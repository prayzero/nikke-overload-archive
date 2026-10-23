import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test, { after, before } from "node:test";
import adapter, { globSync, sync } from "../vendor/fast-glob-compat/index.mjs";

const requireFromTest = createRequire(import.meta.url);
const adapterPath = fileURLToPath(new URL("../vendor/fast-glob-compat/index.cjs", import.meta.url));
const baseline = JSON.parse(await readFile(new URL("../vendor/fast-glob-compat/fixtures/upstream-baseline.json", import.meta.url), "utf8"));
let fixtureRoot;
let fixturePosix;

before(async () => {
  fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "nikke-glob-한글 공백-"));
  fixturePosix = fixtureRoot.replaceAll("\\", "/");
  for (const file of baseline.files) {
    const target = path.join(fixtureRoot, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, "export default 1;\n");
  }
  for (const directory of baseline.directories) await mkdir(path.join(fixtureRoot, directory), { recursive: true });
});

after(async () => {
  // This path was returned by mkdtemp above; never remove a caller-owned path.
  if (fixtureRoot) await rm(fixtureRoot, { recursive: true, force: true });
});

for (const entry of baseline.cases) {
  const unsupported = ["numeric-brace", "extglob"].includes(entry.name);
  test(`glob adapter ${unsupported ? "explicitly rejects unsupported upstream syntax" : "matches captured upstream behavior"}: ${entry.name}`, () => {
    const patterns = (Array.isArray(entry.patterns) ? entry.patterns : [entry.patterns])
      .map((pattern) => pattern.replaceAll("<ROOT>", fixturePosix));
    const options = { cwd: path.join(fixtureRoot, entry.cwd || ""), ...entry.options };
    if (unsupported) {
      assert.throws(() => sync(patterns, options), { code: "ERR_GLOB_UNSUPPORTED_PATTERN" });
      return;
    }
    const results = sync(patterns, options);
    assert.deepEqual(results.map((result) => result.replaceAll(fixturePosix, "<ROOT>")).sort(), entry.expected);
  });
}

test("CJS and ESM consumers receive both synchronous entry points", () => {
  const commonJs = requireFromTest(adapterPath);
  assert.equal(commonJs.sync, sync);
  assert.equal(commonJs.globSync, globSync);
  assert.equal(adapter.sync, globSync);
  assert.deepEqual(Object.keys(commonJs).sort(), ["globSync", "sync"]);
});

test("both installed consumers resolve the actual local adapter rather than a broken override link", async () => {
  const expectedPath = await realpath(adapterPath);
  for (const name of ["@next/eslint-plugin-next", "vite-plugin-dynamic-import"]) {
    const consumerEntry = requireFromTest.resolve(name);
    const consumerRequire = createRequire(consumerEntry);
    const resolved = consumerRequire.resolve("fast-glob");
    assert.equal(await realpath(resolved), expectedPath, `${name}: wrong fast-glob installation path`);
    const installed = consumerRequire("fast-glob");
    assert.equal(installed.sync, sync);
    assert.equal(installed.globSync, globSync);
  }
});

async function loadConsumerWithAdapter(filename) {
  const source = await readFile(filename, "utf8");
  const consumerRequire = createRequire(filename);
  const consumerModule = { exports: {} };
  const load = (specifier) => specifier === "fast-glob" ? adapter : consumerRequire(specifier);
  const factory = new vm.Script(`(function(require, module, exports) {\n${source}\n})`, { filename }).runInThisContext();
  factory(load, consumerModule, consumerModule.exports);
  return consumerModule.exports;
}

test("actual Next root-dir resolver preserves directory results and Windows separators", async () => {
  const pluginEntry = requireFromTest.resolve("@next/eslint-plugin-next");
  const { getRootDirs } = await loadConsumerWithAdapter(path.join(path.dirname(pluginEntry), "utils/get-root-dirs.js"));
  const rootDir = path.join(fixtureRoot, "packages", "*");
  const expected = [`${fixturePosix}/packages/alpha`, `${fixturePosix}/packages/beta`];
  assert.deepEqual(getRootDirs({ cwd: fixtureRoot, settings: {} }), [fixtureRoot]);
  assert.deepEqual(getRootDirs({ cwd: fixtureRoot, settings: { next: { rootDir } } }).sort(), expected);
  assert.deepEqual(getRootDirs({ cwd: fixtureRoot, settings: { next: { rootDir: [rootDir, 42, `${fixturePosix}/empty/`] } } }).sort(),
    [...expected, `${fixturePosix}/empty/`].sort());
});

for (const [index, fixture] of baseline.dynamicImports.entries()) {
  test(`actual dynamic-import transform matches upstream import map ${index + 1}`, async () => {
    const entry = requireFromTest.resolve("vite-plugin-dynamic-import");
    const dynamicImport = await loadConsumerWithAdapter(entry);
    const plugin = dynamicImport.default();
    plugin.configResolved({ createResolver: () => async () => undefined, resolve: { alias: [] }, optimizeDeps: {} });
    const result = await plugin.transform(fixture.code, path.join(fixtureRoot, "entry.js"));
    assert.ok(result?.code);
    const imports = [...result.code.matchAll(/return import\('([^']+)'\)/g)].map((match) => match[1]).sort();
    const cases = [...result.code.matchAll(/case '([^']+)':/g)].map((match) => match[1]).sort();
    assert.deepEqual(imports, fixture.imports);
    assert.deepEqual(cases, fixture.cases);
    assert.ok(result.map, "the actual transform should still produce a source map");
  });
}

test("directory symlinks are followed by default", async (context) => {
  const link = path.join(fixtureRoot, "linked");
  try {
    await symlink(path.join(fixtureRoot, "packages/alpha"), link, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (["EPERM", "EACCES", "ENOSYS"].includes(error.code)) {
      context.skip(`The host does not permit directory symlink creation: ${error.code}`);
      return;
    }
    throw error;
  }
  try {
    assert.deepEqual(sync("linked/*.js", { cwd: fixtureRoot }), ["linked/page.js"]);
    assert.deepEqual(sync("linked", { cwd: fixtureRoot, onlyDirectories: true }), ["linked"]);
  } finally {
    await rm(link, { recursive: true, force: true });
  }
});

test("unsupported options and malformed inputs fail explicitly", () => {
  for (const options of [{ ignore: [] }, { dot: true }, { absolute: true }, { onlyFiles: false }, { cwd: 5 }, { onlyDirectories: "true" }]) {
    assert.throws(() => sync("**/*", options), TypeError);
  }
  for (const input of [null, undefined, 42, ["*.js", null], [""]]) assert.throws(() => sync(input), TypeError);
});

test("brace ranges, extglobs and malformed classes fail explicitly", () => {
  for (const pattern of ["app{1..3}", "app{10..12}", "app{01..03}", "app{1..3..2}", "app{-3..2}", "app{a..z}", "app{Z..A..2}", "[{a..z}]", "?(a)", "+(a)", "*(a)", "@(a|b)", "!(a)", "[abc"]) {
    assert.throws(() => sync(pattern, { cwd: fixtureRoot }), { code: "ERR_GLOB_UNSUPPORTED_PATTERN" });
  }
  assert.deepEqual(sync("{../src,../views}/*.ts", { cwd: path.join(fixtureRoot, "app") }).sort(), ["../src/two.ts", "../views/b.ts"]);
});

test("deep braces and explosive pattern combinations fail before parsing or walking", async () => {
  const adversarialFile = path.join(fixtureRoot, `${"a".repeat(64)}b.js`);
  await writeFile(adversarialFile, "export default 1;\n");
  const program = `
    const assert = require('node:assert/strict');
    const { sync } = require(${JSON.stringify(adapterPath)});
    const attacks = [
      '{'.repeat(1000) + 'x' + '}'.repeat(1000),
      '@('.repeat(500) + 'x' + ')'.repeat(500),
      '{a,b}'.repeat(20),
      'file{1..1000000000}.js',
      '{a..z}'.repeat(12),
      '[{a..z}]'.repeat(12),
      '[{a,b}]'.repeat(20),
      '*a'.repeat(16) + 'c.js',
      '[' + '*a'.repeat(16) + 'c.js',
      '?(a)'.repeat(32) + 'c.js',
      '+(a)'.repeat(16) + 'c.js',
      '*(a)'.repeat(16) + 'c.js',
      'x'.repeat(4097),
      Array.from({ length: 129 }, () => '*.js'),
    ];
    for (const pattern of attacks) {
      assert.throws(() => sync(pattern, { cwd: ${JSON.stringify(fixtureRoot)} }), error => error instanceof TypeError && ['ERR_GLOB_PATTERN_LIMIT', 'ERR_GLOB_UNSUPPORTED_PATTERN'].includes(error.code));
    }
    process.stdout.write('guarded');
  `;
  try {
    const child = spawnSync(process.execPath, ["-e", program], { encoding: "utf8", timeout: 5000 });
    assert.equal(child.error, undefined, child.error?.message);
    assert.equal(child.status, 0, child.stderr);
    assert.equal(child.stdout, "guarded");
  } finally {
    await rm(adversarialFile, { force: true });
  }
});
