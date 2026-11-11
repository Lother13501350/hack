/**
 * OpenAI LLM client (issue #1).
 *
 * A thin `fetch` wrapper over the Chat Completions API, no SDK. Any
 * OpenAI-compatible endpoint works by setting OPENAI_BASE_URL.
 * The LLM only extracts, explains and writes; it never produces a financial
 * number (see src/lib/finance for those).
 *
 * Server-only: reads OPENAI_API_KEY from the environment.
 */
import { z } from "zod";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-6-luna";
const TIMEOUT_MS = 30_000;
/**
 * "low" is accepted by every current GPT model and keeps replies fast.
 * If an endpoint rejects the parameter, the request is retried without it.
 */
const REASONING_EFFORT = "low";
/** max_completion_tokens also covers hidden reasoning tokens, so leave room for them. */
const REASONING_HEADROOM_TOKENS = 2000;

export class LlmError extends Error {
  constructor(
    message: string,
    readonly code:
      "not_configured" | "timeout" | "http" | "invalid_json" | "invalid_shape",
  ) {
    super(message);
    this.name = "LlmError";
  }
}

export function llmConfig() {
  return {
    apiKey: process.env.OPENAI_API_KEY?.trim() ?? "",
    baseUrl: (process.env.OPENAI_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(
      /\/+$/,
      "",
    ),
    model: process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL,
  };
}

export function isLlmConfigured(): boolean {
  return llmConfig().apiKey.length > 0;
}

type ChatMessage = { role: "system" | "user"; content: string };

interface ChatOptions {
  /** Budget for the visible reply. Reasoning headroom is added on top. */
  maxTokens?: number;
  json?: boolean;
}

async function postChat(
  messages: ChatMessage[],
  options: ChatOptions,
  withReasoningEffort: boolean,
): Promise<Response> {
  const { apiKey, baseUrl, model } = llmConfig();
  try {
    return await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      // No `temperature`: reasoning models only accept the default.
      body: JSON.stringify({
        model,
        messages,
        max_completion_tokens:
          (options.maxTokens ?? 2000) + REASONING_HEADROOM_TOKENS,
        ...(withReasoningEffort ? { reasoning_effort: REASONING_EFFORT } : {}),
        ...(options.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    throw new LlmError(
      timedOut
        ? `LLM request timed out after ${TIMEOUT_MS / 1000}s`
        : `LLM request failed: ${String(error)}`,
      timedOut ? "timeout" : "http",
    );
  }
}

async function chatRaw(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<string> {
  if (!isLlmConfigured()) {
    throw new LlmError("OPENAI_API_KEY is not set", "not_configured");
  }

  let response = await postChat(messages, options, true);
  if (response.status === 400) {
    const detail = await response.text();
    if (!detail.includes("reasoning_effort")) {
      throw new LlmError(`LLM returned 400: ${detail.slice(0, 300)}`, "http");
    }
    // The model or endpoint does not take reasoning_effort; send without it.
    response = await postChat(messages, options, false);
  }
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new LlmError(`LLM returned ${response.status}: ${detail}`, "http");
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new LlmError("LLM returned an empty message", "invalid_json");
  }
  return content;
}

/** Plain text completion. */
export async function chatText(
  system: string,
  user: string,
  options: Omit<ChatOptions, "json"> = {},
): Promise<string> {
  return chatRaw(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    options,
  );
}

/** Pulls the first JSON object out of a model reply (tolerates code fences and preambles). */
function parseJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new LlmError("No JSON object in the model reply", "invalid_json");
  }
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new LlmError("Model reply is not valid JSON", "invalid_json");
  }
}

/**
 * Asks for a JSON object and validates it against `schema`.
 * Retries once on a malformed or mis-shaped reply, telling the model what was wrong.
 * Throws LlmError when the key is missing, the call fails or both attempts are invalid;
 * callers fall back to a template.
 */
export async function chatJSON<T>(
  system: string,
  user: string,
  schema: z.ZodType<T>,
  options: Omit<ChatOptions, "json"> = {},
): Promise<T> {
  const jsonSchema = JSON.stringify(z.toJSONSchema(schema));
  const fullSystem = `${system}

Reply with one JSON object and nothing else. It must match this JSON Schema:
${jsonSchema}`;

  let problem = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = problem
      ? `${user}

Your previous reply was rejected: ${problem}
Reply again with a corrected JSON object.`
      : user;
    const text = await chatRaw(
      [
        { role: "system", content: fullSystem },
        { role: "user", content: prompt },
      ],
      { ...options, json: true },
    );
    try {
      const parsed = schema.safeParse(parseJsonObject(text));
      if (parsed.success) return parsed.data;
      problem = z.prettifyError(parsed.error).slice(0, 600);
    } catch (error) {
      if (!(error instanceof LlmError)) throw error;
      problem = error.message;
    }
  }
  throw new LlmError(
    `Model reply failed validation twice: ${problem}`,
    "invalid_shape",
  );
}

/** Lists model IDs the key can use, to catch a mistyped OPENAI_MODEL early. */
export async function listModels(): Promise<string[]> {
  const { apiKey, baseUrl } = llmConfig();
  if (!apiKey) {
    throw new LlmError("OPENAI_API_KEY is not set", "not_configured");
  }
  const response = await fetch(`${baseUrl}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new LlmError(`LLM /models returned ${response.status}`, "http");
  }
  const data = (await response.json()) as { data?: { id: string }[] };
  return (data.data ?? []).map((model) => model.id);
}
