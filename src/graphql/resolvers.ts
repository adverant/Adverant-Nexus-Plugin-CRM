import { GraphQLScalarType, Kind } from 'graphql';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import {
  orchestrationClient,
  mageClient,
  graphRAGClient,
  geoClient,
  authClient,
  healthCheckAll,
} from '../clients';
import {
  Contact,
  Company,
  Deal,
  Activity,
  Campaign,
  VoiceCall,
  CreateContactInput,
  UpdateContactInput,
  ContactFilter,
  MakeCallInput,
  LaunchCampaignInput,
} from '../types';

/**
 * NexusCRM GraphQL Resolvers
 *
 * Implements all queries and mutations using:
 * - PostgreSQL database (via db utility)
 * - Nexus service clients (orchestration, mage, graphRAG, geo, auth)
 */

// ============================================================================
// Custom Scalars
// ============================================================================

const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  serialize(value: any) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  },
  parseValue(value: any) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  serialize(value: any) {
    return value;
  },
  parseValue(value: any) {
    return value;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.OBJECT) {
      return ast;
    }
    return null;
  },
});

// ============================================================================
// Query Resolvers
// ============================================================================

const Query = {
  // Contact queries
  contact: async (_: any, { id }: { id: string }, context: any): Promise<Contact | null> => {
    try {
      const result = await db.queryWithContext<Contact>(
        context.auth.user.organizationId,
        `SELECT * FROM nexuscrm.contacts WHERE id = $1 AND deleted_at IS NULL`,
        [id]
      );

      return result.rows[0] || null;
    } catch (error: any) {
      logger.error('Failed to fetch contact', { error: error.message, id });
      throw new Error('Failed to fetch contact');
    }
  },

  contacts: async (
    _: any,
    {
      filter,
      limit = 50,
      offset = 0,
    }: { filter?: ContactFilter; limit?: number; offset?: number },
    context: any
  ): Promise<Contact[]> => {
    try {
      const conditions: string[] = ['deleted_at IS NULL'];
      const params: any[] = [];
      let paramIndex = 1;

      if (filter) {
        if (filter.companyId) {
          conditions.push(`company_id = $${paramIndex++}`);
          params.push(filter.companyId);
        }
        if (filter.leadStatus) {
          conditions.push(`lead_status = $${paramIndex++}`);
          params.push(filter.leadStatus);
        }
        if (filter.ownerId) {
          conditions.push(`owner_id = $${paramIndex++}`);
          params.push(filter.ownerId);
        }
        if (filter.minLeadScore !== undefined) {
          conditions.push(`lead_score >= $${paramIndex++}`);
          params.push(filter.minLeadScore);
        }
        if (filter.maxLeadScore !== undefined) {
          conditions.push(`lead_score <= $${paramIndex++}`);
          params.push(filter.maxLeadScore);
        }
        if (filter.search) {
          conditions.push(`(
            first_name ILIKE $${paramIndex} OR
            last_name ILIKE $${paramIndex} OR
            email ILIKE $${paramIndex}
          )`);
          params.push(`%${filter.search}%`);
          paramIndex++;
        }
      }

      params.push(limit, offset);

      const query = `
        SELECT * FROM nexuscrm.contacts
        WHERE ${conditions.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      const result = await db.queryWithContext<Contact>(
        context.auth.user.organizationId,
        query,
        params
      );

      return result.rows;
    } catch (error: any) {
      logger.error('Failed to fetch contacts', { error: error.message });
      throw new Error('Failed to fetch contacts');
    }
  },

  contactsCount: async (
    _: any,
    { filter }: { filter?: ContactFilter },
    context: any
  ): Promise<number> => {
    try {
      const conditions: string[] = ['deleted_at IS NULL'];
      const params: any[] = [];
      let paramIndex = 1;

      if (filter) {
        if (filter.companyId) {
          conditions.push(`company_id = $${paramIndex++}`);
          params.push(filter.companyId);
        }
        if (filter.leadStatus) {
          conditions.push(`lead_status = $${paramIndex++}`);
          params.push(filter.leadStatus);
        }
      }

      const query = `
        SELECT COUNT(*) FROM nexuscrm.contacts
        WHERE ${conditions.join(' AND ')}
      `;

      const result = await db.queryWithContext(
        context.auth.user.organizationId,
        query,
        params
      );

      return parseInt(result.rows[0].count, 10);
    } catch (error: any) {
      logger.error('Failed to count contacts', { error: error.message });
      throw new Error('Failed to count contacts');
    }
  },

  // Company queries
  company: async (_: any, { id }: { id: string }, context: any): Promise<Company | null> => {
    try {
      const result = await db.queryWithContext<Company>(
        context.auth.user.organizationId,
        `SELECT * FROM nexuscrm.companies WHERE id = $1 AND deleted_at IS NULL`,
        [id]
      );

      return result.rows[0] || null;
    } catch (error: any) {
      logger.error('Failed to fetch company', { error: error.message, id });
      throw new Error('Failed to fetch company');
    }
  },

  companies: async (
    _: any,
    { search, limit = 50, offset = 0 }: { search?: string; limit?: number; offset?: number },
    context: any
  ): Promise<Company[]> => {
    try {
      let query = `
        SELECT * FROM nexuscrm.companies
        WHERE deleted_at IS NULL
      `;
      const params: any[] = [];

      if (search) {
        query += ` AND (name ILIKE $1 OR domain ILIKE $1)`;
        params.push(`%${search}%`);
        query += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
        params.push(limit, offset);
      } else {
        query += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
        params.push(limit, offset);
      }

      const result = await db.queryWithContext<Company>(
        context.auth.user.organizationId,
        query,
        params
      );

      return result.rows;
    } catch (error: any) {
      logger.error('Failed to fetch companies', { error: error.message });
      throw new Error('Failed to fetch companies');
    }
  },

  // Deal queries
  deal: async (_: any, { id }: { id: string }, context: any): Promise<Deal | null> => {
    try {
      const result = await db.queryWithContext<Deal>(
        context.auth.user.organizationId,
        `SELECT * FROM nexuscrm.deals WHERE id = $1 AND deleted_at IS NULL`,
        [id]
      );

      return result.rows[0] || null;
    } catch (error: any) {
      logger.error('Failed to fetch deal', { error: error.message, id });
      throw new Error('Failed to fetch deal');
    }
  },

  deals: async (
    _: any,
    {
      stage,
      ownerId,
      limit = 50,
      offset = 0,
    }: { stage?: string; ownerId?: string; limit?: number; offset?: number },
    context: any
  ): Promise<Deal[]> => {
    try {
      const conditions: string[] = ['deleted_at IS NULL'];
      const params: any[] = [];
      let paramIndex = 1;

      if (stage) {
        conditions.push(`stage = $${paramIndex++}`);
        params.push(stage);
      }
      if (ownerId) {
        conditions.push(`owner_id = $${paramIndex++}`);
        params.push(ownerId);
      }

      params.push(limit, offset);

      const query = `
        SELECT * FROM nexuscrm.deals
        WHERE ${conditions.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      const result = await db.queryWithContext<Deal>(
        context.auth.user.organizationId,
        query,
        params
      );

      return result.rows;
    } catch (error: any) {
      logger.error('Failed to fetch deals', { error: error.message });
      throw new Error('Failed to fetch deals');
    }
  },

  // Activity queries
  activity: async (_: any, { id }: { id: string }, context: any): Promise<Activity | null> => {
    try {
      const result = await db.queryWithContext<Activity>(
        context.auth.user.organizationId,
        `SELECT * FROM nexuscrm.activities WHERE id = $1 AND deleted_at IS NULL`,
        [id]
      );

      return result.rows[0] || null;
    } catch (error: any) {
      logger.error('Failed to fetch activity', { error: error.message, id });
      throw new Error('Failed to fetch activity');
    }
  },

  activities: async (
    _: any,
    {
      contactId,
      companyId,
      dealId,
      type,
      limit = 50,
      offset = 0,
    }: {
      contactId?: string;
      companyId?: string;
      dealId?: string;
      type?: string;
      limit?: number;
      offset?: number;
    },
    context: any
  ): Promise<Activity[]> => {
    try {
      const conditions: string[] = ['deleted_at IS NULL'];
      const params: any[] = [];
      let paramIndex = 1;

      if (contactId) {
        conditions.push(`contact_id = $${paramIndex++}`);
        params.push(contactId);
      }
      if (companyId) {
        conditions.push(`company_id = $${paramIndex++}`);
        params.push(companyId);
      }
      if (dealId) {
        conditions.push(`deal_id = $${paramIndex++}`);
        params.push(dealId);
      }
      if (type) {
        conditions.push(`type = $${paramIndex++}`);
        params.push(type);
      }

      params.push(limit, offset);

      const query = `
        SELECT * FROM nexuscrm.activities
        WHERE ${conditions.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      const result = await db.queryWithContext<Activity>(
        context.auth.user.organizationId,
        query,
        params
      );

      return result.rows;
    } catch (error: any) {
      logger.error('Failed to fetch activities', { error: error.message });
      throw new Error('Failed to fetch activities');
    }
  },

  // Campaign queries
  campaign: async (_: any, { id }: { id: string }, context: any): Promise<Campaign | null> => {
    try {
      const result = await db.queryWithContext<Campaign>(
        context.auth.user.organizationId,
        `SELECT * FROM nexuscrm.campaigns WHERE id = $1 AND deleted_at IS NULL`,
        [id]
      );

      return result.rows[0] || null;
    } catch (error: any) {
      logger.error('Failed to fetch campaign', { error: error.message, id });
      throw new Error('Failed to fetch campaign');
    }
  },

  campaigns: async (
    _: any,
    {
      status,
      limit = 50,
      offset = 0,
    }: { status?: string; limit?: number; offset?: number },
    context: any
  ): Promise<Campaign[]> => {
    try {
      const conditions: string[] = ['deleted_at IS NULL'];
      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(status);
      }

      params.push(limit, offset);

      const query = `
        SELECT * FROM nexuscrm.campaigns
        WHERE ${conditions.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      const result = await db.queryWithContext<Campaign>(
        context.auth.user.organizationId,
        query,
        params
      );

      return result.rows;
    } catch (error: any) {
      logger.error('Failed to fetch campaigns', { error: error.message });
      throw new Error('Failed to fetch campaigns');
    }
  },

  // Voice call queries
  voiceCall: async (_: any, { id }: { id: string }, context: any): Promise<VoiceCall | null> => {
    try {
      const result = await db.queryWithContext<VoiceCall>(
        context.auth.user.organizationId,
        `SELECT * FROM nexuscrm.voice_calls WHERE id = $1`,
        [id]
      );

      return result.rows[0] || null;
    } catch (error: any) {
      logger.error('Failed to fetch voice call', { error: error.message, id });
      throw new Error('Failed to fetch voice call');
    }
  },

  voiceCalls: async (
    _: any,
    {
      status,
      limit = 50,
      offset = 0,
    }: { status?: string; limit?: number; offset?: number },
    context: any
  ): Promise<VoiceCall[]> => {
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(status);
      }

      params.push(limit, offset);

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const query = `
        SELECT * FROM nexuscrm.voice_calls
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      const result = await db.queryWithContext<VoiceCall>(
        context.auth.user.organizationId,
        query,
        params
      );

      return result.rows;
    } catch (error: any) {
      logger.error('Failed to fetch voice calls', { error: error.message });
      throw new Error('Failed to fetch voice calls');
    }
  },

  // Health check
  health: async (): Promise<any> => {
    const servicesHealth = await healthCheckAll();

    return {
      status: servicesHealth.allHealthy ? 'healthy' : 'degraded',
      services: servicesHealth,
      timestamp: new Date(),
    };
  },
};

// ============================================================================
// Mutation Resolvers
// ============================================================================

const Mutation = {
  // Create contact
  createContact: async (
    _: any,
    { input }: { input: CreateContactInput },
    context: any
  ): Promise<Contact> => {
    try {
      const result = await db.queryWithContext<Contact>(
        context.auth.user.organizationId,
        `
          INSERT INTO nexuscrm.contacts (
            company_id, first_name, last_name, email, phone, mobile,
            job_title, department, seniority, lead_source, owner_id,
            tags, custom_fields, organization_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *
        `,
        [
          input.companyId || null,
          input.firstName || null,
          input.lastName || null,
          input.email || null,
          input.phone || null,
          input.mobile || null,
          input.jobTitle || null,
          input.department || null,
          input.seniority || null,
          input.leadSource || null,
          input.ownerId || context.auth.user.id,
          input.tags || [],
          input.customFields || {},
          context.auth.user.organizationId,
        ]
      );

      const contact = result.rows[0];

      // Store in GraphRAG for semantic search
      if (contact.email || contact.phone) {
        await graphRAGClient.storeDocument(
          JSON.stringify({
            name: contact.fullName,
            email: contact.email,
            phone: contact.phone,
            jobTitle: contact.jobTitle,
          }),
          {
            type: 'contact',
            source: 'crm',
            entityType: 'contact',
            entityId: contact.id,
            tags: contact.tags || [],
          }
        );
      }

      logger.info('Contact created', { contactId: contact.id });

      return contact;
    } catch (error: any) {
      logger.error('Failed to create contact', { error: error.message });
      throw new Error('Failed to create contact');
    }
  },

  // Update contact
  updateContact: async (
    _: any,
    { id, input }: { id: string; input: UpdateContactInput },
    context: any
  ): Promise<Contact> => {
    try {
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (input.firstName !== undefined) {
        updates.push(`first_name = $${paramIndex++}`);
        params.push(input.firstName);
      }
      if (input.lastName !== undefined) {
        updates.push(`last_name = $${paramIndex++}`);
        params.push(input.lastName);
      }
      if (input.email !== undefined) {
        updates.push(`email = $${paramIndex++}`);
        params.push(input.email);
      }
      if (input.phone !== undefined) {
        updates.push(`phone = $${paramIndex++}`);
        params.push(input.phone);
      }
      if (input.mobile !== undefined) {
        updates.push(`mobile = $${paramIndex++}`);
        params.push(input.mobile);
      }
      if (input.jobTitle !== undefined) {
        updates.push(`job_title = $${paramIndex++}`);
        params.push(input.jobTitle);
      }
      if (input.department !== undefined) {
        updates.push(`department = $${paramIndex++}`);
        params.push(input.department);
      }
      if (input.seniority !== undefined) {
        updates.push(`seniority = $${paramIndex++}`);
        params.push(input.seniority);
      }
      if (input.leadStatus !== undefined) {
        updates.push(`lead_status = $${paramIndex++}`);
        params.push(input.leadStatus);
      }
      if (input.leadScore !== undefined) {
        updates.push(`lead_score = $${paramIndex++}`);
        params.push(input.leadScore);
      }
      if (input.lifecycleStage !== undefined) {
        updates.push(`lifecycle_stage = $${paramIndex++}`);
        params.push(input.lifecycleStage);
      }
      if (input.doNotCall !== undefined) {
        updates.push(`do_not_call = $${paramIndex++}`);
        params.push(input.doNotCall);
      }
      if (input.doNotEmail !== undefined) {
        updates.push(`do_not_email = $${paramIndex++}`);
        params.push(input.doNotEmail);
      }
      if (input.tags !== undefined) {
        updates.push(`tags = $${paramIndex++}`);
        params.push(input.tags);
      }
      if (input.customFields !== undefined) {
        updates.push(`custom_fields = $${paramIndex++}`);
        params.push(input.customFields);
      }

      params.push(id);

      const query = `
        UPDATE nexuscrm.contacts
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex++} AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await db.queryWithContext<Contact>(
        context.auth.user.organizationId,
        query,
        params
      );

      if (result.rows.length === 0) {
        throw new Error('Contact not found');
      }

      logger.info('Contact updated', { contactId: id });

      return result.rows[0];
    } catch (error: any) {
      logger.error('Failed to update contact', { error: error.message, id });
      throw new Error('Failed to update contact');
    }
  },

  // Delete contact (soft delete)
  deleteContact: async (_: any, { id }: { id: string }, context: any): Promise<boolean> => {
    try {
      const result = await db.queryWithContext(
        context.auth.user.organizationId,
        `UPDATE nexuscrm.contacts SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL`,
        [id]
      );

      logger.info('Contact deleted', { contactId: id });

      return (result.rowCount ?? 0) > 0;
    } catch (error: any) {
      logger.error('Failed to delete contact', { error: error.message, id });
      throw new Error('Failed to delete contact');
    }
  },

  // Enrich contact using GraphRAG
  enrichContact: async (_: any, { id }: { id: string }, context: any): Promise<Contact> => {
    try {
      // Get contact
      const contactResult = await db.queryWithContext<Contact>(
        context.auth.user.organizationId,
        `SELECT * FROM nexuscrm.contacts WHERE id = $1 AND deleted_at IS NULL`,
        [id]
      );

      if (contactResult.rows.length === 0) {
        throw new Error('Contact not found');
      }

      const contact = contactResult.rows[0];

      // Use GraphRAG to enrich contact data
      const enrichment = await graphRAGClient.enrichContact(id);

      // Update contact with enrichment data
      const updateResult = await db.queryWithContext<Contact>(
        context.auth.user.organizationId,
        `
          UPDATE nexuscrm.contacts
          SET
            enrichment_data = $1,
            enrichment_source = $2,
            enrichment_confidence = $3,
            enriched_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
          RETURNING *
        `,
        [enrichment.enrichmentData, enrichment.sources.join(','), enrichment.confidence, id]
      );

      logger.info('Contact enriched', { contactId: id, confidence: enrichment.confidence });

      return updateResult.rows[0];
    } catch (error: any) {
      logger.error('Failed to enrich contact', { error: error.message, id });
      throw new Error('Failed to enrich contact');
    }
  },

  // Make voice call
  makeCall: async (
    _: any,
    { input }: { input: MakeCallInput },
    context: any
  ): Promise<{ callId: string; status: string; message?: string }> => {
    try {
      logger.info('Initiating voice call', {
        contactId: input.contactId,
        toNumber: input.toNumber,
      });

      // Use OrchestrationAgent to execute the call workflow
      const orchestrationResult = await orchestrationClient.execute({
        goal: `Make a voice call to ${input.toNumber} using the following script: ${input.script}`,
        metadata: {
          contactId: input.contactId,
          toNumber: input.toNumber,
          script: input.script,
          language: input.language || 'en',
          voiceId: input.voiceId,
          model: input.model,
          tools: input.tools || [],
        },
      });

      // Create voice call record
      const callResult = await db.queryWithContext<VoiceCall>(
        context.auth.user.organizationId,
        `
          INSERT INTO nexuscrm.voice_calls (
            platform, from_number, to_number, status,
            assistant_config, metadata, organization_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `,
        [
          'vapi',
          'system', // Will be replaced with actual number from Vapi
          input.toNumber,
          'initiated',
          { script: input.script, language: input.language, voiceId: input.voiceId },
          { orchestrationExecutionId: orchestrationResult.executionId },
          context.auth.user.organizationId,
        ]
      );

      const call = callResult.rows[0];

      // Create activity record
      if (input.contactId) {
        await db.queryWithContext(
          context.auth.user.organizationId,
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
            { voiceCallId: call.id },
            context.auth.user.organizationId,
            context.auth.user.id,
          ]
        );
      }

      logger.info('Voice call initiated', { callId: call.id });

      return {
        callId: call.id,
        status: 'initiated',
        message: 'Call initiated successfully',
      };
    } catch (error: any) {
      logger.error('Failed to make call', { error: error.message });
      throw new Error(`Failed to make call: ${error.message}`);
    }
  },

  // Cancel voice call
  cancelCall: async (_: any, { callId }: { callId: string }, context: any): Promise<boolean> => {
    try {
      // Update call status
      const result = await db.queryWithContext(
        context.auth.user.organizationId,
        `UPDATE nexuscrm.voice_calls SET status = 'cancelled', ended_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [callId]
      );

      logger.info('Voice call cancelled', { callId });

      return (result.rowCount ?? 0) > 0;
    } catch (error: any) {
      logger.error('Failed to cancel call', { error: error.message, callId });
      throw new Error('Failed to cancel call');
    }
  },

  // Launch campaign
  launchCampaign: async (
    _: any,
    { input }: { input: LaunchCampaignInput },
    context: any
  ): Promise<{ campaignId: string; jobsCreated: number; jobs: string[] }> => {
    try {
      // Get campaign
      const campaignResult = await db.queryWithContext<Campaign>(
        context.auth.user.organizationId,
        `SELECT * FROM nexuscrm.campaigns WHERE id = $1 AND deleted_at IS NULL`,
        [input.campaignId]
      );

      if (campaignResult.rows.length === 0) {
        throw new Error('Campaign not found');
      }

      const campaign = campaignResult.rows[0];

      logger.info('Launching campaign', { campaignId: campaign.id, type: campaign.type });

      // Use OrchestrationAgent to execute the campaign workflow
      const orchestrationResult = await orchestrationClient.execute({
        goal: campaign.workflowGoal || `Execute ${campaign.type} campaign: ${campaign.name}`,
        metadata: {
          campaignId: campaign.id,
          segmentId: input.segmentId,
          type: campaign.type,
          targetCount: campaign.targetCount,
        },
      });

      // Update campaign status
      await db.queryWithContext(
        context.auth.user.organizationId,
        `
          UPDATE nexuscrm.campaigns
          SET
            status = 'active',
            orchestration_execution_id = $1,
            launched_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `,
        [orchestrationResult.executionId, campaign.id]
      );

      logger.info('Campaign launched', {
        campaignId: campaign.id,
        executionId: orchestrationResult.executionId,
      });

      return {
        campaignId: campaign.id,
        jobsCreated: 1,
        jobs: [orchestrationResult.executionId],
      };
    } catch (error: any) {
      logger.error('Failed to launch campaign', { error: error.message });
      throw new Error(`Failed to launch campaign: ${error.message}`);
    }
  },

  // Pause campaign
  pauseCampaign: async (
    _: any,
    { campaignId }: { campaignId: string },
    context: any
  ): Promise<Campaign> => {
    try {
      const result = await db.queryWithContext<Campaign>(
        context.auth.user.organizationId,
        `UPDATE nexuscrm.campaigns SET status = 'paused', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [campaignId]
      );

      if (result.rows.length === 0) {
        throw new Error('Campaign not found');
      }

      logger.info('Campaign paused', { campaignId });

      return result.rows[0];
    } catch (error: any) {
      logger.error('Failed to pause campaign', { error: error.message, campaignId });
      throw new Error('Failed to pause campaign');
    }
  },

  // Resume campaign
  resumeCampaign: async (
    _: any,
    { campaignId }: { campaignId: string },
    context: any
  ): Promise<Campaign> => {
    try {
      const result = await db.queryWithContext<Campaign>(
        context.auth.user.organizationId,
        `UPDATE nexuscrm.campaigns SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [campaignId]
      );

      if (result.rows.length === 0) {
        throw new Error('Campaign not found');
      }

      logger.info('Campaign resumed', { campaignId });

      return result.rows[0];
    } catch (error: any) {
      logger.error('Failed to resume campaign', { error: error.message, campaignId });
      throw new Error('Failed to resume campaign');
    }
  },

  // Cancel campaign
  cancelCampaign: async (
    _: any,
    { campaignId }: { campaignId: string },
    context: any
  ): Promise<Campaign> => {
    try {
      const result = await db.queryWithContext<Campaign>(
        context.auth.user.organizationId,
        `UPDATE nexuscrm.campaigns SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [campaignId]
      );

      if (result.rows.length === 0) {
        throw new Error('Campaign not found');
      }

      logger.info('Campaign cancelled', { campaignId });

      return result.rows[0];
    } catch (error: any) {
      logger.error('Failed to cancel campaign', { error: error.message, campaignId });
      throw new Error('Failed to cancel campaign');
    }
  },
};

// ============================================================================
// Export Resolvers
// ============================================================================

export const resolvers = {
  Query,
  Mutation,
  DateTime: DateTimeScalar,
  JSON: JSONScalar,
};

export default resolvers;
