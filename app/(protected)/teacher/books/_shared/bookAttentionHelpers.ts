import { supabase } from "@/lib/supabaseClient";

export type GlobalBookRow = {
  id: string;
  title: string | null;
  isbn13: string | null;
  cover_url: string | null;
  book_type: string | null;
  author: string | null;
  publisher: string | null;
  published_date: string | null;
  page_count: number | null;
  allow_missing_isbn?: boolean | null;
  allow_missing_publisher?: boolean | null;
  missing_info_cleared_at?: string | null;
};

export function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

export function missingGlobalBookFields(book: GlobalBookRow) {
  if (book.missing_info_cleared_at) return [];

  const missing: string[] = [];
  if (!String(book.title ?? "").trim()) missing.push("title");
  if (!book.allow_missing_isbn && !String(book.isbn13 ?? "").trim()) missing.push("ISBN-13");
  if (!String(book.cover_url ?? "").trim()) missing.push("cover");
  if (!String(book.book_type ?? "").trim()) missing.push("book type");
  if (!String(book.author ?? "").trim()) missing.push("author");
  if (!book.allow_missing_publisher && !String(book.publisher ?? "").trim()) missing.push("publisher");
  if (!String(book.published_date ?? "").trim()) missing.push("published date");
  if (book.page_count == null) missing.push("page count");
  return missing;
}

export async function requireSuperTeacher() {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const user = auth?.user;

  if (authError || !user) {
    return { user: null, error: "Please sign in." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_super_teacher")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) return { user: null, error: profileError.message };

  const canAccess =
    profile?.role === "super_teacher" || isSuperTeacherFlag(profile?.is_super_teacher);

  if (!canAccess) {
    return { user: null, error: "Super teacher access is required for book attention flags." };
  }

  return { user, error: null };
}

export async function rejectBookRequestWithSession(requestId: string) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (sessionError || !token) {
    throw new Error("Please sign in again before rejecting this request.");
  }

  const response = await fetch("/api/book-requests/reject", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ requestId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error ?? "Could not reject this book request.");
  }

  return data;
}
