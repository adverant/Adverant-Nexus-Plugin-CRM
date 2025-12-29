import axios, { AxiosInstance } from 'axios';
import config from '../config';
import { logger } from '../utils/logger';
import { AuthUser, AuthContext } from '../types';

/**
 * Auth Service Client
 *
 * Provides interface to the Nexus Auth service for authentication,
 * authorization, and user/organization management.
 *
 * Use this for:
 * - Validating JWT tokens
 * - Getting user context from tokens
 * - Checking permissions
 * - Managing multi-tenant organization isolation
 */
export class AuthClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.services.auth;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000, // 5 seconds for auth operations
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Auth service request', {
          method: config.method,
          url: config.url,
        });
        return config;
      },
      (error) => {
        logger.error('Auth service request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Auth service response', {
          status: response.status,
        });
        return response;
      },
      (error) => {
        logger.error('Auth service response error', {
          error: error.message,
          response: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Verify JWT token and extract user context
   *
   * Example:
   * ```typescript
   * const authContext = await authClient.verifyToken(req.headers.authorization);
   * if (authContext) {
   *   // User authenticated
   *   const userId = authContext.user.id;
   *   const organizationId = authContext.user.organizationId;
   * }
   * ```
   */
  async verifyToken(token: string): Promise<AuthContext | null> {
    try {
      // Remove 'Bearer ' prefix if present
      const cleanToken = token.replace(/^Bearer\s+/i, '');

      const response = await this.client.post('/api/auth/verify', {
        token: cleanToken,
      });

      if (!response.data.valid) {
        return null;
      }

      return {
        user: {
          id: response.data.user.id,
          email: response.data.user.email,
          organizationId: response.data.user.organizationId,
          role: response.data.user.role,
          permissions: response.data.user.permissions || [],
        },
        token: cleanToken,
      };
    } catch (error: any) {
      if (error.response?.status === 401) {
        logger.warn('Invalid or expired token');
        return null;
      }

      logger.error('Failed to verify token', {
        error: error.message,
      });
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Check if user has specific permission
   *
   * Example:
   * ```typescript
   * const canMakeCalls = await authClient.hasPermission(userId, 'voice:call:create');
   * if (canMakeCalls) {
   *   // Proceed with call
   * }
   * ```
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const response = await this.client.post('/api/auth/check-permission', {
        userId,
        permission,
      });

      return response.data.hasPermission;
    } catch (error: any) {
      logger.error('Failed to check permission', {
        error: error.message,
        userId,
        permission,
      });
      return false;
    }
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<AuthUser | null> {
    try {
      const response = await this.client.get(`/api/users/${userId}`);

      return {
        id: response.data.id,
        email: response.data.email,
        organizationId: response.data.organizationId,
        role: response.data.role,
        permissions: response.data.permissions || [],
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }

      logger.error('Failed to get user', {
        error: error.message,
        userId,
      });
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }

  /**
   * Get organization details
   */
  async getOrganization(organizationId: string): Promise<{
    id: string;
    name: string;
    plan: string;
    features: string[];
    limits: Record<string, number>;
  } | null> {
    try {
      const response = await this.client.get(`/api/organizations/${organizationId}`);

      return {
        id: response.data.id,
        name: response.data.name,
        plan: response.data.plan,
        features: response.data.features || [],
        limits: response.data.limits || {},
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }

      logger.error('Failed to get organization', {
        error: error.message,
        organizationId,
      });
      throw new Error(`Failed to get organization: ${error.message}`);
    }
  }

  /**
   * Check if organization has feature enabled
   *
   * Example:
   * ```typescript
   * const hasVoice = await authClient.hasFeature(organizationId, 'voice_calling');
   * if (!hasVoice) {
   *   throw new Error('Voice calling not enabled for your plan');
   * }
   * ```
   */
  async hasFeature(organizationId: string, feature: string): Promise<boolean> {
    try {
      const org = await this.getOrganization(organizationId);
      return org?.features.includes(feature) ?? false;
    } catch (error: any) {
      logger.error('Failed to check feature', {
        error: error.message,
        organizationId,
        feature,
      });
      return false;
    }
  }

  /**
   * Check usage limits for organization
   *
   * Example:
   * ```typescript
   * const usage = await authClient.checkUsageLimit(organizationId, 'voice_minutes', 100);
   * if (!usage.allowed) {
   *   throw new Error(`Usage limit exceeded: ${usage.current}/${usage.limit}`);
   * }
   * ```
   */
  async checkUsageLimit(
    organizationId: string,
    limitType: string,
    requestedAmount: number
  ): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    remaining: number;
  }> {
    try {
      const response = await this.client.post('/api/usage/check', {
        organizationId,
        limitType,
        requestedAmount,
      });

      return {
        allowed: response.data.allowed,
        current: response.data.current,
        limit: response.data.limit,
        remaining: response.data.remaining,
      };
    } catch (error: any) {
      logger.error('Failed to check usage limit', {
        error: error.message,
        organizationId,
        limitType,
      });
      throw new Error(`Failed to check usage limit: ${error.message}`);
    }
  }

  /**
   * Create authentication middleware for Express
   *
   * Example:
   * ```typescript
   * app.use(authClient.middleware());
   * ```
   */
  middleware() {
    return async (req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({ error: 'No authorization token provided' });
      }

      try {
        const authContext = await this.verifyToken(authHeader);

        if (!authContext) {
          return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Attach auth context to request
        req.auth = authContext;

        next();
      } catch (error: any) {
        logger.error('Authentication middleware error', { error: error.message });
        return res.status(401).json({ error: 'Authentication failed' });
      }
    };
  }

  /**
   * Create permission check middleware
   *
   * Example:
   * ```typescript
   * app.post('/api/calls', authClient.requirePermission('voice:call:create'), async (req, res) => {
   *   // User has permission
   * });
   * ```
   */
  requirePermission(permission: string) {
    return async (req: any, res: any, next: any) => {
      if (!req.auth) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const hasPermission = req.auth.user.permissions.includes(permission);

      if (!hasPermission) {
        logger.warn('Permission denied', {
          userId: req.auth.user.id,
          permission,
        });
        return res.status(403).json({ error: 'Permission denied' });
      }

      next();
    };
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
export const authClient = new AuthClient();

export default authClient;
