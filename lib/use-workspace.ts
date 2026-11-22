import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { curriculum, stagesFor, type Stage } from './content';
import { supabase } from './supabase';

export type Work = {
  ipo?: number[];
  method?: string;
  stepAnswer?: number;
  chart?: number[];
  alternate?: string;
  reason?: string;
  comparison?: number;
  prediction?: number;
};

export type LessonRecord = {
  revision: number;
  step: number;
  firstTry: Partial<Record<Stage, boolean>>;
  work: Work;
};

export type Progress = Partial<Record<string, LessonRecord>>;
type Identity = { userId: string | null };
type Account = { identity: Identity; name: string; isAdmin: boolean; progress: Progress };
type SaveResult = 'saved' | 'temporary' | 'conflict' | 'error';
type ProgressRow = { lesson_id: string; revision: number; step: number; first_try: LessonRecord['firstTry']; work: Work };

const guestKey = 'pf-step-by-step:guest:v1';
const empty: Progress = {};
export const blankRecord: LessonRecord = { revision: 0, step: 0, firstTry: {}, work: {} };

function guestProgress(): Progress {
  try {
    const stored = JSON.parse(window.localStorage.getItem(guestKey) ?? '{}');
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : empty;
  } catch {
    return empty;
  }
}

export function completedCount(progress: Progress) {
  return curriculum.filter(({ lesson }) => (progress[lesson.id]?.step ?? 0) >= stagesFor(lesson).length).length;
}

export function pointCount(progress: Progress) {
  return curriculum.reduce((sum, { lesson }) => sum + (progress[lesson.id]?.step ?? 0), 0);
}

export function firstUnfinished(progress: Progress) {
  return curriculum.findIndex(({ lesson }) => (progress[lesson.id]?.step ?? 0) < stagesFor(lesson).length);
}

export function useWorkspace() {
  const currentIdentity = useRef<Identity>({ userId: null });
  const [session, setSession] = useState<{ user: User | null; identity: Identity }>();
  const [account, setAccount] = useState<Account>();
  const [failedIdentity, setFailedIdentity] = useState<Identity>();
  const [guest, setGuest] = useState<Progress>(empty);
  const [guestStorage, setGuestStorage] = useState(true);
  const [reload, setReload] = useState(0);
  const identity = session?.identity;
  const user = session?.user ?? null;

  useEffect(() => {
    setGuest(guestProgress());
    function syncGuest(event: StorageEvent) {
      if (event.key === guestKey || event.key === null) setGuest(guestProgress());
    }
    window.addEventListener('storage', syncGuest);
    const subscription = supabase?.auth.onAuthStateChange((_event, authSession) => {
      const nextUser = authSession?.user.is_anonymous ? null : authSession?.user ?? null;
      const userId = nextUser?.id ?? null;
      if (currentIdentity.current.userId !== userId) currentIdentity.current = { userId };
      setSession({ user: nextUser, identity: currentIdentity.current });
    });
    if (!subscription) setSession({ user: null, identity: currentIdentity.current });
    return () => {
      subscription?.data.subscription.unsubscribe();
      window.removeEventListener('storage', syncGuest);
    };
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client || !identity?.userId) {
      setAccount(undefined);
      return;
    }
    const accountId = identity.userId;
    const request = new AbortController();
    const stillCurrent = () => !request.signal.aborted && currentIdentity.current === identity;
    setFailedIdentity(undefined);

    async function loadAccount() {
      try {
        const [profile, progress] = await Promise.all([
          client!.from('profiles').select('role,display_name').eq('id', accountId).abortSignal(request.signal).single(),
          client!.from('pf_progress').select('lesson_id,revision,step,first_try,work').eq('user_id', accountId).abortSignal(request.signal),
        ]);
        if (!stillCurrent()) return;
        if (profile.error || progress.error) throw new Error('Account data unavailable');
        setAccount({
          identity: identity!,
          name: profile.data.display_name,
          isAdmin: profile.data.role === 'admin',
          progress: Object.fromEntries((progress.data as ProgressRow[]).map(row => [
            row.lesson_id, { revision: row.revision, step: row.step, firstTry: row.first_try, work: row.work },
          ])),
        });
      } catch {
        if (stillCurrent()) setFailedIdentity(identity);
      }
    }

    void loadAccount();
    return () => request.abort();
  }, [identity, reload]);

  const activeAccount = account?.identity === identity ? account : undefined;
  const status = !identity || (user && !activeAccount)
    ? identity && failedIdentity === identity ? 'error' : 'loading'
    : 'ready';

  async function save(lessonId: string, previous: LessonRecord, change: Omit<LessonRecord, 'revision'>): Promise<SaveResult> {
    if (!identity || identity !== currentIdentity.current) return 'error';
    const next = { ...change, revision: previous.revision + 1 };
    if (!user) {
      const latest = guestStorage ? guestProgress() : guest;
      if ((latest[lessonId]?.revision ?? 0) !== previous.revision) {
        setGuest(latest);
        return 'conflict';
      }
      const updated = { ...latest, [lessonId]: next };
      setGuest(updated);
      try {
        window.localStorage.setItem(guestKey, JSON.stringify(updated));
        return 'saved';
      } catch {
        setGuestStorage(false);
        return 'temporary';
      }
    }

    if (!supabase || !activeAccount) return 'error';
    const record = { revision: next.revision, step: next.step, first_try: next.firstTry, work: next.work };
    try {
      const request = previous.revision === 0
        ? await supabase.from('pf_progress').insert({ ...record, user_id: user.id, lesson_id: lessonId })
        : await supabase.from('pf_progress').update(record)
            .eq('user_id', user.id).eq('lesson_id', lessonId).eq('revision', previous.revision).select('revision');
      if (identity !== currentIdentity.current) return 'error';
      if (request.error?.code === '23505' || (!request.error && Array.isArray(request.data) && !request.data.length)) {
        setAccount(undefined);
        setReload(value => value + 1);
        return 'conflict';
      }
      if (request.error) return 'error';
      setAccount(value => value?.identity === identity
        ? { ...value, progress: { ...value.progress, [lessonId]: next } }
        : value);
      return 'saved';
    } catch {
      return 'error';
    }
  }

  return {
    user, status, save, guestStorage, identity,
    name: activeAccount?.name,
    isAdmin: activeAccount?.isAdmin ?? false,
    progress: user ? activeAccount?.progress ?? empty : guest,
    retry: () => setReload(value => value + 1),
  };
}
