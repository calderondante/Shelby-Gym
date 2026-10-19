// Verification of the workspace brain; no product dependencies or network calls.
import { createHash } from 'node:crypto';
import { readdir, readFile, lstat } from 'node:fs/promises';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const read = (path) => readFile(join(root, path), 'utf8');
const git = (args, input) => spawnSync('git', args, {
  cwd: root, encoding: 'utf8', input, windowsHide: true,
});

async function filesUnder(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const stat = await lstat(path);
    check(!stat.isSymbolicLink(), `Symlink inesperado: ${relative(root, path)}`);
    if (stat.isDirectory()) result.push(...await filesUnder(path));
    else if (stat.isFile()) result.push(path);
  }
  return result;
}

try {
  for (const path of [
    'AGENTS.md', 'README.md', '.gitignore', '.env.example', '.editorconfig',
    'docs/PRODUCT.md', 'docs/ARCHITECTURE.md', 'docs/DESIGN_SYSTEM.md',
    'docs/DATA_MODEL.md', 'docs/SECURITY.md', 'docs/DECISIONS.md', 'docs/QA.md',
    'docs/SKILLS.md', 'docs/WORKSPACE.md', 'docs/THIRD_PARTY_NOTICES.md',
  ]) check((await read(path)).trim().length > 0, `Archivo vacío: ${path}`);

  const lock = JSON.parse(await read('skills-lock.json'));
  const provenance = JSON.parse(await read('docs/skills-provenance.json'));
  const names = Object.keys(lock.skills).sort();
  check(JSON.stringify(names) === JSON.stringify(Object.keys(provenance.skills).sort()),
    'Inventarios lock/procedencia distintos');
  const skillsDir = join(root, '.agents', 'skills');
  const installed = (await readdir(skillsDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  check(JSON.stringify(names) === JSON.stringify(installed), 'Inventario instalado distinto al lock');

  let fileCount = 0;
  for (const name of names) {
    const source = provenance.skills[name];
    check(source.source === lock.skills[name].source, `Fuente distinta: ${name}`);
    check(source.skillPath === lock.skills[name].skillPath, `Ruta upstream distinta: ${name}`);
    check(/^[a-f0-9]{40}$/.test(source.commit), `Commit inválido: ${name}`);
    const skillRoot = join(skillsDir, name);
    const files = await filesUnder(skillRoot);
    const actualNames = files.map((path) => relative(skillRoot, path).split('\\').join('/')).sort();
    check(JSON.stringify(actualNames) === JSON.stringify(Object.keys(source.filesSha256).sort()),
      `Archivos añadidos/ausentes en ${name}`);
    const body = await readFile(join(skillRoot, 'SKILL.md'), 'utf8');
    check(body.startsWith('---\n') && body.includes(`\nname: ${name}\n`), `Frontmatter/nombre inválido: ${name}`);
    check(/\ndescription:\s*\S/.test(body), `Descripción ausente: ${name}`);
    for (const path of files) {
      const key = relative(skillRoot, path).split('\\').join('/');
      const hash = createHash('sha256').update(await readFile(path)).digest('hex');
      check(hash === source.filesSha256[key], `Contenido modificado: ${name}/${key}`);
      fileCount++;
    }
  }

  for (const line of (await read('.env.example')).split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    check(/^[A-Z][A-Z0-9_]*=$/.test(line), '.env.example debe tener valores vacíos');
  }

  check(git(['rev-parse', '--is-inside-work-tree']).status === 0, 'Git no inicializado');
  const excluded = [
    '.env', '.env.local', '.env.production.local', '.env.staging',
    'node_modules/probe', '.next/probe', 'dist/probe', 'coverage/probe',
    '.DS_Store', '.idea/workspace.xml', '.vscode/private.json',
    'shared/probe', 'scratch/probe', 'library-files/probe',
  ];
  for (const path of excluded) {
    check(git(['check-ignore', '--no-index', '-q', path]).status === 0, `No se ignora: ${path}`);
  }
  for (const path of ['.env.example', 'AGENTS.md', 'docs/PRODUCT.md',
    'skills-lock.json', '.agents/skills/animate/SKILL.md', 'supabase/migrations/probe.sql']) {
    check(git(['check-ignore', '--no-index', '-q', path]).status === 1, `Se ignora un archivo versionable: ${path}`);
  }
  const tracked = git(['ls-files', '-z']);
  check(tracked.status === 0, 'No se pudo inspeccionar el índice Git');
  for (const path of (tracked.stdout ?? '').split('\0').filter(Boolean)) {
    check(!/(^|\/)\.env(?:\.|$)/.test(path) || path === '.env.example', `Env rastreado: ${path}`);
    check(!/\.(pem|key)$/.test(path) && !/(^|\/)(\.npmrc|\.netrc)$/.test(path), `Archivo sensible rastreado: ${path}`);
  }

  if (failures.length) {
    for (const failure of failures) console.error(`FAIL: ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`OK: documentación, ${names.length} skills, ${fileCount} archivos de skills íntegros, Git y exclusiones.`);
    console.log('Sin red, sin instalaciones ni modificaciones. No valida aún una aplicación ni descarta secretos arbitrarios en otros archivos.');
  }
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
}
