import 'server-only';
import { randomBytes } from 'node:crypto';

export type UsernameStore = {
  find(userId: string): Promise<{ username: string | null } | null>;
  create(userId: string, username: string): Promise<void>;
  assignIfMissing(userId: string, previous: string | null, username: string): Promise<boolean>;
};

export function createNeutralUsername() {
  return `reader_${randomBytes(8).toString('hex')}`;
}

function uniqueViolation(error: unknown, constraint: string) {
  if (!error || typeof error !== 'object') return false;
  const pg = error as { code?: string; constraint?: string; message?: string };
  return pg.code === '23505' && (pg.constraint === constraint || pg.message?.includes(`"${constraint}"`));
}

// The unique index chooses availability; the conditional write chooses the winner
// for one account. Existing usernames (including mixed-case legacy names) survive.
export async function allocateUsername(userId: string, store: UsernameStore, generate = createNeutralUsername) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const profile = await store.find(userId);
    if (profile?.username?.trim()) return profile.username;
    const candidate = generate();
    try {
      if (!profile) {
        await store.create(userId, candidate);
        return candidate;
      }
      if (await store.assignIfMissing(userId, profile.username, candidate)) return candidate;
    } catch (error) {
      // Primary-key races only apply to creating the same missing profile.
      if (!uniqueViolation(error, 'profiles_username_unique_idx') &&
          !(profile === null && uniqueViolation(error, 'profiles_pkey'))) throw error;
    }
  }
  throw new Error('Could not assign your Library link. Please try again.');
}
