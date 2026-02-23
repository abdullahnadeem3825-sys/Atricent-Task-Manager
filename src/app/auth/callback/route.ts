import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in search params, use it as the redirection URL
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Create profile if it doesn't exist (for first-time Google logins)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Use service role client to bypass RLS for profile creation
        const serviceClient = await createServiceClient();
        const { data: profile } = await serviceClient
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!profile) {
          await serviceClient.from('profiles').insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata.full_name || user.user_metadata.name || user.email?.split('@')[0],
            role: 'employee' // Default role for social logins
          });
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
