# NexusCRM Quick Start Guide

**AI-powered CRM with lead scoring and conversation intelligence** - Streamline your sales pipeline with intelligent lead prioritization, automated follow-ups, and deal forecasting.

---

## The NexusCRM Advantage

| Feature | Traditional CRM | NexusCRM |
|---------|-----------------|----------|
| Lead Scoring | Manual/rules-based | AI-powered predictions |
| Follow-up Timing | Manual scheduling | Intelligent automation |
| Deal Forecasting | Spreadsheet estimates | ML-based predictions |
| Call Analysis | Manual review | Automated transcription & insights |

**Results vary based on sales process, team size, and implementation.**

---

## Prerequisites

| Requirement | Minimum | Purpose |
|-------------|---------|---------|
| Nexus Platform | v1.0.0+ | Plugin runtime |
| Node.js | v20+ | SDK (TypeScript) |
| Python | v3.9+ | SDK (Python) |
| API Key | - | Authentication |

---

## Installation (Choose Your Method)

### Method 1: Nexus Marketplace (Recommended)

1. Navigate to **Marketplace** in your Nexus Dashboard
2. Search for "NexusCRM"
3. Click **Install** and select your tier
4. The plugin activates automatically within 60 seconds

### Method 2: Nexus CLI

```bash
nexus plugin install nexus-crm
nexus config set CRM_API_KEY your-api-key-here
```

### Method 3: Direct API

```bash
curl -X POST "https://api.adverant.ai/v1/plugins/install" \
  -H "Authorization: Bearer YOUR_NEXUS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "pluginId": "nexus-crm",
    "tier": "professional",
    "autoActivate": true
  }'
```

---

## Your First 5 Minutes: Create an AI-Scored Lead

### Step 1: Set Your API Key

```bash
export NEXUS_API_KEY="your-api-key-here"
```

### Step 2: Create a Lead with AI Scoring

```bash
curl -X POST "https://api.adverant.ai/proxy/nexus-crm/api/v1/leads" \
  -H "Authorization: Bearer $NEXUS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Sarah",
    "lastName": "Chen",
    "email": "sarah.chen@techcorp.com",
    "company": "TechCorp Industries",
    "title": "VP of Engineering",
    "source": "webinar",
    "enableAIScoring": true
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leadId": "lead_Abc123Xyz",
    "name": "Sarah Chen",
    "company": "TechCorp Industries",
    "aiScore": {
      "score": 87,
      "grade": "A",
      "signals": [
        "VP-level decision maker (+25)",
        "Tech industry - ideal ICP (+20)",
        "Webinar attendee - high intent (+15)",
        "Company size 500-1000 (+12)",
        "Recent funding round (+15)"
      ],
      "nextBestActions": [
        "Send personalized demo invitation",
        "Connect on LinkedIn",
        "Share relevant case study"
      ],
      "predictedConversion": 0.72
    },
    "createdAt": "2026-01-01T10:00:00Z"
  }
}
```

---

## Core API Endpoints

**Base URL:** `https://api.adverant.ai/proxy/nexus-crm/api/v1`

### Lead Management

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| `POST` | `/leads` | Create lead with AI scoring | 300/min |
| `GET` | `/leads/:id` | Get lead details | 300/min |
| `POST` | `/leads/:id/score` | Trigger AI lead scoring | 100/min |
| `PUT` | `/leads/:id` | Update lead | 300/min |

### Deal Management

```bash
# Get deal with AI prediction
curl -X POST "https://api.adverant.ai/proxy/nexus-crm/api/v1/deals/deal_789/predict" \
  -H "Authorization: Bearer $NEXUS_API_KEY"
```

**Response:**
```json
{
  "dealId": "deal_789",
  "name": "TechCorp Enterprise License",
  "value": 125000,
  "aiPrediction": {
    "winProbability": 0.68,
    "confidence": 0.85,
    "predictedCloseDate": "2026-02-15",
    "riskFactors": [
      "No executive sponsor identified",
      "Competitor mentioned in last call"
    ],
    "accelerators": [
      "Strong technical fit",
      "Budget confirmed",
      "Clear timeline"
    ],
    "recommendations": [
      "Schedule executive briefing",
      "Prepare competitive differentiation deck"
    ]
  }
}
```

### Voice AI

```bash
# Initiate AI-powered outbound call
curl -X POST "https://api.adverant.ai/proxy/nexus-crm/api/v1/calls/outbound" \
  -H "Authorization: Bearer $NEXUS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "lead_Abc123Xyz",
    "agentId": "rep_456",
    "enableTranscription": true,
    "enableCoaching": true
  }'
```

---

## SDK Examples

### TypeScript/JavaScript

```bash
npm install @adverant/nexus-sdk
```

```typescript
import { NexusClient } from '@adverant/nexus-sdk';

const nexus = new NexusClient({
  apiKey: process.env.NEXUS_API_KEY!
});

const crm = nexus.plugin('nexus-crm');

// Create and score a lead
const lead = await crm.leads.create({
  firstName: 'Sarah',
  lastName: 'Chen',
  email: 'sarah.chen@techcorp.com',
  company: 'TechCorp Industries',
  title: 'VP of Engineering',
  enableAIScoring: true
});

console.log(`Lead Score: ${lead.aiScore.score} (${lead.aiScore.grade})`);
console.log(`Predicted Conversion: ${lead.aiScore.predictedConversion * 100}%`);

// Get deal prediction
const prediction = await crm.deals.predict({
  dealId: 'deal_789'
});

console.log(`Win Probability: ${prediction.winProbability * 100}%`);
console.log('Risk Factors:', prediction.riskFactors);

// Analyze a call
const callAnalysis = await crm.calls.analyze({
  callId: 'call_123'
});

console.log(`Talk Ratio: ${callAnalysis.talkRatio}`);
console.log(`Key Topics:`, callAnalysis.topics);
console.log(`Action Items:`, callAnalysis.actionItems);
```

### Python

```bash
pip install nexus-sdk
```

```python
import os
from nexus_sdk import NexusClient

client = NexusClient(api_key=os.environ["NEXUS_API_KEY"])
crm = client.plugin("nexus-crm")

# Create and score a lead
lead = crm.leads.create(
    first_name="Sarah",
    last_name="Chen",
    email="sarah.chen@techcorp.com",
    company="TechCorp Industries",
    title="VP of Engineering",
    enable_ai_scoring=True
)

print(f"Lead Score: {lead.ai_score.score} ({lead.ai_score.grade})")
print(f"Signals: {lead.ai_score.signals}")

# Get conversation intelligence
transcript = crm.calls.get_transcript(call_id="call_123")
analysis = crm.calls.analyze(call_id="call_123")

print(f"Sentiment: {analysis.sentiment}")
print(f"Objections: {analysis.objections}")
print(f"Next Steps: {analysis.next_steps}")
```

---

## Pricing

| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| **Monthly Price** | $49 | $149 | Custom |
| **Seats** | 3 | 15 | Unlimited |
| **Leads/Month** | 1,000 | 10,000 | Unlimited |
| **Voice Minutes** | 100 | 1,000 | Unlimited |
| **Lead Scoring** | Basic | Advanced | Custom Models |
| **Conversation Intelligence** | - | Yes | Yes |
| **Deal Predictions** | - | Yes | Yes |
| **Multi-Channel Campaigns** | - | Yes | Yes |
| **API Access** | Limited | Full | Full |

**14-day free trial. No credit card required.**

[Start Free Trial](https://marketplace.adverant.ai/plugins/nexus-crm)

---

## Rate Limits

| Tier | Requests/Minute | Voice Minutes/Month | Timeout |
|------|-----------------|---------------------|---------|
| Starter | 60 | 100 | 60s |
| Professional | 300 | 1,000 | 300s |
| Enterprise | Custom | Unlimited | Custom |

---

## Next Steps

1. **[Use Cases Guide](./USE-CASES.md)** - 5 detailed sales optimization scenarios
2. **[Architecture Overview](./ARCHITECTURE.md)** - System design and AI models
3. **[API Reference](./docs/api-reference/endpoints.md)** - Complete endpoint documentation

---

## Support

| Channel | Response Time | Availability |
|---------|---------------|--------------|
| **Documentation** | Instant | [docs.adverant.ai/plugins/crm](https://docs.adverant.ai/plugins/crm) |
| **Community Forum** | < 4 hours | [community.adverant.ai](https://community.adverant.ai) |
| **Email Support** | < 24 hours | plugins@adverant.ai |
| **Priority Support** | < 1 hour | Enterprise only |

---

*NexusCRM is built and maintained by [Adverant](https://adverant.ai) - Verified Nexus Plugin Developer*
