// Teacher Book Review Page
//

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { TeacherBookReviewLoadingState } from "./components/TeacherBookReviewLoadingState";
import { TeacherBookReviewAccessState } from "./components/TeacherBookReviewAccessState";
import { TeacherBookReviewNav } from "./components/TeacherBookReviewNav";
import { TeacherBookReviewHero } from "./components/TeacherBookReviewHero";
import { TeacherBookReviewMessage } from "./components/TeacherBookReviewMessage";
import { TeacherBookReviewSavedSnapshot } from "./components/TeacherBookReviewSavedSnapshot";
import { TeacherBookReviewSaveBar } from "./components/TeacherBookReviewSaveBar";
import { SuitableLevelSelector } from "./components/SuitableLevelSelector";
import { TeacherRatingSelector } from "./components/TeacherRatingSelector";
import { TeacherNotesCard } from "./components/TeacherNotesCard";

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
    finished_at: string | null;
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
    [5, "Excellent choice for lessons."],
    [4, "A strong choice for many learners."],
    [3, "Depends on the learner and lesson goals."],
    [2, "Not a good fit for most learners."],
    [1, "I would not recommend using this for lessons."],
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
    if (value === 5) return "Excellent choice for lessons.";
    if (value === 4) return "A strong choice for many learners.";
    if (value === 3) return "Depends on the learner and lesson goals.";
    if (value === 2) return "Not a good fit for most learners.";
    if (value === 1) return "I would not recommend using this for lessons.";
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
          finished_at,
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
                }
                : prev
        );

        setSaveMessage("Teacher review saved.");
        window.setTimeout(() => setSaveMessage(""), 2500);
    }

    if (loading) {
        return <TeacherBookReviewLoadingState />;
    }

    if (errorMessage && !row) {
        return <TeacherBookReviewAccessState message={errorMessage} />;
    }

    const book = row?.books ?? null;

    return (
        <main className="min-h-screen bg-stone-50 p-6">
            <div className="mx-auto max-w-5xl space-y-5">
                <TeacherBookReviewNav
                    onBackToTeacherPortal={() => router.push("/teacher")}
                    onBackToTeacherRatings={() => router.push("/teacher/ratings")}
                />

                <TeacherBookReviewHero book={book} />

                <TeacherBookReviewMessage
                    errorMessage={errorMessage}
                    saveMessage={saveMessage}
                />

                <TeacherBookReviewSavedSnapshot
                    savedLevelInfo={savedLevelInfo}
                    recommendedLevel={row?.recommended_level ?? null}
                    studentUseRating={row?.teacher_student_use_rating ?? null}
                    finishedAt={row?.finished_at ?? null}
                    notes={row?.notes ?? null}
                    stars5={stars5}
                    studentUseLabel={studentUseLabel}
                />

                <SuitableLevelSelector
                    value={recommendedLevel}
                    options={suitableLevelOptions}
                    selectedOption={selectedLevelInfo}
                    onChange={setRecommendedLevel}
                />

                <TeacherRatingSelector
                    title="Lesson Fit"
                    description="How well would this book work in a lesson?"
                    value={teacherStudentUseRating}
                    options={studentUseOptions}
                    label={studentUseLabel(clampRating5(teacherStudentUseRating))}
                    stars5={stars5}
                    onChange={setTeacherStudentUseRating}
                />

                <TeacherNotesCard
                    notes={notes}
                    onChange={setNotes}
                />

                <TeacherBookReviewSaveBar
                    saving={saving}
                    onSave={saveTeacherReview}
                />
            </div>
        </main>
    );
}
