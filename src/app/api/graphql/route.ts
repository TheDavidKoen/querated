// The single GraphQL endpoint. Requests are size-checked and rate-limited here, before Yoga
// parses anything, and only POST is served in production so search terms never sit in URLs or
// access logs.

import { MAX_BODY_BYTES } from "@/lib/contract";
import { createQueratedYoga } from "@/server/graphql/yoga";
import { met } from "@/server/met/instance";
import { clientAddress, createRateLimiter } from "@/server/rate-limit";

export const maxDuration = 30;

const production = process.env.NODE_ENV === "production";
const yoga = createQueratedYoga({ met, production });
const rateLimiter = createRateLimiter({ limit: 20, windowMs: 60_000 });

function refuse(status: number, code: string, message: string, headers: HeadersInit = {}) {
  return Response.json(
    { errors: [{ message, extensions: { code } }] },
    { status, headers: { "cache-control": "no-store", ...headers } },
  );
}

const TOO_LARGE = `Requests are limited to ${MAX_BODY_BYTES / 1024} KB.`;

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return refuse(413, "PAYLOAD_TOO_LARGE", TOO_LARGE);
  }

  const verdict = rateLimiter.take(clientAddress(request.headers));
  if (!verdict.allowed) {
    return refuse(
      429,
      "RATE_LIMITED",
      `Too many queries. Try again in ${verdict.retryAfterSeconds} seconds.`,
      { "retry-after": String(verdict.retryAfterSeconds) },
    );
  }

  const body = await request.text();
  if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
    return refuse(413, "PAYLOAD_TOO_LARGE", TOO_LARGE);
  }

  return yoga.handleRequest(
    new Request(request.url, { method: "POST", headers: request.headers, body }),
    {},
  );
}

export async function GET(request: Request) {
  if (production) {
    return new Response(null, { status: 405, headers: { allow: "POST" } });
  }
  return yoga.handleRequest(request, {});
}
