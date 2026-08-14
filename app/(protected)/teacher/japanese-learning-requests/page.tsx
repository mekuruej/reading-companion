"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type JapaneseLearningRequest = {
  id: string;
  userId: string;
  status: string;
  note: string | null;
  readingExperience: string | null;
  jlptLevel: string | null;
  source: string | null;
  requestedAt: string | null;
  reviewedAt: string | null;
  displayName: string | null;
  username: string | null;
  email: string | null;
  appAccessType: string | null;
  appAccessExpiresAt: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function displayRequester(request: JapaneseLearningRequest) {
  return (
    request.displayName ||
    request.username ||
    request.email ||
    "Unknown reader"
  );
}

function readingExperienceLabel(value: string | null | undefined) {
  switch (value) {
    case "starting":
      return "Just starting";
    case "lots_of_support":
      return "Can read with a lot of support";
    case "independent_slow":
      return "Reads independently but slowly";
    case "comfortable":
      return "Comfortable reader";
    case "not_sure":
      return "Not sure";
    default:
      return "—";
  }
}

function jlptLevelLabel(value: string | null | undefined) {
  switch (value) {
    case "n5":
      return "N5";
    case "n4":
      return "N4";
    case "n3":
      return "N3";
    case "n2":
      return "N2";
    case "n1":
      return "N1";
    case "not_sure":
      return "Not sure";
    case "not_taken":
      return "Hasn’t taken the JLPT";
    default:
      return "—";
  }
}

export default function JapaneseLearningRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [requests, setRequests] = useState<JapaneseLearningRequest[]>([]);

  async function fetchWithSession(path: string, options: RequestInit = {}) {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      throw new Error("Please sign in again.");
    }

    return fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        ...(options.headers ?? {}),
      },
    });
  }

  async function loadRequests() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetchWithSession(
        "/api/teacher/japanese-learning-requests?status=pending"
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not load Japanese Learning requests.");
      }

      setRequests(payload?.requests ?? []);
    } catch (error: any) {
      setMessage(error?.message ?? "Could not load Japanese Learning requests.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  async function reviewRequest(requestId: string, action: "approve" | "decline") {
    const confirmed = window.confirm(
      action === "approve"
        ? "Approve this request and start the 21-day Japanese Learning trial now?"
        : "Decline this request? No access will change."
    );

    if (!confirmed) return;

    setReviewingId(requestId);
    setMessage("");

    try {
      const response = await fetchWithSession("/api/teacher/japanese-learning-requests", {
        method: "PATCH",
        body: JSON.stringify({ requestId, action }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not review this request.");
      }

      if (action === "approve") {
        const endsAt = payload?.trialEndsAt ? formatDate(payload.trialEndsAt) : "21 days from now";
        setMessage(
          payload?.notificationError
            ? `Request approved. Trial access runs through ${endsAt}. Notification could not be logged: ${payload.notificationError}`
            : `Request approved. Trial access runs through ${endsAt}.`
        );
      } else {
        setMessage("Request declined.");
      }

      await loadRequests();
    } catch (error: any) {
      setMessage(error?.message ?? "Could not review this request.");
    } finally {
      setReviewingId(null);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/teacher" className="text-sm font-semibold text-stone-500 hover:text-stone-900">
        ← Back to Teacher Hub
      </Link>

      <section className="mt-4 rounded-3xl border border-violet-200 bg-violet-50 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
          Japanese Learning Requests
        </p>
        <h1 className="mt-2 text-3xl font-black text-stone-900">
          {requests.length} pending request{requests.length === 1 ? "" : "s"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Review invitation requests for the manually managed Japanese Learning pilot.
        </p>
      </section>

      {message ? <p className="mt-4 text-sm font-semibold text-violet-700">{message}</p> : null}
      {loading ? <p className="mt-6 text-sm text-stone-500">Loading requests...</p> : null}

      {!loading && requests.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
          No pending Japanese Learning requests right now.
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {requests.map((request) => (
          <div key={request.id} className="rounded-3xl border border-violet-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-stone-900">
                  {displayRequester(request)}
                </h2>
                <div className="mt-2 grid gap-1 text-sm text-stone-600 sm:grid-cols-2">
                  <p><span className="font-semibold text-stone-800">Username:</span> {request.username || "—"}</p>
                  <p><span className="font-semibold text-stone-800">Email:</span> {request.email || "—"}</p>
                  <p><span className="font-semibold text-stone-800">Requested:</span> {formatDate(request.requestedAt)}</p>
                  <p><span className="font-semibold text-stone-800">Status:</span> {request.status || "—"}</p>
                  <p><span className="font-semibold text-stone-800">Source:</span> {request.source || "—"}</p>
                  <p><span className="font-semibold text-stone-800">Reading experience:</span> {readingExperienceLabel(request.readingExperience)}</p>
                  <p><span className="font-semibold text-stone-800">JLPT:</span> {jlptLevelLabel(request.jlptLevel)}</p>
                  <p><span className="font-semibold text-stone-800">Current access:</span> {request.appAccessType || "—"}</p>
                  <p><span className="font-semibold text-stone-800">Access expires:</span> {formatDate(request.appAccessExpiresAt)}</p>
                </div>
                {request.note ? (
                  <p className="mt-3 rounded-2xl bg-stone-50 px-3 py-2 text-sm leading-6 text-stone-700">
                    {request.note}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void reviewRequest(request.id, "approve")}
                  disabled={reviewingId === request.id}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                >
                  Approve Trial
                </button>
                <button
                  type="button"
                  onClick={() => void reviewRequest(request.id, "decline")}
                  disabled={reviewingId === request.id}
                  className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-black text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
