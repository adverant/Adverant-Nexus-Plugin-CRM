import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { vapiClient, VapiAssistant } from './vapi-client';
import { mageClient } from '../clients';
import { VoiceCall, Activity, MakeCallInput } from '../types';

/**
 * Call Manager
 *
 * Orchestrates voice calling operations:
 * - Creates call records in database
 * - Initiates calls via Vapi
 * - Generates dynamic call scripts using MageAgent
 * - Tracks call status and updates
 * - Creates activity records
 * - Analyzes call transcripts post-call
 */
export class CallManager {
  /**
   * Make a call with dynamic script generation
   *
   * This is the primary method for making calls in NexusCRM.
   * It handles the complete workflow:
   * 1. Generate call script using MageAgent (if needed)
   * 2. Create database records
   * 3. Initiate call via Vapi
   * 4. Return call ID for tracking
   */
  async makeCall(
    input: MakeCallInput,
    organizationId: string,
    userId: string
  ): Promise<{ callId: string; vapiCallId: string; status: string }> {
    try {
      logger.info('Making call', {
        contactId: input.contactId,
        toNumber: input.toNumber,
        organizationId,
      });

      // Step 1: Get contact context if contactId provided
      let contactContext: any = null;
      if (input.contactId) {
        const contactResult = await db.queryWithContext(
          organizationId,
          `SELECT * FROM nexuscrm.contacts WHERE id = $1 AND deleted_at IS NULL`,
          [input.contactId]
        );

        if (contactResult.rows.length > 0) {
          contactContext = contactResult.rows[0];
        }
      }

      // Step 2: Generate or enhance call script using MageAgent
      let finalScript = input.script;
      if (contactContext) {
        logger.info('Enhancing call script with contact context', {
          contactId: input.contactId,
        });

        finalScript = await mageClient.generate({
          task: `Enhance this call script with personalized details for the contact: ${input.script}`,
          context: {
            contact: {
              name: contactContext.full_name,
              company: contactContext.company_id,
              jobTitle: contactContext.job_title,
              previousInteractions: contactContext.last_contacted_at
                ? `Last contacted: ${contactContext.last_contacted_at}`
                : 'First contact',
            },
            originalScript: input.script,
          },
          temperature: 0.8,
        });
      }

      // Step 3: Build Vapi assistant configuration
      const assistant = vapiClient.buildAssistant({
        name: `Call to ${input.toNumber}`,
        systemPrompt: finalScript,
        firstMessage: this.extractFirstMessage(finalScript),
        language: input.language || 'en',
        voiceId: input.voiceId,
        model: input.model || 'gpt-4o',
        temperature: 0.7,
        functions: input.tools?.map((tool) => ({
          name: tool.name,
          description: tool.description,
          parameters: {
            type: 'object' as const,
            properties: tool.parameters,
            required: [],
          },
        })),
      });

      // Step 4: Create voice call record
      const callResult = await db.queryWithContext<VoiceCall>(
        organizationId,
        `
          INSERT INTO nexuscrm.voice_calls (
            platform, from_number, to_number, status,
            assistant_config, stt_provider, tts_provider, llm_model,
            metadata, organization_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `,
        [
          'vapi',
          'system', // Will be updated with actual number from Vapi
          input.toNumber,
          'initiated',
          assistant,
          'deepgram',
          'elevenlabs',
          input.model || 'gpt-4o',
          { contactId: input.contactId, script: finalScript },
          organizationId,
        ]
      );

      const call = callResult.rows[0];

      // Step 5: Initiate call via Vapi
      const vapiCall = await vapiClient.makeCall({
        phoneNumber: input.toNumber,
        assistant,
        metadata: {
          nexusCallId: call.id,
          contactId: input.contactId,
          organizationId,
          userId,
        },
      });

      // Step 6: Update call record with Vapi call ID
      await db.queryWithContext(
        organizationId,
        `
          UPDATE nexuscrm.voice_calls
          SET
            external_call_id = $1,
            from_number = $2,
            initiated_at = $3,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `,
        [vapiCall.id, vapiCall.phoneNumber, vapiCall.startedAt || new Date(), call.id]
      );

      // Step 7: Create activity record
      if (input.contactId) {
        await db.queryWithContext(
          organizationId,
          `
            INSERT INTO nexuscrm.activities (
              type, direction, contact_id, to_number,
              call_status, metadata, organization_id, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            'call',
            'outbound',
            input.contactId,
            input.toNumber,
            'initiated',
            { voiceCallId: call.id, vapiCallId: vapiCall.id },
            organizationId,
            userId,
          ]
        );
      }

      logger.info('Call initiated successfully', {
        callId: call.id,
        vapiCallId: vapiCall.id,
        status: vapiCall.status,
      });

      return {
        callId: call.id,
        vapiCallId: vapiCall.id,
        status: vapiCall.status,
      };
    } catch (error: any) {
      logger.error('Failed to make call', {
        error: error.message,
        toNumber: input.toNumber,
      });
      throw new Error(`Failed to make call: ${error.message}`);
    }
  }

  /**
   * Update call status from webhook
   */
  async updateCallStatus(
    vapiCallId: string,
    status: string,
    data: {
      answeredAt?: Date;
      endedAt?: Date;
      durationSeconds?: number;
      transcript?: string;
      recordingUrl?: string;
      cost?: number;
      costBreakdown?: Record<string, number>;
    }
  ): Promise<void> {
    try {
      logger.info('Updating call status', { vapiCallId, status });

      // Update voice call record
      const updateResult = await db.query<VoiceCall>(
        `
          UPDATE nexuscrm.voice_calls
          SET
            status = $1,
            answered_at = COALESCE($2, answered_at),
            ended_at = COALESCE($3, ended_at),
            duration_seconds = COALESCE($4, duration_seconds),
            transcript = COALESCE($5, transcript),
            recording_url = COALESCE($6, recording_url),
            cost_usd = COALESCE($7, cost_usd),
            cost_breakdown = COALESCE($8, cost_breakdown),
            updated_at = CURRENT_TIMESTAMP
          WHERE external_call_id = $9
          RETURNING *
        `,
        [
          status,
          data.answeredAt || null,
          data.endedAt || null,
          data.durationSeconds || null,
          data.transcript || null,
          data.recordingUrl || null,
          data.cost || null,
          data.costBreakdown || null,
          vapiCallId,
        ]
      );

      if (updateResult.rows.length === 0) {
        logger.warn('Call not found for update', { vapiCallId });
        return;
      }

      const call = updateResult.rows[0];

      // If call completed and has transcript, analyze it
      if (status === 'completed' && data.transcript) {
        await this.analyzeCallTranscript(call.id, data.transcript, call.organizationId);
      }

      // Update associated activity
      await db.query(
        `
          UPDATE nexuscrm.activities
          SET
            call_status = $1,
            duration_seconds = COALESCE($2, duration_seconds),
            transcript = COALESCE($3, transcript),
            recording_url = COALESCE($4, recording_url),
            cost_usd = COALESCE($5, cost_usd),
            completed_at = COALESCE($6, completed_at),
            updated_at = CURRENT_TIMESTAMP
          WHERE metadata->>'vapiCallId' = $7
        `,
        [
          status === 'completed' ? 'completed' : status,
          data.durationSeconds || null,
          data.transcript || null,
          data.recordingUrl || null,
          data.cost || null,
          data.endedAt || null,
          vapiCallId,
        ]
      );

      logger.info('Call status updated', { callId: call.id, status });
    } catch (error: any) {
      logger.error('Failed to update call status', {
        error: error.message,
        vapiCallId,
      });
      throw error;
    }
  }

  /**
   * Analyze call transcript using MageAgent
   *
   * Extracts:
   * - Sentiment
   * - Keywords
   * - Topics discussed
   * - Objections raised
   * - Buying signals
   * - Action items
   * - Call outcome
   */
  private async analyzeCallTranscript(
    callId: string,
    transcript: string,
    organizationId: string
  ): Promise<void> {
    try {
      logger.info('Analyzing call transcript', { callId });

      const analysis = await mageClient.analyze(
        'Analyze this sales call transcript and extract key information',
        transcript,
        {
          sentiment: {
            type: 'string',
            enum: ['positive', 'neutral', 'negative', 'mixed'],
          },
          sentimentScore: {
            type: 'number',
            minimum: -1,
            maximum: 1,
          },
          keywords: {
            type: 'array',
            items: { type: 'string' },
          },
          topicsDiscussed: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                topic: { type: 'string' },
                importance: { type: 'number' },
              },
            },
          },
          objectionsRaised: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                objection: { type: 'string' },
                response: { type: 'string' },
                resolved: { type: 'boolean' },
              },
            },
          },
          buyingSignals: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                signal: { type: 'string' },
                strength: { type: 'number' },
              },
            },
          },
          actionItems: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                action: { type: 'string' },
                owner: { type: 'string' },
                dueDate: { type: 'string' },
              },
            },
          },
          callOutcome: {
            type: 'string',
            enum: [
              'qualified',
              'not_interested',
              'needs_follow_up',
              'callback_requested',
              'meeting_scheduled',
              'deal_closed',
              'voicemail',
            ],
          },
          dealScore: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: 'Likelihood of deal closing (0-100)',
          },
          summary: {
            type: 'string',
          },
        }
      );

      // Update call record with analysis
      await db.queryWithContext(
        organizationId,
        `
          UPDATE nexuscrm.voice_calls
          SET
            sentiment_overall = $1,
            keywords_detected = $2,
            topics_discussed = $3,
            objections_raised = $4,
            buying_signals = $5,
            action_items = $6,
            call_outcome = $7,
            deal_score = $8,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $9
        `,
        [
          analysis.sentiment,
          analysis.keywords,
          JSON.stringify(analysis.topicsDiscussed),
          JSON.stringify(analysis.objectionsRaised),
          JSON.stringify(analysis.buyingSignals),
          JSON.stringify(analysis.actionItems),
          analysis.callOutcome,
          analysis.dealScore,
          callId,
        ]
      );

      // Update activity with AI analysis
      await db.queryWithContext(
        organizationId,
        `
          UPDATE nexuscrm.activities
          SET
            sentiment = $1,
            sentiment_score = $2,
            keywords_detected = $3,
            ai_summary = $4,
            action_items = $5,
            objections_raised = $6,
            buying_signals = $7,
            updated_at = CURRENT_TIMESTAMP
          WHERE metadata->>'voiceCallId' = $8
        `,
        [
          analysis.sentiment,
          analysis.sentimentScore,
          analysis.keywords,
          analysis.summary,
          JSON.stringify(analysis.actionItems),
          JSON.stringify(analysis.objectionsRaised),
          JSON.stringify(analysis.buyingSignals),
          callId,
        ]
      );

      logger.info('Call transcript analyzed', {
        callId,
        sentiment: analysis.sentiment,
        dealScore: analysis.dealScore,
      });
    } catch (error: any) {
      logger.error('Failed to analyze call transcript', {
        error: error.message,
        callId,
      });
      // Don't throw - analysis failure shouldn't break the workflow
    }
  }

  /**
   * Cancel a call
   */
  async cancelCall(callId: string, organizationId: string): Promise<void> {
    try {
      // Get call
      const callResult = await db.queryWithContext<VoiceCall>(
        organizationId,
        `SELECT * FROM nexuscrm.voice_calls WHERE id = $1`,
        [callId]
      );

      if (callResult.rows.length === 0) {
        throw new Error('Call not found');
      }

      const call = callResult.rows[0];

      // Cancel via Vapi if external call ID exists
      if (call.externalCallId) {
        await vapiClient.cancelCall(call.externalCallId);
      }

      // Update status
      await this.updateCallStatus(call.externalCallId || '', 'cancelled', {
        endedAt: new Date(),
      });

      logger.info('Call cancelled', { callId });
    } catch (error: any) {
      logger.error('Failed to cancel call', {
        error: error.message,
        callId,
      });
      throw error;
    }
  }

  /**
   * Extract first message from script
   */
  private extractFirstMessage(script: string): string {
    // Try to find a greeting or opening line
    const lines = script.split('\n').filter((line) => line.trim());

    if (lines.length === 0) {
      return 'Hello!';
    }

    // Look for common greeting patterns
    for (const line of lines) {
      if (
        line.toLowerCase().includes('hello') ||
        line.toLowerCase().includes('hi ') ||
        line.toLowerCase().includes('good morning') ||
        line.toLowerCase().includes('good afternoon')
      ) {
        return line.trim();
      }
    }

    // Default to first line
    return lines[0].trim();
  }
}

// Export singleton instance
export const callManager = new CallManager();

export default callManager;
