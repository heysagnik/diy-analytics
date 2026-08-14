import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModel } from 'ai';

export type ChatProvider = 'anthropic' | 'openai' | 'gemini' | 'groq' | 'openrouter' | 'nvidia';

const DEFAULT_MODEL_IDS: Record<ChatProvider, string> = {
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-5.1',
  gemini: 'gemini-3-pro',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'anthropic/claude-sonnet-5',
  nvidia: 'meta/llama-3.1-8b-instruct',
};

const PROVIDER_ENV_VARS: Record<ChatProvider, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
  groq: 'GROQ_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  nvidia: 'NVIDIA_API_KEY',
};

// Per-provider model overrides, e.g. ANTHROPIC_MODEL=claude-opus-5.
// AI_MODEL applies to whichever provider ends up active.
const PROVIDER_MODEL_ENV_VARS: Record<ChatProvider, string> = {
  anthropic: 'ANTHROPIC_MODEL',
  openai: 'OPENAI_MODEL',
  gemini: 'GEMINI_MODEL',
  groq: 'GROQ_MODEL',
  openrouter: 'OPENROUTER_MODEL',
  nvidia: 'NVIDIA_MODEL',
};

const PROVIDER_PRIORITY: ChatProvider[] = ['anthropic', 'openai', 'gemini', 'groq', 'openrouter', 'nvidia'];

const DEFAULT_NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function hasKey(provider: ChatProvider): boolean {
  return env(PROVIDER_ENV_VARS[provider]) !== undefined;
}

function parseProvider(value: string): ChatProvider | null {
  const normalized = value.trim().toLowerCase();
  const aliases: Record<string, ChatProvider> = {
    anthropic: 'anthropic',
    claude: 'anthropic',
    openai: 'openai',
    gpt: 'openai',
    gemini: 'gemini',
    google: 'gemini',
    groq: 'groq',
    openrouter: 'openrouter',
    nvidia: 'nvidia',
    nim: 'nvidia',
  };
  return aliases[normalized] ?? null;
}

function resolveActiveProvider(): ChatProvider | null {
  // Explicit selection wins, but only if its key is actually present —
  // otherwise a stale AI_PROVIDER would disable an otherwise working setup.
  const requested = env('AI_PROVIDER');
  if (requested) {
    const provider = parseProvider(requested);
    if (provider && hasKey(provider)) return provider;
  }
  return PROVIDER_PRIORITY.find(hasKey) ?? null;
}

function resolveModelId(provider: ChatProvider): string {
  return env(PROVIDER_MODEL_ENV_VARS[provider]) ?? env('AI_MODEL') ?? DEFAULT_MODEL_IDS[provider];
}

function buildModel(provider: ChatProvider, modelId: string): LanguageModel {
  const apiKey = env(PROVIDER_ENV_VARS[provider]) as string;
  const baseURL = env('AI_BASE_URL');

  switch (provider) {
    case 'anthropic':
      return createAnthropic({ apiKey, ...(baseURL ? { baseURL } : {}) })(modelId);
    case 'openai':
      return createOpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) })(modelId);
    case 'gemini':
      return createGoogleGenerativeAI({ apiKey, ...(baseURL ? { baseURL } : {}) })(modelId);
    case 'groq':
      return createGroq({ apiKey, ...(baseURL ? { baseURL } : {}) })(modelId);
    case 'openrouter':
      return createOpenRouter({ apiKey, ...(baseURL ? { baseURL } : {}) }).chat(modelId);
    case 'nvidia':
      return createOpenAICompatible({
        name: 'nvidia',
        apiKey,
        baseURL: baseURL ?? DEFAULT_NVIDIA_BASE_URL,
      })(modelId);
  }
}

export interface ChatModelSelection {
  provider: ChatProvider;
  modelId: string;
  model: LanguageModel;
}

let cached: { key: string; selection: ChatModelSelection } | null = null;

export function getChatModelSelection(): ChatModelSelection | null {
  const provider = resolveActiveProvider();
  if (!provider) {
    cached = null;
    return null;
  }

  const modelId = resolveModelId(provider);
  // Key on the resolved identity + secret so env changes between hot reloads
  // (or across serverless config updates) rebuild the client.
  const key = `${provider}:${modelId}:${env(PROVIDER_ENV_VARS[provider])}:${env('AI_BASE_URL') ?? ''}`;
  if (cached?.key === key) return cached.selection;

  const selection: ChatModelSelection = { provider, modelId, model: buildModel(provider, modelId) };
  cached = { key, selection };
  return selection;
}

export function getChatModel(): LanguageModel | null {
  return getChatModelSelection()?.model ?? null;
}

export function getActiveProvider(): ChatProvider | null {
  return resolveActiveProvider();
}

/** Which providers have keys present — useful for diagnosing config. */
export function getConfiguredProviders(): ChatProvider[] {
  return PROVIDER_PRIORITY.filter(hasKey);
}
