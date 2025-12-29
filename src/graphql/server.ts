import { ApolloServer } from 'apollo-server-express';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { authClient } from '../clients';
import { logger } from '../utils/logger';
import { AuthContext } from '../types';

/**
 * Create Apollo Server instance
 *
 * Configured with:
 * - GraphQL schema and resolvers
 * - Authentication context
 * - Error handling
 * - Introspection and playground (dev only)
 */
export function createApolloServer(): ApolloServer {
  return new ApolloServer({
    typeDefs,
    resolvers,

    // Context function - runs on every request
    context: async ({ req }): Promise<{ auth: AuthContext | null }> => {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return { auth: null };
      }

      try {
        const authContext = await authClient.verifyToken(authHeader);
        return { auth: authContext };
      } catch (error: any) {
        logger.warn('Failed to verify auth token', { error: error.message });
        return { auth: null };
      }
    },

    // Format errors
    formatError: (error) => {
      logger.error('GraphQL error', {
        message: error.message,
        path: error.path,
        extensions: error.extensions,
      });

      // Don't expose internal error details in production
      if (process.env.NODE_ENV === 'production') {
        return {
          message: error.message,
          extensions: {
            code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
          },
        };
      }

      return error;
    },

    // Enable introspection in development
    introspection: process.env.NODE_ENV !== 'production',

    // Plugin for logging
    plugins: [
      {
        async requestDidStart(requestContext) {
          logger.debug('GraphQL request started', {
            operationName: requestContext.request.operationName,
            variables: requestContext.request.variables,
          });

          return {
            async didEncounterErrors(ctx: any) {
              logger.error('GraphQL errors encountered', {
                operationName: ctx.request.operationName,
                errors: ctx.errors?.map((e: any) => e.message),
              });
            },
            async willSendResponse(ctx: any) {
              logger.debug('GraphQL response sent', {
                operationName: ctx.request.operationName,
                errors: ctx.errors?.length || 0,
              });
            },
          };
        },
      },
    ],
  });
}

export default createApolloServer;
