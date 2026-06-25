import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:55432/orders_test';
const deadline = Date.now() + 30_000;

while (Date.now() < deadline) {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    process.exit(0);
  } catch (_error) {
    try { await client.end(); } catch {}
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
}

console.error('Timeout DB.');
process.exit(1);
