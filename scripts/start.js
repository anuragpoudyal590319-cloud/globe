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

  // Step 1: Run migrations (non-blocking - server will start even if this fails)
  console.log('\n[Startup] Running database migrations...');
  const migrateProcess = spawn('npm', ['run', 'migrate'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  migrateProcess.on('exit', (code) => {
    if (code === 0) {
      console.log('[Startup] Migrations completed successfully');
      // Seed countries after migrations succeed
      run('npm run seed', 'Seeding countries');
    } else {
      console.error('[Startup] Migrations failed (code ' + code + '), but continuing...');
      console.error('[Startup] You can run migrations manually later');
    }
  });

  // Step 2: Start the server immediately (don't wait for migrations)
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

