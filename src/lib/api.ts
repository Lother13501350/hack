/** Small helpers shared by the route handlers. */
import { z } from "zod";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Reads a JSON body. An empty body is treated as `{}` so demo calls need no payload. */
export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "Request body is not valid JSON");
  }
}

export function parseBody<T>(schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ApiError(
      400,
      `Invalid request: ${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}

/** Wraps a handler so ApiError becomes a JSON error response. */
export function handle(
  handler: (request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      return await handler(request);
    } catch (error) {
      if (error instanceof ApiError) {
        return Response.json(
          { error: error.message },
          { status: error.status },
        );
      }
      console.error(error);
      return Response.json(
        { error: "Unexpected server error" },
        { status: 500 },
      );
    }
  };
}
