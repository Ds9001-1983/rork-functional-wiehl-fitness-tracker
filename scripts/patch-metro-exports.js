#!/usr/bin/env node
/**
 * Patch metro and metro-core package.json exports for Node.js 22 compatibility.
 *
 * Node.js 22 enforces the "exports" field in package.json, which blocks
 * @expo/cli from accessing internal metro paths like metro/src/lib/TerminalReporter.
 *
 * This script adds "./src/*" export patterns to allow these internal imports.
 * Run this after `bun install` / `npm install` and before `expo export`.
 */

const fs = require('fs');
const path = require('path');

const packagesToPatch = [
  'metro',
  'metro-core',
  'metro-runtime',
  'metro-config',
  'metro-resolver',
  'metro-transform-worker',
  'metro-transform-plugins',
  'metro-source-map',
  'metro-symbolicate',
  'metro-file-map',
  'metro-cache',
  'metro-babel-transformer',
];

const nodeModulesDir = path.join(__dirname, '..', 'node_modules');

let patchedCount = 0;
let skippedCount = 0;

for (const pkg of packagesToPatch) {
  const pkgJsonPath = path.join(nodeModulesDir, pkg, 'package.json');

  if (!fs.existsSync(pkgJsonPath)) {
    continue;
  }

  try {
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

    if (!pkgJson.exports) {
      skippedCount++;
      continue;
    }

    // Check if already correctly patched (with .js mapping)
    if (pkgJson.exports['./src/*'] === './src/*.js') {
      skippedCount++;
      continue;
    }

    // Map ./src/* (no extension) -> ./src/*.js (with extension)
    // Node.js 22 exports are strict - no auto .js resolution
    pkgJson.exports['./src/*'] = './src/*.js';
    // Also allow explicit .js imports
    pkgJson.exports['./src/*.js'] = './src/*.js';

    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');
    patchedCount++;
    console.log(`  Patched: ${pkg}`);
  } catch (err) {
    console.error(`  Error patching ${pkg}: ${err.message}`);
  }
}

console.log(`\nMetro exports patch: ${patchedCount} patched, ${skippedCount} skipped`);
