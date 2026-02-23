import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  // Auth check - verify caller is admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { email, password, full_name } = await request.json();

  if (!email || !password || !full_name) {
    return Response.json({ error: 'Email, password, and full name are required' }, { status: 400 });
  }

  try {
    // Use service role client to create user
    const serviceClient = await createServiceClient();
    const { data, error } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ user: data.user });
  } catch (error: any) {
    console.error('Create employee error:', error);
    return Response.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}
