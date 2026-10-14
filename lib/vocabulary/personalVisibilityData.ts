import { supabase } from "@/lib/supabaseClient";
export async function loadPersonallyHiddenStudyKeys() {
  const keys = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("personally_hidden_study_identities")
      .select("study_identity_key").order("study_identity_key").range(from, from + 999);
    if (error) throw error;
    for (const row of data ?? []) if (row.study_identity_key) keys.add(row.study_identity_key);
    if (!data || data.length < 1000) return keys;
  }
}
