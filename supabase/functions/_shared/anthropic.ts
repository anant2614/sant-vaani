import Anthropic from '@anthropic-ai/sdk';

export const DEFAULT_MODEL = 'claude-opus-5-5';

export type ClaudeOptions = {
  apiKey: string | undefined;
  model: string;
  timeout?: number;
  maxRetries?: number;
  /** Tests pass a fake in place of the network. */
  fetch?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
};

/**
 * The key and model from the function's settings. modelSetting names the
 * variable that can swap the model without a deploy, such as ASK_MODEL.
 */
export function claudeOptions(modelSetting: string): ClaudeOptions {
  return { apiKey: Deno.env.get('ANTHROPIC_API_KEY'), model: Deno.env.get(modelSetting) || DEFAULT_MODEL };
}

export function claudeClient(options: ClaudeOptions): Anthropic {
  if (!options.apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set. Add it with: npx supabase secrets set ANTHROPIC_API_KEY=...');
  }
  return new Anthropic({
    apiKey: options.apiKey,
    timeout: options.timeout,
    maxRetries: options.maxRetries,
    fetch: options.fetch,
  });
}
