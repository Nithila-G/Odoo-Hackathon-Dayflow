import EmbeddedPostgres from 'embedded-postgres';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

async function main() {
  const dataDir = path.resolve('./data/db');
  const pgVersionFile = path.join(dataDir, 'PG_VERSION');

  if (fs.existsSync(dataDir) && !fs.existsSync(pgVersionFile)) {
    console.log('Cleaning partially initialized database directory...');
    fs.rmSync(path.resolve('./data'), { recursive: true, force: true });
  }

  const pgServer = new EmbeddedPostgres({
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres',
    persistent: true,
  });

  console.log('Starting Embedded PostgreSQL on port 5432...');
  if (!fs.existsSync(pgVersionFile)) {
    await pgServer.initialise();
  }
  await pgServer.start();
  console.log('Embedded PostgreSQL process running on localhost:5432');

  // 1. Connect to default "postgres" database and create "dayflow" DB if needed
  const adminClient = new pg.Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres'
  });
  await adminClient.connect();

  const dbRes = await adminClient.query("SELECT 1 FROM pg_database WHERE datname='dayflow'");
  if (dbRes.rowCount === 0) {
    console.log('Creating database "dayflow"...');
    await adminClient.query('CREATE DATABASE dayflow');
  }
  await adminClient.end();

  // 2. Connect to "dayflow" database and apply schema if needed
  const dayflowClient = new pg.Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/dayflow'
  });
  await dayflowClient.connect();

  const res = await dayflowClient.query("SELECT to_regclass('public.users') as tbl;");
  if (!res.rows[0].tbl) {
    console.log('Applying migrations/001_init.sql...');
    const sql = fs.readFileSync(path.resolve('./migrations/001_init.sql'), 'utf-8');
    await dayflowClient.query(sql);
    console.log('Database schema applied successfully!');
  } else {
    console.log('Database schema is already applied.');
  }
  await dayflowClient.end();

  console.log('PostgreSQL is ready on localhost:5432 and schema is applied!');
  // Keep process alive so embedded postgres stays running
  setInterval(() => {}, 60000);
}

main().catch((err) => {
  console.error('Error starting Embedded Postgres:', err);
  process.exit(1);
});
