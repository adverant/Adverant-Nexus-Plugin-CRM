import axios, { AxiosInstance } from 'axios';
import config from '../config';
import { logger } from '../utils/logger';
import { MageReasonInput, MageReasonOutput } from '../types';

/**
 * MageAgent Client
 *
 * Provides interface to the Nexus MageAgent service for AI reasoning,
 * content generation, and analysis using 320+ LLM models.
 *
 * Use this for ALL AI operations instead of calling OpenAI/Anthropic directly.
 * Provides model selection, cost optimization, and unified interface.
 */
export class MageClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.services.mageAgent;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 60000, // 1 minute for AI reasoning
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('MageAgent request', {
          method: config.method,
          url: config.url,
          task: config.data?.task?.substring(0, 100),
        });
        return config;
      },
      (error) => {
        logger.error('MageAgent request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('MageAgent response', {
          status: response.status,
          tokensUsed: response.data?.tokensUsed,
          cost: response.data?.cost,
        });
        return response;
      },
      (error) => {
        logger.error('MageAgent response error', {
          error: error.message,
          response: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Reason about a task using AI
   *
   * Example:
   * ```typescript
   * const result = await mageClient.reason({
   *   task: 'Analyze this sales call transcript and extract key insights',
   *   context: { transcript: '...' },
   *   model: 'gpt-4o',
   *   temperature: 0.2,
   *   outputFormat: 'json',
   *   schema: { insights: [], sentiment: '', buyingSignals: [] }
   * });
   * ```
   */
  async reason(input: MageReasonInput): Promise<MageReasonOutput> {
    try {
      logger.info('MageAgent reasoning', {
        task: input.task.substring(0, 100),
        model: input.model || 'default',
      });

      const response = await this.client.post('/api/reason', {
        task: input.task,
        context: input.context || {},
        model: input.model,
        temperature: input.temperature ?? 0.7,
        outputFormat: input.outputFormat || 'text',
        schema: input.schema,
        tools: input.tools || [],
      });

      const result: MageReasonOutput = {
        output: response.data.output,
        confidence: response.data.confidence,
        model: response.data.model,
        tokensUsed: response.data.tokensUsed,
        cost: response.data.cost,
      };

      logger.info('MageAgent reasoning complete', {
        model: result.model,
        tokensUsed: result.tokensUsed,
        cost: result.cost,
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to execute MageAgent reasoning', {
        error: error.message,
        task: input.task.substring(0, 100),
      });
      throw new Error(`MageAgent reasoning failed: ${error.message}`);
    }
  }

  /**
   * Generate content (text, email, script, etc.)
   *
   * Example:
   * ```typescript
   * const script = await mageClient.generate({
   *   task: 'Generate a voice call script for property rental verification',
   *   context: { property: {...}, language: 'thai' },
   *   model: 'gpt-4o',
   *   temperature: 0.9
   * });
   * ```
   */
  async generate(input: Omit<MageReasonInput, 'outputFormat'>): Promise<string> {
    const result = await this.reason({
      ...input,
      outputFormat: 'text',
    });

    return result.output as string;
  }

  /**
   * Analyze structured data (call transcripts, emails, documents)
   *
   * Returns structured JSON output based on provided schema
   */
  async analyze<T = any>(
    task: string,
    data: any,
    schema: Record<string, any>,
    model?: string
  ): Promise<T> {
    const result = await this.reason({
      task,
      context: { data },
      model: model || 'gpt-4o',
      temperature: 0.2, // Lower temperature for analytical tasks
      outputFormat: 'json',
      schema,
    });

    return result.output as T;
  }

  /**
   * Extract entities from text (contacts, companies, locations, etc.)
   *
   * Example:
   * ```typescript
   * const entities = await mageClient.extractEntities(
   *   'John Smith from Acme Corp in Bangkok mentioned their office at Sukhumvit Road',
   *   ['person', 'company', 'location']
   * );
   * // Returns: { persons: ['John Smith'], companies: ['Acme Corp'], locations: ['Bangkok', 'Sukhumvit Road'] }
   * ```
   */
  async extractEntities(
    text: string,
    entityTypes: string[]
  ): Promise<Record<string, string[]>> {
    return this.analyze(
      `Extract the following entity types from the text: ${entityTypes.join(', ')}`,
      text,
      {
        type: 'object',
        properties: entityTypes.reduce((acc, type) => {
          acc[type] = { type: 'array', items: { type: 'string' } };
          return acc;
        }, {} as Record<string, any>),
      }
    );
  }

  /**
   * Sentiment analysis
   *
   * Returns sentiment score and classification
   */
  async analyzeSentiment(
    text: string
  ): Promise<{ sentiment: 'positive' | 'neutral' | 'negative' | 'mixed'; score: number }> {
    return this.analyze(
      'Analyze the sentiment of this text and provide a score from -1 (very negative) to 1 (very positive)',
      text,
      {
        sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative', 'mixed'] },
        score: { type: 'number', minimum: -1, maximum: 1 },
      }
    );
  }

  /**
   * Summarize long text
   */
  async summarize(text: string, maxLength?: number): Promise<string> {
    return this.generate({
      task: `Summarize the following text${maxLength ? ` in no more than ${maxLength} words` : ''}`,
      context: { text },
      temperature: 0.3,
    });
  }

  /**
   * Translate text to another language
   */
  async translate(text: string, targetLanguage: string): Promise<string> {
    return this.generate({
      task: `Translate the following text to ${targetLanguage}`,
      context: { text },
      temperature: 0.3,
    });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const mageClient = new MageClient();

export default mageClient;
