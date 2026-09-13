import { Injectable, BadRequestException } from '@nestjs/common';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface RunResult {
  provider: string;
  model: string;
  output: string;
  input_tokens?: number;
  output_tokens?: number;
  latency_ms: number;
}

@Injectable()
export class RunnerService {
  /**
   * Execute a prompt string against the chosen provider.
   * Supports BYOK (api_key in body) or falls back to server env keys.
   */
  async run(
    promptContent: string,
    userInput: string,
    provider: 'openai' | 'anthropic' | 'google',
    model?: string,
    temperature?: number,
    apiKey?: string,
  ): Promise<RunResult> {
    const start = Date.now();

    // Merge prompt template with user input (simple substitution)
    const fullPrompt = `${promptContent}\n\nUser: ${userInput}`;

    switch (provider) {
      case 'openai':
        return this.runOpenAI(fullPrompt, model ?? 'gpt-4o', temperature ?? 0.7, apiKey, start);
      case 'anthropic':
        return this.runAnthropic(fullPrompt, model ?? 'claude-3-5-sonnet-20241022', temperature ?? 0.7, apiKey, start);
      case 'google':
        return this.runGoogle(fullPrompt, model ?? 'gemini-1.5-pro', apiKey, start);
      default:
        throw new BadRequestException(`Unknown provider: ${provider}`);
    }
  }

  private async runOpenAI(
    prompt: string,
    model: string,
    temperature: number,
    apiKey?: string,
    start?: number,
  ): Promise<RunResult> {
    const key = apiKey ?? process.env.OPENAI_API_KEY;
    if (!key) throw new BadRequestException('OpenAI API key is required');

    const client = new OpenAI({ apiKey: key });
    const response = await client.chat.completions.create({
      model,
      temperature,
      messages: [{ role: 'user', content: prompt }],
    });

    const choice = response.choices[0];
    return {
      provider: 'openai',
      model,
      output: choice.message.content ?? '',
      input_tokens: response.usage?.prompt_tokens,
      output_tokens: response.usage?.completion_tokens,
      latency_ms: Date.now() - (start ?? Date.now()),
    };
  }

  private async runAnthropic(
    prompt: string,
    model: string,
    temperature: number,
    apiKey?: string,
    start?: number,
  ): Promise<RunResult> {
    const key = apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!key) throw new BadRequestException('Anthropic API key is required');

    const client = new Anthropic({ apiKey: key });
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      temperature,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    return {
      provider: 'anthropic',
      model,
      output: textBlock?.type === 'text' ? textBlock.text : '',
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      latency_ms: Date.now() - (start ?? Date.now()),
    };
  }

  private async runGoogle(
    prompt: string,
    model: string,
    apiKey?: string,
    start?: number,
  ): Promise<RunResult> {
    const key = apiKey ?? process.env.GOOGLE_API_KEY;
    if (!key) throw new BadRequestException('Google API key is required');

    const genAI = new GoogleGenerativeAI(key);
    const genModel = genAI.getGenerativeModel({ model });
    const result = await genModel.generateContent(prompt);
    const response = result.response;

    return {
      provider: 'google',
      model,
      output: response.text(),
      latency_ms: Date.now() - (start ?? Date.now()),
    };
  }
}
