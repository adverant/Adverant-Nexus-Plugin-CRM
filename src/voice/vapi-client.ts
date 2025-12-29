import axios, { AxiosInstance } from 'axios';
import config from '../config';
import { logger } from '../utils/logger';

/**
 * Vapi Client
 *
 * Provides interface to Vapi.ai for AI-powered voice calling.
 *
 * Vapi offers:
 * - Low-latency voice AI (<300ms)
 * - Function calling capabilities
 * - Multiple TTS/STT providers (ElevenLabs, Deepgram, etc.)
 * - Real-time transcription and analysis
 * - Webhook events for call lifecycle
 *
 * Cost: ~$0.05/min base + STT/TTS/LLM usage
 */

export interface VapiAssistant {
  name: string;
  voice: {
    provider: 'elevenlabs' | '11labs' | 'deepgram' | 'openai' | 'azure';
    voiceId: string;
    model?: string;
  };
  model: {
    provider: 'openai' | 'anthropic' | 'together-ai';
    model: string;
    temperature?: number;
    systemPrompt: string;
    functions?: VapiFunction[];
  };
  firstMessage?: string;
  endCallMessage?: string;
  recordingEnabled?: boolean;
  transcriptionProvider?: 'deepgram' | 'assemblyai';
  maxDurationSeconds?: number;
}

export interface VapiFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  url?: string; // Webhook URL to call when function is invoked
}

export interface VapiCallRequest {
  phoneNumber: string;
  assistant: VapiAssistant;
  metadata?: Record<string, any>;
}

export interface VapiCallResponse {
  id: string;
  status: string;
  phoneNumber: string;
  startedAt?: string;
  endedAt?: string;
  cost?: number;
  transcript?: string;
}

/**
 * Vapi API Client
 */
export class VapiClient {
  private client: AxiosInstance;
  private apiKey: string;
  private phoneNumber: string;

  constructor() {
    this.apiKey = config.voice.vapiApiKey;
    this.phoneNumber = config.voice.vapiPhoneNumber;

    if (!this.apiKey) {
      logger.warn('Vapi API key not configured - voice calling will not work');
    }

    this.client = axios.create({
      baseURL: 'https://api.vapi.ai',
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Vapi API request', {
          method: config.method,
          url: config.url,
        });
        return config;
      },
      (error) => {
        logger.error('Vapi API request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Vapi API response', {
          status: response.status,
        });
        return response;
      },
      (error) => {
        logger.error('Vapi API response error', {
          error: error.message,
          response: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Make an outbound call
   *
   * Example:
   * ```typescript
   * const call = await vapiClient.makeCall({
   *   phoneNumber: '+66812345678',
   *   assistant: {
   *     name: 'Property Rental Agent',
   *     voice: {
   *       provider: 'elevenlabs',
   *       voiceId: 'pNInz6obpgDQGcFmaJgB' // Adam
   *     },
   *     model: {
   *       provider: 'openai',
   *       model: 'gpt-4o',
   *       temperature: 0.7,
   *       systemPrompt: 'You are calling to verify property rental availability...',
   *       functions: [...]
   *     },
   *     firstMessage: 'Hello, I'm calling about the property listing...'
   *   },
   *   metadata: { contactId: 'contact_123', campaignId: 'campaign_456' }
   * });
   * ```
   */
  async makeCall(request: VapiCallRequest): Promise<VapiCallResponse> {
    try {
      if (!this.apiKey) {
        throw new Error('Vapi API key not configured');
      }

      logger.info('Making outbound call via Vapi', {
        phoneNumber: request.phoneNumber,
        assistant: request.assistant.name,
      });

      const response = await this.client.post('/call', {
        phoneNumberId: this.phoneNumber,
        customer: {
          number: request.phoneNumber,
        },
        assistant: request.assistant,
        metadata: request.metadata || {},
      });

      logger.info('Call initiated', {
        callId: response.data.id,
        status: response.data.status,
      });

      return {
        id: response.data.id,
        status: response.data.status,
        phoneNumber: request.phoneNumber,
        startedAt: response.data.startedAt,
        endedAt: response.data.endedAt,
        cost: response.data.cost,
        transcript: response.data.transcript,
      };
    } catch (error: any) {
      logger.error('Failed to make call', {
        error: error.message,
        phoneNumber: request.phoneNumber,
      });
      throw new Error(`Failed to make call: ${error.message}`);
    }
  }

  /**
   * Get call details
   */
  async getCall(callId: string): Promise<VapiCallResponse> {
    try {
      const response = await this.client.get(`/call/${callId}`);

      return {
        id: response.data.id,
        status: response.data.status,
        phoneNumber: response.data.customer?.number,
        startedAt: response.data.startedAt,
        endedAt: response.data.endedAt,
        cost: response.data.cost,
        transcript: response.data.transcript,
      };
    } catch (error: any) {
      logger.error('Failed to get call', {
        error: error.message,
        callId,
      });
      throw new Error(`Failed to get call: ${error.message}`);
    }
  }

  /**
   * Cancel an ongoing call
   */
  async cancelCall(callId: string): Promise<void> {
    try {
      await this.client.delete(`/call/${callId}`);
      logger.info('Call cancelled', { callId });
    } catch (error: any) {
      logger.error('Failed to cancel call', {
        error: error.message,
        callId,
      });
      throw new Error(`Failed to cancel call: ${error.message}`);
    }
  }

  /**
   * Create a persistent assistant
   *
   * Useful for reusing the same assistant configuration across multiple calls
   */
  async createAssistant(assistant: VapiAssistant): Promise<{ id: string }> {
    try {
      const response = await this.client.post('/assistant', assistant);

      logger.info('Assistant created', {
        assistantId: response.data.id,
        name: assistant.name,
      });

      return { id: response.data.id };
    } catch (error: any) {
      logger.error('Failed to create assistant', {
        error: error.message,
        name: assistant.name,
      });
      throw new Error(`Failed to create assistant: ${error.message}`);
    }
  }

  /**
   * Make call with persistent assistant ID
   */
  async makeCallWithAssistant(
    phoneNumber: string,
    assistantId: string,
    metadata?: Record<string, any>
  ): Promise<VapiCallResponse> {
    try {
      const response = await this.client.post('/call', {
        phoneNumberId: this.phoneNumber,
        customer: {
          number: phoneNumber,
        },
        assistantId,
        metadata: metadata || {},
      });

      return {
        id: response.data.id,
        status: response.data.status,
        phoneNumber,
        startedAt: response.data.startedAt,
        endedAt: response.data.endedAt,
        cost: response.data.cost,
        transcript: response.data.transcript,
      };
    } catch (error: any) {
      logger.error('Failed to make call with assistant', {
        error: error.message,
        phoneNumber,
        assistantId,
      });
      throw new Error(`Failed to make call with assistant: ${error.message}`);
    }
  }

  /**
   * Build assistant configuration for specific use case
   */
  buildAssistant(params: {
    name: string;
    systemPrompt: string;
    firstMessage: string;
    language?: string;
    voiceId?: string;
    model?: string;
    temperature?: number;
    functions?: VapiFunction[];
  }): VapiAssistant {
    // Default voice IDs for different languages
    const defaultVoices: Record<string, string> = {
      en: 'pNInz6obpgDQGcFmaJgB', // ElevenLabs Adam
      th: 'onwK4e9ZLuTAKqWW03F9', // ElevenLabs Daniel (supports Thai)
      es: 'EXAVITQu4vr4xnSDxMaL', // ElevenLabs Bella
      fr: 'XB0fDUnXU5powFXDhCwa', // ElevenLabs Charlotte
      de: 'ErXwobaYiN019PkySvjV', // ElevenLabs Antoni
      ja: 'CwhRBWXzGAHq8TQ4Fs17', // ElevenLabs Domi
      zh: 'TX3LPaxmHKxFdv7VOQHJ', // ElevenLabs Elli
    };

    const language = params.language || 'en';
    const voiceId = params.voiceId || defaultVoices[language] || defaultVoices['en'];

    return {
      name: params.name,
      voice: {
        provider: 'elevenlabs',
        voiceId,
        model: 'eleven_turbo_v2', // Low latency
      },
      model: {
        provider: 'openai',
        model: params.model || 'gpt-4o',
        temperature: params.temperature ?? 0.7,
        systemPrompt: params.systemPrompt,
        functions: params.functions || [],
      },
      firstMessage: params.firstMessage,
      endCallMessage: 'Thank you for your time. Goodbye!',
      recordingEnabled: true,
      transcriptionProvider: 'deepgram',
      maxDurationSeconds: 600, // 10 minutes
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        return false;
      }
      // Vapi doesn't have a dedicated health endpoint, so we'll check if we can list calls
      await this.client.get('/call?limit=1');
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const vapiClient = new VapiClient();

export default vapiClient;
