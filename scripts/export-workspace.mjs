// Export source and documentation only. Requires Git and tar; never exports DB state.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destination = resolve(process.argv[2] ?? "/tmp/shelby-gym-source.tar.gz");
const localPath = relative(root, destination);
if (!localPath.startsWith(`..${sep}`) || existsSync(destination)) {
  throw new Error("Choose a new archive path outside the repository.");
}
const candidates = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { cwd: root, encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const allowedDirectories = new Set([
  ".agents",
  "docs",
  "public",
  "scripts",
  "src",
  "supabase",
  "tests",
]);
const rootFiles = new Set([
  ".editorconfig",
  ".env.example",
  ".gitignore",
  "AGENTS.md",
  "README.md",
  "components.json",
  "eslint.config.mjs",
  "next-env.d.ts",
  "next.config.ts",
  "package.json",
  "playwright.config.ts",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "postcss.config.mjs",
  "skills-lock.json",
  "tsconfig.json",
  "vitest.config.ts",
]);
const files = [...new Set(candidates)]
  .filter(
    (path) =>
      rootFiles.has(path) ||
      (path.includes("/") && allowedDirectories.has(path.split("/")[0])),
  )
  .sort();
const sensitiveValues = [".env.local", ".env.test.local"].flatMap((path) => {
  if (!existsSync(resolve(root, path))) return [];
  return Object.entries(parseEnv(readFileSync(resolve(root, path), "utf8")))
    .filter(
      ([key, value]) =>
        /KEY|SECRET|PASSWORD|TOKEN/.test(key) && value.length >= 16,
    )
    .map(([, value]) => value);
});
for (const path of files) {
  if (
    path !== ".env.example" &&
    /(^|\/)\.env(?:\.|$)|(^|\/)(node_modules|\.next|\.git|\.temp|\.branches|test-results|playwright-report)(\/|$)|\.(pem|key|log|tsbuildinfo)$/.test(
      path,
    )
  ) {
    throw new Error(`Sensitive or generated path rejected: ${path}`);
  }
  if (!lstatSync(resolve(root, path)).isFile())
    throw new Error(`Non-file rejected: ${path}`);
  const contents = readFileSync(resolve(root, path));
  if (sensitiveValues.some((secret) => contents.includes(Buffer.from(secret))))
    throw new Error(`Local credential detected in ${path}; export cancelled.`);
}
execFileSync("tar", ["-czf", destination, "-C", root, "--null", "-T", "-"], {
  input: files.join("\0") + "\0",
});
const sha256 = createHash("sha256")
  .update(readFileSync(destination))
  .digest("hex");
console.log(
  JSON.stringify(
    { archive: destination, files: files.length, sha256 },
    null,
    2,
  ),
);
