import postgres from 'postgres';

// Supabase direct connection - URL encode password to handle special chars
const password = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);
const connectionString = `postgresql://postgres.iwnceizhrxmxaecfakff:${password}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`;

const sql = postgres(connectionString, { ssl: 'require' });

async function main() {
  console.log('Creating task_statuses table...');

  await sql`
    CREATE TABLE IF NOT EXISTS task_statuses (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      value TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      position INTEGER NOT NULL DEFAULT 0,
      is_default BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;

  console.log('Table created.');

  // Check if default statuses exist
  const existing = await sql`SELECT COUNT(*) as cnt FROM task_statuses`;
  if (parseInt(existing[0].cnt) === 0) {
    console.log('Inserting default statuses...');
    await sql`
      INSERT INTO task_statuses (value, label, color, position, is_default) VALUES
        ('todo', 'To Do', 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', 0, true),
        ('in_progress', 'In Progress', 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', 1, true),
        ('done', 'Done', 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', 2, true)
    `;
    console.log('Default statuses inserted.');
  } else {
    console.log(`Statuses already exist (${existing[0].cnt} rows). Skipping seed.`);
  }

  // Also alter the tasks.status column - drop any CHECK constraint and make it TEXT
  // (It's likely already TEXT based on what we saw)
  console.log('Ensuring tasks.status is unconstrained TEXT...');
  try {
    await sql`
      ALTER TABLE tasks ALTER COLUMN status TYPE TEXT
    `;
    console.log('tasks.status is TEXT.');
  } catch (e) {
    console.log('tasks.status already TEXT or could not alter:', e.message);
  }

  // Enable RLS on task_statuses
  await sql`ALTER TABLE task_statuses ENABLE ROW LEVEL SECURITY`;

  // Create RLS policies
  try {
    await sql`
      CREATE POLICY "Anyone can read task_statuses" ON task_statuses
        FOR SELECT USING (true)
    `;
    console.log('SELECT policy created.');
  } catch (e) {
    console.log('SELECT policy already exists:', e.message);
  }

  try {
    await sql`
      CREATE POLICY "Admins can manage task_statuses" ON task_statuses
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
          )
        )
    `;
    console.log('Admin ALL policy created.');
  } catch (e) {
    console.log('Admin policy already exists:', e.message);
  }

  console.log('Done!');
  await sql.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
