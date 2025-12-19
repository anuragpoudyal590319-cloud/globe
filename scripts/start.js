#!/usr/bin/env node

/**
 * Production startup script for Railway deployment
 * 
 * This script:
 * 1. Runs database migrations
 * 2. Seeds countries if the database is empty
 * 3. Starts the production server
 */

import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

function run(command, description) {
  console.log(`\n[Startup] ${description}...`);
  try {
    execSync(command, { 
      cwd: rootDir, 
      stdio: 'inherit',
      env: { ...process.env }
    });
    console.log(`[Startup] ${description} - Done`);
    return true;
  } catch (error) {
    console.error(`[Startup] ${description} - Failed:`, error.message);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('[Startup] World Economic Map - Production Startup');
  console.log('='.repeat(60));

  // Step 1: Run migrations
  if (!run('npm run migrate', 'Running database migrations')) {
    console.error('[Startup] Migration failed, but continuing...');
  }

  // Step 2: Seed countries (idempotent - skips if already seeded)
  if (!run('npm run seed', 'Seeding countries')) {
    console.error('[Startup] Seed failed, but continuing...');
  }

  // Step 3: Start the server
  console.log('\n[Startup] Starting production server...');
  console.log('='.repeat(60));

  const server = spawn('npm', ['run', 'start:server'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });

  server.on('error', (err) => {
    console.error('[Startup] Failed to start server:', err);
    process.exit(1);
  });

  server.on('exit', (code) => {
    console.log(`[Startup] Server exited with code ${code}`);
    process.exit(code || 0);
  });

  // Handle termination signals
  process.on('SIGTERM', () => {
    console.log('[Startup] Received SIGTERM, shutting down...');
    server.kill('SIGTERM');
  });

  process.on('SIGINT', () => {
    console.log('[Startup] Received SIGINT, shutting down...');
    server.kill('SIGINT');
  });
}

main().catch((err) => {
  console.error('[Startup] Fatal error:', err);
  process.exit(1);
});

