/**
 * Voice Calling Module
 *
 * Provides AI-powered voice calling capabilities using Vapi.ai:
 * - Outbound calling with dynamic scripts
 * - Real-time transcription and analysis
 * - Sentiment analysis and keyword extraction
 * - Function calling during conversations
 * - Multi-language support
 * - Call recording and analytics
 *
 * Components:
 * - VapiClient: Interface to Vapi.ai API
 * - CallManager: Orchestrates call workflow and analysis
 * - WebhookHandler: Processes Vapi webhook events
 */

export { vapiClient, VapiClient, VapiAssistant, VapiFunction } from './vapi-client';
export { callManager, CallManager } from './call-manager';
export { verifyWebhookMiddleware, handleVapiWebhook } from './webhook-handler';
