import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseConfig, supabaseConfig } from "@/lib/supabase/env";
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const origin = hasSupabaseConfig()
    ? new URL(supabaseConfig().url).origin
    : "";
  const wsOrigin = origin.replace(/^http/, "ws");
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${origin} ${wsOrigin}${isDev ? " ws://localhost:3000 ws://127.0.0.1:3000" : ""}`,
    "img-src 'self' data: blob:",
    "worker-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  function makeResponse() {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", csp);
    const next = NextResponse.next({ request: { headers } });
    next.headers.set("Content-Security-Policy", csp);
    next.headers.set("Cache-Control", "private, no-store, max-age=0");
    return next;
  }
  let response = makeResponse();
  if (!hasSupabaseConfig()) return response;
  const { url, key } = supabaseConfig();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        for (const { name, value } of values) request.cookies.set(name, value);
        response = makeResponse();
        for (const { name, value, options } of values)
          response.cookies.set(name, value, options);
        for (const [name, value] of Object.entries(headers))
          response.headers.set(name, value);
        response.headers.set("Cache-Control", "private, no-store, max-age=0");
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}
export const config = {
  matcher: ["/((?!_next/|favicon.ico|brand/).*)"],
};
