import type { ComponentType } from "react";

type Book = {
  page_count: number | null;
};

type UserBook = {
  id: string;
  started_at: string | null;
  finished_at: string | null;
  dnf_at: string | null;
  format_type: string | null;
  progress_mode: string | null;
  show_page_numbers: boolean | null;
};

type ReadingSession = {
  id: string;
  user_book_id: string;
  read_on: string;
  start_page: number | null;
  end_page: number | null;
  minutes_read: number | null;
  created_at: string;
  session_mode?: string | null;
};

type ReadingTabProps = {
  row: UserBook;
  book: Book;
  isEditingThisTab: boolean;

  markStartedToday: () => void;
  markFinishedToday: () => void;
  markDnfToday: () => void;

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

  started: Date | null;
  finished: Date | null;

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
  deleteReadingSession: (sessionId: string) => Promise<void>;

  readingSessions: ReadingSession[];
  visibleReadingSessions: ReadingSession[];
  showAllSessions: boolean;
  renderSessionToggle: () => React.ReactNode;

  canFillBeginningPages: boolean;
  canFillEndingPages: boolean;
  fillBeginningPages: () => Promise<void>;
  fillEndingPages: () => Promise<void>;
  earliestStartPage: number | null;
  furthestPage: number | null;

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

  markStartedToday,
  markFinishedToday,
  markDnfToday,

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
  deleteReadingSession,

  readingSessions,
  visibleReadingSessions,
  showAllSessions,
  renderSessionToggle,

  canFillBeginningPages,
  canFillEndingPages,
  fillBeginningPages,
  fillEndingPages,
  earliestStartPage,
  furthestPage,

  formatTypeLabel,
  progressModeLabel,

  DateField,
}: ReadingTabProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 text-sm font-semibold text-stone-900">Book Status</div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={markStartedToday}
            className="rounded-2xl border px-4 py-2 text-sm font-medium text-stone-700 hover:bg-white"
          >
            Start Today
          </button>

          <button
            type="button"
            onClick={markFinishedToday}
            className="rounded-2xl border px-4 py-2 text-sm font-medium text-stone-700 hover:bg-white"
          >
            Mark Finished
          </button>

          <button
            type="button"
            onClick={markDnfToday}
            className="rounded-2xl border px-4 py-2 text-sm font-medium text-stone-700 hover:bg-white"
          >
            Mark DNF
          </button>
        </div>

        {canFillBeginningPages || canFillEndingPages ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {canFillBeginningPages ? (
              <button
                type="button"
                onClick={fillBeginningPages}
                className="rounded-2xl border px-4 py-2 text-sm font-medium text-stone-700 hover:bg-white"
              >
                Fill the empty beginning pages
              </button>
            ) : null}

            {canFillEndingPages ? (
              <button
                type="button"
                onClick={fillEndingPages}
                className="rounded-2xl border px-4 py-2 text-sm font-medium text-stone-700 hover:bg-white"
              >
                Fill the empty ending pages
              </button>
            ) : null}
          </div>
        ) : null}

        {canFillBeginningPages && earliestStartPage != null ? (
          <div className="mt-2 text-xs text-stone-500">
            Looks like you started logging the book on page {earliestStartPage}. Fill pages 1–{earliestStartPage - 1}?
            <p className="mt-2 text-xs text-stone-500">
              This will not affect your stats.
            </p>
          </div>

        ) : null}

        {canFillEndingPages && furthestPage != null ? (
          <div className="mt-2 text-xs text-stone-500">
            Looks like your story ended on page {furthestPage}. Fill pages {furthestPage + 1}–{book.page_count}?
            <p className="mt-2 text-xs text-stone-500">
              This will not affect your stats.
            </p>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 text-sm font-semibold text-stone-900">Reading History</div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded border bg-white p-3 text-sm">
            <div className="text-stone-600">Format</div>
            {!isEditingThisTab ? (
              <div className="mt-1 font-medium">{formatTypeLabel(formatType)}</div>
            ) : (
              <select
                value={formatType}
                onChange={(e) => setFormatType(e.target.value)}
                className="mt-1 w-full rounded border bg-white px-2 py-1 text-sm"
              >
                <option value="">—</option>
                <option value="paperback">Paperback</option>
                <option value="hardcover">Hardcover</option>
                <option value="ebook">eBook</option>
                <option value="audiobook">Audiobook</option>
                <option value="other">Other</option>
              </select>
            )}
          </div>

          <div className="rounded border bg-white p-3 text-sm">
            <div className="text-stone-600">Progress Mode</div>
            {!isEditingThisTab ? (
              <div className="mt-1 font-medium">{progressModeLabel(progressMode)}</div>
            ) : (
              <select
                value={progressMode}
                onChange={(e) => setProgressMode(e.target.value)}
                className="mt-1 w-full rounded border bg-white px-2 py-1 text-sm"
              >
                <option value="">—</option>
                <option value="pages">Pages</option>
                <option value="percent">Percent</option>
                <option value="chapters">Chapters</option>
                <option value="time">Time</option>
              </select>
            )}
          </div>

          <div className="rounded border bg-white p-3 text-sm">
            <div className="text-stone-600">Show Page Numbers</div>
            {!isEditingThisTab ? (
              <div className="mt-1 font-medium">{showPageNumbers ? "Yes" : "No"}</div>
            ) : (
              <label className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showPageNumbers}
                  onChange={(e) => setShowPageNumbers(e.target.checked)}
                />
                <span>Show page numbers</span>
              </label>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <DateField
            label="Started"
            value={started}
            editing={isEditingThisTab}
            inputValue={startedAt}
            setInputValue={setStartedAt}
          />

          <div className="rounded border bg-white p-3 text-sm">
            <div className="text-stone-600">Finished / DNF</div>
            {!isEditingThisTab ? (
              <div className="mt-1 font-medium">
                {dnfAt
                  ? `${dnfAt} (DNF)`
                  : finished
                    ? finishedAt
                    : "—"}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="date"
                  value={finishedAt}
                  onChange={(e) => setFinishedAt(e.target.value)}
                  className="w-full rounded border px-2 py-1"
                />
                <input
                  type="date"
                  value={dnfAt}
                  onChange={(e) => setDnfAt(e.target.value)}
                  className="w-full rounded border px-2 py-1"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 text-sm font-semibold text-stone-900">Log a Session</div>

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
                <div className="text-stone-600">Start page</div>
                <input
                  type="number"
                  min={1}
                  value={sessionStartPage}
                  onChange={(e) => setSessionStartPage(e.target.value)}
                  placeholder="e.g. 4"
                  className="mt-1 w-full rounded border px-2 py-1"
                />
              </div>

              <div className="rounded border bg-white p-3 text-sm">
                <div className="text-stone-600">End page</div>
                <input
                  type="number"
                  min={1}
                  value={sessionEndPage}
                  onChange={(e) => setSessionEndPage(e.target.value)}
                  placeholder="e.g. 10"
                  className="mt-1 w-full rounded border px-2 py-1"
                />
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Session Type
            </label>
            <select
              value={sessionMode}
              onChange={(e) =>
                setSessionMode(e.target.value as "fluid" | "curiosity" | "listening")
              }
            >
              <option value="fluid">Fluid Reading</option>
              <option value="curiosity">Curiosity Reading</option>
              <option value="listening">Listening</option>
            </select>
          </div>
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={saveReadingSession}
            className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
          >
            Save Session
          </button>
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
                          {session.start_page != null && session.end_page != null
                            ? `p. ${session.start_page} → ${session.end_page}`
                            : session.session_mode === "listening"
                              ? "Listening session"
                              : "Pages not recorded"}
                        </div>
                        <div className="mt-1 text-stone-500">
                          {pagesRead != null
                            ? session.minutes_read != null
                              ? `${session.minutes_read} min · ${pagesRead} pages`
                              : `Untimed · ${pagesRead} pages`
                            : session.minutes_read != null
                              ? `${session.minutes_read} min`
                              : "Untimed"}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteReadingSession(session.id)}
                        className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100"
                      >
                        Remove
                      </button>
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