import axios, { AxiosInstance } from 'axios';
import config from '../config';
import { logger } from '../utils/logger';
import { OrchestrationGoal, OrchestrationResult } from '../types';

/**
 * OrchestrationAgent Client
 *
 * Provides interface to the Nexus OrchestrationAgent service for
 * autonomous workflow execution using ReAct loops.
 *
 * Use this instead of building custom workflow engines - leverages
 * existing Nexus orchestration capabilities.
 */
export class OrchestrationClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.services.orchestrationAgent;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 120000, // 2 minutes for long-running orchestrations
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('OrchestrationAgent request', {
          method: config.method,
          url: config.url,
          data: config.data,
        });
        return config;
      },
      (error) => {
        logger.error('OrchestrationAgent request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('OrchestrationAgent response', {
          status: response.status,
          data: response.data,
        });
        return response;
      },
      (error) => {
        logger.error('OrchestrationAgent response error', {
          error: error.message,
          response: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Execute a workflow goal using ReAct loop
   *
   * Example:
   * ```typescript
   * const result = await orchestrationClient.execute({
   *   goal: 'Call 50 property owners in Rawai, Thailand to verify rental availability',
   *   metadata: {
   *     campaignId: 'campaign_123',
   *     maxConcurrency: 5,
   *     language: 'thai',
   *   }
   * });
   * ```
   */
  async execute(input: OrchestrationGoal): Promise<OrchestrationResult> {
    try {
      logger.info('Executing orchestration goal', { goal: input.goal });

      const response = await this.client.post('/api/orchestration/execute', {
        goal: input.goal,
        metadata: input.metadata || {},
      });

      const result: OrchestrationResult = {
        executionId: response.data.executionId,
        status: response.data.status,
        output: response.data.output,
        duration: response.data.duration,
      };

      logger.info('Orchestration execution started', { executionId: result.executionId });

      return result;
    } catch (error: any) {
      logger.error('Failed to execute orchestration', {
        error: error.message,
        goal: input.goal,
      });
      throw new Error(`OrchestrationAgent execution failed: ${error.message}`);
    }
  }

  /**
   * Get status of a running orchestration
   */
  async getStatus(executionId: string): Promise<OrchestrationResult> {
    try {
      const response = await this.client.get(`/api/orchestration/status/${executionId}`);

      return {
        executionId: response.data.executionId,
        status: response.data.status,
        output: response.data.output,
        duration: response.data.duration,
      };
    } catch (error: any) {
      logger.error('Failed to get orchestration status', {
        error: error.message,
        executionId,
      });
      throw new Error(`Failed to get orchestration status: ${error.message}`);
    }
  }

  /**
   * Cancel a running orchestration
   */
  async cancel(executionId: string): Promise<void> {
    try {
      await this.client.post(`/api/orchestration/cancel/${executionId}`);
      logger.info('Orchestration cancelled', { executionId });
    } catch (error: any) {
      logger.error('Failed to cancel orchestration', {
        error: error.message,
        executionId,
      });
      throw new Error(`Failed to cancel orchestration: ${error.message}`);
    }
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
export const orchestrationClient = new OrchestrationClient();

export default orchestrationClient;
