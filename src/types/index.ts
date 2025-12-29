/**
 * NexusCRM Type Definitions
 */

// ============================================================================
// CRM Entity Types
// ============================================================================

export interface Company {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  revenueRange?: string;
  employeeCount?: number;
  foundedYear?: number;
  description?: string;
  website?: string;
  phone?: string;
  address?: Address;
  socialLinks?: Record<string, string>;
  enrichmentData?: Record<string, any>;
  enrichmentSource?: string;
  enrichmentConfidence?: number;
  enrichedAt?: Date;
  tags?: string[];
  customFields?: Record<string, any>;
  ownerId?: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Contact {
  id: string;
  companyId?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  emailVerified: boolean;
  phone?: string;
  phoneVerified: boolean;
  mobile?: string;
  jobTitle?: string;
  department?: string;
  seniority?: 'IC' | 'Manager' | 'Director' | 'VP' | 'C-Level' | 'Owner';
  decisionMaker: boolean;
  linkedinUrl?: string;
  twitterHandle?: string;
  address?: Address;
  timezone?: string;
  language: string;
  leadScore: number;
  leadStatus: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'customer' | 'churned' | 'unsubscribed';
  leadSource?: string;
  lifecycleStage?: 'subscriber' | 'lead' | 'mql' | 'sql' | 'opportunity' | 'customer' | 'evangelist';
  doNotCall: boolean;
  doNotEmail: boolean;
  unsubscribed: boolean;
  unsubscribedAt?: Date;
  bounced: boolean;
  bouncedAt?: Date;
  enrichmentData?: Record<string, any>;
  enrichmentSource?: string;
  enrichmentConfidence?: number;
  enrichedAt?: Date;
  tags?: string[];
  customFields?: Record<string, any>;
  ownerId?: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  lastContactedAt?: Date;
  lastScoredAt?: Date;
  deletedAt?: Date;
}

export interface Deal {
  id: string;
  name: string;
  companyId?: string;
  primaryContactId?: string;
  amount?: number;
  currency: string;
  stage: string;
  stageChangedAt?: Date;
  probability?: number;
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  closeReason?: string;
  dealType?: 'new-business' | 'expansion' | 'renewal' | 'upsell' | 'cross-sell';
  lostReason?: string;
  lostToCompetitor?: string;
  mrr?: number;
  arr?: number;
  contractTermMonths?: number;
  productsSold?: any[];
  customFields?: Record<string, any>;
  tags?: string[];
  ownerId?: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'task' | 'note' | 'sms' | 'whatsapp' | 'linkedin-message';
  subject?: string;
  body?: string;
  direction?: 'inbound' | 'outbound' | 'internal';
  contactId?: string;
  companyId?: string;
  dealId?: string;
  fromNumber?: string;
  toNumber?: string;
  durationSeconds?: number;
  callStatus?: 'completed' | 'no-answer' | 'busy' | 'failed' | 'voicemail' | 'cancelled';
  recordingUrl?: string;
  transcript?: string;
  transcriptSegments?: TranscriptSegment[];
  sentiment?: 'positive' | 'neutral' | 'negative' | 'mixed';
  sentimentScore?: number;
  sentimentAnalysis?: Record<string, any>;
  keywordsDetected?: string[];
  entitiesMentioned?: any[];
  aiSummary?: string;
  actionItems?: any[];
  objectionsRaised?: any[];
  buyingSignals?: any[];
  fromEmail?: string;
  toEmails?: string[];
  ccEmails?: string[];
  bccEmails?: string[];
  emailOpened: boolean;
  emailOpenedAt?: Date;
  emailClicked: boolean;
  emailClickedAt?: Date;
  emailBounced: boolean;
  emailBouncedReason?: string;
  meetingStartTime?: Date;
  meetingEndTime?: Date;
  meetingLocation?: string;
  meetingAttendees?: any[];
  meetingUrl?: string;
  taskStatus?: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  taskPriority?: 'low' | 'medium' | 'high' | 'urgent';
  taskDueDate?: Date;
  taskCompletedAt?: Date;
  costUsd?: number;
  externalId?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  createdBy?: string;
  assignedTo?: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  deletedAt?: Date;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: 'email-drip' | 'voice-outbound' | 'sms-blast' | 'whatsapp-campaign' | 'multi-channel';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  workflowGoal?: string;
  workflowConfig?: Record<string, any>;
  orchestrationExecutionId?: string;
  targetSegmentId?: string;
  targetCount: number;
  scheduledAt?: Date;
  launchedAt?: Date;
  completedAt?: Date;
  emailSubject?: string;
  emailBodyHtml?: string;
  emailBodyText?: string;
  emailFromName?: string;
  emailFromEmail?: string;
  emailReplyTo?: string;
  smsMessage?: string;
  voiceScript?: string;
  voiceAssistantConfig?: Record<string, any>;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  repliedCount: number;
  convertedCount: number;
  bouncedCount: number;
  unsubscribedCount: number;
  failedCount: number;
  openRate?: number;
  clickRate?: number;
  conversionRate?: number;
  totalCostUsd: number;
  tags?: string[];
  customFields?: Record<string, any>;
  createdBy?: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface VoiceCall {
  id: string;
  activityId?: string;
  platform: 'vapi' | 'twilio' | 'internal';
  externalCallId?: string;
  fromNumber: string;
  toNumber: string;
  status: 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'no-answer' | 'busy' | 'failed' | 'voicemail';
  initiatedAt?: Date;
  answeredAt?: Date;
  endedAt?: Date;
  durationSeconds?: number;
  assistantConfig?: Record<string, any>;
  sttProvider?: string;
  ttsProvider?: string;
  llmModel?: string;
  recordingUrl?: string;
  recordingDuration?: number;
  transcript?: string;
  transcriptLanguage?: string;
  sentimentOverall?: string;
  sentimentTimeline?: any[];
  keywordsDetected?: string[];
  topicsDiscussed?: any[];
  objectionsRaised?: any[];
  buyingSignals?: any[];
  actionItems?: any[];
  callOutcome?: string;
  dealScore?: number;
  costUsd?: number;
  costBreakdown?: Record<string, number>;
  metadata?: Record<string, any>;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface TranscriptSegment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateContactInput {
  companyId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  jobTitle?: string;
  department?: string;
  seniority?: string;
  leadSource?: string;
  ownerId?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface UpdateContactInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  jobTitle?: string;
  department?: string;
  seniority?: string;
  leadStatus?: string;
  leadScore?: number;
  lifecycleStage?: string;
  doNotCall?: boolean;
  doNotEmail?: boolean;
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface ContactFilter {
  companyId?: string;
  leadStatus?: string;
  ownerId?: string;
  tags?: string[];
  minLeadScore?: number;
  maxLeadScore?: number;
  search?: string;
}

export interface MakeCallInput {
  contactId?: string;
  toNumber: string;
  script: string;
  language?: string;
  voiceId?: string;
  model?: string;
  tools?: VoiceTool[];
}

export interface VoiceTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface CallResult {
  callId: string;
  status: string;
  message?: string;
}

export interface LaunchCampaignInput {
  campaignId: string;
  segmentId: string;
}

export interface CampaignLaunchResult {
  campaignId: string;
  jobsCreated: number;
  jobs: string[];
}

// ============================================================================
// Nexus Service Client Types
// ============================================================================

export interface OrchestrationGoal {
  goal: string;
  metadata?: Record<string, any>;
}

export interface OrchestrationResult {
  executionId: string;
  status: string;
  output?: any;
  duration?: number;
}

export interface MageReasonInput {
  task: string;
  context?: Record<string, any>;
  model?: string;
  temperature?: number;
  outputFormat?: string;
  schema?: Record<string, any>;
  tools?: string[];
}

export interface MageReasonOutput {
  output: any;
  confidence?: number;
  model?: string;
  tokensUsed?: number;
  cost?: number;
}

export interface GraphRAGSearchInput {
  query: string;
  collections?: string[];
  limit?: number;
  strategy?: 'semantic_chunks' | 'graph_traversal' | 'hybrid' | 'adaptive';
  rerank?: boolean;
}

export interface GraphRAGSearchResult {
  results: any[];
  totalFound: number;
}

// ============================================================================
// Event Types (for WebSocket)
// ============================================================================

export interface CRMEvent {
  type: string;
  entityType: 'contact' | 'company' | 'deal' | 'activity' | 'campaign';
  entityId: string;
  action: 'created' | 'updated' | 'deleted';
  data?: any;
  timestamp: Date;
  userId?: string;
  organizationId: string;
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface AuthUser {
  id: string;
  email: string;
  organizationId: string;
  role: string;
  permissions: string[];
}

export interface AuthContext {
  user: AuthUser;
  token: string;
}
