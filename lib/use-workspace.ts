import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

type LearningData = {
  completed: string[];
  notes: Record<string, string>;
};

type Identity = { userId: string | null };
type Account = LearningData & { identity: Identity; isAdmin: boolean };

const empty: LearningData = { completed: [], notes: {} };

export function readLocal(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function readLocalJson(key: string): unknown {
  try {
    return JSON.parse(readLocal(key) ?? 'null');
  } catch {
    return null;
  }
}

export function useWorkspace() {
  const currentIdentity = useRef<Identity>({ userId: null });
  const [session, setSession] = useState<{ user: User | null; identity: Identity }>();
  const [account, setAccount] = useState<Account>();
  const [failedIdentity, setFailedIdentity] = useState<Identity>();
  const [reload, setReload] = useState(0);
  const identity = session?.identity;
  const user = session?.user ?? null;

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setSession({ user: null, identity: currentIdentity.current });
      return;
    }

    const { data } = client.auth.onAuthStateChange((_event, authSession) => {
      const nextUser = authSession?.user.is_anonymous ? null : authSession?.user ?? null;
      const userId = nextUser?.id ?? null;
      if (currentIdentity.current.userId !== userId) currentIdentity.current = { userId };
      setSession({ user: nextUser, identity: currentIdentity.current });
    });
    return () => data.subscription.unsubscribe();
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
        const [profile, progress, notes] = await Promise.all([
          client.from('profiles').select('role').eq('id', accountId).abortSignal(request.signal).single(),
          client.from('lesson_progress').select('lesson_id').eq('user_id', accountId).abortSignal(request.signal),
          client.from('notes').select('lesson_id,body').eq('user_id', accountId).abortSignal(request.signal),
        ]);
        if (!stillCurrent()) return;
        if (profile.error || progress.error || notes.error) throw new Error('Account data is unavailable');

        setAccount({
          identity,
          isAdmin: profile.data.role === 'admin',
          completed: progress.data.map(row => row.lesson_id),
          notes: Object.fromEntries(notes.data.map(row => [row.lesson_id, row.body])),
        });
      } catch {
        if (stillCurrent()) setFailedIdentity(identity);
      }
    }

    void loadAccount();
    return () => request.abort();
  }, [identity, reload]);

  const activeAccount = account?.identity === identity ? account : undefined;
  const status = activeAccount ? 'ready' : identity && failedIdentity === identity ? 'error' : 'loading';

  async function completeLesson(lessonId: string) {
    if (!user || !supabase || !activeAccount || identity !== currentIdentity.current) return false;

    const { error } = await supabase.from('lesson_progress').upsert(
      { user_id: user.id, lesson_id: lessonId },
      { onConflict: 'user_id,lesson_id', ignoreDuplicates: true },
    );
    if (error || identity !== currentIdentity.current) return false;
    setAccount(value => value?.identity === identity
      ? { ...value, completed: Array.from(new Set([...value.completed, lessonId])) }
      : value);
    return true;
  }

  async function saveNote(lessonId: string, body: string) {
    if (!user || !supabase || !activeAccount || identity !== currentIdentity.current) return false;

    const { error } = await supabase.from('notes').upsert(
      { user_id: user.id, lesson_id: lessonId, body, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,lesson_id' },
    );
    if (error || identity !== currentIdentity.current) return false;
    setAccount(value => value?.identity === identity
      ? { ...value, notes: { ...value.notes, [lessonId]: body } }
      : value);
    return true;
  }

  return {
    user, identity, status, completeLesson, saveNote,
    completed: activeAccount?.completed ?? empty.completed,
    notes: activeAccount?.notes ?? empty.notes,
    isAdmin: activeAccount?.isAdmin ?? false,
    retry: () => setReload(value => value + 1),
  };
}
