import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import config from '../config';
import { logger } from './logger';

/**
 * PostgreSQL Database Client
 * Connects to the shared GraphRAG database (extends with nexuscrm schema)
 */
class Database {
  private pool: Pool;
  private isConnected: boolean = false;

  constructor() {
    this.pool = new Pool({
      host: config.postgres.host,
      port: config.postgres.port,
      user: config.postgres.user,
      password: config.postgres.password,
      database: config.postgres.database,
      max: config.postgres.max,
      idleTimeoutMillis: config.postgres.idleTimeoutMillis,
      connectionTimeoutMillis: config.postgres.connectionTimeoutMillis,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error('Unexpected database pool error', { error: err.message, stack: err.stack });
    });
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      logger.debug('Database already connected');
      return;
    }

    try {
      const client = await this.pool.connect();

      // Test connection
      await client.query('SELECT NOW()');

      // Verify nexuscrm schema exists
      const schemaCheck = await client.query(
        "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'nexuscrm'"
      );

      if (schemaCheck.rows.length === 0) {
        throw new Error(
          'NexusCRM schema not found. Please run migration 011_nexuscrm_schema.sql first.'
        );
      }

      client.release();
      this.isConnected = true;

      logger.info('Database connected successfully', {
        host: config.postgres.host,
        database: config.postgres.database,
        schemas: ['graphrag', 'nexuscrm'],
      });
    } catch (error: any) {
      logger.error('Failed to connect to database', {
        error: error.message,
        host: config.postgres.host,
        database: config.postgres.database,
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.pool.end();
      this.isConnected = false;
      logger.info('Database disconnected successfully');
    } catch (error: any) {
      logger.error('Failed to disconnect from database', { error: error.message });
      throw error;
    }
  }

  /**
   * Execute a query
   */
  async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();

    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - startTime;

      logger.debug('Query executed', {
        query: text.substring(0, 100),
        params: params?.length || 0,
        rows: result.rowCount,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error('Query failed', {
        query: text.substring(0, 100),
        params,
        error: error.message,
        duration: `${duration}ms`,
      });

      throw error;
    }
  }

  /**
   * Execute query with a transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Set organization context for Row-Level Security (RLS)
   */
  async setOrganizationContext(
    client: PoolClient,
    organizationId: string
  ): Promise<void> {
    await client.query(
      `SET LOCAL app.current_organization_id = $1`,
      [organizationId]
    );
  }

  /**
   * Execute query with organization context (for RLS)
   */
  async queryWithContext<T extends QueryResultRow = any>(
    organizationId: string,
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    return this.transaction(async (client) => {
      await this.setOrganizationContext(client, organizationId);
      return client.query<T>(text, params);
    });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health');
      return result.rows[0]?.health === 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get pool status
   */
  getPoolStatus(): {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

// Export singleton instance
export const db = new Database();

export default db;
