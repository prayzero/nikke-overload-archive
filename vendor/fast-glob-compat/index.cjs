"use strict";
/* eslint-disable @typescript-eslint/no-require-imports -- The two scoped consumers require a native CommonJS entry point. */

const { globSync: nativeGlobSync, hasMagic } = require("glob");

// These are build-configuration inputs, not an unrestricted glob service.
const MAX_PATTERNS = 128;
const MAX_PATTERN_LENGTH = 4096;
const MAX_TOTAL_LENGTH = 32768;
const MAX_NESTING = 16;
const MAX_BRANCH_PRODUCT = 4096;
const hasDynamicParts = (pattern) => hasMagic(pattern, { magicalBraces: true });

function invalidPattern(reason) {
  const error = new TypeError(`fast-glob compatibility adapter: ${reason}`);
  error.code = "ERR_GLOB_PATTERN_LIMIT";
  return error;
}

function unsupportedPattern(reason) {
  const error = new TypeError(`fast-glob compatibility adapter: unsupported pattern syntax (${reason})`);
  error.code = "ERR_GLOB_UNSUPPORTED_PATTERN";
  return error;
}

function validatePatterns(input) {
  const patterns = typeof input === "string" ? [input] : input;
  if (!Array.isArray(patterns) || patterns.some((pattern) => typeof pattern !== "string" || !pattern)) {
    throw new TypeError("fast-glob compatibility adapter: patterns must be non-empty strings or an array of them");
  }
  if (patterns.length > MAX_PATTERNS) throw invalidPattern("too many patterns");
  let totalLength = 0;
  for (const pattern of patterns) {
    totalLength += pattern.length;
    if (pattern.length > MAX_PATTERN_LENGTH || totalLength > MAX_TOTAL_LENGTH) {
      throw invalidPattern("pattern length limit exceeded");
    }
    const stack = [];
    let inClass = false;
    let branchProduct = 1;
    let wildcardRuns = 0;
    for (let index = 0; index < pattern.length; index++) {
      const character = pattern[index];
      if (character === "\\") { index++; continue; }
      if (character === "[") { inClass = true; continue; }
      if (character === "]") { inClass = false; continue; }
      // Brace expansion happens before character-class parsing in glob, so
      // braces inside [] must still count toward the expansion budget.
      if (inClass && !"{},".includes(character)) continue;
      if (character === "/") wildcardRuns = 0;
      if (character === "*" && pattern[index - 1] !== "*") {
        wildcardRuns++;
        if (wildcardRuns > 2) throw invalidPattern("more than two wildcard runs in a path segment");
      }
      if (character === "(" && /[?*+@!]/.test(pattern[index - 1] ?? "")) {
        throw unsupportedPattern("extglobs are not needed by the scoped consumers");
      }
      if (character === "{" || character === "(") {
        stack.push({ character, start: index, branches: 1 });
        if (stack.length > MAX_NESTING) throw invalidPattern("pattern nesting limit exceeded");
      } else if ((character === "," || character === "|") && stack.length) {
        const group = stack[stack.length - 1];
        if ((character === "," && group.character === "{") || (character === "|" && group.character === "(")) {
          group.branches++;
        }
      } else if ((character === "}" || character === ")") && stack.length) {
        const group = stack[stack.length - 1];
        if ((character === "}" && group.character !== "{") || (character === ")" && group.character !== "(")) continue;
        stack.pop();
        const range = /^(?:-?\d+\.\.-?\d+|[a-zA-Z]\.\.[a-zA-Z])(?:\.\.-?\d+)?$/.test(pattern.slice(group.start + 1, index));
        if (group.character === "{" && range) {
          throw unsupportedPattern("brace ranges are not needed by the scoped consumers");
        }
        branchProduct *= group.branches;
        if (branchProduct > MAX_BRANCH_PRODUCT) throw invalidPattern("pattern branching limit exceeded");
      }
    }
    if (inClass) throw unsupportedPattern("unclosed character classes are not supported");
  }
  return patterns;
}

function validateOptions(options) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("fast-glob compatibility adapter: options must be an object");
  }
  for (const key of Object.keys(options)) {
    if (key !== "cwd" && key !== "onlyDirectories") {
      throw new TypeError(`fast-glob compatibility adapter: unsupported option ${key}`);
    }
  }
  if (options.cwd !== undefined && typeof options.cwd !== "string") {
    throw new TypeError("fast-glob compatibility adapter: cwd must be a string");
  }
  if (options.onlyDirectories !== undefined && typeof options.onlyDirectories !== "boolean") {
    throw new TypeError("fast-glob compatibility adapter: onlyDirectories must be boolean");
  }
}

function globSync(input, options = {}) {
  const patterns = validatePatterns(input);
  validateOptions(options);
  const negative = patterns.filter((pattern) => pattern.startsWith("!")).map((pattern) => pattern.slice(1));
  const positive = patterns.filter((pattern) => !pattern.startsWith("!"));
  const results = new Set();
  for (const pattern of positive) {
    const dynamic = hasDynamicParts(pattern);
    let glob = [pattern];
    // fast-glob excludes a static traversal base from foo/**, but includes
    // matching dynamic bases (foo*/**) along with their descendants.
    if (/\/\*\*\/?$/.test(pattern)) {
      const base = pattern.replace(/\/\*\*\/?$/, "");
      glob[0] = `${base}/**/*`;
      if (hasDynamicParts(base)) glob.push(base);
    }
    // glob's documented trailing-slash syntax matches directories, including
    // symbolic links to directories, without a separate filesystem walker.
    if (options.onlyDirectories) glob = glob.map((value) => value.endsWith("/") ? value : `${value}/`);
    const matches = nativeGlobSync(glob, {
      cwd: options.cwd,
      nodir: options.onlyDirectories !== true,
      dot: false,
      follow: true,
      nocase: false,
      noext: true,
      ignore: negative,
    });
    for (let match of matches) {
      match = match.replaceAll("\\", "/");
      if (!dynamic) {
        // Static patterns preserve spelling, including ./ and a final slash.
        results.add(pattern);
        continue;
      }
      if (!/^(?:[A-Za-z]:)?\/$/.test(match)) match = match.replace(/\/$/, "");
      if (pattern.startsWith("./") && !match.startsWith("./")) match = `./${match}`;
      results.add(match);
    }
  }
  return [...results];
}

exports.sync = globSync;
exports.globSync = globSync;
