import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolveResumeBookmark, resumeBookmarkLabel, latestSessionPhrase } from "../lib/books/resumeBookmark.mjs";

const repo = new URL("../", import.meta.url);

test("top, end, and phrase choices map independently from the session ending page", () => {
  assert.deepEqual(resolveResumeBookmark("top", 44, 300), { kind: "top", page: 44, phrase: null });
  assert.deepEqual(resolveResumeBookmark("end", 44, 300), { kind: "top", page: 45, phrase: null });
  assert.deepEqual(resolveResumeBookmark("phrase", 44, 300, " 家族そろって "), { kind: "phrase", page: 44, phrase: "家族そろって" });
  assert.equal(resumeBookmarkLabel({ kind: "phrase", page: 44, phrase: "家族そろって" }, 300), "Resume from 「家族そろって」 on page 44");
  assert.equal(resumeBookmarkLabel({ kind: "top", page: 44, phrase: null }, 300), "Resume from page 44 (top of page)");
  assert.equal(resumeBookmarkLabel({ kind: "top", page: 45, phrase: null }, 300), "Resume from page 45 (top of page)");
});

test("end-of-book mapping never invents a page beyond the known total", () => {
  const bookmark = resolveResumeBookmark("end", 44, 44);
  assert.deepEqual(bookmark, { kind: "end", page: 44, phrase: null });
  assert.equal(resumeBookmarkLabel(bookmark, 44), "Resume at the end of page 44");
  assert.deepEqual(resolveResumeBookmark("end", 44, null), { kind: "top", page: 45, phrase: null });
});

test("invalid page and missing/oversized phrases are rejected", () => {
  assert.equal(resolveResumeBookmark("top", -1, 44), null);
  assert.equal(resolveResumeBookmark("end", 45, 44), null);
  assert.equal(resolveResumeBookmark("phrase", 44, 44, "  "), null);
  assert.equal(resolveResumeBookmark("phrase", 44, 44, "x".repeat(501)), null);
});

test("API enforces owner identity, page tracking, and graceful missing-schema behavior", async () => {
  const route = await readFile(new URL("app/api/books/[userBookId]/resume-bookmark/route.ts", repo), "utf8");
  assert.match(route, /auth\.getUser\(token\)/);
  assert.match(route, /book\.user_id !== user\.id/);
  assert.match(route, /\.eq\("user_id", owner\.user\.id\)/);
  assert.match(route, /effectiveProgressMethod\(owner\.book\.progress_tracking_method/);
  assert.match(route, /available: false, bookmark: null/);
  assert.match(route, /effectiveProgressMethod\(owner\.book\.progress_tracking_method, owner\.bookDetails \?\? \{\}\) !== "page"/);
});

test("finish forms show optional choices only for owner page tracking and do not change session history edits", async () => {
  const [simple, curiosity, follow, history, sessionsApi, section, hook, hub, read, listen] = await Promise.all([
    readFile(new URL("app/(protected)/books/[userBookId]/_shared/timed-session/SimpleTimedSessionPage.tsx", repo), "utf8"),
    readFile(new URL("app/(protected)/books/[userBookId]/curiosity-reading/WordTimerExperience.tsx", repo), "utf8"),
    readFile(new URL("app/(protected)/books/[userBookId]/readalong/page.tsx", repo), "utf8"),
    readFile(new URL("app/(protected)/books/[userBookId]/sessions/page.tsx", repo), "utf8"),
    readFile(new URL("app/api/books/[userBookId]/reading-sessions/route.ts", repo), "utf8"),
    readFile(new URL("components/books/ResumeBookmarkSection.tsx", repo), "utf8"),
    readFile(new URL("lib/books/useResumeBookmark.ts", repo), "utf8"),
    readFile(new URL("app/(protected)/books/[userBookId]/page.tsx", repo), "utf8"),
    readFile(new URL("app/(protected)/books/[userBookId]/read/page.tsx", repo), "utf8"),
    readFile(new URL("app/(protected)/books/[userBookId]/listening/page.tsx", repo), "utf8"),
  ]);
  for (const source of [simple, curiosity, follow]) {
    assert.match(source, /ResumeBookmarkSection/);
    assert.match(source, /tracking\.method === "page"/);
    assert.match(source, /resumeBookmark\.save\(/);
  }
  assert.match(section, /specific location within the page is optional/);
  assert.doesNotMatch(section, /Skip bookmark/);
  assert.match(hook, /!draft.kind/);
  assert.match(hook, /result\.available === false/);
  assert.doesNotMatch(hub, /ResumeBookmarkSummary/);
  assert.match(read, /ResumeBookmarkSummary/);
  assert.match(listen, /BookProgressSummaryBar/);
  assert.doesNotMatch(history, /resumeBookmark|resume_bookmark/);
  assert.doesNotMatch(sessionsApi, /resume_bookmark/);
  assert.match(simple, /session_mode: activeSessionMode/);
  assert.match(curiosity, /session_mode: isListeningMode \? "listening" : "curiosity"/);
  assert.match(follow, /session_mode: "fluid"/);
});

test("Dictionary-independent session progress helpers and unit handling remain unchanged", async () => {
  const progress = await readFile(new URL("lib/books/readingProgress.ts", repo), "utf8");
  assert.match(progress, /export function progressSummary/);
  assert.match(progress, /export function timedReadingSummary/);
  assert.match(progress, /export function progressPayload/);
  assert.match(progress, /export function sessionProgressUnit/);
  const migration = await readFile(new URL("sql/20261028_private_resume_bookmarks.sql", repo), "utf8");
  assert.doesNotMatch(migration, /alter table public\.user_books|security definer|create.*function/i);
  assert.match(migration, /force row level security/i);
  assert.match(migration, /create policy resume_bookmark_insert_own/i);
});


test("end of penultimate page resumes at the top of the last page", () => {
  const bookmark = resolveResumeBookmark("end", 44, 45);
  assert.deepEqual(bookmark, { kind: "top", page: 45, phrase: null });
  assert.equal(resumeBookmarkLabel(bookmark, 45), "Resume from page 45 (top of page)");
  assert.equal(resumeBookmarkLabel(resolveResumeBookmark("end", 45, 45), 45), "Resume at the end of page 45");
});

test("a newer blank stopping phrase suppresses older phrases, without mutating history", () => {
  const sessions = [{ id: "1", read_on: "2026-10-01", ending_phrase: "Old phrase" }, { id: "2", read_on: "2026-10-02", ending_phrase: null }];
  assert.equal(latestSessionPhrase(sessions), undefined);
  assert.equal(sessions[0].ending_phrase, "Old phrase");
  assert.equal(latestSessionPhrase([{ ...sessions[1], ending_phrase: " New phrase " }, sessions[0]]), "New phrase");
  assert.equal(latestSessionPhrase([]), undefined);
});


test("legacy phrase loader includes blank latest sessions and legacy untyped reading sessions", async () => {
  const source = await readFile(new URL("components/books/SessionEndingPhrase.tsx", repo), "utf8");
  assert.doesNotMatch(source, /\.not\("ending_phrase"/);
  assert.match(source, /session_mode\.neq\.listening,session_mode\.is\.null/);
  assert.match(source, /setLatestEndingPhrase\(sessionEndingPhrase\.trim\(\)\)/);
});


test("page-only bookmarks save the current page and discard any older precise location", () => {
  const bookmark = resolveResumeBookmark("page", 44, 45, "old phrase");
  assert.deepEqual(bookmark, { kind: "page", page: 44, phrase: null });
  assert.equal(resumeBookmarkLabel(bookmark, 45), "Resume from page 44");
  assert.deepEqual(resolveResumeBookmark("page", 45, 45), { kind: "page", page: 45, phrase: null });
});
