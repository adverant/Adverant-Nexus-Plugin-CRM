import { gql } from 'apollo-server-express';

/**
 * NexusCRM GraphQL Schema
 *
 * Provides unified API for CRM operations, voice calling, campaigns,
 * and multi-channel communication.
 */
export const typeDefs = gql`
  # ============================================================================
  # Core CRM Types
  # ============================================================================

  type Contact {
    id: ID!
    companyId: ID
    company: Company
    firstName: String
    lastName: String
    fullName: String
    email: String
    emailVerified: Boolean!
    phone: String
    phoneVerified: Boolean!
    mobile: String
    jobTitle: String
    department: String
    seniority: Seniority
    decisionMaker: Boolean!
    linkedinUrl: String
    twitterHandle: String
    address: Address
    timezone: String
    language: String!
    leadScore: Int!
    leadStatus: LeadStatus!
    leadSource: String
    lifecycleStage: LifecycleStage
    doNotCall: Boolean!
    doNotEmail: Boolean!
    unsubscribed: Boolean!
    unsubscribedAt: DateTime
    bounced: Boolean!
    bouncedAt: DateTime
    enrichmentData: JSON
    enrichmentSource: String
    enrichmentConfidence: Float
    enrichedAt: DateTime
    tags: [String!]
    customFields: JSON
    ownerId: ID
    owner: User
    organizationId: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    lastContactedAt: DateTime
    lastScoredAt: DateTime
    activities: [Activity!]
    deals: [Deal!]
  }

  type Company {
    id: ID!
    name: String!
    domain: String
    industry: String
    size: String
    revenueRange: String
    employeeCount: Int
    foundedYear: Int
    description: String
    website: String
    phone: String
    address: Address
    socialLinks: JSON
    enrichmentData: JSON
    enrichmentSource: String
    enrichmentConfidence: Float
    enrichedAt: DateTime
    tags: [String!]
    customFields: JSON
    ownerId: ID
    owner: User
    organizationId: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    contacts: [Contact!]
    deals: [Deal!]
  }

  type Deal {
    id: ID!
    name: String!
    companyId: ID
    company: Company
    primaryContactId: ID
    primaryContact: Contact
    amount: Float
    currency: String!
    stage: String!
    stageChangedAt: DateTime
    probability: Float
    expectedCloseDate: DateTime
    actualCloseDate: DateTime
    closeReason: String
    dealType: DealType
    lostReason: String
    lostToCompetitor: String
    mrr: Float
    arr: Float
    contractTermMonths: Int
    productsSold: [JSON!]
    customFields: JSON
    tags: [String!]
    ownerId: ID
    owner: User
    organizationId: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    activities: [Activity!]
  }

  type Activity {
    id: ID!
    type: ActivityType!
    subject: String
    body: String
    direction: Direction
    contactId: ID
    contact: Contact
    companyId: ID
    company: Company
    dealId: ID
    deal: Deal
    fromNumber: String
    toNumber: String
    durationSeconds: Int
    callStatus: CallStatus
    recordingUrl: String
    transcript: String
    transcriptSegments: [TranscriptSegment!]
    sentiment: Sentiment
    sentimentScore: Float
    sentimentAnalysis: JSON
    keywordsDetected: [String!]
    entitiesMentioned: [JSON!]
    aiSummary: String
    actionItems: [JSON!]
    objectionsRaised: [JSON!]
    buyingSignals: [JSON!]
    fromEmail: String
    toEmails: [String!]
    ccEmails: [String!]
    bccEmails: [String!]
    emailOpened: Boolean!
    emailOpenedAt: DateTime
    emailClicked: Boolean!
    emailClickedAt: DateTime
    emailBounced: Boolean!
    emailBouncedReason: String
    meetingStartTime: DateTime
    meetingEndTime: DateTime
    meetingLocation: String
    meetingAttendees: [JSON!]
    meetingUrl: String
    taskStatus: TaskStatus
    taskPriority: TaskPriority
    taskDueDate: DateTime
    taskCompletedAt: DateTime
    costUsd: Float
    externalId: String
    metadata: JSON
    tags: [String!]
    createdBy: ID
    creator: User
    assignedTo: ID
    assignee: User
    organizationId: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    completedAt: DateTime
  }

  type Campaign {
    id: ID!
    name: String!
    description: String
    type: CampaignType!
    status: CampaignStatus!
    workflowGoal: String
    workflowConfig: JSON
    orchestrationExecutionId: ID
    targetSegmentId: ID
    targetCount: Int!
    scheduledAt: DateTime
    launchedAt: DateTime
    completedAt: DateTime
    emailSubject: String
    emailBodyHtml: String
    emailBodyText: String
    emailFromName: String
    emailFromEmail: String
    emailReplyTo: String
    smsMessage: String
    voiceScript: String
    voiceAssistantConfig: JSON
    sentCount: Int!
    deliveredCount: Int!
    openedCount: Int!
    clickedCount: Int!
    repliedCount: Int!
    convertedCount: Int!
    bouncedCount: Int!
    unsubscribedCount: Int!
    failedCount: Int!
    openRate: Float
    clickRate: Float
    conversionRate: Float
    totalCostUsd: Float!
    tags: [String!]
    customFields: JSON
    createdBy: ID
    creator: User
    organizationId: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type VoiceCall {
    id: ID!
    activityId: ID
    activity: Activity
    platform: VoicePlatform!
    externalCallId: String
    fromNumber: String!
    toNumber: String!
    status: VoiceCallStatus!
    initiatedAt: DateTime
    answeredAt: DateTime
    endedAt: DateTime
    durationSeconds: Int
    assistantConfig: JSON
    sttProvider: String
    ttsProvider: String
    llmModel: String
    recordingUrl: String
    recordingDuration: Int
    transcript: String
    transcriptLanguage: String
    sentimentOverall: String
    sentimentTimeline: [JSON!]
    keywordsDetected: [String!]
    topicsDiscussed: [JSON!]
    objectionsRaised: [JSON!]
    buyingSignals: [JSON!]
    actionItems: [JSON!]
    callOutcome: String
    dealScore: Float
    costUsd: Float
    costBreakdown: JSON
    metadata: JSON
    organizationId: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # ============================================================================
  # Supporting Types
  # ============================================================================

  type Address {
    street: String
    city: String
    state: String
    country: String
    postalCode: String
    coordinates: Coordinates
  }

  type Coordinates {
    lat: Float!
    lng: Float!
  }

  type TranscriptSegment {
    speaker: String!
    text: String!
    startTime: Float!
    endTime: Float!
  }

  type User {
    id: ID!
    email: String!
    role: String!
    organizationId: ID!
  }

  # ============================================================================
  # Enums
  # ============================================================================

  enum Seniority {
    IC
    Manager
    Director
    VP
    C_Level
    Owner
  }

  enum LeadStatus {
    new
    contacted
    qualified
    unqualified
    customer
    churned
    unsubscribed
  }

  enum LifecycleStage {
    subscriber
    lead
    mql
    sql
    opportunity
    customer
    evangelist
  }

  enum ActivityType {
    call
    email
    meeting
    task
    note
    sms
    whatsapp
    linkedin_message
  }

  enum Direction {
    inbound
    outbound
    internal
  }

  enum CallStatus {
    completed
    no_answer
    busy
    failed
    voicemail
    cancelled
  }

  enum Sentiment {
    positive
    neutral
    negative
    mixed
  }

  enum TaskStatus {
    pending
    in_progress
    completed
    cancelled
  }

  enum TaskPriority {
    low
    medium
    high
    urgent
  }

  enum DealType {
    new_business
    expansion
    renewal
    upsell
    cross_sell
  }

  enum CampaignType {
    email_drip
    voice_outbound
    sms_blast
    whatsapp_campaign
    multi_channel
  }

  enum CampaignStatus {
    draft
    scheduled
    active
    paused
    completed
    cancelled
  }

  enum VoicePlatform {
    vapi
    twilio
    internal
  }

  enum VoiceCallStatus {
    initiated
    ringing
    in_progress
    completed
    no_answer
    busy
    failed
    voicemail
  }

  # ============================================================================
  # Input Types
  # ============================================================================

  input CreateContactInput {
    companyId: ID
    firstName: String
    lastName: String
    email: String
    phone: String
    mobile: String
    jobTitle: String
    department: String
    seniority: Seniority
    leadSource: String
    ownerId: ID
    tags: [String!]
    customFields: JSON
  }

  input UpdateContactInput {
    firstName: String
    lastName: String
    email: String
    phone: String
    mobile: String
    jobTitle: String
    department: String
    seniority: Seniority
    leadStatus: LeadStatus
    leadScore: Int
    lifecycleStage: LifecycleStage
    doNotCall: Boolean
    doNotEmail: Boolean
    tags: [String!]
    customFields: JSON
  }

  input ContactFilterInput {
    companyId: ID
    leadStatus: LeadStatus
    lifecycleStage: LifecycleStage
    ownerId: ID
    tags: [String!]
    minLeadScore: Int
    maxLeadScore: Int
    search: String
  }

  input MakeCallInput {
    contactId: ID
    toNumber: String!
    script: String!
    language: String
    voiceId: String
    model: String
    tools: [VoiceToolInput!]
  }

  input VoiceToolInput {
    name: String!
    description: String!
    parameters: JSON!
  }

  input LaunchCampaignInput {
    campaignId: ID!
    segmentId: ID!
  }

  input AddressInput {
    street: String
    city: String
    state: String
    country: String
    postalCode: String
    coordinates: CoordinatesInput
  }

  input CoordinatesInput {
    lat: Float!
    lng: Float!
  }

  # ============================================================================
  # Scalars
  # ============================================================================

  scalar DateTime
  scalar JSON

  # ============================================================================
  # Queries
  # ============================================================================

  type Query {
    # Contact queries
    contact(id: ID!): Contact
    contacts(filter: ContactFilterInput, limit: Int, offset: Int): [Contact!]!
    contactsCount(filter: ContactFilterInput): Int!

    # Company queries
    company(id: ID!): Company
    companies(search: String, limit: Int, offset: Int): [Company!]!

    # Deal queries
    deal(id: ID!): Deal
    deals(stage: String, ownerId: ID, limit: Int, offset: Int): [Deal!]!

    # Activity queries
    activity(id: ID!): Activity
    activities(
      contactId: ID
      companyId: ID
      dealId: ID
      type: ActivityType
      limit: Int
      offset: Int
    ): [Activity!]!

    # Campaign queries
    campaign(id: ID!): Campaign
    campaigns(status: CampaignStatus, limit: Int, offset: Int): [Campaign!]!

    # Voice call queries
    voiceCall(id: ID!): VoiceCall
    voiceCalls(status: VoiceCallStatus, limit: Int, offset: Int): [VoiceCall!]!

    # Health check
    health: HealthStatus!
  }

  type HealthStatus {
    status: String!
    services: ServicesHealth!
    timestamp: DateTime!
  }

  type ServicesHealth {
    orchestration: Boolean!
    mage: Boolean!
    graphRAG: GraphRAGHealth!
    geo: Boolean!
    auth: Boolean!
  }

  type GraphRAGHealth {
    postgres: Boolean!
    neo4j: Boolean!
    qdrant: Boolean!
  }

  # ============================================================================
  # Mutations
  # ============================================================================

  type Mutation {
    # Contact mutations
    createContact(input: CreateContactInput!): Contact!
    updateContact(id: ID!, input: UpdateContactInput!): Contact!
    deleteContact(id: ID!): Boolean!
    enrichContact(id: ID!): Contact!

    # Voice calling mutations
    makeCall(input: MakeCallInput!): CallResult!
    cancelCall(callId: ID!): Boolean!

    # Campaign mutations
    launchCampaign(input: LaunchCampaignInput!): CampaignLaunchResult!
    pauseCampaign(campaignId: ID!): Campaign!
    resumeCampaign(campaignId: ID!): Campaign!
    cancelCampaign(campaignId: ID!): Campaign!
  }

  type CallResult {
    callId: ID!
    status: String!
    message: String
  }

  type CampaignLaunchResult {
    campaignId: ID!
    jobsCreated: Int!
    jobs: [ID!]!
  }
`;

export default typeDefs;
