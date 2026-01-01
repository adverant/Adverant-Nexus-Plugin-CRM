# NexusCRM - Technical Documentation

## API Reference

### Base URL

```
https://api.adverant.ai/proxy/nexus-crm/api/v1/crm
```

### Authentication

All API requests require a Bearer token in the Authorization header:

```bash
Authorization: Bearer YOUR_API_KEY
```

#### Required Scopes

| Scope | Description |
|-------|-------------|
| `crm:read` | Read leads, deals, and contacts |
| `crm:write` | Create and modify CRM records |
| `crm:calls` | Access voice calling features |
| `crm:analytics` | Access analytics and predictions |

---

## API Endpoints

### Lead Management

#### Create Lead

```http
POST /leads
```

**Request Body:**

```json
{
  "email": "prospect@company.com",
  "name": "John Doe",
  "company": "Acme Corp",
  "title": "VP of Engineering",
  "phone": "+1-555-0123",
  "source": "website",
  "source_detail": "pricing_page",
  "custom_fields": {
    "industry": "Technology",
    "company_size": "100-500",
    "budget": "50000-100000"
  },
  "enableAIScoring": true
}
```

**Response:**

```json
{
  "leadId": "lead_abc123",
  "email": "prospect@company.com",
  "name": "John Doe",
  "company": "Acme Corp",
  "score": 85,
  "scoreBreakdown": {
    "behavioral": 90,
    "firmographic": 80,
    "intent": 85
  },
  "lifecycle_stage": "lead",
  "recommendedActions": [
    "Send personalized product demo invitation",
    "Add to high-intent nurture sequence"
  ],
  "created_at": "2025-01-15T10:00:00Z"
}
```

#### Get Lead Details

```http
GET /leads/:id
```

**Response:**

```json
{
  "leadId": "lead_abc123",
  "email": "prospect@company.com",
  "name": "John Doe",
  "company": "Acme Corp",
  "title": "VP of Engineering",
  "phone": "+1-555-0123",
  "source": "website",
  "score": 85,
  "scoreBreakdown": {
    "behavioral": 90,
    "firmographic": 80,
    "intent": 85,
    "engagement": 88
  },
  "lifecycle_stage": "opportunity",
  "owner": {
    "user_id": "user_xyz",
    "name": "Sarah Sales",
    "email": "sarah@company.com"
  },
  "activities": [
    {
      "type": "email_opened",
      "timestamp": "2025-01-14T15:30:00Z",
      "details": { "subject": "Product Demo Invitation" }
    },
    {
      "type": "page_viewed",
      "timestamp": "2025-01-14T15:35:00Z",
      "details": { "page": "/pricing" }
    }
  ],
  "deals": ["deal_def456"],
  "created_at": "2025-01-10T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

#### Trigger AI Lead Scoring

```http
POST /leads/:id/score
```

**Request Body:**

```json
{
  "scoring_model": "default | custom",
  "include_predictions": true,
  "factors": ["behavioral", "firmographic", "intent", "engagement"]
}
```

**Response:**

```json
{
  "leadId": "lead_abc123",
  "score": 85,
  "previous_score": 72,
  "score_change": 13,
  "scoreBreakdown": {
    "behavioral": {
      "score": 90,
      "signals": [
        { "signal": "Multiple pricing page visits", "impact": 15 },
        { "signal": "Demo video watched (100%)", "impact": 12 },
        { "signal": "Case study downloaded", "impact": 8 }
      ]
    },
    "firmographic": {
      "score": 80,
      "signals": [
        { "signal": "Company size matches ICP", "impact": 10 },
        { "signal": "Industry: Technology", "impact": 8 },
        { "signal": "Seniority: VP level", "impact": 7 }
      ]
    },
    "intent": {
      "score": 85,
      "signals": [
        { "signal": "Competitor research detected", "impact": 12 },
        { "signal": "Budget inquiry submitted", "impact": 10 }
      ]
    }
  },
  "predictions": {
    "conversion_probability": 0.72,
    "expected_deal_size": 75000,
    "optimal_contact_time": "Tuesday 10:00 AM EST",
    "recommended_channel": "phone"
  },
  "scored_at": "2025-01-15T10:30:00Z"
}
```

### Deal Management

#### List Deals

```http
GET /deals
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `stage` | string | Filter by deal stage |
| `owner_id` | string | Filter by deal owner |
| `min_value` | number | Minimum deal value |
| `max_value` | number | Maximum deal value |
| `sort` | string | Sort field (created_at, value, close_date) |
| `order` | string | Sort order (asc, desc) |
| `limit` | number | Results per page (max 100) |
| `offset` | number | Pagination offset |

**Response:**

```json
{
  "deals": [
    {
      "deal_id": "deal_def456",
      "name": "Acme Corp - Enterprise License",
      "value": 75000,
      "currency": "USD",
      "stage": "proposal",
      "probability": 60,
      "lead_id": "lead_abc123",
      "company": "Acme Corp",
      "owner": { "user_id": "user_xyz", "name": "Sarah Sales" },
      "expected_close_date": "2025-02-28",
      "created_at": "2025-01-10T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

#### Get AI Deal Prediction

```http
POST /deals/:id/predict
```

**Request Body:**

```json
{
  "include_factors": true,
  "include_recommendations": true
}
```

**Response:**

```json
{
  "deal_id": "deal_def456",
  "predictions": {
    "win_probability": 0.68,
    "confidence": 0.85,
    "predicted_close_date": "2025-02-25",
    "predicted_value": 72000,
    "value_range": { "low": 65000, "high": 85000 }
  },
  "risk_assessment": {
    "overall_risk": "medium",
    "risk_factors": [
      {
        "factor": "Competitor engagement detected",
        "impact": "high",
        "mitigation": "Schedule executive sponsor call"
      },
      {
        "factor": "Decision maker not engaged recently",
        "impact": "medium",
        "mitigation": "Send personalized value proposition"
      }
    ]
  },
  "recommendations": [
    {
      "action": "Schedule demo with technical team",
      "priority": "high",
      "expected_impact": "+8% win probability"
    },
    {
      "action": "Share customer case study in same industry",
      "priority": "medium",
      "expected_impact": "+5% win probability"
    }
  ],
  "similar_deals": {
    "won": 12,
    "lost": 5,
    "average_win_rate": 0.71,
    "average_cycle_days": 45
  },
  "predicted_at": "2025-01-15T10:30:00Z"
}
```

### Voice & Calling

#### Initiate Outbound Call

```http
POST /calls/outbound
```

**Request Body:**

```json
{
  "lead_id": "lead_abc123",
  "phone_number": "+1-555-0123",
  "caller_id": "+1-555-9999",
  "agent_config": {
    "voice": "professional_female",
    "language": "en-US",
    "script_id": "script_abc123",
    "recording_enabled": true
  },
  "context": {
    "purpose": "qualification",
    "talking_points": [
      "Confirm budget range",
      "Identify decision timeline",
      "Schedule demo"
    ],
    "lead_info": {
      "name": "John Doe",
      "company": "Acme Corp",
      "previous_interactions": ["email_opened", "pricing_page_viewed"]
    }
  }
}
```

**Response:**

```json
{
  "call_id": "call_ghi789",
  "status": "initiating",
  "lead_id": "lead_abc123",
  "estimated_wait": 5,
  "caller_id": "+1-555-9999",
  "created_at": "2025-01-15T10:30:00Z"
}
```

#### Get Call Transcript

```http
GET /calls/:id/transcript
```

**Response:**

```json
{
  "call_id": "call_ghi789",
  "lead_id": "lead_abc123",
  "duration_seconds": 420,
  "status": "completed",
  "recording_url": "https://storage.adverant.ai/calls/call_ghi789.mp3",
  "transcript": [
    {
      "speaker": "agent",
      "timestamp": 0,
      "text": "Hi John, this is calling from Acme Solutions...",
      "sentiment": "neutral"
    },
    {
      "speaker": "customer",
      "timestamp": 8,
      "text": "Hi, yes I was looking at your website earlier...",
      "sentiment": "positive"
    }
  ],
  "analysis": {
    "overall_sentiment": "positive",
    "sentiment_progression": [0.5, 0.6, 0.7, 0.8, 0.75],
    "key_topics": [
      { "topic": "pricing", "mentions": 3, "sentiment": "neutral" },
      { "topic": "integration", "mentions": 2, "sentiment": "positive" },
      { "topic": "timeline", "mentions": 1, "sentiment": "positive" }
    ],
    "action_items": [
      "Send pricing proposal",
      "Schedule technical demo for next week",
      "Connect with IT team lead"
    ],
    "objections_raised": [
      { "objection": "Budget concerns", "handled": true }
    ],
    "next_steps_agreed": [
      "Demo scheduled for Tuesday 2pm",
      "Pricing document to be sent"
    ]
  },
  "coaching_insights": [
    {
      "area": "Discovery questions",
      "rating": 8,
      "feedback": "Good use of open-ended questions"
    },
    {
      "area": "Objection handling",
      "rating": 7,
      "feedback": "Consider addressing budget concerns earlier"
    }
  ],
  "created_at": "2025-01-15T10:30:00Z"
}
```

---

## Rate Limits

| Tier | Leads/min | Deals/min | Calls/hour | Predictions/min |
|------|-----------|-----------|------------|-----------------|
| Starter | 30 | 30 | 10 | 10 |
| Professional | 100 | 100 | 50 | 50 |
| Enterprise | 500 | 500 | 200 | 200 |

---

## Data Models

### Lead

```typescript
interface Lead {
  leadId: string;
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  title?: string;
  phone?: string;
  source: string;
  source_detail?: string;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  lifecycle_stage: 'subscriber' | 'lead' | 'mql' | 'sql' | 'opportunity' | 'customer';
  owner?: UserReference;
  tags: string[];
  custom_fields: Record<string, unknown>;
  activities: Activity[];
  deals: string[];
  created_at: string;
  updated_at: string;
}

interface ScoreBreakdown {
  behavioral: number;
  firmographic: number;
  intent: number;
  engagement?: number;
}

interface Activity {
  type: string;
  timestamp: string;
  details: Record<string, unknown>;
}
```

### Deal

```typescript
interface Deal {
  deal_id: string;
  name: string;
  value: number;
  currency: string;
  stage: 'qualification' | 'discovery' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  probability: number;
  lead_id: string;
  company: string;
  contacts: Contact[];
  owner: UserReference;
  expected_close_date: string;
  actual_close_date?: string;
  notes: string;
  activities: Activity[];
  predictions?: DealPrediction;
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface DealPrediction {
  win_probability: number;
  confidence: number;
  predicted_close_date: string;
  predicted_value: number;
  risk_level: 'low' | 'medium' | 'high';
  predicted_at: string;
}
```

### Call

```typescript
interface Call {
  call_id: string;
  lead_id: string;
  deal_id?: string;
  direction: 'inbound' | 'outbound';
  status: 'initiating' | 'ringing' | 'in_progress' | 'completed' | 'failed' | 'no_answer';
  phone_number: string;
  caller_id: string;
  duration_seconds?: number;
  recording_url?: string;
  transcript?: TranscriptEntry[];
  analysis?: CallAnalysis;
  agent_id?: string;
  user_id?: string;
  created_at: string;
  ended_at?: string;
}

interface TranscriptEntry {
  speaker: 'agent' | 'customer';
  timestamp: number;
  text: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
}

interface CallAnalysis {
  overall_sentiment: string;
  sentiment_progression: number[];
  key_topics: TopicMention[];
  action_items: string[];
  objections_raised: Objection[];
  next_steps_agreed: string[];
}
```

---

## SDK Integration

### JavaScript/TypeScript

```typescript
import { NexusClient } from '@adverant/nexus-sdk';

const client = new NexusClient({
  apiKey: process.env.NEXUS_API_KEY
});

// Create a lead with AI scoring
const lead = await client.crm.leads.create({
  email: 'prospect@company.com',
  name: 'John Doe',
  company: 'Acme Corp',
  source: 'website',
  enableAIScoring: true
});

console.log(`Lead score: ${lead.score}`);
console.log(`Recommended actions:`, lead.recommendedActions);

// Get deal prediction
const prediction = await client.crm.deals.predict('deal_def456', {
  include_factors: true,
  include_recommendations: true
});

console.log(`Win probability: ${prediction.predictions.win_probability * 100}%`);

// Initiate outbound call
const call = await client.crm.calls.outbound({
  lead_id: lead.leadId,
  phone_number: '+1-555-0123',
  agent_config: {
    voice: 'professional_female',
    script_id: 'script_abc123',
    recording_enabled: true
  }
});

// Get call transcript after completion
const transcript = await client.crm.calls.transcript(call.call_id);
console.log('Action items:', transcript.analysis.action_items);
```

### Python

```python
from nexus_sdk import NexusClient

client = NexusClient(api_key=os.environ["NEXUS_API_KEY"])

# Create lead with scoring
lead = client.crm.leads.create(
    email="prospect@company.com",
    name="John Doe",
    company="Acme Corp",
    source="website",
    enable_ai_scoring=True
)

print(f"Lead score: {lead['score']}")
print(f"Behavioral: {lead['scoreBreakdown']['behavioral']}")

# Get deal prediction
prediction = client.crm.deals.predict(
    deal_id="deal_def456",
    include_factors=True,
    include_recommendations=True
)

print(f"Win probability: {prediction['predictions']['win_probability'] * 100:.1f}%")
for rec in prediction["recommendations"]:
    print(f"- {rec['action']} ({rec['expected_impact']})")

# Initiate voice call
call = client.crm.calls.outbound(
    lead_id=lead["leadId"],
    phone_number="+1-555-0123",
    agent_config={
        "voice": "professional_female",
        "script_id": "script_abc123"
    }
)
```

---

## Webhook Events

### Available Events

| Event | Description |
|-------|-------------|
| `lead.created` | New lead added |
| `lead.score_changed` | Lead score updated |
| `lead.stage_changed` | Lead lifecycle stage changed |
| `deal.created` | New deal created |
| `deal.stage_changed` | Deal stage updated |
| `deal.won` | Deal marked as won |
| `deal.lost` | Deal marked as lost |
| `call.started` | Call initiated |
| `call.completed` | Call ended |
| `call.transcribed` | Transcript ready |

---

## Error Handling

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `LEAD_NOT_FOUND` | 404 | Lead does not exist |
| `DEAL_NOT_FOUND` | 404 | Deal does not exist |
| `CALL_FAILED` | 400 | Call could not be initiated |
| `SCORING_FAILED` | 500 | AI scoring service error |
| `VOICE_MINUTES_EXCEEDED` | 402 | Voice quota exhausted |
| `LEADS_LIMIT_EXCEEDED` | 402 | Monthly leads limit reached |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

---

## Deployment Requirements

### Container Specifications

| Resource | Value |
|----------|-------|
| CPU | 1000m (1 core) |
| Memory | 2048 MB |
| Disk | 5 GB |
| Timeout | 300,000 ms (5 min) |
| Max Concurrent Jobs | 10 |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis for caching |
| `MAGEAGENT_URL` | Yes | MageAgent service URL |
| `GRAPHRAG_URL` | Yes | GraphRAG service URL |
| `VAPI_API_KEY` | Yes | VAPI voice API key |
| `DEEPGRAM_API_KEY` | Yes | Deepgram transcription key |

### Health Checks

| Endpoint | Purpose |
|----------|---------|
| `/health` | General health check |
| `/ready` | Readiness probe |
| `/live` | Liveness probe |

---

## Quotas and Limits

### By Pricing Tier

| Limit | Starter | Professional | Enterprise |
|-------|---------|--------------|------------|
| Seats | 3 | 15 | Unlimited |
| Leads/month | 1,000 | 10,000 | Unlimited |
| Voice Minutes | 100 | 1,000 | Unlimited |
| AI Lead Scoring | Basic | Advanced | Custom Models |
| Conversation Intelligence | - | Yes | Yes |
| Deal Predictions | - | Yes | Yes |
| Custom Integrations | - | - | Yes |

### Pricing

| Tier | Monthly | Annual |
|------|---------|--------|
| Starter | $49 | $490 |
| Professional | $149 | $1,490 |
| Enterprise | Custom | Custom |

---

## Support

- **Documentation**: [docs.adverant.ai/plugins/nexus-crm](https://docs.adverant.ai/plugins/nexus-crm)
- **Discord**: [discord.gg/adverant](https://discord.gg/adverant)
- **Email**: support@adverant.ai
- **GitHub Issues**: [Report a bug](https://github.com/adverant/Adverant-Nexus-Plugin-CRM/issues)
