"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getAppAccessStatus } from "@/lib/access/appAccess";
import { getLearnerAccessDisplay } from "@/lib/access/learnerDisplayLabels";
import type { StudentsCategory } from "@/lib/teacher/studentsIndex";
import { getTeacherBackLink } from "../components/teacherBackLink";
import TeacherStudentsHeader from "./components/TeacherStudentsHeader";

type Student = {
  id: string;
  display_name: string | null;
  username: string | null;
  level: string | null;
  role: string | null;
  is_super_teacher?: boolean | string | null;
  app_access_type: string | null;
  app_access_expires_at: string | null;
  isCurrentStudent: boolean;
  lastEngagedAt: string | null;
  archivedTeacherId: string | null;
};

function formatLastEngaged(value: string | null) {
  if (!value) return "No recent activity";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No recent activity";
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}

export default function TeacherStudentsPage() {
  const searchParams = useSearchParams();
  const backLink = getTeacherBackLink(searchParams.get("from"));
  const [category, setCategory] = useState<StudentsCategory>("current");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [users, setUsers] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(24);
  const [elevated, setElevated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = window.setTimeout(async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (controller.signal.aborted) return;
        const token = data.session?.access_token;
        if (!token) { setDenied(true); return; }
        const params = new URLSearchParams({ category, q: search, page: String(page) });
        const response = await fetch(`/api/teacher/students-index?${params}`, {
          headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
        });
        const payload = await response.json();
        if (controller.signal.aborted) return;
        setDenied(response.status === 401 || response.status === 403);
        if (!response.ok) throw new Error(payload.error ?? "Could not load students.");
        setUsers(payload.users);
        setTotal(payload.total);
        setElevated(payload.elevated);
        setPageSize(payload.pageSize);
      } catch (err) {
        if (!controller.signal.aborted) {
          setUsers([]);
          setError(err instanceof Error ? err.message : "Could not load students.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, search ? 250 : 0);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [category, search, page, revision]);

  function chooseCategory(value: StudentsCategory) {
    setCategory(value);
    setPage(0);
  }

  async function restoreStudent(student: Student) {
    if (!student.archivedTeacherId || !window.confirm(`Restore ${student.display_name || student.username || "this learner"} to Current Students?`)) return;
    setRestoring(student.id);
    try {
      // Retain the existing relationship-only restoration, subject to the same RLS rules.
      const { data: changed, error } = await supabase.from("teacher_students")
        .update({ relationship_status: "current", archived_at: null, archived_by: null, archive_reason: null })
        .eq("teacher_id", student.archivedTeacherId).eq("student_id", student.id)
        .not("archived_at", "is", null).select("teacher_id");
      if (error) throw error;
      if (!changed?.length) throw new Error("This relationship could not be restored. Refresh and try again.");
      setRevision(value => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not restore this relationship.");
    } finally { setRestoring(null); }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link href={backLink.href} className="mb-3 inline-block text-sm font-semibold text-stone-500 hover:text-stone-900">{backLink.label}</Link>
      <TeacherStudentsHeader />
      {denied ? <p className="mt-6 text-stone-600">Students is available to teachers and accounts with super-teacher access.</p> : (
        <section className="mt-5 space-y-4">
          {elevated ? (
            <nav aria-label="Students categories" className="flex flex-wrap gap-2">
              {([["trial", "Trial"], ["current", "Current Students"], ["all", "All Users"]] as const).map(([value, label]) => (
                <button key={value} type="button" aria-pressed={category === value} onClick={() => chooseCategory(value)}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold ${category === value ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white text-stone-600"}`}>{label}</button>
              ))}
            </nav>
          ) : <h2 className="text-lg font-bold">{category === "past" ? "Past student relationships" : "Students"}</h2>}
          <label className="block text-sm font-medium text-stone-600">
            Search {category === "trial" ? "trial users" : category === "all" ? "all users" : "students"}
            <input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }}
              placeholder="Name, username, level, lesson day, or book title"
              className="mt-1 block w-full rounded-xl border border-stone-300 bg-white px-3 py-2 font-normal" />
          </label>
          {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : null}
          {loading ? <p role="status" className="text-sm text-stone-500">Loading…</p> : (
            <>
              <p className="text-xs text-stone-500" role="status">{total} {total === 1 ? "person" : "people"}{search ? " match this search" : " in this category"}</p>
              {users.length === 0 ? <p className="text-sm text-stone-500">No people found in this category.</p> : null}
              <div className="grid gap-3">
                {users.map(student => {
                  const name = student.display_name || student.username || "Unnamed user";
                  const access = getLearnerAccessDisplay({ role: student.role, app_access_type: student.app_access_type,
                    app_access_expires_at: student.app_access_expires_at, linkedToTeacher: student.isCurrentStudent });
                  const trialAccess = student.app_access_type?.trim().toLowerCase() === "trial"
                    ? getLearnerAccessDisplay({ role: student.role, app_access_type: student.app_access_type,
                        app_access_expires_at: student.app_access_expires_at })
                    : null;
                  const productAccess = getAppAccessStatus(student);
                  const productAccessLabel = productAccess.reason === "expired" && student.app_access_type?.trim().toLowerCase() === "trial"
                    ? `Free · Trial ended ${new Date(student.app_access_expires_at!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                    : `${student.app_access_type || "Not set"}${productAccess.reason === "expired" ? " · expired" : ""}`;
                  const relationshipInfo = student.isCurrentStudent
                    ? student.archivedTeacherId ? "Active + archived relationships" : "Active relationship"
                    : student.archivedTeacherId ? "Archived relationship" : "No relationship";
                  const workspace = `/teacher/students/${encodeURIComponent(student.id)}/workspace`;
                  const canOpen = elevated || student.isCurrentStudent;
                  return (
                    <article key={student.id} className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-lg font-bold text-stone-500">{name.charAt(0).toUpperCase()}</div>
                        <div className="min-w-0 flex-1">
                          <h3 className="break-words font-bold text-stone-900">{name}</h3>
                          {student.username ? <p className="break-words text-xs text-stone-500">@{student.username}</p> : null}
                          <div className="mt-1 flex flex-wrap gap-1 text-xs text-stone-600">
                            {student.level ? <span className="rounded bg-stone-100 px-2 py-0.5">{student.level}</span> : null}
                            <span className="rounded bg-stone-100 px-2 py-0.5">{access.label}</span>
                          </div>
                          {elevated ? (
                            <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
                              <div className="flex gap-1"><dt className="font-medium" title="profiles.role">Role:</dt><dd>{student.role || "Not set"}{student.role !== "super_teacher" && (student.is_super_teacher === true || student.is_super_teacher === "true") ? " · super-teacher enabled" : ""}</dd></div>
                              <div className="flex gap-1"><dt className="font-medium" title="teacher_students">Teaching:</dt><dd>{relationshipInfo}</dd></div>
                              <div className="flex gap-1"><dt className="font-medium" title="profiles.app_access_type">Product access:</dt><dd>{productAccessLabel}</dd></div>
                            </dl>
                          ) : null}
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500">
                            <p>Last engaged: {formatLastEngaged(student.lastEngagedAt)}</p>
                            {trialAccess?.detail ? <p className="text-emerald-800">Trial: {trialAccess.detail}</p> : null}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-3 text-sm sm:justify-end">
                        {canOpen ? <Link href={workspace} className="rounded-lg bg-stone-900 px-3 py-2 font-semibold text-white hover:bg-black">{student.isCurrentStudent ? "Open Student Space" : "Open User Space"}</Link> : null}
                        {student.isCurrentStudent ? <Link href={`${workspace}?assignTask=1`} className="font-semibold text-sky-700 hover:text-sky-900">Assign a Task</Link> : null}
                        {!canOpen && student.archivedTeacherId ? <button type="button" disabled={restoring === student.id} onClick={() => void restoreStudent(student)} className="font-semibold text-emerald-700 disabled:opacity-50">{restoring === student.id ? "Restoring…" : "Restore student relationship"}</button> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
              {total > pageSize ? <div className="flex items-center gap-4 text-sm">
                <button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)} className="disabled:opacity-40">Previous</button>
                <span>Page {page + 1} of {Math.ceil(total / pageSize)}</span>
                <button type="button" disabled={(page + 1) * pageSize >= total} onClick={() => setPage(value => value + 1)} className="disabled:opacity-40">Next</button>
              </div> : null}
            </>
          )}
          {!elevated ? <details className="pt-3 text-xs text-stone-500">
            <summary className="cursor-pointer">Past student relationships</summary>
            <p className="mt-2">Archived relationships can be restored here. Their reading workspace remains unavailable until restored.</p>
            <button type="button" onClick={() => chooseCategory(category === "past" ? "current" : "past")} className="mt-2 underline">{category === "past" ? "Return to Students" : "View archived relationships"}</button>
          </details> : null}
        </section>
      )}
    </main>
  );
}
