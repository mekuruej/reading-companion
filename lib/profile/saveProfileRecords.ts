import type { SupabaseClient } from "@supabase/supabase-js";

/** Two existing-table writes; a completed account write is never described as rolled back. */
export async function saveProfileRecords(
  client: SupabaseClient,
  ownerId: string,
  accountFields: Record<string, unknown>,
  publicFields: Record<string, unknown>,
  isCurrentOwner: (id: string) => boolean,
  onAccountSaved: () => void,
) {
  async function confirmOwner() {
    const { data, error } = await client.auth.getUser();
    if (error || data.user?.id !== ownerId || !isCurrentOwner(ownerId)) {
      throw new Error("Your account changed or your session could not be confirmed. Reopen Profile before saving.");
    }
  }
  await confirmOwner();
  const account = await client.from("profiles").upsert({ ...accountFields, id: ownerId }, { onConflict: "id" });
  if (account.error) throw new Error(account.error.message);
  if (!isCurrentOwner(ownerId)) throw new Error("Your account changed. Reopen Profile to check saved changes.");
  onAccountSaved();
  try {
    await confirmOwner();
    const reader = await client.from("user_public_profile").upsert({ ...publicFields, user_id: ownerId }, { onConflict: "user_id" });
    if (reader.error) throw new Error(reader.error.message);
    if (!isCurrentOwner(ownerId)) throw new Error("Your account changed. Reopen Profile to check saved changes.");
  } catch {
    throw new Error("Your account details were saved, but reader-profile details were not confirmed. Your remaining edits are still here; retry Save Changes, or Cancel to reload saved values. Cancel does not undo completed saves.");
  }
}
