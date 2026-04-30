// TeacherPrepAssignBox
//
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  userBookId: string;
};

export default function TeacherPrepAssignBox({ userBookId }: Props) {
  const [studentId, setStudentId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  async function handleAssign() {
    const trimmedStudentId = studentId.trim();

    if (!trimmedStudentId) {
      setStatus("Paste the student's user ID first.");
      return;
    }

    setIsAssigning(true);
    setStatus(null);

    const { data, error } = await supabase.rpc("assign_teacher_prep_to_student", {
      p_prep_user_book_id: userBookId,
      p_student_id: trimmedStudentId,
      p_copy_vocab: true,
    });

    if (error) {
      setStatus(error.message);
      setIsAssigning(false);
      return;
    }

    const result = data?.[0];
    const copiedCount = result?.copied_word_count ?? 0;
    const targetUserBookId = result?.target_user_book_id;

    setStatus(`Assigned! Copied ${copiedCount} vocab words.`);

    const shouldClear = window.confirm(
      `Assigned successfully.\n\nCopied ${copiedCount} vocab words to the student's book.\n\nClear the vocab from your teacher prep copy now?`
    );

    if (shouldClear) {
      const { data: deletedCount, error: clearError } = await supabase.rpc(
        "clear_teacher_prep_vocab",
        {
          p_prep_user_book_id: userBookId,
        }
      );

      if (clearError) {
        setStatus(
          `Assigned, but could not clear prep vocab: ${clearError.message}`
        );
      } else {
        setStatus(
          `Assigned! Copied ${copiedCount} words. Cleared ${deletedCount ?? 0} words from this prep copy.`
        );
      }
    }

    setIsAssigning(false);

    // Optional later:
    // router.push(`/books/${targetUserBookId}`);
    console.log("Student user_book_id:", targetUserBookId);
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
          Teacher Trial Prep
        </p>

        <h2 className="text-lg font-semibold text-stone-900">
          Assign this prepared book to a student
        </h2>

        <p className="text-sm leading-6 text-stone-700">
          This copies the vocab into the student&apos;s own book. It will not
          share live vocab with your prep copy.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-stone-700">
            Student user ID
          </span>
          <input
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            placeholder="Paste student UUID"
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
          />
        </label>

        <button
          type="button"
          onClick={handleAssign}
          disabled={isAssigning}
          className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isAssigning ? "Assigning..." : "Assign to Student"}
        </button>

        {status && (
          <p className="rounded-xl bg-white/80 px-3 py-2 text-sm text-stone-700">
            {status}
          </p>
        )}
      </div>
    </section>
  );
}
