/**
 * Gemini service — the only file that talks to Google's API.
 *
 * Server-only (GEMINI_API_KEY never reaches the client). Runs the
 * generate → tool-call → tool-result loop until the model produces text,
 * with a hard round cap. Provider-specific types stay inside this module so
 * swapping models later means rewriting one file, not the AI system.
 */

import { GoogleGenAI, ApiError, type Content, type Part, type FunctionDeclaration } from '@google/genai';

// gemini-3.6-flash: current Flash generation (older 2.5 models are retired
// for new API users — the API 404s with exactly this guidance)
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash';
const MAX_TOOL_ROUNDS = 4;
const MAX_OUTPUT_TOKENS = 1024; // coach replies are deliberately short

export type GeminiFailure = 'rate_limit' | 'auth' | 'unavailable';

export class GeminiError extends Error {
    constructor(public kind: GeminiFailure, message: string) {
        super(message);
    }
}

export function isGeminiConfigured(): boolean {
    return !!process.env.GEMINI_API_KEY;
}

export interface CoachTurnInput {
    /** Stable coach identity (system-prompt.ts). */
    systemPrompt: string;
    /** Fresh structured user context for this request (context-builder.ts). */
    context: string;
    /** Conversation so far, oldest first (already length-capped by caller). */
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
    tools: FunctionDeclaration[];
    /** Executes one approved Iron Track tool, already scoped to the user. */
    executeTool: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

export interface CoachTurnResult {
    text: string;
    /** Tool names invoked this turn (for logs/observability). */
    toolCallsMade: string[];
}

function mapError(error: unknown): never {
    if (error instanceof ApiError) {
        if (error.status === 429) throw new GeminiError('rate_limit', 'Gemini rate limit');
        if (error.status === 401 || error.status === 403) throw new GeminiError('auth', 'Gemini auth failed');
        if (error.status >= 500) throw new GeminiError('unavailable', `Gemini ${error.status}`);
    }
    throw new GeminiError('unavailable', 'Gemini request failed');
}

export async function runCoachTurn(input: CoachTurnInput): Promise<CoachTurnResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const systemInstruction = `${input.systemPrompt}\n\nUSER CONTEXT (fresh for this request):\n${input.context}`;
    const contents: Content[] = input.history.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
    }));

    const toolCallsMade: string[] = [];

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
        // On the last permitted round, withhold tools to force a final answer
        const allowTools = round < MAX_TOOL_ROUNDS;
        let response;
        try {
            response = await ai.models.generateContent({
                model: MODEL,
                contents,
                config: {
                    systemInstruction,
                    maxOutputTokens: MAX_OUTPUT_TOKENS,
                    temperature: 0.6,
                    ...(allowTools ? { tools: [{ functionDeclarations: input.tools }] } : {}),
                },
            });
        } catch (error) {
            mapError(error);
        }

        const calls = response.functionCalls;
        if (!calls || calls.length === 0) {
            return { text: (response.text ?? '').trim(), toolCallsMade };
        }

        // Echo the model's tool-request turn, then answer every call in one
        // user turn (matching ids where the model provided them)
        const modelTurn = response.candidates?.[0]?.content;
        if (modelTurn) contents.push(modelTurn);

        const responseParts: Part[] = [];
        for (const call of calls) {
            const name = call.name ?? 'unknown';
            toolCallsMade.push(name);
            const result = await input.executeTool(name, call.args ?? {});
            responseParts.push({
                functionResponse: { name, response: result, ...(call.id ? { id: call.id } : {}) },
            });
        }
        contents.push({ role: 'user', parts: responseParts });
    }

    // Unreachable in practice (the last round runs tool-less), but keep a
    // typed failure rather than returning undefined text
    throw new GeminiError('unavailable', 'Tool loop did not converge');
}
