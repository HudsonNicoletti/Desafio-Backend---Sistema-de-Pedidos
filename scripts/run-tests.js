import { spawnSync } from 'node:child_process';

const compose = ['compose', '-f', 'docker-compose.test.yml'];
const env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:55432/orders_test'
};

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env
  });
  return result.status ?? 1;
}

let status = 0;
try {
  status = run('docker', [...compose, 'up', '-d', 'db']);
  if (status === 0) status = run('node', ['scripts/wait-for-db.js']);
  if (status === 0) status = run('node', ['--test', '--test-concurrency=1']);
} finally {
  const cleanupStatus = run('docker', [...compose, 'down', '-v']);
  if (status === 0 && cleanupStatus !== 0) status = cleanupStatus;
}

process.exitCode = status;
