import pRetry from 'p-retry';
import { AgentDecisionSchema, type AgentDecision, type AgentObservation } from '@arena/core';
import type OpenAI from 'openai';
import { createOpenRouterClient } from './openrouter-client.js';

export interface OpenRouterPaperAgent {
  readonly agentId: string;
  readonly name: string;
  decide(observation: AgentObservation): Promise<AgentDecision>;
}

export interface OpenRouterAgentConfig {
  agentId: string;
  name: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  client?: OpenAI;
}

const defaultSystemPrompt = `You are an AI paper-trading agent in a local simulator. Return only JSON matching the arena AgentDecision schema. Never request live brokerage access, wallet signing, custody, or fund movement.`;

function fallbackNoop(summary: string): AgentDecision {
  return AgentDecisionSchema.parse({
    action: 'NOOP',
    confidence: 0,
    thesis: {
      summary,
      evidence: ['OpenRouter output was missing, invalid, or unavailable.'],
      invalidation: 'A valid schema-checked model response is required before paper action.',
      expectedHoldingPeriod: 'one simulator tick',
    },
    risk: { maxLossUsd: '0' },
  });
}

function extractText(response: OpenAI.Chat.Completions.ChatCompletion): string {
  const content = response.choices[0]?.message?.content;
  return typeof content === 'string' ? content : '';
}

export function createOpenRouterAgent(config: OpenRouterAgentConfig): OpenRouterPaperAgent {
  const client = config.client ?? createOpenRouterClient();
  return {
    agentId: config.agentId,
    name: config.name,
    async decide(observation) {
      return pRetry(async () => {
        const response = await client.chat.completions.create({
          model: config.model,
          temperature: config.temperature ?? 0.2,
          max_tokens: config.maxTokens ?? 900,
          messages: [
            { role: 'system', content: config.systemPrompt ?? defaultSystemPrompt },
            { role: 'user', content: JSON.stringify({ observation, allowedActions: observation.allowedActions }) },
          ],
          response_format: { type: 'json_object' },
        });
        const raw = extractText(response);
        const parsed = AgentDecisionSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) return fallbackNoop('OpenRouter decision failed schema validation and was converted to NOOP.');
        return parsed.data;
      }, { retries: 1 }).catch(() => fallbackNoop('OpenRouter request failed and was converted to NOOP.'));
    },
  };
}
