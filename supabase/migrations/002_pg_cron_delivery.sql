-- Enable pg_cron (must be enabled in Supabase dashboard under Extensions)
-- This runs every hour and triggers the deliver-letters Edge Function
-- The function itself checks which users are at Sunday 8am in their timezone

select cron.schedule(
  'deliver-letters-hourly',
  '0 * * * *',  -- every hour
  $$
  select
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/deliver-letters',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := '{}'::jsonb
    )
  $$
);
