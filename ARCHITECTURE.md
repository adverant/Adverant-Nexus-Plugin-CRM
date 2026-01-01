# NexusCRM Architecture

Technical architecture and system design for the AI-powered CRM platform.

---

## System Overview

```mermaid
flowchart TB
    subgraph Client Layer
        A[Nexus Dashboard] --> B[API Gateway]
        C[Mobile App] --> B
        D[SDK Clients] --> B
    end

    subgraph NexusCRM Service
        B --> E[REST API Layer]
        E --> F[Lead Engine]
        E --> G[Deal Engine]
        E --> H[Voice Engine]
        E --> I[Campaign Engine]
        E --> J[Analytics Engine]
    end

    subgraph AI Services
        F --> K[MageAgent]
        G --> K
        H --> K
        I --> K
        F --> L[GraphRAG]
    end

    subgraph Data Layer
        F --> M[(PostgreSQL)]
        G --> M
        H --> M
        I --> M
        J --> M
        H --> N[(Call Recordings)]
    end
```

---

## Core Components

### 1. REST API Layer

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/leads` | POST | Create lead with AI scoring |
| `/api/v1/leads/:id` | GET | Get lead details |
| `/api/v1/leads/:id/score` | POST | Trigger AI scoring |
| `/api/v1/deals` | GET | List deals |
| `/api/v1/deals/:id/predict` | POST | Get AI prediction |
| `/api/v1/calls/outbound` | POST | Initiate call |
| `/api/v1/calls/:id/transcript` | GET | Get transcript |

### 2. Lead Engine

AI-powered lead management and scoring.

**Scoring Signals:**
- Firmographic fit (company size, industry)
- Demographic fit (title, seniority)
- Behavioral signals (engagement, intent)
- Technographic data
- External enrichment

### 3. Deal Engine

Predictive deal analytics and management.

**Prediction Model:**
```mermaid
flowchart LR
    A[Deal Data] --> E[Feature Engineering]
    B[Activity Data] --> E
    C[Communication Data] --> E
    D[Historical Patterns] --> E
    E --> F[Ensemble Model]
    F --> G[Win Probability]
    F --> H[Close Date Prediction]
    F --> I[Risk Factors]
```

### 4. Voice Engine

AI-powered calling with real-time transcription.

**Capabilities:**
- Real-time transcription
- Sentiment analysis
- Keyword detection
- Coaching prompts
- Call summarization

### 5. Campaign Engine

Multi-channel campaign orchestration.

**Channels:**
- Email
- SMS
- Voice
- LinkedIn
- Custom webhooks

### 6. Analytics Engine

Comprehensive CRM analytics.

**Metrics:**
- Pipeline velocity
- Win/loss analysis
- Rep performance
- Campaign effectiveness

---

## Data Model

```mermaid
erDiagram
    LEADS ||--o{ ACTIVITIES : has
    LEADS ||--o{ DEALS : converts_to
    DEALS ||--o{ ACTIVITIES : has
    DEALS ||--o{ PREDICTIONS : generates
    LEADS ||--o{ CAMPAIGNS : enrolled_in
    CALLS ||--o{ TRANSCRIPTS : has

    LEADS {
        string lead_id PK
        string first_name
        string last_name
        string email
        string company
        string title
        integer ai_score
        string grade
        jsonb enrichment
        timestamp created_at
    }

    DEALS {
        string deal_id PK
        string lead_id FK
        string name
        decimal value
        string stage
        date expected_close
        string owner_id
        jsonb metadata
    }

    PREDICTIONS {
        uuid prediction_id PK
        string deal_id FK
        decimal win_probability
        date predicted_close
        jsonb risk_factors
        jsonb accelerators
        decimal confidence
        timestamp generated_at
    }

    CALLS {
        uuid call_id PK
        string lead_id FK
        string deal_id FK
        string agent_id
        integer duration_seconds
        string recording_url
        string status
        timestamp started_at
    }

    TRANSCRIPTS {
        uuid transcript_id PK
        uuid call_id FK
        text content
        jsonb speakers
        jsonb sentiment
        jsonb topics
        jsonb action_items
    }

    ACTIVITIES {
        uuid activity_id PK
        string entity_type
        string entity_id
        string type
        jsonb data
        timestamp created_at
    }

    CAMPAIGNS {
        uuid campaign_id PK
        string name
        jsonb steps
        string status
        jsonb metrics
    }
```

---

## AI Model Architecture

### Lead Scoring Model

**Features:**
- Firmographic (20+ signals)
- Behavioral (email opens, web visits)
- Intent (content downloads, demo requests)
- Fit (ICP matching score)

**Model Stack:**
- Gradient Boosted Trees for scoring
- Neural network for behavior prediction
- Rule engine for explicit criteria

### Deal Prediction Model

**Input Signals:**
- Stage progression velocity
- Activity frequency
- Stakeholder engagement
- Email sentiment
- Call sentiment
- Competitor mentions
- Budget discussions

**Output:**
- Win probability (0-1)
- Predicted close date
- Confidence score
- Risk factors
- Recommended actions

---

## Security Model

### Authentication
- Bearer token via Nexus API Gateway
- Voice API uses signed tokens
- Webhook signature verification

### Authorization
- Role-based: Rep, Manager, Admin
- Territory-based access
- Record ownership enforcement

### Data Protection
- Call recordings encrypted
- PII masking in transcripts
- CCPA/GDPR compliance
- Data retention policies

```mermaid
flowchart LR
    A[Request] --> B{Valid Token?}
    B -->|No| C[401 Unauthorized]
    B -->|Yes| D{Record Access?}
    D -->|Own Record| E[Full Access]
    D -->|Team Record| F[Manager Check]
    D -->|Other| G[403 Forbidden]
    F -->|Is Manager| E
    F -->|Not Manager| G
```

---

## Deployment Architecture

### Kubernetes Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nexus-crm
  namespace: nexus-plugins
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nexus-crm
  template:
    spec:
      containers:
      - name: crm-api
        image: adverant/nexus-crm:1.0.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /live
            port: 8080
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
```

### Resource Allocation

| Component | CPU | Memory |
|-----------|-----|--------|
| API Server | 500m-1000m | 1Gi-2Gi |
| Voice Server | 1000m-2000m | 2Gi-4Gi |
| ML Server | 500m-1000m | 2Gi-4Gi |

---

## Integration Points

### Voice Providers

- Twilio (primary)
- Vonage (backup)
- Custom SIP trunks (enterprise)

### Email Providers

- SendGrid
- Mailgun
- Custom SMTP

### Event Bus

| Event | Payload | Subscribers |
|-------|---------|-------------|
| `crm.lead.created` | Lead data | Scoring, Campaigns |
| `crm.deal.updated` | Deal data | Predictions, Analytics |
| `crm.call.completed` | Call data | Transcription, Coaching |

---

## Performance

### Rate Limits

| Tier | Requests/min | Voice Minutes |
|------|--------------|---------------|
| Starter | 60 | 100/mo |
| Professional | 300 | 1,000/mo |
| Enterprise | Custom | Unlimited |

### Latency Targets

| Operation | Target | P99 |
|-----------|--------|-----|
| Lead Scoring | 200ms | 500ms |
| Deal Prediction | 300ms | 800ms |
| Call Transcription | Real-time | <2s delay |

---

## Monitoring

### Metrics (Prometheus)

```
# Lead metrics
crm_leads_created_total{source}
crm_lead_score_distribution{grade}

# Deal metrics
crm_deals_created_total{stage}
crm_deal_prediction_accuracy

# Voice metrics
crm_calls_total{direction, status}
crm_call_duration_seconds
```

### Alerting

| Alert | Condition | Severity |
|-------|-----------|----------|
| Lead Scoring Failure | >1% error rate | Critical |
| Voice Service Down | No calls in 10 min | Critical |
| Low Prediction Accuracy | <70% accuracy | Warning |

---

## Next Steps

- [Quick Start Guide](./QUICKSTART.md) - Get started quickly
- [Use Cases](./USE-CASES.md) - Implementation scenarios
- [API Reference](./docs/api-reference/endpoints.md) - Complete docs
