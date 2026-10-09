import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { allocateUsername, type UsernameStore } from '@/lib/profile/allocateUsername';
import { profileReadingLevelFields, PROFILE_LEVEL_OPTIONS } from '@/lib/profileLevels';
import { legacyTargetLanguageForJapaneseLearning } from '@/lib/access/japaneseLearningIntent';

export async function POST(request: Request) {
  const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!token) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth.user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    const body = await request.json().catch(() => null);
    const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : '';
    const nativeLanguage = typeof body?.nativeLanguage === 'string' ? body.nativeLanguage.trim() : '';
    const enabled = body?.japaneseLearningEnabled;
    const level = typeof body?.level === 'string' ? body.level.trim() : '';
    if (!displayName) return NextResponse.json({ error: 'Please enter a display name.' }, { status: 400 });
    if (!nativeLanguage) return NextResponse.json({ error: 'Please choose your native language.' }, { status: 400 });
    if (typeof enabled !== 'boolean') return NextResponse.json({ error: 'Please choose whether you want Japanese Study Tools.' }, { status: 400 });
    if (level && !PROFILE_LEVEL_OPTIONS.some(option => option.value === level)) {
      return NextResponse.json({ error: 'Please choose a valid reading level or leave it unknown.' }, { status: 400 });
    }
    // Scope all writes to the verified session, never a client-supplied ID.
    const userId = auth.user.id;
    const store: UsernameStore = {
      async find(id) {
        const { data, error } = await db.from('profiles').select('username').eq('id', id).maybeSingle();
        if (error) throw error;
        return data;
      },
      async create(id, username) {
        // Match the auth profile initializer: private and unknown level. Database
        // defaults supply role/access; setup never writes entitlement fields.
        const { error } = await db.from('profiles').insert({ id, username, level: null, is_public: false });
        if (error) throw error;
      },
      async assignIfMissing(id, previous, username) {
        let query = db.from('profiles').update({ username }).eq('id', id);
        query = previous === null ? query.is('username', null) : query.eq('username', previous);
        const { data, error } = await query.select('username').maybeSingle();
        if (error) throw error;
        return Boolean(data);
      },
    };
    const username = await allocateUsername(userId, store);
    const { data: profile, error: profileError } = await db.from('profiles').select('display_name').eq('id', userId).single();
    if (profileError) throw profileError;
    if (!profile.display_name?.trim()) {
      let query = db.from('profiles').update({ display_name: displayName }).eq('id', userId);
      query = profile.display_name === null ? query.is('display_name', null) : query.eq('display_name', profile.display_name);
      const { error } = await query;
      if (error) throw error;
    }
    // Omit unknown levels to preserve any existing profile level. Never send a
    // username or display name with the remaining update, even after a race.
    const { error } = await db.from('profiles').update({
      native_language: nativeLanguage,
      japanese_learning_enabled: enabled,
      target_language: legacyTargetLanguageForJapaneseLearning(enabled),
      ...profileReadingLevelFields(enabled, level),
    }).eq('id', userId);
    if (error) throw error;
    return NextResponse.json({ username }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Profile setup failed', error && typeof error === 'object' && 'code' in error ? error.code : 'unknown');
    return NextResponse.json({ error: 'Could not save your profile setup. Please try again.' }, { status: 503 });
  }
}
