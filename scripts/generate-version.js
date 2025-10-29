#!/usr/bin/env node

/**
 * Generate version.json file with current git commit hash
 * This file is used to detect when a new deployment is available
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  // Get current git commit hash (short version)
  const gitHash = execSync('git rev-parse --short HEAD')
    .toString()
    .trim();

  // Get current timestamp
  const buildTime = new Date().toISOString();

  const version = {
    hash: gitHash,
    buildTime: buildTime,
    timestamp: Date.now()
  };

  // Write to client/public so it's accessible at /version.json
  const outputPath = join(__dirname, '../client/public/version.json');
  writeFileSync(outputPath, JSON.stringify(version, null, 2));

  console.log('✅ Generated version.json:', version);
} catch (error) {
  console.error('❌ Failed to generate version.json:', error.message);
  // Don't fail the build if version generation fails
  const fallbackVersion = {
    hash: 'unknown',
    buildTime: new Date().toISOString(),
    timestamp: Date.now()
  };
  const outputPath = join(__dirname, '../client/public/version.json');
  writeFileSync(outputPath, JSON.stringify(fallbackVersion, null, 2));
}
