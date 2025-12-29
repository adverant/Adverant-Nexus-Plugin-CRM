import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface Config {
  // Service
  nodeEnv: string;
  port: number;
  wsPort: number;
  serviceName: string;

  // PostgreSQL (shared with GraphRAG)
  postgres: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };

  // Redis (shared)
  redis: {
    host: string;
    port: number;
    password: string;
  };

  // Existing Nexus Services (REUSE)
  services: {
    orchestrationAgent: string;
    mageAgent: string;
    graphRAG: string;
    geoAgent: string;
    videoAgent: string;
    fileProcessAgent: string;
    learningAgent: string;
    auth: string;
    analytics: string;
    billing: string;
    apiGateway: string;
  };

  // Voice AI (NEW)
  voice: {
    vapiApiKey: string;
    vapiPhoneNumber: string;
    vapiWebhookSecret: string;
    twilioAccountSid: string;
    twilioAuthToken: string;
    twilioPhoneNumber: string;
    deepgramApiKey: string;
    elevenLabsApiKey: string;
  };

  // Communication Services (NEW)
  communication: {
    sendgridApiKey: string;
    sendgridFromEmail: string;
    sendgridFromName: string;
    awsSesRegion: string;
    awsSesAccessKeyId: string;
    awsSesSecretAccessKey: string;
    awsSesFromEmail: string;
  };

  // Rate Limiting
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };

  // Logging
  logging: {
    level: string;
    format: string;
  };

  // CORS
  cors: {
    origins: string[];
  };

  // JWT (from Auth Service)
  jwt: {
    secret: string;
    expiry: string;
  };

  // Feature Flags
  features: {
    enableVoiceCalling: boolean;
    enableEmailCampaigns: boolean;
    enableSmsCampaigns: boolean;
    enableWhatsapp: boolean;
    enableVideoAnalysis: boolean;
    enableGeospatialCrm: boolean;
  };
}

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return parsed;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

export const config: Config = {
  // Service
  nodeEnv: getEnv('NODE_ENV', 'development'),
  port: getEnvNumber('PORT', 9125),
  wsPort: getEnvNumber('WS_PORT', 9126),
  serviceName: getEnv('SERVICE_NAME', 'nexus-crm'),

  // PostgreSQL (shared with GraphRAG)
  postgres: {
    host: getEnv('POSTGRES_HOST', 'nexus-postgres'),
    port: getEnvNumber('POSTGRES_PORT', 5432),
    user: getEnv('POSTGRES_USER', 'nexus'),
    password: getEnv('POSTGRES_PASSWORD'),
    database: getEnv('POSTGRES_DB', 'nexusdb'),
    max: getEnvNumber('POSTGRES_MAX_CONNECTIONS', 20),
    idleTimeoutMillis: getEnvNumber('POSTGRES_IDLE_TIMEOUT', 30000),
    connectionTimeoutMillis: getEnvNumber('POSTGRES_CONNECTION_TIMEOUT', 5000),
  },

  // Redis (shared)
  redis: {
    host: getEnv('REDIS_HOST', 'nexus-redis'),
    port: getEnvNumber('REDIS_PORT', 6379),
    password: getEnv('REDIS_PASSWORD', ''),
  },

  // Existing Nexus Services (REUSE)
  services: {
    orchestrationAgent: getEnv('ORCHESTRATION_AGENT_URL', 'http://nexus-orchestration:9109'),
    mageAgent: getEnv('MAGE_AGENT_URL', 'http://nexus-mageagent:9080'),
    graphRAG: getEnv('GRAPHRAG_URL', 'http://nexus-graphrag:9090'),
    geoAgent: getEnv('GEO_AGENT_URL', 'http://nexus-geoagent:9103'),
    videoAgent: getEnv('VIDEO_AGENT_URL', 'http://nexus-videoagent:9200'),
    fileProcessAgent: getEnv('FILE_PROCESS_AGENT_URL', 'http://nexus-fileprocess:9096'),
    learningAgent: getEnv('LEARNING_AGENT_URL', 'http://nexus-learningagent:9097'),
    auth: getEnv('AUTH_SERVICE_URL', 'http://nexus-auth:9101'),
    analytics: getEnv('ANALYTICS_URL', 'http://nexus-analytics-worker:9098'),
    billing: getEnv('BILLING_URL', 'http://nexus-billing:9106'),
    apiGateway: getEnv('API_GATEWAY_URL', 'http://nexus-gateway:9092'),
  },

  // Voice AI (NEW)
  voice: {
    vapiApiKey: getEnv('VAPI_API_KEY', ''),
    vapiPhoneNumber: getEnv('VAPI_PHONE_NUMBER', ''),
    vapiWebhookSecret: getEnv('VAPI_WEBHOOK_SECRET', ''),
    twilioAccountSid: getEnv('TWILIO_ACCOUNT_SID', ''),
    twilioAuthToken: getEnv('TWILIO_AUTH_TOKEN', ''),
    twilioPhoneNumber: getEnv('TWILIO_PHONE_NUMBER', ''),
    deepgramApiKey: getEnv('DEEPGRAM_API_KEY', ''),
    elevenLabsApiKey: getEnv('ELEVENLABS_API_KEY', ''),
  },

  // Communication Services (NEW)
  communication: {
    sendgridApiKey: getEnv('SENDGRID_API_KEY', ''),
    sendgridFromEmail: getEnv('SENDGRID_FROM_EMAIL', ''),
    sendgridFromName: getEnv('SENDGRID_FROM_NAME', 'NexusCRM'),
    awsSesRegion: getEnv('AWS_SES_REGION', 'us-east-1'),
    awsSesAccessKeyId: getEnv('AWS_SES_ACCESS_KEY_ID', ''),
    awsSesSecretAccessKey: getEnv('AWS_SES_SECRET_ACCESS_KEY', ''),
    awsSesFromEmail: getEnv('AWS_SES_FROM_EMAIL', ''),
  },

  // Rate Limiting
  rateLimit: {
    windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 60000),
    maxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  },

  // Logging
  logging: {
    level: getEnv('LOG_LEVEL', 'info'),
    format: getEnv('LOG_FORMAT', 'json'),
  },

  // CORS
  cors: {
    origins: getEnv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001,http://localhost:3002').split(','),
  },

  // JWT (from Auth Service)
  jwt: {
    secret: getEnv('JWT_SECRET'),
    expiry: getEnv('JWT_EXPIRY', '24h'),
  },

  // Feature Flags
  features: {
    enableVoiceCalling: getEnvBoolean('ENABLE_VOICE_CALLING', true),
    enableEmailCampaigns: getEnvBoolean('ENABLE_EMAIL_CAMPAIGNS', true),
    enableSmsCampaigns: getEnvBoolean('ENABLE_SMS_CAMPAIGNS', true),
    enableWhatsapp: getEnvBoolean('ENABLE_WHATSAPP', true),
    enableVideoAnalysis: getEnvBoolean('ENABLE_VIDEO_ANALYSIS', true),
    enableGeospatialCrm: getEnvBoolean('ENABLE_GEOSPATIAL_CRM', true),
  },
};

export default config;
