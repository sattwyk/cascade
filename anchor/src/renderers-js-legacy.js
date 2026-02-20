import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

function parseSemver(versionString) {
  const [major = '0', minor = '0', patch = '0'] = versionString.split('.');
  return [Number(major), Number(minor), Number(patch)];
}

function compareSemver(a, b) {
  const [aMajor, aMinor, aPatch] = parseSemver(a);
  const [bMajor, bMinor, bPatch] = parseSemver(b);
  if (aMajor !== bMajor) return aMajor - bMajor;
  if (aMinor !== bMinor) return aMinor - bMinor;
  return aPatch - bPatch;
}

function resolveLegacyRendererPath() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const pnpmStoreDir = path.resolve(currentDir, '../../node_modules/.pnpm');
  const rendererCandidates = fs
    .readdirSync(pnpmStoreDir)
    .filter((entry) => entry.startsWith('@codama+renderers-js@'))
    .map((entry) => {
      const version = entry.replace('@codama+renderers-js@', '').split('_')[0];
      return { entry, version };
    })
    .filter(({ version }) => version.startsWith('1.'));

  if (rendererCandidates.length === 0) {
    throw new Error('Missing @codama/renderers-js 1.x in node_modules/.pnpm.');
  }

  rendererCandidates.sort((a, b) => compareSemver(b.version, a.version));
  const selectedRenderer = rendererCandidates[0].entry;

  return path.join(pnpmStoreDir, selectedRenderer, 'node_modules', '@codama', 'renderers-js', 'dist', 'index.node.cjs');
}

const legacyModule = require(resolveLegacyRendererPath());

export default legacyModule.default ?? legacyModule.renderVisitor;
