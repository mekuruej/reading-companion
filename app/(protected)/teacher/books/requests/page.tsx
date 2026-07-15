// Teacher Book Requests Queue
//
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getTeacherBackLink } from "../../components/teacherBackLink";
import { rejectBookRequestWithSession, requireSuperTeacher } from "../_shared/bookAttentionHelpers";

type PendingBookRequest = {
  id: string;
  title: string | null;
  author: string | null;
  isbn13: string | null;
  status: string | null;
  created_at: string | null;
  requestedBy: string;
};

export default function TeacherBookRequestsPage() {
  const searchParams = useSearchParams();
  const backLink = getTeacherBackLink(searchParams.get("from"));

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [requests, setRequests] = useState<PendingBookRequest[]>([]);

  useEffect(() => {
    void loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    setMessage("");

    try {
      const access = await requireSuperTeacher();
      if (access.error || !access.user) {
        setMessage(access.error ?? "Super teacher access is required.");
        setRequests([]);
        return;
      }

      const { data, error } = await supabase
        .from("book_requests")
        .select(`
          id,
          title,
          author,
          isbn13,
          status,
          created_at,
          profiles:user_id (
            display_name,
            username
          )
        `)
        .or("status.eq.pending,status.is.null")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRequests(
        ((data ?? []) as any[]).map((request) => {
          const profile = Array.isArray(request.profiles)
            ? request.profiles[0]
            : request.profiles;

          return {
            id: request.id,
            title: request.title ?? null,
            author: request.author ?? null,
            isbn13: request.isbn13 ?? null,
            status: request.status ?? null,
            created_at: request.created_at ?? null,
            requestedBy: profile?.display_name || profile?.username || "Unknown reader",
          };
        })
      );
    } catch (error: any) {
      setMessage(error?.message ?? "Could not load book requests.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  async function rejectBookRequest(requestId: string) {
    const confirmed = window.confirm(
      "Reject this book request? It will leave the pending list, but the request history will stay in Mekuru."
    );

    if (!confirmed) return;

    try {
      await rejectBookRequestWithSession(requestId);
      setMessage("Book request marked as rejected.");
      await loadRequests();
    } catch (error: any) {
      setMessage(error?.message ?? "Could not reject this book request.");
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link href={backLink.href} className="text-sm font-semibold text-stone-500 hover:text-stone-900">
        {backLink.label}
      </Link>

      <section className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
          Pending Book Requests
        </p>
        <h1 className="mt-2 text-3xl font-black text-stone-900">
          {requests.length} pending book request{requests.length === 1 ? "" : "s"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Failed ISBN lookups that need a super teacher to add or complete book details.
        </p>
      </section>

      {message ? <p className="mt-4 text-sm text-amber-700">{message}</p> : null}
      {loading ? <p className="mt-6 text-sm text-stone-500">Loading pending book requests...</p> : null}

      {!loading && requests.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
          No pending book requests right now.
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {requests.map((request) => {
          const displayTitle =
            String(request.title ?? "").trim() ||
            String(request.isbn13 ?? "").trim() ||
            "Untitled book request";

          return (
            <div key={request.id} className="rounded-3xl border border-amber-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-stone-900">{displayTitle}</h2>
                  <div className="mt-2 grid gap-1 text-sm text-stone-600 sm:grid-cols-2">
                    <p><span className="font-semibold text-stone-800">Author:</span> {request.author || "—"}</p>
                    <p><span className="font-semibold text-stone-800">ISBN:</span> {request.isbn13 || "—"}</p>
                    <p><span className="font-semibold text-stone-800">Requested by:</span> {request.requestedBy}</p>
                    <p><span className="font-semibold text-stone-800">Status:</span> {request.status || "pending"}</p>
                  </div>
                  <p className="mt-2 text-xs text-stone-400">
                    {request.created_at ? new Date(request.created_at).toLocaleString() : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/teacher/books/add?requestId=${request.id}`}
                    className="inline-flex rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                  >
                    Open Global Book Entry
                  </Link>
                  <button
                    type="button"
                    onClick={() => void rejectBookRequest(request.id)}
                    className="inline-flex rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    Reject Request
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
