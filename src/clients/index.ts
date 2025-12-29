/**
 * Nexus Service Clients
 *
 * This module exports all client wrappers for existing Nexus services.
 * These clients provide the foundation for NexusCRM's 80% code reuse strategy.
 *
 * Architecture Pattern:
 * - NexusCRM is a thin orchestration layer over existing Nexus services
 * - DO NOT duplicate functionality - leverage these clients
 * - DO NOT call external APIs directly - use MageAgent for AI operations
 * - DO NOT create new databases - extend GraphRAG's PostgreSQL
 */

export { orchestrationClient, OrchestrationClient } from './orchestration-client';
export { mageClient, MageClient } from './mage-client';
export { graphRAGClient, GraphRAGClient } from './graphrag-client';
export { geoClient, GeoClient } from './geo-client';
export { authClient, AuthClient } from './auth-client';

// Import instances for healthCheckAll function
import { orchestrationClient } from './orchestration-client';
import { mageClient } from './mage-client';
import { graphRAGClient } from './graphrag-client';
import { geoClient } from './geo-client';
import { authClient } from './auth-client';

/**
 * Health check all Nexus services
 *
 * Use this at startup and for monitoring endpoints to verify
 * connectivity to all dependencies.
 */
export async function healthCheckAll(): Promise<{
  orchestration: boolean;
  mage: boolean;
  graphRAG: { postgres: boolean; neo4j: boolean; qdrant: boolean };
  geo: boolean;
  auth: boolean;
  allHealthy: boolean;
}> {
  const [orchestration, mage, graphRAG, geo, auth] = await Promise.all([
    orchestrationClient.healthCheck().catch(() => false),
    mageClient.healthCheck().catch(() => false),
    graphRAGClient.healthCheck().catch(() => ({ postgres: false, neo4j: false, qdrant: false })),
    geoClient.healthCheck().catch(() => false),
    authClient.healthCheck().catch(() => false),
  ]);

  const allHealthy =
    orchestration &&
    mage &&
    graphRAG.postgres &&
    graphRAG.neo4j &&
    graphRAG.qdrant &&
    geo &&
    auth;

  return {
    orchestration,
    mage,
    graphRAG,
    geo,
    auth,
    allHealthy,
  };
}
