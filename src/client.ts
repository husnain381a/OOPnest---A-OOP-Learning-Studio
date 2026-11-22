import { createClient, FunctionsHttpError } from '@supabase/supabase-js';
import { grade, hintFor, lessonFor, type Action, type RecordRow } from './data';

export const appName = 'PF Step by Step';
export const teacherEmail = 'aimenansari008@gmail.com';
export const sections = [{ id: 'blue', name: '1st Blue' }, { id: 'gray', name: '1st Gray' }] as const;
export const sectionName = (id: string) => sections.find(section => section.id === id)?.name ?? id;
const { VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key } = import.meta.env;
export const client = url && key ? createClient(url, key, { auth: { detectSessionInUrl: false } }) : null;
export const studentEmail = (roll: string, section: string) => `${section}.${roll.trim().toLowerCase()}@students.pfnest.example`;
export type Profile = { display_name: string; pfn_roll: string | null; pfn_section: string | null; role: string };
export type EventRow = RecordRow & { request_id: string; message: string };

export async function loadRecords(id: string) {
  if (!client) return [];
  const rows: EventRow[] = [];
  const batch = 500;
  for (let offset = 0; ; offset += batch) {
    const { data, error } = await client.from('pfn_events')
      .select('request_id,lesson_id,stage,type,ok,points,topic,answer,message,created_at')
      .eq('user_id', id).order('created_at').order('request_id').range(offset, offset + batch - 1);
    if (error) throw error;
    rows.push(...data as EventRow[]);
    if (data.length < batch) return rows;
  }
}

export async function saveAction(action: Action, rows: EventRow[], demo: boolean): Promise<EventRow> {
  if (!demo && client) {
    const { data, error } = await client.functions.invoke<EventRow>('pfn-learning', { body: action });
    if (error instanceof FunctionsHttpError) {
      const response = await error.context.json().catch(() => ({}));
      throw new Error(response.message ?? 'Could not save. Try again.');
    }
    if (error || !data) throw new Error('Could not save. Check your connection and try again.');
    return data;
  }
  if (!demo) throw new Error('Sign in to save your progress.');
  const lesson = lessonFor(action.lessonId)!;
  const previous = rows.filter(row => row.lesson_id === lesson.id);
  const repeats = previous.some(row => row.stage === 'predict' && row.type === 'check');
  const first = previous.find(row => row.stage === 'write' && row.ok)?.answer;
  const hintCount = previous.filter(row => row.type === 'hint').length;
  if (action.type === 'hint' && hintCount >= 3) throw new Error('You have used all three hints.');
  const result = action.type === 'hint'
    ? { ok: false, message: hintFor(lesson, action.stage, hintCount), topic: action.stage, points: -2 }
    : grade(lesson, action.stage, action.answer, first);
  return {
    ...result, request_id: action.id, lesson_id: lesson.id, stage: action.stage, type: action.type,
    points: action.stage === 'predict' && repeats && result.ok ? 0 : result.points,
    answer: result.ok ? action.answer : undefined, created_at: new Date().toISOString(),
  };
}
