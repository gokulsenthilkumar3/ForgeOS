import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { generateScaffold, scaffoldTemplates, validateProjectName } from '../apps/web/app/modules/[id]/scaffold-engine.mjs';
import { formatCommit, validateGeneratedCommit } from '../apps/web/app/modules/[id]/commit-engine.mjs';

const requireFromWeb = createRequire(new URL('../apps/web/package.json', import.meta.url));
const JSZip = requireFromWeb('jszip');
const typescript = requireFromWeb('typescript');

test('CommitCraft formats and validates a single conventional commit', () => {
  assert.equal(formatCommit({ kind: 'feat', scope: 'api', summary: 'Add alerts' }), 'feat(api): add alerts');
  assert.equal(validateGeneratedCommit('fix: recover connection'), 'fix: recover connection');
  assert.throws(() => formatCommit({ kind: 'feat', scope: '../bad', summary: 'Update' }), /Scope/);
  assert.throws(() => formatCommit({ kind: 'feat', summary: 'first\nsecond' }), /Summary/);
  assert.throws(() => validateGeneratedCommit('A paragraph, not a commit'), /Conventional Commit/);
});

test('StackForge rejects unsafe and invalid names', () => {
  for (const name of ['../escape', 'A Space', 'a--b', 'con', 'x', 'a/', 'a-']) {
    assert.notEqual(validateProjectName(name), '', name);
    assert.throws(() => generateScaffold({ name, template: 'next' }), undefined, name);
  }
  assert.equal(validateProjectName('my-app-2'), '');
  assert.throws(() => generateScaffold({ name: 'my-app', template: 'missing' }), /supported template/);
});

test('StackForge emits syntactically valid entry points and a usable package manifest', () => {
  for (const { id } of scaffoldTemplates) {
    const files = generateScaffold({ name: 'my-app', template: id });
    const pkg = JSON.parse(files['package.json']);
    assert.equal(pkg.name, 'my-app');
    assert.ok(pkg.scripts.build);
    assert.ok(files['README.md'].includes('npm install'));
    assert.ok(!Object.keys(files).some(path => path.startsWith('/') || path.includes('..') || path.includes('\\')));
    const entry = id === 'next' ? files['app/page.tsx'] : files['src/index.ts'];
    const output = typescript.transpileModule(entry, { reportDiagnostics: true, compilerOptions: { module: typescript.ModuleKind.ESNext, jsx: typescript.JsxEmit.ReactJSX } });
    assert.equal(output.diagnostics?.length || 0, 0, id);
    assert.ok(output.outputText.length > 0);
  }
});

test('StackForge ZIP round-trips exact generated files and options', async () => {
  const files = generateScaffold({ name: 'my-api', template: 'api', docker: true, ci: true });
  assert.ok(files['Dockerfile']);
  assert.ok(files['compose.yml']);
  assert.ok(files['.github/workflows/ci.yml']);
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) zip.file(path, content);
  const archive = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const loaded = await JSZip.loadAsync(archive);
  for (const [path, content] of Object.entries(files)) {
    assert.equal(await loaded.file(path)?.async('string'), content, path);
  }
  assert.throws(() => generateScaffold({ name: 'my-lib', template: 'library', docker: true }), /Docker/);
});
