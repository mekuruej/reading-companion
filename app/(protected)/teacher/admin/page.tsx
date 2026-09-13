"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AccessDeniedMessage from "@/components/AccessDeniedMessage";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import { supabase } from "@/lib/supabaseClient";
import { TeacherHubCardGrid } from "../components/TeacherHubCardGrid";

type Tool = { title: string; route: string; description: string; superOnly?: boolean };
const sections: { title: string; tools: Tool[] }[] = [
  { title: "Accounts & Access", tools: [
    { title: "Japanese Learning Requests", route: "/teacher/japanese-learning-requests", description: "Review requests for Japanese Learning access." },
  ] },
  { title: "Catalog & Books", tools: [
    { title: "Books & Catalog", route: "/teacher/books", description: "Review shared catalog issues and book requests." },
    { title: "Book Requests", route: "/teacher/books/requests", description: "Review requested books.", superOnly: true },
    { title: "Book Flags", route: "/teacher/books/flags", description: "Review reported book issues.", superOnly: true },
    { title: "Missing Book Information", route: "/teacher/books/missing-info", description: "Complete missing catalog details.", superOnly: true },
    { title: "Catalog Editor", route: "/teacher/books/add", description: "Edit shared edition metadata." },
  ] },
  { title: "Shared Language Content", tools: [
    { title: "Global Vocabulary", route: "/teacher/global-words", description: "Maintain vocabulary and reference content.", superOnly: true },
    { title: "Vocabulary Flags", route: "/teacher/words", description: "Review reported saved-word issues.", superOnly: true },
    { title: "Kanji Maintenance", route: "/teacher/kanji", description: "Review and enrich kanji reading maps.", superOnly: true },
    { title: "Kanji Fast Pass", route: "/teacher/kanji/fast-pass", description: "Complete kanji maps for existing vocabulary.", superOnly: true },
    { title: "Radicals & Components", route: "/teacher/kanji/radicals", description: "Maintain radicals and component data.", superOnly: true },
    { title: "Grammar DB", route: "/teacher/needs-attention/grammar", description: "Maintain shared grammar content.", superOnly: true },
  ] },
  { title: "Diagnostics & Maintenance", tools: [
    { title: "Needs Attention", route: "/teacher/needs-attention", description: "Open global review and cleanup queues.", superOnly: true },
    { title: "Site Upkeep", route: "/teacher/general-upkeep", description: "Open existing maintenance tools." },
    { title: "Testing Tools", route: "/teacher/testing", description: "Check feature access and Ability Check behavior." },
  ] },
];

export default function AdminHubPage() {
  const [access, setAccess] = useState<{ allowed: boolean; superTeacher: boolean } | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth.user) throw new Error("Not signed in");
        const { data: profile, error } = await supabase.from("profiles").select("role, is_super_teacher").eq("id", auth.user.id).maybeSingle();
        if (error || !profile) throw new Error("Profile unavailable");
        const allowed = getFeatureAccess({ role: profile.role, isSuperTeacher: profile.is_super_teacher }).isAdmin;
        const superTeacher = profile.role === "super_teacher" || profile.is_super_teacher === true || profile.is_super_teacher === "true";
        if (!cancelled) setAccess({ allowed, superTeacher });
      } catch {
        if (!cancelled) setAccess({ allowed: false, superTeacher: false });
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);
  if (!access) return <main className="mx-auto max-w-6xl p-6">Checking admin access...</main>;
  if (!access.allowed) return <AccessDeniedMessage message="Admin Hub is available to super teachers and admins only." />;
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <Link href="/teacher" className="text-sm font-semibold text-stone-500">← Teacher Hub</Link>
        <h1 className="mt-4 text-3xl font-black text-stone-950">Admin Hub</h1>
        <p className="mt-3 text-stone-600">Maintain MEKURU’s catalog, shared content, access, and system tools.</p>
      </section>
      {sections.map(section => {
        const tools = section.tools.filter(tool => !tool.superOnly || access.superTeacher);
        if (!tools.length) return null;
        return <section key={section.title} className="mt-8">
          <h2 className="mb-3 text-2xl font-black text-stone-950">{section.title}</h2>
          <TeacherHubCardGrid cards={tools.map(tool => ({ title: tool.title, href: `${tool.route}?from=admin-hub`, description: tool.description, eyebrow: section.title }))} />
        </section>;
      })}
    </main>
  );
}
