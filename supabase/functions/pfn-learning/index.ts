import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { grade, hintFor, lessonFor, lessons, type Action } from '../_shared/learning.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return json({ message: 'Use POST.' }, 405);
  const token = /^Bearer (\S+)$/i.exec(request.headers.get('Authorization') ?? '')?.[1];
  if (!token) return json({ message: 'Please sign in again.' }, 401);
  const url = Deno.env.get('SUPABASE_URL');
  const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
  const key = keys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json({ message: 'The learning service needs setup.' }, 503);
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await db.auth.getUser(token);
  if (authError || !user || user.is_anonymous) return json({ message: 'Please sign in again.' }, 401);

  let action: Action;
  try {
    const body = await request.text();
    if (body.length > 16_000) return json({ message: 'Your answer is too long.' }, 413);
    action = JSON.parse(body);
  } catch { return json({ message: 'Please send a valid answer.' }, 400); }
  const lesson = action && typeof action.lessonId === 'string' ? lessonFor(action.lessonId) : undefined;
  const position = lesson?.stages.indexOf(action.stage) ?? -1;
  if (!lesson || position < 0 || !['check', 'hint'].includes(action.type) || typeof action.id !== 'string'
    || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(action.id)) {
    return json({ message: 'Please open the current activity again.' }, 400);
  }

  let result;
  let response: unknown = action.answer ?? null;
  if (action.type === 'hint') {
    response = [0, 1, 2].map(hintsUsed => hintFor(lesson, action.stage, hintsUsed));
    result = { ok: false, points: -2, topic: action.stage, message: hintFor(lesson, action.stage, 0) };
  } else {
    let original;
    if (action.stage === 'compare') {
      const { data, error } = await db.from('pfn_events').select('answer').eq('user_id', user.id)
        .eq('lesson_id', lesson.id).eq('stage', 'write').eq('ok', true).maybeSingle();
      if (error) return json({ message: 'Could not load your first solution. Try again.' }, 503);
      original = data?.answer;
    }
    result = grade(lesson, action.stage, action.answer, original);
  }

  const { data, error } = await db.rpc('pfn_record', {
    student: user.id, request: action.id, lesson: lesson.id, module_number: lesson.module,
    checkpoint: action.stage, action_type: action.type, correct: result.ok, award: result.points,
    issue: result.topic, feedback: result.message, response,
    previous_lesson: lessons[lessons.indexOf(lesson) - 1]?.id ?? null,
    previous_stage: lesson.stages[position - 1] ?? null, final_stage: position === lesson.stages.length - 1,
  });
  if (error) return error.code === 'P0001' ? json({ message: error.message }, 409) : json({ message: 'Could not save your activity. Try again.' }, 503);
  return json(data);
});
