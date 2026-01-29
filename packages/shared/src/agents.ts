/**
 * Centralized model and agent definitions.
 * Single source of truth - all packages import from here.
 */

export const DEFAULT_PROVIDER = "amazon-bedrock" as const;
export const DEFAULT_MODEL = "claude-opus-4-5" as const;
export const DEFAULT_SMALL_MODEL = "claude-haiku-4-5" as const;
export const DEFAULT_AGENT = "opencode" as const;

export interface ModelDefinition {
  id: string;
  name: string;
  description: string;
  bedrockId: string;
}

export const MODELS: Record<string, ModelDefinition> = {
  "claude-opus-4-5": {
    id: "claude-opus-4-5",
    name: "Claude Opus 4.5",
    description: "Most capable",
    bedrockId: "anthropic.claude-opus-4-5-20251101-v1:0",
  },
  "claude-sonnet-4-5": {
    id: "claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    description: "Balanced performance",
    bedrockId: "anthropic.claude-sonnet-4-5-20250929-v1:0",
  },
  "claude-haiku-4-5": {
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    description: "Fast and efficient",
    bedrockId: "anthropic.claude-3-5-haiku-20241022-v1:0",
  },
} as const;

/**
 * Get the Bedrock model ID for a given canonical model ID.
 * Falls back to default model if not found.
 */
export function getBedrockModelId(modelId: string): string {
  return MODELS[modelId]?.bedrockId ?? MODELS[DEFAULT_MODEL].bedrockId;
}

/**
 * Get the full Bedrock model string with provider prefix.
 */
export function getFullBedrockModelId(modelId: string): string {
  return `${DEFAULT_PROVIDER}/${getBedrockModelId(modelId)}`;
}

/**
 * Format model ID to display name.
 * e.g., "claude-opus-4-5" → "Claude Opus 4.5"
 */
export function formatModelName(modelId: string): string {
  if (!modelId) return "Unknown Model";

  // Check if it's a known model
  const model = MODELS[modelId];
  if (model) return model.name;

  // Handle full Bedrock IDs (e.g., "amazon-bedrock/anthropic.claude-opus-4-5...")
  if (modelId.includes("/")) {
    const parts = modelId.split("/");
    const bedrockId = parts[parts.length - 1];
    // Find model by Bedrock ID
    for (const m of Object.values(MODELS)) {
      if (m.bedrockId === bedrockId) return m.name;
    }
  }

  // Handle legacy format "claude-variant-major-minor"
  const match = modelId.match(/^claude-(\w+)-(\d+)-(\d+)$/i);
  if (match) {
    const [, variant, major, minor] = match;
    const capitalizedVariant = variant.charAt(0).toUpperCase() + variant.slice(1).toLowerCase();
    return `Claude ${capitalizedVariant} ${major}.${minor}`;
  }

  // Fallback: capitalize words and replace hyphens with spaces
  return modelId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Check if a model ID is valid.
 */
export function isValidModel(modelId: string): boolean {
  return modelId in MODELS;
}
