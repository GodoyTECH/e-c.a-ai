const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL ausente.');
  }

  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query('BEGIN');
  await client.query(sql);
  await client.query('COMMIT');
  await client.end();
  console.log('Migração executada com sucesso.');
}

run().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
