// Reading Tab
// 

import type { ComponentType } from "react";
import { useState } from "react";

type Book = {
  page_count: number | null;
};

type UserBook = {
  id: string;
  started_at: string | null;
  finished_at: string | null;
  dnf_at: string | null;
  dnf_reason: string | null;
  dnf_note: string | null;
  would_retry: string | null;
  format_type: string | null;
  progress_mode: string | null;
  show_page_numbers: boolean | null;
};

const DNF_REASON_OPTIONS = [
  { value: "", label: "Choose a reason" },
  { value: "too_difficult_right_now", label: "Too difficult right now" },
  { value: "wrong_timing_mood", label: "Wrong timing or mood" },
  { value: "too_much_unknown_vocabulary", label: "Too much unknown vocabulary" },
  { value: "too_dense_slow", label: "Too dense or slow" },
  { value: "lost_interest", label: "Lost interest" },
  { value: "did_not_like_it", label: "Did not like it" },
  { value: "other", label: "Other" },
];

const WOULD_RETRY_OPTIONS = [
  { value: "", label: "Choose retry intent" },
  { value: "yes", label: "Yes, I want to try again" },
  { value: "maybe", label: "Maybe later" },
  { value: "no", label: "No, probably not" },
];

type ReadingSession = {
  id: string;
  user_book_id: string;
  read_on: string;
  start_page: number;
  end_page: number;
  minutes_read: number | null;
  is_filler: boolean;
  created_at: string;
  session_mode: string | null;
};

type ReadingTabProps = {
  row: UserBook;
  book: Book;
  isEditingThisTab: boolean;

  formatType: string;
  setFormatType: (value: string) => void;
  progressMode: string;
  setProgressMode: (value: string) => void;
  showPageNumbers: boolean;
  setShowPageNumbers: (value: boolean) => void;

  startedAt: string;
  setStartedAt: (value: string) => void;
  finishedAt: string;
  setFinishedAt: (value: string) => void;
  dnfAt: string;
  setDnfAt: (value: string) => void;
  dnfReason: string;
  setDnfReason: (value: string) => void;
  dnfNote: string;
  setDnfNote: (value: string) => void;
  wouldRetry: string;
  setWouldRetry: (value: string) => void;
  started: Date | null;
  finished: Date | null;

  canFillBeginningPages: boolean;
  fillBeginningPages: () => Promise<void>;

  sessionDate: string;
  setSessionDate: (value: string) => void;
  sessionMinutesRead: string;
  setSessionMinutesRead: (value: string) => void;
  sessionStartPage: string;
  setSessionStartPage: (value: string) => void;
  sessionEndPage: string;
  setSessionEndPage: (value: string) => void;
  sessionMode: "fluid" | "curiosity" | "listening";
  setSessionMode: React.Dispatch<
    React.SetStateAction<"fluid" | "curiosity" | "listening">
  >;

  saveReadingSession: () => Promise<void>;
  saveReadingDates: () => Promise<void>;
  deleteReadingSession: (sessionId: string) => Promise<void>;
  editingReadingSessionId: string | null;
  startEditingReadingSession: (session: ReadingSession) => void;
  cancelEditingReadingSession: () => void;

  readingSessions: ReadingSession[];
  visibleReadingSessions: ReadingSession[];
  showAllSessions: boolean;
  renderSessionToggle: () => React.ReactNode;

  formatTypeLabel: (value: string | null | undefined) => string;
  progressModeLabel: (value: string | null | undefined) => string;

  DateField: ComponentType<{
    label: string;
    value: Date | null;
    editing: boolean;
    inputValue: string;
    setInputValue: (v: string) => void;
  }>;
};

export default function ReadingTab({
  row,
  book,
  isEditingThisTab,

  formatType,
  setFormatType,
  progressMode,
  setProgressMode,
  showPageNumbers,
  setShowPageNumbers,

  startedAt,
  setStartedAt,
  finishedAt,
  setFinishedAt,
  dnfAt,
  setDnfAt,
  dnfReason,
  setDnfReason,
  dnfNote,
  setDnfNote,
  wouldRetry,
  setWouldRetry,
  canFillBeginningPages,
  fillBeginningPages,

  started,
  finished,

  sessionDate,
  setSessionDate,
  sessionMinutesRead,
  setSessionMinutesRead,
  sessionStartPage,
  setSessionStartPage,
  sessionEndPage,
  setSessionEndPage,
  sessionMode,
  setSessionMode,

  saveReadingSession,
  saveReadingDates,
  deleteReadingSession,
  editingReadingSessionId,
  startEditingReadingSession,
  cancelEditingReadingSession,

  readingSessions,
  visibleReadingSessions,
  showAllSessions,
  renderSessionToggle,

  formatTypeLabel,
  progressModeLabel,

  DateField,
}: ReadingTabProps) {
  const [isEditingDates, setIsEditingDates] = useState(false);
  const usePercentMode = progressMode === "percent" && book.page_count != null && book.page_count > 0;
  const useListeningPercentMode = book.page_count != null && book.page_count > 0;

  function pageToPercent(page: number | null) {
    if (page == null || !book.page_count || book.page_count <= 0) return null;
    return Math.max(0, Math.min(100, Math.round((page / book.page_count) * 100)));
  }

  function listeningProgressLabel(endPage: number | null | undefined) {
    if (endPage == null) return "Listening session";

    const percent = pageToPercent(endPage);
    if (percent != null) return `Listening · up to ${percent}%`;

    return `Listening · up to p. ${endPage}`;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-stone-900">Book Dates</div>

          {!isEditingDates ? (
            <button
              type="button"
              onClick={() => setIsEditingDates(true)}
              className="rounded-lg bg-stone-200 px-3 py-1 text-sm font-medium text-stone-800 hover:bg-stone-300"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  await saveReadingDates();
                  setIsEditingDates(false);
                }}
                className="rounded-lg bg-stone-900 px-3 py-1 text-sm font-medium text-white hover:bg-black"
              >
                Save
              </button>

              <button
                type="button"
                onClick={() => setIsEditingDates(false)}
                className="rounded-lg bg-stone-200 px-3 py-1 text-sm font-medium text-stone-800 hover:bg-stone-300"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <DateField
            label="Start Date"
            value={started}
            editing={isEditingDates}
            inputValue={startedAt}
            setInputValue={setStartedAt}
          />

          <DateField
            label="Finish Date"
            value={finished}
            editing={isEditingDates}
            inputValue={finishedAt}
            setInputValue={setFinishedAt}
          />

          <DateField
            label="DNF Date"
            value={dnfAt ? new Date(dnfAt) : null}
            editing={isEditingDates}
            inputValue={dnfAt}
            setInputValue={setDnfAt}
          />
        </div>

        {(isEditingDates || dnfAt) ? (
          <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
            <div className="mb-3">
              <p className="text-sm font-semibold text-stone-900">DNF reason</p>
              <p className="mt-1 text-xs leading-5 text-stone-500">
                This helps separate “not right now” from “not for me.”
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                  Reason
                </span>
                <select
                  value={dnfReason}
                  onChange={(event) => setDnfReason(event.target.value)}
                  disabled={!isEditingDates}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 disabled:bg-stone-100 disabled:text-stone-500"
                >
                  {DNF_REASON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                  Try again?
                </span>
                <select
                  value={wouldRetry}
                  onChange={(event) => setWouldRetry(event.target.value)}
                  disabled={!isEditingDates}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 disabled:bg-stone-100 disabled:text-stone-500"
                >
                  {WOULD_RETRY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                Note
              </span>
              <textarea
                value={dnfNote}
                onChange={(event) => setDnfNote(event.target.value)}
                disabled={!isEditingDates}
                rows={3}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm leading-6 text-stone-900 disabled:bg-stone-100 disabled:text-stone-500"
                placeholder="Optional note about why you stopped."
              />
            </label>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 text-sm font-semibold text-stone-900">Log Reading Session</div>
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          <p>
            Use this for real reading sessions. If you’re catching up pages you read before using Mekuru,
            use “Fill beginning pages” instead so your progress is correct without making your stats weird.
          </p>

          {canFillBeginningPages && !editingReadingSessionId ? (
            <button
              type="button"
              onClick={() => void fillBeginningPages()}
              className="mt-3 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
            >
              Fill beginning pages instead
            </button>
          ) : null}
        </div>

        {editingReadingSessionId ? (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
            Editing reading session
          </div>
        ) : null}

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Session Type
          </label>
          <select
            value={sessionMode}
            onChange={(e) =>
              setSessionMode(e.target.value as "fluid" | "curiosity" | "listening")
            }
            className="w-full rounded border bg-white px-2 py-1 text-sm sm:w-auto"
          >
            <option value="fluid">Fluid Reading</option>
            <option value="curiosity">Curiosity Reading</option>
            <option value="listening">
              {useListeningPercentMode ? "Listening (%)" : "Listening"}
            </option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded border bg-white p-3 text-sm">
            <div className="text-stone-600">Date</div>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="mt-1 w-full rounded border px-2 py-1"
            />
          </div>

          <div className="rounded border bg-white p-3 text-sm">
            <div className="text-stone-600">
              {sessionMode === "listening" ? "Minutes listened" : "Minutes read"}
            </div>
            <input
              type="number"
              min={1}
              value={sessionMinutesRead}
              onChange={(e) => setSessionMinutesRead(e.target.value)}
              placeholder="e.g. 25"
              className="mt-1 w-full rounded border px-2 py-1"
            />
          </div>

          {sessionMode !== "listening" && (
            <>
              <div className="rounded border bg-white p-3 text-sm">
                <div className="text-stone-600">
                  {usePercentMode ? "Start percent" : "Start page"}
                </div>
                <input
                  type="number"
                  min={usePercentMode ? 0 : 1}
                  max={usePercentMode ? 100 : undefined}
                  value={sessionStartPage}
                  onChange={(e) => setSessionStartPage(e.target.value)}
                  placeholder={usePercentMode ? "e.g. 12" : "e.g. 4"}
                  className="mt-1 w-full rounded border px-2 py-1"
                />
              </div>

              <div className="rounded border bg-white p-3 text-sm">
                <div className="text-stone-600">
                  {usePercentMode ? "End percent" : "End page"}
                </div>
                <input
                  type="number"
                  min={usePercentMode ? 0 : 1}
                  max={usePercentMode ? 100 : undefined}
                  value={sessionEndPage}
                  onChange={(e) => setSessionEndPage(e.target.value)}
                  placeholder={usePercentMode ? "e.g. 18" : "e.g. 10"}
                  className="mt-1 w-full rounded border px-2 py-1"
                />
              </div>
            </>
          )}

          {sessionMode === "listening" && (
            <div className="rounded border bg-white p-3 text-sm">
              <div className="text-stone-600">
                {useListeningPercentMode
                  ? "Listening end percent (optional)"
                  : "Listening end page (optional)"}
              </div>
              <input
                type="number"
                min={useListeningPercentMode ? 0 : 1}
                max={useListeningPercentMode ? 100 : undefined}
                value={sessionEndPage}
                onChange={(e) => setSessionEndPage(e.target.value)}
                placeholder={useListeningPercentMode ? "e.g. 35" : "e.g. 45"}
                className="mt-1 w-full rounded border px-2 py-1"
              />
              <p className="mt-2 text-xs text-stone-500">
                Fill this in only if you want to update your listening progress. It does not affect reading stats.
              </p>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={saveReadingSession}
            className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
          >
            {editingReadingSessionId ? "Update Session" : "Save Session"}
          </button>

          {editingReadingSessionId ? (
            <button
              type="button"
              onClick={cancelEditingReadingSession}
              className="rounded-2xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-300"
            >
              Cancel Edit
            </button>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 text-sm font-semibold text-stone-900">Reading Sessions</div>

        {readingSessions.length === 0 ? (
          <div className="text-sm text-stone-500">No sessions yet.</div>
        ) : (
          <>
            {showAllSessions && <div className="mb-3">{renderSessionToggle()}</div>}

            <div className="space-y-2">
              {visibleReadingSessions.map((session) => {
                const pagesRead =
                  session.start_page != null && session.end_page != null
                    ? session.end_page - session.start_page + 1
                    : null;

                return (
                  <div
                    key={session.id}
                    className="rounded-xl border bg-white p-3 text-sm text-stone-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{session.read_on}</div>
                        <div className="mt-1">
                          {session.session_mode === "listening" ? (
                            listeningProgressLabel(session.end_page)
                          ) : session.start_page != null && session.end_page != null ? (
                            usePercentMode
                              ? `${pageToPercent(session.start_page)}% → ${pageToPercent(session.end_page)}%`
                              : `p. ${session.start_page} → ${session.end_page}`
                          ) : (
                            "Pages not recorded"
                          )}
                        </div>

                        <div className="mt-1 text-stone-500">
                          {session.session_mode === "listening" ? (
                            session.minutes_read != null
                              ? session.end_page != null
                                ? `${session.minutes_read} min · progress only`
                                : `${session.minutes_read} min`
                              : session.end_page != null
                                ? "Progress only"
                                : "Untimed"
                          ) : pagesRead != null ? (
                            session.minutes_read != null
                              ? `${session.minutes_read} min · ${pagesRead} pages`
                              : `Untimed · ${pagesRead} pages`
                          ) : session.minutes_read != null ? (
                            `${session.minutes_read} min`
                          ) : (
                            "Untimed"
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => startEditingReadingSession(session)}
                          className="rounded bg-stone-200 px-2 py-1 text-xs font-medium text-stone-700 transition hover:bg-stone-300"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteReadingSession(session.id)}
                          className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3">{renderSessionToggle()}</div>
          </>
        )}
      </div>
    </div>
  );
}
