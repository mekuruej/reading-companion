// Teacher Book Review Page
//

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ProfileRole = "teacher" | "member" | "student";

type Book = {
    title: string | null;
    title_reading: string | null;
    cover_url: string | null;
};

type UserBook = {
    id: string;
    user_id: string;
    notes: string | null;
    recommended_level: string | null;
    teacher_student_use_rating: number | null;
    rating_recommend: number | null;
    books: Book | null;
};

const suitableLevelOptions = [
    {
        value: "Level 1",
        title: "Level 1",
        plain: "Absolute Beginner",
        cefr: "Pre-A1",
        jlpt: "Before N5",
        feel: "Hiragana/katakana, survival words, very guided sentences",
    },
    {
        value: "Level 2",
        title: "Level 2",
        plain: "Beginner 1",
        cefr: "A1",
        jlpt: "Early N5",
        feel: "Simple sentences, basic particles, dictionary-form verbs still hard",
    },
    {
        value: "Level 3",
        title: "Level 3",
        plain: "Beginner 2",
        cefr: "A1+",
        jlpt: "Solid N5",
        feel: "Can read graded material slowly with support",
    },
    {
        value: "Level 4",
        title: "Level 4",
        plain: "Upper Beginner",
        cefr: "A2",
        jlpt: "N4 entry",
        feel: "Longer sentences, more verb forms, lots of grammar still foggy",
    },
    {
        value: "Level 5",
        title: "Level 5",
        plain: "Pre-Intermediate",
        cefr: "A2+",
        jlpt: "Solid N4",
        feel: "Can follow simple stories, but unknown vocab blocks flow",
    },
    {
        value: "Level 6",
        title: "Level 6",
        plain: "Intermediate 1",
        cefr: "B1",
        jlpt: "N3 entry",
        feel: "Real Japanese starts becoming possible, but slow and lookup-heavy",
    },
    {
        value: "Level 7",
        title: "Level 7",
        plain: "Intermediate 2",
        cefr: "B1+",
        jlpt: "Solid N3",
        feel: "Can read easier native texts with support; nuance still hard",
    },
    {
        value: "Level 8",
        title: "Level 8",
        plain: "Upper Intermediate",
        cefr: "B2-ish",
        jlpt: "N2 entry",
        feel: "Can handle novels/articles, but kanji/vocab density hurts",
    },
    {
        value: "Level 9",
        title: "Level 9",
        plain: "Advanced",
        cefr: "B2+",
        jlpt: "Solid N2 / N1 entry",
        feel: "Reads real Japanese regularly, still misses style, implication, register",
    },
    {
        value: "Level 10",
        title: "Level 10",
        plain: "Upper Advanced",
        cefr: "C1-ish",
        jlpt: "Solid N1+",
        feel: "Can read widely with nuance, ambiguity, tone, and less hand-holding",
    },
] as const;

const studentUseOptions = [
    [5, "Strong yes. I'd happily use this with students."],
    [4, "Yes, with minor caveats."],
    [3, "Maybe. Depends on the student or context."],
    [2, "Probably not."],
    [1, "No. I would not use this with students."],
] as const;

const languageLearningOptions = [
    [5, "This is a learner's dream come true."],
    [4, "Has a lot of good material in there."],
    [3, "You can learn some stuff, but nothing special."],
    [2, "Not so much useful language material."],
    [1, "I didn't get anything out of it."],
] as const;

function clampRating5(value: string) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return Math.max(1, Math.min(5, n));
}

function stars5(n: number | null) {
    if (!n || n < 1) return "☆☆☆☆☆";
    return "★".repeat(n) + "☆".repeat(5 - n);
}

function studentUseLabel(value: number | null) {
    if (value === 5) return "Strong yes. I'd happily use this with students.";
    if (value === 4) return "Yes, with minor caveats.";
    if (value === 3) return "Maybe. Depends on the student or context.";
    if (value === 2) return "Probably not.";
    if (value === 1) return "No. I would not use this with students.";
    return "Not rated yet.";
}

function languageLearningLabel(value: number | null) {
    if (value === 5) return "This is a learner's dream come true.";
    if (value === 4) return "Has a lot of good material in there.";
    if (value === 3) return "You can learn some stuff, but nothing special.";
    if (value === 2) return "Not so much useful language material.";
    if (value === 1) return "I didn't get anything out of it.";
    return "Not rated yet.";
}

function getBook(data: any): Book | null {
    if (!data?.books) return null;
    return Array.isArray(data.books) ? data.books[0] ?? null : data.books;
}

export default function TeacherBookReviewPage() {
    const router = useRouter();
    const params = useParams<{ userBookId: string }>();
    const userBookId = params.userBookId;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [saveMessage, setSaveMessage] = useState("");

    const [row, setRow] = useState<UserBook | null>(null);

    const [recommendedLevel, setRecommendedLevel] = useState("");
    const [teacherStudentUseRating, setTeacherStudentUseRating] = useState("");
    const [ratingRecommend, setRatingRecommend] = useState("");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function load() {
            if (!userBookId) return;

            setLoading(true);
            setErrorMessage("");
            setSaveMessage("");

            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (cancelled) return;

            if (userError || !user) {
                setErrorMessage("Please sign in.");
                setLoading(false);
                return;
            }

            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("role, is_super_teacher")
                .eq("id", user.id)
                .maybeSingle();

            if (cancelled) return;

            if (profileError) {
                console.error("Error loading teacher profile:", profileError);
                setErrorMessage("Could not check teacher access.");
                setLoading(false);
                return;
            }

            const role = (profile?.role as ProfileRole | null) ?? "member";
            const isTeacher = role === "teacher" || !!profile?.is_super_teacher;

            if (!isTeacher) {
                setErrorMessage("Teacher access only.");
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from("user_books")
                .select(`
          id,
          user_id,
          notes,
          recommended_level,
          teacher_student_use_rating,
          rating_recommend,
          books (
            title,
            title_reading,
            cover_url
          )
        `)
                .eq("id", userBookId)
                .single();

            if (cancelled) return;

            if (error) {
                console.error("Error loading teacher book review:", error);
                setErrorMessage("Could not load this teacher review.");
                setLoading(false);
                return;
            }

            const nextRow: UserBook = {
                ...(data as any),
                books: getBook(data),
            };

            setRow(nextRow);
            setRecommendedLevel(nextRow.recommended_level ?? "");
            setTeacherStudentUseRating(
                nextRow.teacher_student_use_rating != null ? String(nextRow.teacher_student_use_rating) : ""
            );
            setRatingRecommend(
                nextRow.rating_recommend != null ? String(nextRow.rating_recommend) : ""
            );
            setNotes(nextRow.notes ?? "");

            setLoading(false);
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [userBookId]);

    const selectedLevelInfo = useMemo(() => {
        return suitableLevelOptions.find((option) => option.value === recommendedLevel) ?? null;
    }, [recommendedLevel]);

    const savedLevelInfo = useMemo(() => {
        return suitableLevelOptions.find((option) => option.value === row?.recommended_level) ?? null;
    }, [row?.recommended_level]);

    async function saveTeacherReview() {
        if (!row?.id) return;

        setSaving(true);
        setErrorMessage("");
        setSaveMessage("");

        const { error } = await supabase
            .from("user_books")
            .update({
                notes: notes.trim() || null,
                recommended_level: recommendedLevel || null,
                teacher_student_use_rating: teacherStudentUseRating
                    ? clampRating5(teacherStudentUseRating)
                    : null,
                rating_recommend: ratingRecommend ? clampRating5(ratingRecommend) : null,
            })
            .eq("id", row.id);

        setSaving(false);

        if (error) {
            console.error("Error saving teacher review:", error);
            setErrorMessage(error.message || "Could not save teacher review.");
            return;
        }

        setRow((prev) =>
            prev
                ? {
                    ...prev,
                    notes: notes.trim() || null,
                    recommended_level: recommendedLevel || null,
                    teacher_student_use_rating: teacherStudentUseRating
                        ? clampRating5(teacherStudentUseRating)
                        : null,
                    rating_recommend: ratingRecommend ? clampRating5(ratingRecommend) : null,
                }
                : prev
        );

        setSaveMessage("Teacher review saved.");
        window.setTimeout(() => setSaveMessage(""), 2500);
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-stone-50 p-6">
                <div className="mx-auto max-w-5xl rounded-3xl border border-stone-200 bg-white p-6 text-stone-600 shadow-sm">
                    Loading teacher review...
                </div>
            </main>
        );
    }

    if (errorMessage && !row) {
        return (
            <main className="min-h-screen bg-stone-50 p-6">
                <div className="mx-auto max-w-5xl rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
                    {errorMessage}
                </div>
            </main>
        );
    }

    const book = row?.books ?? null;

    return (
        <main className="min-h-screen bg-stone-50 p-6">
            <div className="mx-auto max-w-5xl space-y-5">
                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={() => router.push("/teacher")}
                        className="text-sm font-medium text-stone-500 underline underline-offset-4 hover:text-stone-800"
                    >
                        ← Teacher Portal
                    </button>

                    <button
                        type="button"
                        onClick={() => router.push(`/books/${encodeURIComponent(userBookId)}`)}
                        className="text-sm font-medium text-stone-500 underline underline-offset-4 hover:text-stone-800"
                    >
                        Back to Book Hub
                    </button>
                </div>

                <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
                    <div className="grid gap-6 p-6 md:grid-cols-[120px_minmax(0,1fr)] md:p-8">
                        <div>
                            {book?.cover_url ? (
                                <img
                                    src={book.cover_url}
                                    alt={`${book.title ?? "Book"} cover`}
                                    className="w-28 rounded-2xl border border-stone-200 object-cover shadow-sm"
                                />
                            ) : (
                                <div className="flex aspect-[2/3] w-28 items-center justify-center rounded-2xl border border-stone-200 bg-stone-100 text-xs text-stone-400">
                                    No cover
                                </div>
                            )}
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                                Teacher Book Review
                            </p>
                            <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
                                {book?.title ?? "Untitled book"}
                            </h1>
                            {book?.title_reading ? (
                                <p className="mt-1 text-lg text-stone-500">{book.title_reading}</p>
                            ) : null}

                            <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600">
                                Teacher-facing notes and ratings for deciding how useful this book is for guided reading,
                                lessons, trials, or book clubs.
                            </p>
                        </div>
                    </div>
                </section>

                {errorMessage ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {errorMessage}
                    </div>
                ) : null}

                {saveMessage ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        {saveMessage}
                    </div>
                ) : null}

                <section className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
                    <div className="mb-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                            Saved Teacher Review
                        </div>
                        <h2 className="mt-2 text-xl font-black text-stone-900">
                            Current teacher-facing read on this book
                        </h2>
                        <p className="mt-1 text-sm text-stone-600">
                            This is the currently saved review. Edit the sections below, then save to update this snapshot.
                        </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
                            <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                                Suitable Level
                            </div>
                            <div className="mt-2 text-base font-black text-stone-900">
                                {savedLevelInfo
                                    ? `${savedLevelInfo.title} · ${savedLevelInfo.plain}`
                                    : row?.recommended_level || "Not set yet"}
                            </div>
                            {savedLevelInfo ? (
                                <>
                                    <div className="mt-1 text-xs font-semibold text-amber-700">
                                        {savedLevelInfo.cefr} · {savedLevelInfo.jlpt}
                                    </div>
                                    <div className="mt-2 text-sm leading-6 text-stone-600">
                                        {savedLevelInfo.feel}
                                    </div>
                                </>
                            ) : null}
                        </div>

                        <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
                            <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                                Use With Students
                            </div>
                            <div className="mt-2 text-base font-black text-stone-900">
                                {row?.teacher_student_use_rating
                                    ? `${row.teacher_student_use_rating}/5`
                                    : "Not rated yet"}
                            </div>
                            <div className="mt-1 text-amber-600">
                                {stars5(row?.teacher_student_use_rating ?? null)}
                            </div>
                            <div className="mt-2 text-sm leading-6 text-stone-600">
                                {studentUseLabel(row?.teacher_student_use_rating ?? null)}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
                            <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                                Learning Potential
                            </div>
                            <div className="mt-2 text-base font-black text-stone-900">
                                {row?.rating_recommend ? `${row.rating_recommend}/5` : "Not rated yet"}
                            </div>
                            <div className="mt-1 text-amber-600">
                                {stars5(row?.rating_recommend ?? null)}
                            </div>
                            <div className="mt-2 text-sm leading-6 text-stone-600">
                                {languageLearningLabel(row?.rating_recommend ?? null)}
                            </div>
                        </div>
                    </div>

                    <div className="mt-3 rounded-2xl border border-emerald-100 bg-white/80 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                            Teacher Notes
                        </div>
                        <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">
                            {row?.notes?.trim() ? row.notes : "No saved teacher notes yet."}
                        </div>
                    </div>
                </section>

                <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                    <div className="mb-4">
                        <h2 className="text-lg font-black text-stone-900">Suitable Level</h2>
                        <p className="mt-1 text-sm text-stone-500">
                            Pick the level that feels suitable with guidance, not necessarily the level where the book becomes easy.
                        </p>
                    </div>

                    <div className="space-y-2">
                        {suitableLevelOptions.map((option) => {
                            const isSelected = recommendedLevel === option.value;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setRecommendedLevel(option.value)}
                                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${isSelected
                                        ? "border-stone-900 bg-stone-100 shadow-sm"
                                        : "border-stone-200 bg-white hover:bg-stone-50"
                                        }`}
                                >
                                    <div className="text-sm font-semibold text-stone-900">
                                        {option.title} · {option.plain} ({option.cefr} · {option.jlpt})
                                    </div>
                                    <div className="mt-1 text-sm leading-6 text-stone-600">{option.feel}</div>
                                </button>
                            );
                        })}

                        <button
                            type="button"
                            onClick={() => setRecommendedLevel("")}
                            className="rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50"
                        >
                            Clear level
                        </button>
                    </div>

                    {selectedLevelInfo ? (
                        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            Selected: {selectedLevelInfo.title} · {selectedLevelInfo.plain}
                        </div>
                    ) : null}
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-black text-stone-900">Use With Students</h2>
                        <p className="mt-1 text-sm text-stone-500">
                            Teaching fit, not reading level alone.
                        </p>

                        <div className="mt-4 space-y-2">
                            {studentUseOptions.map(([value, label]) => {
                                const isSelected = Number(teacherStudentUseRating) === value;

                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setTeacherStudentUseRating(String(value))}
                                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${isSelected
                                            ? "border-amber-500 bg-amber-50 shadow-sm"
                                            : "border-stone-200 bg-white hover:bg-stone-50"
                                            }`}
                                    >
                                        <div className="font-medium text-amber-600">{stars5(value)}</div>
                                        <div className="mt-1 text-sm text-stone-700">{label}</div>
                                    </button>
                                );
                            })}

                            <button
                                type="button"
                                onClick={() => setTeacherStudentUseRating("")}
                                className="rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50"
                            >
                                Clear rating
                            </button>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-black text-stone-900">Language Learning Potential</h2>
                        <p className="mt-1 text-sm text-stone-500">
                            Vocabulary, grammar, patterns, nuance, and discussion value.
                        </p>

                        <div className="mt-4 space-y-2">
                            {languageLearningOptions.map(([value, label]) => {
                                const isSelected = Number(ratingRecommend) === value;

                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setRatingRecommend(String(value))}
                                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${isSelected
                                            ? "border-amber-500 bg-amber-50 shadow-sm"
                                            : "border-stone-200 bg-white hover:bg-stone-50"
                                            }`}
                                    >
                                        <div className="font-medium text-amber-600">{stars5(value)}</div>
                                        <div className="mt-1 text-sm text-stone-700">{label}</div>
                                    </button>
                                );
                            })}

                            <button
                                type="button"
                                onClick={() => setRatingRecommend("")}
                                className="rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50"
                            >
                                Clear rating
                            </button>
                        </div>
                    </div>
                </section>

                <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-black text-stone-900">Teacher Notes</h2>
                    <p className="mt-1 text-sm text-stone-500">
                        Private teaching notes, prep ideas, student fit, or lesson reminders.
                    </p>

                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={8}
                        className="mt-4 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none focus:border-stone-500"
                        placeholder="Add teacher notes..."
                    />
                </section>

                <div className="sticky bottom-4 flex justify-end">
                    <button
                        type="button"
                        onClick={saveTeacherReview}
                        disabled={saving}
                        className="rounded-2xl bg-stone-900 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-black disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save Teacher Review"}
                    </button>
                </div>
            </div>
        </main>
    );
}