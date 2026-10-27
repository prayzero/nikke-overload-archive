import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const manifest = await readJson("package.json");
const lock = await readJson("package-lock.json");
const reactPackages = ["react", "react-dom", "react-server-dom-webpack"];

test("React, React DOM and RSC use the same exact version", async () => {
  const declared = { ...manifest.dependencies, ...manifest.devDependencies };
  const expected = declared.react;
  assert.match(expected, /^\d+\.\d+\.\d+$/, "React must use an exact stable version");

  for (const name of reactPackages) {
    assert.equal(declared[name], expected, `${name} must be updated with React`);
    assert.equal(lock.packages[`node_modules/${name}`].version, expected, `${name} lock version`);
    const installed = await readJson(`node_modules/${name}/package.json`);
    assert.equal(installed.version, expected, `${name} installed version`);
  }
});

test("the lockfile root matches the dependency declarations", () => {
  for (const kind of ["dependencies", "devDependencies"]) {
    assert.deepEqual(lock.packages[""][kind], manifest[kind], `${kind} must match package-lock.json`);
  }
});

test("the patched SVG stack remains compatible with the OG image renderer", async () => {
  const [{ createElement }, { ImageResponse }] = await Promise.all([import("react"), import("@vercel/og")]);
  const response = new ImageResponse(createElement("div", { style: {
    display: "flex", width: "100%", height: "100%", backgroundColor: "#151a20", color: "#ffffff",
  } }, "Arena"), { width: 320, height: 160 });
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(new DataView(bytes.buffer).getUint32(16), 320);
  assert.equal(new DataView(bytes.buffer).getUint32(20), 160);
});

test("OG entries load patched dependencies instead of embedding stale bundles", async () => {
  for (const target of ["node", "edge"]) {
    const source = await readFile(new URL(`node_modules/@vercel/og/dist/index.${target}.js`, root), "utf8");
    assert.match(source, /from ['"]satori(?:\/standalone)?['"]/);
    assert.doesNotMatch(source, /fflate@0\.7\.3|require_hb/);
  }
});
