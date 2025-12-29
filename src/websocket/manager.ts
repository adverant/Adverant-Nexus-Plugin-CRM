/**
 * WebSocket Manager
 *
 * Centralized Socket.IO instance management for broadcasting events
 * across the NexusCRM service.
 */

import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';

/**
 * Singleton WebSocket server instance
 */
let ioInstance: SocketIOServer | null = null;

/**
 * Initialize WebSocket manager with Socket.IO server instance
 */
export function initializeWebSocketManager(io: SocketIOServer): void {
  if (ioInstance) {
    logger.warn('WebSocket manager already initialized');
    return;
  }

  ioInstance = io;
  logger.info('WebSocket manager initialized');
}

/**
 * Get Socket.IO server instance
 */
export function getIO(): SocketIOServer {
  if (!ioInstance) {
    throw new Error('WebSocket manager not initialized. Call initializeWebSocketManager() first.');
  }
  return ioInstance;
}

/**
 * Broadcast event to all clients in an organization
 */
export function broadcastToOrganization(
  organizationId: string,
  event: string,
  data: any
): void {
  if (!ioInstance) {
    logger.warn('Cannot broadcast: WebSocket manager not initialized', {
      event,
      organizationId,
    });
    return;
  }

  const room = `org:${organizationId}`;
  ioInstance.to(room).emit(event, data);

  logger.debug('Broadcasted event to organization', {
    event,
    organizationId,
    room,
  });
}

/**
 * Broadcast event to specific call participants
 */
export function broadcastToCall(
  callId: string,
  event: string,
  data: any
): void {
  if (!ioInstance) {
    logger.warn('Cannot broadcast: WebSocket manager not initialized', {
      event,
      callId,
    });
    return;
  }

  const room = `call:${callId}`;
  ioInstance.to(room).emit(event, data);

  logger.debug('Broadcasted event to call room', {
    event,
    callId,
    room,
  });
}

/**
 * Broadcast transcript update in real-time
 *
 * This is called from webhook handlers to push live transcript
 * updates to connected WebSocket clients for call monitoring.
 */
export function broadcastTranscriptUpdate(
  callId: string,
  organizationId: string,
  transcript: {
    text: string;
    speaker: 'user' | 'assistant';
    timestamp: string;
    confidence?: number;
  }
): void {
  if (!ioInstance) {
    logger.warn('Cannot broadcast transcript: WebSocket manager not initialized', {
      callId,
    });
    return;
  }

  const event = 'call:transcript:update';
  const data = {
    callId,
    transcript,
    timestamp: new Date().toISOString(),
  };

  // Broadcast to both call-specific room and organization room
  broadcastToCall(callId, event, data);
  broadcastToOrganization(organizationId, event, data);

  logger.debug('Broadcasted transcript update', {
    callId,
    organizationId,
    transcriptLength: transcript.text.length,
  });
}

/**
 * Broadcast call status update
 */
export function broadcastCallStatus(
  callId: string,
  organizationId: string,
  status: 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'failed',
  metadata?: Record<string, any>
): void {
  if (!ioInstance) {
    logger.warn('Cannot broadcast call status: WebSocket manager not initialized', {
      callId,
      status,
    });
    return;
  }

  const event = 'call:status';
  const data = {
    callId,
    status,
    metadata,
    timestamp: new Date().toISOString(),
  };

  // Broadcast to both call-specific room and organization room
  broadcastToCall(callId, event, data);
  broadcastToOrganization(organizationId, event, data);

  logger.debug('Broadcasted call status update', {
    callId,
    organizationId,
    status,
  });
}

/**
 * Get WebSocket statistics
 */
export function getWebSocketStats(): {
  connected: number;
  rooms: number;
} | null {
  if (!ioInstance) {
    return null;
  }

  return {
    connected: ioInstance.sockets.sockets.size,
    rooms: ioInstance.sockets.adapter.rooms.size,
  };
}
