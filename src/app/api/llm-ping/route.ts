import {
  LlmError,
  chatText,
  isLlmConfigured,
  listModels,
  llmConfig,
} from "@/lib/llm";

/** Test route for the GMI Cloud connection. Safe to delete before the demo. */
export async function GET() {
  const { baseUrl, model } = llmConfig();
  if (!isLlmConfigured()) {
    return Response.json(
      {
        ok: false,
        error: "GMI_API_KEY is not set. Add it to .env.local.",
        baseUrl,
        model,
      },
      { status: 503 },
    );
  }

  try {
    const [reply, models] = await Promise.all([
      chatText(
        "You are a connection test. Reply with one short sentence.",
        "Say hello from GMI Cloud.",
        { maxTokens: 60 },
      ),
      listModels().catch(() => [] as string[]),
    ]);
    return Response.json({
      ok: true,
      reply: reply.trim(),
      baseUrl,
      model,
      modelListed: models.length ? models.includes(model) : null,
    });
  } catch (error) {
    const models = await listModels().catch(() => [] as string[]);
    return Response.json(
      {
        ok: false,
        error: error instanceof LlmError ? error.message : String(error),
        baseUrl,
        model,
        modelListed: models.length ? models.includes(model) : null,
        availableModels: models.slice(0, 40),
      },
      { status: 502 },
    );
  }
}
