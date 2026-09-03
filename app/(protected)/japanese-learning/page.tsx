"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type RequestState = {
  id: string;
  status: "pending" | "approved" | "declined";
  note: string | null;
  reading_experience: string | null;
  jlpt_level: string | null;
  request_source: string | null;
  requested_at: string | null;
  reviewed_at: string | null;
};

type AccessState = {
  hasFullAccess: boolean;
  reason: string;
  accessType: string | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  expiresAt: string | null;
};

const features = [
  {
    title: "Japanese reading support",
    description:
      "Use MEKURU alongside the Japanese books you choose. Look things up, capture vocabulary, and study as you read.",
  },
  {
    title: "Curiosity Reading",
    description:
      "Look up and save words while you read, then keep those words connected to the book.",
  },
  {
    title: "Follow-Along",
    description:
      "Use saved words as light reading support when you return to a Japanese book.",
  },
  {
    title: "Vocabulary study and flashcards",
    description:
      "Review saved vocabulary from a single book or across your Japanese reading library.",
  },
];

const readingExperienceOptions = [
  { value: "starting", label: "Just starting" },
  { value: "lots_of_support", label: "I can read with a lot of support" },
  { value: "independent_slow", label: "I can read independently but slowly" },
  { value: "comfortable", label: "I’m a comfortable reader" },
  { value: "not_sure", label: "Not sure" },
];

const jlptLevelOptions = [
  { value: "n5", label: "N5" },
  { value: "n4", label: "N4" },
  { value: "n3", label: "N3" },
  { value: "n2", label: "N2" },
  { value: "n1", label: "N1" },
  { value: "not_sure", label: "Not sure" },
  { value: "not_taken", label: "I haven’t taken the JLPT" },
];

const initialReadingSessionHref = "https://scheduler.zoom.us/mekuru/initial-japanese";
const followUpSessionHref = "https://scheduler.zoom.us/mekuru/follow-up-japanese";

function requestSourceFromParam(value: string | null) {
  if (value === "study_hub" || value === "book_hub") return value;
  return "japanese_learning_page";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function JapaneseLearningPage() {
  const searchParams = useSearchParams();
  const source = useMemo(
    () => requestSourceFromParam(searchParams.get("source")),
    [searchParams]
  );

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [readingExperience, setReadingExperience] = useState("not_sure");
  const [jlptLevel, setJlptLevel] = useState("");
  const [access, setAccess] = useState<AccessState | null>(null);
  const [request, setRequest] = useState<RequestState | null>(null);

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

  async function loadRequestState() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetchWithSession("/api/japanese-learning/request");
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not load Japanese Learning status.");
      }

      setAccess(payload?.access ?? null);
      setRequest(payload?.request ?? null);
    } catch (error: any) {
      setMessage(error?.message ?? "Could not load Japanese Learning status.");
    } finally {
      setLoading(false);
    }
  }

  async function submitRequest() {
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetchWithSession("/api/japanese-learning/request", {
        method: "POST",
        body: JSON.stringify({
          note,
          readingExperience,
          jlptLevel: jlptLevel || null,
          source,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not request an invitation.");
      }

      setRequest(payload?.request ?? null);
      setMessage(
        payload?.duplicate
          ? "Invitation already requested."
          : "Invitation requested. Access has not started yet."
      );
      setNote("");
      setReadingExperience("not_sure");
      setJlptLevel("");
    } catch (error: any) {
      setMessage(error?.message ?? "Could not request an invitation.");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    void loadRequestState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeAccess = access?.hasFullAccess;
  const activeTrial = activeAccess && access?.reason === "trial";
  const pendingRequest = request?.status === "pending";
  const approvedRequest = request?.status === "approved";
  const declinedRequest = request?.status === "declined";

  return (
    <main className="min-h-screen bg-[#f7f3ee] px-5 py-8 text-stone-950">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/library-study"
          className="text-sm font-black text-stone-500 transition hover:text-stone-900"
        >
          ← Back to Study Hub
        </Link>

        <section className="mt-5 rounded-[2rem] border border-white bg-gradient-to-br from-violet-100 via-white to-amber-50 p-6 shadow-sm md:p-10">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-600">
            Japanese Learning
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight md:text-6xl">
            Learn Japanese through the books you are actually reading.
          </h1>
        </section>

        <section className="mt-6 rounded-3xl border border-amber-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-black text-stone-950">
            You choose the book. You direct the reading. MEKURU provides the tools.
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Bring your own books. MEKURU supports your reading and study, but does not provide the book text.
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-black text-stone-950">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {feature.description}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-3xl border border-violet-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">
            Current pilot
          </p>
          <h2 className="mt-2 text-2xl font-black text-stone-950">
            Invitation only
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Japanese Learning is currently available by invitation while we test and refine the experience.
          </p>

          {loading ? (
            <p className="mt-5 text-sm font-semibold text-stone-500">
              Loading your invitation status...
            </p>
          ) : activeAccess ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-950">
              <h3 className="text-lg font-black">
                {activeTrial
                  ? "Your Japanese Learning trial has started"
                  : "Japanese Learning access is active"}
              </h3>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                    Trial start
                  </dt>
                  <dd className="mt-1">{formatDate(access?.trialStartedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                    {activeTrial ? "Trial ends" : "Access expires"}
                  </dt>
                  <dd className="mt-1">
                    {formatDate(access?.trialEndsAt ?? access?.expiresAt)}
                  </dd>
                </div>
              </dl>
              <Link
                href="/library-study"
                className="mt-4 inline-flex rounded-full bg-emerald-700 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-800"
              >
                Start learning →
              </Link>
            </div>
          ) : pendingRequest ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              Invitation requested. Access has not started yet.
            </div>
          ) : approvedRequest ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
              Your invitation was approved. Sign in again if your access does not look active yet.
            </div>
          ) : declinedRequest ? (
            <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-700">
              Your previous request has been reviewed.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <label className="block text-sm font-black text-stone-800">
                How would you describe your current Japanese reading experience?
              </label>
              <select
                value={readingExperience}
                onChange={(event) => setReadingExperience(event.target.value)}
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
              >
                {readingExperienceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <label className="block text-sm font-black text-stone-800">
                JLPT level, if you know it{" "}
                <span className="font-semibold text-stone-500">(optional)</span>
              </label>
              <select
                value={jlptLevel}
                onChange={(event) => setJlptLevel(event.target.value)}
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
              >
                <option value="">Select one, or leave blank</option>
                {jlptLevelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <label className="block text-sm font-black text-stone-800">
                Anything you’d like me to know?{" "}
                <span className="font-semibold text-stone-500">(optional)</span>
              </label>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={600}
                className="min-h-[110px] w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                placeholder="A book, manga, audiobook use, reading goal, learning background, or anything else helpful..."
              />
              <button
                type="button"
                onClick={() => void submitRequest()}
                disabled={submitting}
                className="rounded-full bg-stone-950 px-5 py-3 text-sm font-black text-white transition hover:bg-stone-800 disabled:opacity-60"
              >
                {submitting ? "Requesting..." : "Request an invitation"}
              </button>
              <p className="text-xs leading-5 text-stone-500">
                Requesting an invitation does not start a trial or unlock paid features.
              </p>
            </div>
          )}

          {!loading && approvedRequest ? (
            <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4 text-sm text-violet-950">
              <h3 className="text-lg font-black">Book your Guided Japanese Trial sessions</h3>
              <p className="mt-2 leading-6">
                Please book both 30-minute sessions now. Schedule the initial reading
                session first, then schedule the follow-up for approximately two weeks
                after the initial session.
              </p>
              <p className="mt-2 leading-6">
                Your 28-day app trial will begin after the initial reading/setup
                session. The follow-up session is only available if you have used the
                app before the appointment.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={initialReadingSessionHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-full bg-violet-700 px-4 py-2 text-sm font-black text-white transition hover:bg-violet-800"
                >
                  Book Initial Reading Session
                </a>
                <a
                  href={followUpSessionHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-black text-violet-800 transition hover:bg-violet-100"
                >
                  Book Follow-Up Session
                </a>
              </div>
            </div>
          ) : null}

          {message ? (
            <p className="mt-4 text-sm font-semibold text-violet-700">{message}</p>
          ) : null}
        </section>

        <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">
            Want more support?
          </p>
          <h2 className="mt-2 text-2xl font-black text-stone-950">
            Japanese reading lessons with Devon
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Lessons are optional and separate from Japanese Learning. Devon offers focused support for working through real Japanese texts.
          </p>
          <Link
            href="/japanese"
            className="mt-4 inline-flex rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-black text-stone-800 transition hover:bg-stone-50"
          >
            View lessons →
          </Link>
        </section>
      </div>
    </main>
  );
}
