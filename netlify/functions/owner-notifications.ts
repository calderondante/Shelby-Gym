import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "../../src/lib/supabase/database";
import { pushSubscriptionSchema } from "../../src/features/notifications/domain/contracts";
import {
  sendOwnerPush,
  pushErrorCode,
} from "../../src/features/notifications/server/push-transport";
const jobSchema = pushSubscriptionSchema.extend({
  id: z.uuid(),
  leaseId: z.uuid(),
});
export const config = { schedule: "0 * * * *" };
export default async function ownerNotifications() {
  const e = process.env;
  if (
    !e.NEXT_PUBLIC_SUPABASE_URL ||
    !e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    !e.SHELBY_NOTIFICATION_WORKER_EMAIL ||
    !e.SHELBY_NOTIFICATION_WORKER_PASSWORD ||
    !e.SHELBY_VAPID_PUBLIC_KEY ||
    !e.SHELBY_VAPID_PRIVATE_KEY ||
    !e.SHELBY_VAPID_SUBJECT
  ) {
    console.warn("Owner notifications: configuration missing.");
    return new Response(null, { status: 503 });
  }
  const db = createClient<Database>(
    e.NEXT_PUBLIC_SUPABASE_URL,
    e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, options) =>
          fetch(input, { ...options, signal: AbortSignal.timeout(5000) }),
      },
    },
  );
  const login = await db.auth.signInWithPassword({
    email: e.SHELBY_NOTIFICATION_WORKER_EMAIL,
    password: e.SHELBY_NOTIFICATION_WORKER_PASSWORD,
  });
  if (login.error) {
    console.warn("Owner notifications: worker access rejected.");
    return new Response(null, { status: 503 });
  }
  let accepted = 0,
    failed = 0;
  try {
    const claimed = await db.rpc("claim_owner_push_jobs", { p_limit: 8 });
    if (claimed.error) throw new Error("claim");
    const jobs = z.array(jobSchema).max(8).parse(claimed.data);
    // Small batches bound provider concurrency and the scheduled function duration.
    for (let i = 0; i < jobs.length; i += 8)
      await Promise.all(
        jobs.slice(i, i + 8).map(async (job) => {
          let state = "accepted",
            code: number | null = null;
          try {
            await sendOwnerPush(job, {
              publicKey: e.SHELBY_VAPID_PUBLIC_KEY!,
              privateKey: e.SHELBY_VAPID_PRIVATE_KEY!,
              subject: e.SHELBY_VAPID_SUBJECT!,
            });
            accepted++;
          } catch (error) {
            code = pushErrorCode(error);
            state =
              code === 404 || code === 410
                ? "gone"
                : code === 429 || (code !== null && code >= 500)
                  ? "failed"
                  : "unknown";
            failed++;
          }
          const saved = await db.rpc("finish_owner_push_job", {
            p_id: job.id,
            p_lease: job.leaseId,
            p_status: state,
            ...(code === null ? {} : { p_code: code }),
          });
          if (saved.error) throw new Error("acknowledgement");
        }),
      );
    console.log(
      JSON.stringify({ task: "owner-notifications", accepted, failed }),
    );
    return new Response(null, { status: 204 });
  } catch {
    console.warn(
      "Owner notifications: run incomplete; check the private delivery queue.",
    );
    return new Response(null, { status: 503 });
  } finally {
    await db.auth.signOut({ scope: "local" });
  }
}
