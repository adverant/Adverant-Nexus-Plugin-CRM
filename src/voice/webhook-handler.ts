import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import config from '../config';
import { logger } from '../utils/logger';
import { callManager } from './call-manager';
import { broadcastTranscriptUpdate, broadcastCallStatus } from '../websocket/manager';

/**
 * Vapi Webhook Handler
 *
 * Handles webhook events from Vapi for call lifecycle tracking:
 * - call.started: Call initiated and ringing
 * - call.answered: Call answered by recipient
 * - call.ended: Call completed
 * - call.failed: Call failed
 * - function.called: Assistant invoked a function
 * - transcript.updated: Real-time transcript updates
 *
 * Events are verified using HMAC signature to ensure authenticity.
 */

export interface VapiWebhookEvent {
  type: string;
  callId: string;
  timestamp: string;
  data: any;
}

/**
 * Verify Vapi webhook signature
 *
 * Vapi signs webhooks with HMAC-SHA256 to ensure authenticity.
 * The signature is sent in the X-Vapi-Signature header.
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    logger.error('Failed to verify webhook signature', { error });
    return false;
  }
}

/**
 * Webhook signature verification middleware
 */
export function verifyWebhookMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const signature = req.headers['x-vapi-signature'] as string;
  const webhookSecret = config.voice.vapiWebhookSecret;

  if (!webhookSecret) {
    logger.warn('Vapi webhook secret not configured - skipping signature verification');
    return next();
  }

  if (!signature) {
    logger.warn('Webhook signature missing');
    res.status(401).json({ error: 'Signature required' });
    return;
  }

  const payload = JSON.stringify(req.body);

  if (!verifySignature(payload, signature, webhookSecret)) {
    logger.warn('Invalid webhook signature');
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  next();
}

/**
 * Main webhook handler
 */
export async function handleVapiWebhook(req: Request, res: Response): Promise<void> {
  try {
    const event: VapiWebhookEvent = req.body;

    logger.info('Received Vapi webhook', {
      type: event.type,
      callId: event.callId,
    });

    // Handle different event types
    switch (event.type) {
      case 'call.started':
        await handleCallStarted(event);
        break;

      case 'call.answered':
        await handleCallAnswered(event);
        break;

      case 'call.ended':
        await handleCallEnded(event);
        break;

      case 'call.failed':
        await handleCallFailed(event);
        break;

      case 'function.called':
        await handleFunctionCalled(event);
        break;

      case 'transcript.updated':
        await handleTranscriptUpdated(event);
        break;

      default:
        logger.debug('Unhandled webhook event type', { type: event.type });
    }

    // Always respond 200 to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error: any) {
    logger.error('Failed to handle webhook', { error: error.message });
    // Still return 200 to avoid retries for processing errors
    res.status(200).json({ received: true, error: error.message });
  }
}

/**
 * Handle call.started event
 */
async function handleCallStarted(event: VapiWebhookEvent): Promise<void> {
  try {
    logger.info('Call started', { callId: event.callId });

    await callManager.updateCallStatus(event.callId, 'ringing', {});

    // Broadcast call status to WebSocket clients
    const call = await callManager.getCall(event.callId);
    if (call) {
      broadcastCallStatus(event.callId, call.organizationId, 'initiated', {
        startedAt: event.timestamp
      });
    }
  } catch (error: any) {
    logger.error('Failed to handle call.started', { error: error.message });
  }
}

/**
 * Handle call.answered event
 */
async function handleCallAnswered(event: VapiWebhookEvent): Promise<void> {
  try {
    logger.info('Call answered', { callId: event.callId });

    await callManager.updateCallStatus(event.callId, 'in-progress', {
      answeredAt: new Date(event.timestamp),
    });

    // Broadcast call status to WebSocket clients
    const call = await callManager.getCall(event.callId);
    if (call) {
      broadcastCallStatus(event.callId, call.organizationId, 'in-progress', {
        answeredAt: event.timestamp
      });
    }
  } catch (error: any) {
    logger.error('Failed to handle call.answered', { error: error.message });
  }
}

/**
 * Handle call.ended event
 */
async function handleCallEnded(event: VapiWebhookEvent): Promise<void> {
  try {
    logger.info('Call ended', {
      callId: event.callId,
      duration: event.data.durationSeconds,
    });

    await callManager.updateCallStatus(event.callId, 'completed', {
      endedAt: new Date(event.timestamp),
      durationSeconds: event.data.durationSeconds,
      transcript: event.data.transcript,
      recordingUrl: event.data.recordingUrl,
      cost: event.data.cost,
      costBreakdown: event.data.costBreakdown,
    });

    // Broadcast call completion to WebSocket clients
    const call = await callManager.getCall(event.callId);
    if (call) {
      broadcastCallStatus(event.callId, call.organizationId, 'completed', {
        endedAt: event.timestamp,
        durationSeconds: event.data.durationSeconds,
        cost: event.data.cost
      });
    }
  } catch (error: any) {
    logger.error('Failed to handle call.ended', { error: error.message });
  }
}

/**
 * Handle call.failed event
 */
async function handleCallFailed(event: VapiWebhookEvent): Promise<void> {
  try {
    logger.warn('Call failed', {
      callId: event.callId,
      reason: event.data.reason,
    });

    const status = event.data.reason === 'no-answer' ? 'no-answer' : 'failed';

    await callManager.updateCallStatus(event.callId, status, {
      endedAt: new Date(event.timestamp),
    });

    // Broadcast call failure to WebSocket clients
    const call = await callManager.getCall(event.callId);
    if (call) {
      broadcastCallStatus(event.callId, call.organizationId, 'failed', {
        endedAt: event.timestamp,
        reason: event.data.reason
      });
    }
  } catch (error: any) {
    logger.error('Failed to handle call.failed', { error: error.message });
  }
}

/**
 * Handle function.called event
 *
 * This is triggered when the assistant invokes a function during the call.
 * The function can be used to:
 * - Look up information
 * - Update CRM records
 * - Schedule follow-ups
 * - Transfer to human agent
 */
async function handleFunctionCalled(event: VapiWebhookEvent): Promise<void> {
  try {
    logger.info('Function called during call', {
      callId: event.callId,
      functionName: event.data.functionName,
      parameters: event.data.parameters,
    });

    // Function calls are handled by the MageAgent or other services
    // depending on the function configuration. This is just for logging.

    // Example: If function is "schedule_follow_up", you could create a task
    if (event.data.functionName === 'schedule_follow_up') {
      logger.info('Follow-up scheduled during call', {
        callId: event.callId,
        followUpDate: event.data.parameters.date,
      });
      // TODO: Create task in CRM
    }
  } catch (error: any) {
    logger.error('Failed to handle function.called', { error: error.message });
  }
}

/**
 * Handle transcript.updated event
 *
 * This provides real-time transcript updates during the call.
 * Useful for live monitoring and real-time coaching.
 */
async function handleTranscriptUpdated(event: VapiWebhookEvent): Promise<void> {
  try {
    const transcript = event.data.transcript;

    logger.debug('Transcript updated', {
      callId: event.callId,
      transcriptLength: transcript?.length || 0,
    });

    // Get call details to retrieve organization ID for multi-tenant broadcasting
    const call = await callManager.getCall(event.callId);

    if (!call) {
      logger.warn('Call not found for transcript update', { callId: event.callId });
      return;
    }

    // Extract latest transcript segment
    // Vapi sends incremental updates, get the most recent message
    const latestMessage = transcript && transcript.length > 0
      ? transcript[transcript.length - 1]
      : null;

    if (latestMessage) {
      // Broadcast real-time transcript update to WebSocket clients
      broadcastTranscriptUpdate(
        event.callId,
        call.organizationId,
        {
          text: latestMessage.text || latestMessage.content || '',
          speaker: latestMessage.role === 'assistant' ? 'assistant' : 'user',
          timestamp: latestMessage.timestamp || event.timestamp,
          confidence: latestMessage.confidence
        }
      );

      logger.debug('Transcript broadcasted to WebSocket clients', {
        callId: event.callId,
        organizationId: call.organizationId,
        speaker: latestMessage.role,
        textLength: latestMessage.text?.length || 0
      });
    }
  } catch (error: any) {
    logger.error('Failed to handle transcript.updated', { error: error.message });
  }
}

export default {
  verifyWebhookMiddleware,
  handleVapiWebhook,
};
