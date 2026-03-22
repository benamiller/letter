// Supabase Edge Function — deliver-letters
// Runs every Sunday at 8am per user timezone via pg_cron
// Finds all users for whom it is currently Sunday 8am, triggers letter generation

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const now = new Date();

  // Find users where it's currently between 8:00-8:59am on Sunday in their timezone
  // We query all active/trial users and check their timezone offset
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, timezone')
    .in('subscription_status', ['active', 'trial']);

  if (error || !users) {
    return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const eligible: string[] = [];

  for (const user of users) {
    try {
      const localTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: user.timezone,
        weekday: 'short',
        hour: 'numeric',
        hour12: false
      }).formatToParts(now);

      const weekday = localTime.find(p => p.type === 'weekday')?.value;
      const hour = parseInt(localTime.find(p => p.type === 'hour')?.value ?? '0', 10);

      if (weekday === 'Sun' && hour === 8) {
        eligible.push(user.id);
      }
    } catch {
      // Invalid timezone — skip
    }
  }

  if (eligible.length === 0) {
    return new Response(JSON.stringify({ delivered: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Trigger generate-letter for each eligible user
  const results = await Promise.allSettled(
    eligible.map(userId =>
      fetch(`${supabaseUrl}/functions/v1/generate-letter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`
        },
        body: JSON.stringify({ user_id: userId })
      })
    )
  );

  const delivered = results.filter(r => r.status === 'fulfilled').length;

  return new Response(JSON.stringify({ delivered, total: eligible.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});
