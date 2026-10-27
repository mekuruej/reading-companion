'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { todayYmdAppTimeZone } from '@/lib/timeZone';
import { selectDailyLibraryReminder, reminderHidden, dismissDailyReminder, loadDailyLibraryReminder, wordSkyReminderHref, type LoadedDailyReminder } from '@/lib/study/dailyLibraryReminder';

type Props = { ownerId: string; libraryPath: string; search: string; bookType: string; status: string; sort: string; view: string };

export default function DailyLibraryReminder(props: Props) {
  const inFlight = useRef(new Map<string, Promise<LoadedDailyReminder | null>>());
  const [loaded, setLoaded] = useState<LoadedDailyReminder | null>(null);
  const [authOwner, setAuthOwner] = useState<string | null>(null);
  const [day, setDay] = useState(todayYmdAppTimeZone);
  const [refresh, setRefresh] = useState(0);
  const [hidden, setHidden] = useState<{ ownerId: string; day: string } | null>(null);

  useEffect(() => {
    const update = () => { setDay(todayYmdAppTimeZone()); setRefresh(value => value + 1); };
    let foregroundTimer: ReturnType<typeof setTimeout> | null = null;
    const foreground = () => {
      if (foregroundTimer) clearTimeout(foregroundTimer);
      foregroundTimer = setTimeout(update, 150);
    };
    const visible = () => { if (document.visibilityState === 'visible') foreground(); };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoaded(null);
      setAuthOwner(session?.user.id ?? null);
      setRefresh(value => value + 1);
    });
    const midnight = Date.parse(day + 'T00:00:00+09:00') + 86400000;
    const timer = window.setTimeout(update, Math.max(1, midnight - Date.now() + 1));
    window.addEventListener('focus', foreground);
    window.addEventListener('storage', update);
    document.addEventListener('visibilitychange', visible);
    return () => { subscription.unsubscribe(); window.clearTimeout(timer); if (foregroundTimer) clearTimeout(foregroundTimer); window.removeEventListener('focus', foreground); window.removeEventListener('storage', update); document.removeEventListener('visibilitychange', visible); };
  }, [day]);

  useEffect(() => {
    let stale = false;
    setLoaded(null);
    async function load() {
      try {
        const auth = await supabase.auth.getUser();
        const userId = auth.data.user?.id;
        if (stale || auth.error || !userId || userId !== props.ownerId) return;
        setAuthOwner(userId);
        let storage: Storage | null = null;
        try { storage = window.localStorage; } catch { /* Readiness will remain unknown. */ }
        if (storage && reminderHidden(storage, userId)) {
          setHidden({ ownerId: userId, day });
          return;
        }
        const key = JSON.stringify([userId, day, props.libraryPath]);
        let pending = inFlight.current.get(key);
        if (!pending) {
          pending = loadDailyLibraryReminder(supabase, userId, storage, props.libraryPath);
          inFlight.current.set(key, pending);
          void pending.finally(() => { if (inFlight.current.get(key) === pending) inFlight.current.delete(key); });
        }
        const result = await pending;
        if (!stale && todayYmdAppTimeZone() === day) setLoaded(result);
      } catch { /* Unknown state intentionally renders no personal recommendation. */ }
    }
    void load();
    return () => { stale = true; };
  }, [props.ownerId, props.libraryPath, day, refresh]);

  if (!loaded || loaded.libraryPath !== props.libraryPath || loaded.ownerId !== props.ownerId || authOwner !== props.ownerId || loaded.day !== day) return null;
  const activity = selectDailyLibraryReminder({ ...loaded, date: new Date(), ownLibrary: true, enabled: true, hidden: hidden?.ownerId === props.ownerId && hidden.day === day });
  if (!activity) return null;
  const sky = activity === 'word_sky';
  return (
    <section aria-label="Today's reading invitation" className="mb-5 rounded-3xl border border-[var(--appearance-border)] bg-[var(--appearance-surface)] p-4 text-[var(--appearance-text)] shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold">{sky ? 'Discover words you already know!' : 'Your Ability Check is ready!'}</h2>
          <p className="mt-1 text-sm text-[var(--appearance-muted-text)]">{sky ? 'Explore the sky and see what feels familiar.' : "Revisit the vocabulary you've been collecting."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={sky ? wordSkyReminderHref(props.libraryPath, props) : '/library-study/check?start=1'} className="inline-flex min-h-11 items-center rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700">{sky ? 'Open Word Sky' : 'Start Ability Check'}</Link>
          <button type="button" className="min-h-11 rounded-xl border border-[var(--appearance-border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--appearance-surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700" onClick={() => {
            setHidden({ ownerId: props.ownerId, day });
            try { dismissDailyReminder(window.localStorage, props.ownerId); } catch { /* Session-only dismissal. */ }
          }}>Hide for today</button>
        </div>
      </div>
    </section>
  );
}
