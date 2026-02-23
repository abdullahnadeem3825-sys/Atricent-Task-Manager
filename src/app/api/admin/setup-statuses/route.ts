import { NextResponse } from 'next/server';

export async function POST() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  // Use Supabase's SQL endpoint via the Management API
  const sql = `
    -- Create task_statuses table
    CREATE TABLE IF NOT EXISTS task_statuses (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      value TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      position INTEGER NOT NULL DEFAULT 0,
      is_default BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    -- Seed defaults if empty
    INSERT INTO task_statuses (value, label, color, position, is_default)
    SELECT * FROM (VALUES
      ('todo', 'To Do', 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', 0, true),
      ('in_progress', 'In Progress', 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', 1, true),
      ('done', 'Done', 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', 2, true)
    ) AS v(value, label, color, position, is_default)
    WHERE NOT EXISTS (SELECT 1 FROM task_statuses LIMIT 1);

    -- Enable RLS
    ALTER TABLE task_statuses ENABLE ROW LEVEL SECURITY;

    -- Create policies (ignore if exist)
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_statuses' AND policyname = 'Anyone can read task_statuses') THEN
        CREATE POLICY "Anyone can read task_statuses" ON task_statuses FOR SELECT USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_statuses' AND policyname = 'Admins can manage task_statuses') THEN
        CREATE POLICY "Admins can manage task_statuses" ON task_statuses FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
        );
      END IF;
    END $$;
  `;

  try {
    // Use Supabase's pg REST endpoint to execute raw SQL
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_raw_sql`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql_text: sql }),
    });

    if (!res.ok) {
      // Fallback: Try creating via individual queries through supabase-js
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // We can't run DDL via supabase-js, but let's check if table exists
      const { data, error } = await supabase.from('task_statuses').select('id').limit(1);

      if (error && error.code === 'PGRST204') {
        return NextResponse.json({
          success: false,
          message: 'Table does not exist. Please run the SQL in Supabase SQL Editor.',
          sql,
        }, { status: 400 });
      }

      if (data) {
        return NextResponse.json({ success: true, message: 'Table already exists', data });
      }

      return NextResponse.json({
        success: false,
        message: 'Could not create table automatically. Please run the following SQL in your Supabase SQL Editor:',
        sql,
      }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error.message,
      sql,
    }, { status: 500 });
  }
}
