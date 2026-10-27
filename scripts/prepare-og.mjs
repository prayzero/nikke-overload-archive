import { readFile, writeFile, mkdir } from "node:fs/promises";
import ts from "typescript";

// @vercel/og 1.0.3 bundles HarfBuzz's Node CJS loader into an ESM file and
// embeds fflate 0.7.3. Re-emit its published TypeScript sources without
// bundling so the patched, lockfile-resolved dependencies are actually used.
// Only this exact upstream release and this fixed file allowlist are handled.
const root = new URL("../node_modules/@vercel/og/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
if (manifest.version !== "1.0.3") throw new Error("Review the OG compatibility preparation before changing @vercel/og");
const outputs = new Map();
for (const target of ["node", "edge"]) {
  const map = JSON.parse(await readFile(new URL(`dist/index.${target}.js.map`, root), "utf8"));
  const files = [`index.${target}`, "og", "emoji/index", "language/index"];
  for (const file of files) {
    const index = map.sources.indexOf(`../src/${file}.ts`);
    const source = map.sourcesContent[index];
    if (index < 0 || typeof source !== "string") throw new Error(`Missing published OG source: ${file}`);
    const result = ts.transpileModule(source, { compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    } });
    const code = result.outputText
      .replaceAll("from './og'", "from './og.js'")
      .replaceAll("from './emoji'", "from './emoji/index.js'")
      .replaceAll("from './language'", "from './language/index.js'");
    if (outputs.has(file) && outputs.get(file) !== code) throw new Error(`Divergent upstream OG source: ${file}`);
    outputs.set(file, code);
  }
}
for (const [file, code] of outputs) {
  const destination = new URL(`dist/${file}.js`, root);
  await mkdir(new URL(".", destination), { recursive: true });
  await writeFile(destination, `// Re-emitted from @vercel/og 1.0.3 published source map; original MIT license applies.\n${code}`);
}
console.log("OG compatibility: unbundled node/edge entries use patched external dependencies");
