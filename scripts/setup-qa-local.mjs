// Disposable local QA only. Never connect this stack to production data.
import { execFileSync } from "node:child_process";
import { randomBytes, createHmac } from "node:crypto";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { resolve } from "node:path";
const root = process.cwd(),
  state = "/tmp/shelby-qa-local";
const run = (args, input) =>
  execFileSync("docker", args, {
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
const sql = (query) =>
  run(
    [
      "exec",
      "-i",
      "shelby-qa-db",
      "psql",
      "-U",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    query,
  );
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
if (existsSync(resolve(root, ".env.local")))
  throw Error(
    "Existing .env.local preserved. Use the existing local stack or a fresh checkout.",
  );
mkdirSync(state, { recursive: true, mode: 0o700 });
const secret = randomBytes(40).toString("hex"),
  password = randomBytes(24).toString("hex");
const jwt = (role) => {
  const enc = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const body =
    enc({ alg: "HS256", typ: "JWT" }) +
    "." +
    enc({
      role,
      iss: "supabase-local",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400 * 30,
    });
  return (
    body + "." + createHmac("sha256", secret).update(body).digest("base64url")
  );
};
const anon = jwt("anon"),
  service = jwt("service_role");
const envFile = (name, values) => {
  const path = state + "/" + name;
  writeFileSync(
    path,
    Object.entries(values)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n") + "\n",
    { mode: 0o600 },
  );
  return path;
};
try {
  run(["network", "inspect", "shelby-qa"]);
} catch {
  run(["network", "create", "shelby-qa"]);
}
run([
  "run",
  "-d",
  "--name",
  "shelby-qa-db",
  "--network",
  "shelby-qa",
  "-p",
  "127.0.0.1:54322:5432",
  "--env-file",
  envFile("db.env", { POSTGRES_PASSWORD: password, POSTGRES_DB: "postgres" }),
  "postgres:17-alpine",
  "postgres",
  "-c",
  "wal_level=logical",
  "-c",
  "max_replication_slots=10",
  "-c",
  "max_wal_senders=10",
]);
for (let i = 0; ; i++) {
  try {
    sql("select 1;");
    break;
  } catch {
    if (i > 80) throw Error("Local database did not become ready");
    await pause(250);
  }
}
sql(
  `create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create role authenticator login noinherit password '${password}'; grant anon,authenticated,service_role to authenticator; create role supabase_auth_admin login createrole password '${password}'; create schema auth authorization supabase_auth_admin; grant all on schema public to supabase_auth_admin; grant usage on schema public,auth to anon,authenticated,service_role; alter default privileges in schema public grant all on tables to service_role; alter default privileges in schema public grant all on sequences to service_role; create publication supabase_realtime;`,
);
run([
  "run",
  "-d",
  "--name",
  "shelby-qa-auth",
  "--network",
  "shelby-qa",
  "-p",
  "127.0.0.1:54324:9999",
  "--env-file",
  envFile("auth.env", {
    GOTRUE_API_HOST: "0.0.0.0",
    GOTRUE_API_PORT: 9999,
    API_EXTERNAL_URL: "http://127.0.0.1:54321/auth/v1",
    GOTRUE_SITE_URL: "http://127.0.0.1:3000",
    GOTRUE_DB_DRIVER: "postgres",
    GOTRUE_DB_DATABASE_URL: `postgres://supabase_auth_admin:${password}@shelby-qa-db:5432/postgres?search_path=auth`,
    GOTRUE_JWT_SECRET: secret,
    GOTRUE_JWT_EXP: 3600,
    GOTRUE_JWT_AUD: "authenticated",
    GOTRUE_JWT_DEFAULT_GROUP_NAME: "authenticated",
    GOTRUE_JWT_ADMIN_ROLES: "service_role",
    GOTRUE_EXTERNAL_EMAIL_ENABLED: true,
    GOTRUE_DISABLE_SIGNUP: true,
    GOTRUE_MAILER_AUTOCONFIRM: true,
    GOTRUE_RATE_LIMIT_EMAIL_SENT: 1000,
    GOTRUE_RATE_LIMIT_TOKEN_REFRESH: 1000,
    GOTRUE_RATE_LIMIT_VERIFY: 1000,
    GOTRUE_RATE_LIMIT_ANONYMOUS_USERS: 1000,
  }),
  "public.ecr.aws/supabase/gotrue:v2.197.0",
]);
for (let i = 0; ; i++) {
  try {
    if ((await fetch("http://127.0.0.1:54324/health")).ok) break;
  } catch {}
  if (i > 100) throw Error("Local Auth did not become ready");
  await pause(250);
}
sql(
  `create or replace function auth.uid() returns uuid language sql stable as $$ select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;`,
);
sql(
  `create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim',true),''),nullif(current_setting('request.jwt.claims',true),''))::jsonb $$; grant execute on all functions in schema auth to anon,authenticated,service_role; create schema supabase_migrations; create table supabase_migrations.schema_migrations(version text primary key,statements text[],name text);`,
);
for (const file of readdirSync(resolve(root, "supabase/migrations"))
  .filter((x) => x.endsWith(".sql"))
  .sort()) {
  sql(
    "begin;\n" +
      readFileSync(resolve(root, "supabase/migrations", file), "utf8") +
      `\ninsert into supabase_migrations.schema_migrations(version,name) values('${file.split("_")[0]}','${file.replace(/^[0-9]+_|\.sql$/g, "")}');\ncommit;`,
  );
}
run([
  "run",
  "-d",
  "--name",
  "shelby-qa-rest",
  "--network",
  "shelby-qa",
  "-p",
  "127.0.0.1:54325:3000",
  "--env-file",
  envFile("rest.env", {
    PGRST_DB_URI: `postgres://authenticator:${password}@shelby-qa-db:5432/postgres`,
    PGRST_DB_SCHEMAS: "public",
    PGRST_DB_ANON_ROLE: "anon",
    PGRST_JWT_SECRET: secret,
    PGRST_DB_MAX_ROWS: 1000,
    PGRST_DB_POOL: 10,
  }),
  "public.ecr.aws/supabase/postgrest:v16.4",
]);
writeFileSync(
  resolve(root, ".env.local"),
  `# Disposable LOCAL QA only. Do not export.\nNEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${anon}\nSUPABASE_SERVICE_ROLE_KEY=${service}\n`,
  { mode: 0o600, flag: "wx" },
);
writeFileSync(
  state + "/runtime.json",
  JSON.stringify({ password, secret, anon, service }),
  { mode: 0o600 },
);
console.log(
  "Local PostgreSQL 17 + Auth + REST created; all repository migrations applied. Start node scripts/setup-qa-proxy.mjs separately. No credential values printed.",
);
