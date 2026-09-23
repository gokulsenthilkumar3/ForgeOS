import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const web = resolve(root, 'apps/web');

export function parseEnv(contents) {
  const values = {};
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const raw = match[2];
    values[match[1]] = (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")) ? raw.slice(1, -1) : raw;
  }
  return values;
}

export function validCredential(value, minimum) {
  return typeof value === 'string' && value.length >= minimum && !/replace|change.?me|example|placeholder/i.test(value);
}

export function ensureDevCredentials(rootDir, webDir, environment = process.env) {
  const rootFile = resolve(rootDir, '.env');
  const localFile = resolve(webDir, '.env.local');
  const rootValues = existsSync(rootFile) ? parseEnv(readFileSync(rootFile, 'utf8')) : {};
  const localValues = existsSync(localFile) ? parseEnv(readFileSync(localFile, 'utf8')) : {};
  const choose = (key, minimum) => [environment[key], localValues[key], rootValues[key]].find(value => validCredential(value, minimum));
  let password = choose('FORGEOS_ADMIN_PASSWORD', 8);
  let secret = choose('FORGEOS_SESSION_SECRET', 32);
  let generated = false;
  if (!password || !secret) {
    if (existsSync(localFile)) throw new Error('apps/web/.env.local has missing or example credentials. Set FORGEOS_ADMIN_PASSWORD and FORGEOS_SESSION_SECRET (32+ characters) there.');
    password ||= randomBytes(24).toString('base64url');
    secret ||= randomBytes(48).toString('base64url');
    writeFileSync(localFile, `FORGEOS_ADMIN_PASSWORD=${password}\nFORGEOS_SESSION_SECRET=${secret}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    generated = true;
  }
  return { password, secret, generated, localFile };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const credentials = ensureDevCredentials(root, web);
    if (credentials.generated) console.log(`ForgeOS local login created in ${credentials.localFile}. Open that file to find your administrator password.`);
    const child = spawn(process.execPath, [resolve(web, 'node_modules/next/dist/bin/next'), 'dev', ...process.argv.slice(2)], {
      cwd: web, stdio: 'inherit',
      env: { ...process.env, FORGEOS_ADMIN_PASSWORD: credentials.password, FORGEOS_SESSION_SECRET: credentials.secret },
    });
    child.on('exit', code => { process.exitCode = code ?? 1; });
    process.on('SIGINT', () => child.kill('SIGINT'));
    process.on('SIGTERM', () => child.kill('SIGTERM'));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
