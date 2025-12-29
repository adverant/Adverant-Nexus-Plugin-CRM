import axios, { AxiosInstance } from 'axios';
import config from '../config';
import { logger } from '../utils/logger';
import { GraphRAGSearchInput, GraphRAGSearchResult } from '../types';

/**
 * GraphRAG Client
 *
 * Provides interface to the Nexus GraphRAG service for semantic search,
 * graph traversal, and knowledge retrieval across PostgreSQL, Neo4j, and Qdrant.
 *
 * Use this for:
 * - Semantic search across documents and memories
 * - Graph-based knowledge retrieval
 * - Finding related entities and relationships
 * - Context enrichment for AI operations
 */
export class GraphRAGClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.services.graphRAG;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000, // 30 seconds for complex queries
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('GraphRAG request', {
          method: config.method,
          url: config.url,
          query: config.data?.query?.substring(0, 100),
        });
        return config;
      },
      (error) => {
        logger.error('GraphRAG request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('GraphRAG response', {
          status: response.status,
          resultsCount: response.data?.totalFound || response.data?.results?.length,
        });
        return response;
      },
      (error) => {
        logger.error('GraphRAG response error', {
          error: error.message,
          response: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Semantic search across documents and memories
   *
   * Example:
   * ```typescript
   * const results = await graphRAGClient.search({
   *   query: 'successful cold calling strategies for property rentals',
   *   collections: ['crm_activities', 'campaign_results'],
   *   limit: 10,
   *   strategy: 'hybrid',
   *   rerank: true
   * });
   * ```
   */
  async search(input: GraphRAGSearchInput): Promise<GraphRAGSearchResult> {
    try {
      logger.info('GraphRAG search', {
        query: input.query.substring(0, 100),
        strategy: input.strategy || 'semantic_chunks',
      });

      const response = await this.client.post('/api/search', {
        query: input.query,
        collections: input.collections || [],
        limit: input.limit || 10,
        strategy: input.strategy || 'semantic_chunks',
        rerank: input.rerank ?? false,
      });

      const result: GraphRAGSearchResult = {
        results: response.data.results,
        totalFound: response.data.totalFound,
      };

      logger.info('GraphRAG search complete', { totalFound: result.totalFound });

      return result;
    } catch (error: any) {
      logger.error('Failed to execute GraphRAG search', {
        error: error.message,
        query: input.query.substring(0, 100),
      });
      throw new Error(`GraphRAG search failed: ${error.message}`);
    }
  }

  /**
   * Find similar contacts based on attributes
   *
   * Uses semantic similarity to find contacts with similar profiles,
   * job titles, industries, or interaction patterns.
   */
  async findSimilarContacts(
    contactId: string,
    limit: number = 10
  ): Promise<Array<{ id: string; similarity: number; attributes: any }>> {
    try {
      const response = await this.client.post('/api/similarity/contacts', {
        contactId,
        limit,
      });

      return response.data.results;
    } catch (error: any) {
      logger.error('Failed to find similar contacts', {
        error: error.message,
        contactId,
      });
      throw new Error(`Failed to find similar contacts: ${error.message}`);
    }
  }

  /**
   * Find related companies based on graph relationships
   *
   * Uses Neo4j graph traversal to find companies connected through
   * contacts, deals, activities, or industry relationships.
   */
  async findRelatedCompanies(
    companyId: string,
    relationshipTypes?: string[],
    maxDepth: number = 2
  ): Promise<Array<{ id: string; relationshipPath: string[]; distance: number }>> {
    try {
      const response = await this.client.post('/api/graph/related-companies', {
        companyId,
        relationshipTypes: relationshipTypes || ['HAS_CONTACT', 'HAS_DEAL', 'IN_INDUSTRY'],
        maxDepth,
      });

      return response.data.results;
    } catch (error: any) {
      logger.error('Failed to find related companies', {
        error: error.message,
        companyId,
      });
      throw new Error(`Failed to find related companies: ${error.message}`);
    }
  }

  /**
   * Store document in GraphRAG for semantic search
   *
   * Automatically chunks, embeds, and indexes the document across
   * PostgreSQL (metadata), Qdrant (vectors), and Neo4j (relationships).
   */
  async storeDocument(
    content: string,
    metadata: {
      type: string;
      source: string;
      entityType?: 'contact' | 'company' | 'deal' | 'activity' | 'campaign';
      entityId?: string;
      tags?: string[];
      [key: string]: any;
    }
  ): Promise<{ documentId: string; chunks: number }> {
    try {
      logger.info('Storing document in GraphRAG', {
        type: metadata.type,
        source: metadata.source,
        contentLength: content.length,
      });

      const response = await this.client.post('/api/documents', {
        content,
        metadata,
      });

      logger.info('Document stored in GraphRAG', {
        documentId: response.data.documentId,
        chunks: response.data.chunks,
      });

      return {
        documentId: response.data.documentId,
        chunks: response.data.chunks,
      };
    } catch (error: any) {
      logger.error('Failed to store document in GraphRAG', {
        error: error.message,
        type: metadata.type,
      });
      throw new Error(`Failed to store document: ${error.message}`);
    }
  }

  /**
   * Retrieve context for a CRM entity
   *
   * Gets all related documents, activities, and knowledge for enriching
   * AI operations (call scripts, email generation, sentiment analysis).
   */
  async getEntityContext(
    entityType: 'contact' | 'company' | 'deal' | 'campaign',
    entityId: string,
    contextTypes?: string[]
  ): Promise<{
    documents: any[];
    activities: any[];
    relationships: any[];
    insights: any[];
  }> {
    try {
      const response = await this.client.get(`/api/context/${entityType}/${entityId}`, {
        params: {
          types: contextTypes?.join(','),
        },
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to get entity context', {
        error: error.message,
        entityType,
        entityId,
      });
      throw new Error(`Failed to get entity context: ${error.message}`);
    }
  }

  /**
   * Enrich contact data using GraphRAG knowledge
   *
   * Uses semantic search and graph traversal to find additional
   * information about a contact from past interactions, documents, etc.
   */
  async enrichContact(contactId: string): Promise<{
    enrichmentData: Record<string, any>;
    sources: string[];
    confidence: number;
  }> {
    try {
      const response = await this.client.post('/api/enrich/contact', {
        contactId,
      });

      return {
        enrichmentData: response.data.enrichmentData,
        sources: response.data.sources,
        confidence: response.data.confidence,
      };
    } catch (error: any) {
      logger.error('Failed to enrich contact', {
        error: error.message,
        contactId,
      });
      throw new Error(`Failed to enrich contact: ${error.message}`);
    }
  }

  /**
   * Create knowledge graph relationship
   *
   * Creates explicit relationship in Neo4j between CRM entities
   * for graph-based queries and traversals.
   */
  async createRelationship(
    sourceType: string,
    sourceId: string,
    targetType: string,
    targetId: string,
    relationshipType: string,
    properties?: Record<string, any>
  ): Promise<{ relationshipId: string }> {
    try {
      const response = await this.client.post('/api/graph/relationships', {
        source: { type: sourceType, id: sourceId },
        target: { type: targetType, id: targetId },
        relationshipType,
        properties: properties || {},
      });

      return { relationshipId: response.data.relationshipId };
    } catch (error: any) {
      logger.error('Failed to create relationship', {
        error: error.message,
        sourceType,
        targetType,
        relationshipType,
      });
      throw new Error(`Failed to create relationship: ${error.message}`);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    postgres: boolean;
    neo4j: boolean;
    qdrant: boolean;
  }> {
    try {
      const response = await this.client.get('/health');
      return {
        postgres: response.data.postgres === 'healthy',
        neo4j: response.data.neo4j === 'healthy',
        qdrant: response.data.qdrant === 'healthy',
      };
    } catch (error) {
      return { postgres: false, neo4j: false, qdrant: false };
    }
  }
}

// Export singleton instance
export const graphRAGClient = new GraphRAGClient();

export default graphRAGClient;
