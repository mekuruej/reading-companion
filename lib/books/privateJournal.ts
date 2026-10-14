import { supabase } from "@/lib/supabaseClient";

export type PrivateJournalFields = {
  notes: string | null;
  favorite_quotes: string | null;
};

const emptyPrivateJournal: PrivateJournalFields = {
  notes: null,
  favorite_quotes: null,
};

export async function loadPrivateJournalFields(userBookId: string): Promise<{
  data: PrivateJournalFields;
  error: unknown | null;
}> {
  const { data, error } = await supabase
    .from("user_book_private_journals")
    .select("notes, favorite_quotes")
    .eq("user_book_id", userBookId)
    .maybeSingle();

  if (error) return { data: emptyPrivateJournal, error };
  return {
    data: {
      notes: data?.notes ?? null,
      favorite_quotes: data?.favorite_quotes ?? null,
    },
    error: null,
  };
}

export async function savePrivateJournalFields(
  userBookId: string,
  fields: Partial<PrivateJournalFields>
) {
  return supabase
    .from("user_book_private_journals")
    .upsert(
      {
        user_book_id: userBookId,
        ...fields,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_book_id" }
    );
}
