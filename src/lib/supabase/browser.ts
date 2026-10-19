"use client";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./env";
import type { Database } from "./database";
export function createClient() {
  const { url, key } = supabaseConfig();
  return createBrowserClient<Database>(url, key);
}
