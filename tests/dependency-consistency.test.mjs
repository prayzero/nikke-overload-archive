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
