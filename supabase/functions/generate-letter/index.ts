// Supabase Edge Function — generate-letter
// Called by deliver-letters or manually for testing
// Reads a user's week of entries and generates one letter via Claude

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

interface Entry {
  content: string;
  type: string;
  created_at: string;
}

function getWeekStart(timezone: string): string {
  const now = new Date();
  const localDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);

  const d = new Date(localDate + 'T00:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function buildPrompt(entries: Entry[]): string {
  const entriesText = entries
    .map(e => {
      const date = new Date(e.created_at).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long'
      });
      return `[${date}]\n${e.content}`;
    })
    .join('\n\n');

  return `You are Nia. You write one letter per week to a specific person, based on everything they've shared with you that week.

This person has shared the following with you this week:

${entriesText}

Write their weekly letter. This is not a summary or a report. It is a letter — the kind someone prints and keeps.

Rules:
- 600 to 900 words, no more
- Write as yourself (Nia) — a thoughtful, unhurried presence who has been paying attention
- No bullet points, no headers, no AI-speak, no phrases like "I noticed that" or "It seems like"
- No hollow affirmations. No "that's wonderful" or "how exciting"
- Find the real thing inside what they shared — the anxiety under the excitement, the longing inside the complaint, the small courage they didn't name
- Reference specific things they shared but don't just recite them back — reflect on them
- Write in flowing paragraphs, like a letter from a wise older friend who also happens to know everything
- Begin with something that lands, not a greeting
- End quietly — no calls to action, no "until next week", no summaries
- Do not mention you are an AI
- Do not use em-dashes (—) — use commas or restructure instead
- Tone: warm, specific, occasionally wry, never sentimental, never performative

Output only the letter body. No subject line. No "Dear [name]". Just the letter.`;
}

async function generateLetter(entries: Entry[], apiKey: string): Promise<string> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 1200,
      messages: [
        {
          role: 'user',
          content: buildPrompt(entries)
        }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${err}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

Deno.serve(async (req: Request) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Verify service role key
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!;

  const supabase = createClient(supabaseUrl, serviceKey);

  const body = await req.json();
  const { user_id } = body;

  if (!user_id) {
    return new Response(JSON.stringify({ error: 'user_id required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, timezone, subscription_status, trial_ends_at')
    .eq('id', user_id)
    .single();

  if (profileError || !profile) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Check subscription is active or in trial
  const isActive = profile.subscription_status === 'active';
  const inTrial = profile.subscription_status === 'trial' &&
    new Date(profile.trial_ends_at) > new Date();

  if (!isActive && !inTrial) {
    return new Response(JSON.stringify({ error: 'Subscription inactive' }), {
      status: 402,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const weekStart = getWeekStart(profile.timezone);

  // Check a letter hasn't already been generated this week
  const { data: existing } = await supabase
    .from('letters')
    .select('id')
    .eq('user_id', user_id)
    .eq('week_start', weekStart)
    .single();

  if (existing) {
    return new Response(JSON.stringify({ error: 'Letter already generated this week' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Fetch this week's entries
  const { data: entries, error: entriesError } = await supabase
    .from('entries')
    .select('content, type, created_at')
    .eq('user_id', user_id)
    .eq('week_start', weekStart)
    .order('created_at', { ascending: true });

  if (entriesError) {
    return new Response(JSON.stringify({ error: 'Failed to fetch entries' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // If no entries, generate a thoughtful placeholder
  const hasEntries = entries && entries.length > 0;
  const effectiveEntries: Entry[] = hasEntries ? entries : [{
    content: 'Nothing shared this week. The silence itself.',
    type: 'text',
    created_at: new Date().toISOString()
  }];

  let letterContent: string;
  try {
    letterContent = await generateLetter(effectiveEntries, anthropicKey);
  } catch (err) {
    console.error('Letter generation failed:', err);
    return new Response(JSON.stringify({ error: 'Letter generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Store the letter
  const { data: letter, error: insertError } = await supabase
    .from('letters')
    .insert({
      user_id,
      content: letterContent,
      delivered_at: new Date().toISOString(),
      week_start: weekStart
    })
    .select()
    .single();

  if (insertError) {
    return new Response(JSON.stringify({ error: 'Failed to store letter' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ success: true, letter_id: letter.id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});
