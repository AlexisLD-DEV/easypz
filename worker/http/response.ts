import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

export function json(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers
    }
  });
}

export function fail(error: unknown) {
  if (error instanceof HttpError) {
    return json({ error: error.code }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return json({ error: "validation_error", issues: error.issues }, { status: 400 });
  }
  if (error instanceof SyntaxError) {
    return json({ error: "invalid_json" }, { status: 400 });
  }
  return json({ error: "internal_error" }, { status: 500 });
}
