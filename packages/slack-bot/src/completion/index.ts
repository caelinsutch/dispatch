/**
 * Completion handling module.
 * Extracts agent responses and builds Slack messages.
 */

export { buildCompletionBlocks, getFallbackText } from "./blocks";
export { extractAgentResponse, SUMMARY_TOOL_NAMES } from "./extractor";
