import { supabase } from "@/lib/supabaseClient";
export type StudentWordContext = { studentId: string; userBookId: string; sourceUserBookId: string };
export async function saveStudentWord(context: StudentWordContext, payload: object, id?: string, remove = false): Promise<{ data: any; error: { message: string } | null }> {
  try {
    const { data } = await supabase.auth.getSession();
    const response = await fetch("/api/teacher/student-words", {
      method: remove ? "DELETE" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify({ context, payload, id }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return { data: result.data, error: null };
  } catch (error) { return { data: null, error: { message: error instanceof Error ? error.message : "Could not save word." } }; }
}
