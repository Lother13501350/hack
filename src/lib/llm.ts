/**
 * GMI Cloud LLM client (issue #1).
 *
 * GMI's inference API is OpenAI-compatible, so this is a thin `fetch` wrapper
 * with no SDK. The LLM only extracts, explains and writes; it never produces
 * a financial number (see src/lib/finance for those).
 *
 * Server-only: reads GMI_API_KEY from the environment.
 */
import { z } from "zod";

const DEFAULT_BASE_URL = "https://api.gmi-serving.com/v1";
const DEFAULT_MODEL = "Qwen/Qwen3.6-35B-A3B";
const TIMEOUT_MS = 30_000;

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
    apiKey: process.env.GMI_API_KEY?.trim() ?? "",
    baseUrl: (process.env.GMI_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(
      /\/+$/,
      "",
    ),
    model: process.env.GMI_MODEL?.trim() || DEFAULT_MODEL,
  };
}

export function isLlmConfigured(): boolean {
  return llmConfig().apiKey.length > 0;
}

type ChatMessage = { role: "system" | "user"; content: string };

interface ChatOptions {
  maxTokens?: number;
  temperature?: number;
  json?: boolean;
}

async function chatRaw(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<string> {
  const { apiKey, baseUrl, model } = llmConfig();
  if (!apiKey) {
    throw new LlmError("GMI_API_KEY is not set", "not_configured");
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0,
        max_tokens: options.maxTokens ?? 2000,
        // GMI truncates over-long prompts silently by default; fail instead.
        context_length_exceeded_behavior: "error",
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
        ? `GMI request timed out after ${TIMEOUT_MS / 1000}s`
        : `GMI request failed: ${String(error)}`,
      timedOut ? "timeout" : "http",
    );
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new LlmError(`GMI returned ${response.status}: ${detail}`, "http");
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new LlmError("GMI returned an empty message", "invalid_json");
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

/** Pulls the first JSON object out of a model reply (tolerates code fences and reasoning preambles). */
function parseJsonObject(text: string): unknown {
  const withoutThinking = text.replace(/<think>[\s\S]*?<\/think>/g, "");
  const start = withoutThinking.indexOf("{");
  const end = withoutThinking.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new LlmError("No JSON object in the model reply", "invalid_json");
  }
  try {
    return JSON.parse(withoutThinking.slice(start, end + 1));
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

/** Lists model IDs the key can use, to catch a mistyped GMI_MODEL early. */
export async function listModels(): Promise<string[]> {
  const { apiKey, baseUrl } = llmConfig();
  if (!apiKey) throw new LlmError("GMI_API_KEY is not set", "not_configured");
  const response = await fetch(`${baseUrl}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new LlmError(`GMI /models returned ${response.status}`, "http");
  }
  const data = (await response.json()) as { data?: { id: string }[] };
  return (data.data ?? []).map((model) => model.id);
}
