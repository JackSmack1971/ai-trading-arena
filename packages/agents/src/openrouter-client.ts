import OpenAI from 'openai';
import type { OpenAI as OpenAIClient } from 'openai';

export interface OpenRouterClientOptions {
  apiKey?: string;
  referer?: string;
  title?: string;
}

export function createOpenRouterClient(options: OpenRouterClientOptions = {}): OpenAIClient {
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: options.apiKey ?? process.env['OPENROUTER_API_KEY'],
    defaultHeaders: {
      'HTTP-Referer': options.referer ?? process.env['OPENROUTER_REFERER'] ?? 'http://localhost:8787',
      'X-OpenRouter-Title': options.title ?? 'AI Trading Arena',
    },
    timeout: 30_000,
    maxRetries: 0,
  });
}
