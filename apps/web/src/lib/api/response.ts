import { NextResponse } from "next/server";
import { apiError, type ApiErrorBody, type ErrorCode } from "@careerpulse/shared-types";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  TOKEN_EXPIRED: 401,
  RATE_LIMITED: 429,
  PROVIDER_ERROR: 502,
  VALIDATION_ERROR: 400,
  INTERNAL_ERROR: 500,
  NOT_FOUND: 404,
  KILL_SWITCH_ACTIVE: 423,
};

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly retryable: boolean;

  constructor(code: ErrorCode, message: string, retryable?: boolean) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.retryable = retryable ?? (code === "RATE_LIMITED" || code === "PROVIDER_ERROR");
  }

  toBody(): ApiErrorBody {
    return apiError(this.code, this.message, this.retryable);
  }
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, { status: 200, ...init });
}

export function created<T>(data: T): NextResponse<T> {
  return NextResponse.json(data, { status: 201 });
}

export function fail(code: ErrorCode, message: string, retryable = false): NextResponse<ApiErrorBody> {
  return NextResponse.json(apiError(code, message, retryable), { status: STATUS_BY_CODE[code] });
}

/** Detects the control-flow error thrown by `redirect()` in Next.js. */
export function isNextRedirect(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

/** Converts any thrown value into the standard error envelope. */
export function toErrorResponse(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof ApiError) {
    return NextResponse.json(error.toBody(), { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Unexpected server error";
  return NextResponse.json(
    apiError("INTERNAL_ERROR", process.env.NODE_ENV === "production" ? "Unexpected server error" : message, false),
    { status: 500 },
  );
}

/** Parses and validates a JSON body against a Zod schema. */
export async function parseBody<T>(
  request: Request,
  schema: { safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: { issues: { message: string }[] } } },
): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const detail = result.error.issues.map((issue) => issue.message).join("; ");
    throw new ApiError("VALIDATION_ERROR", detail || "Invalid request payload.");
  }
  return result.data;
}
