// Teacher Grammar Needs Attention
//
// Phase 1 shared Grammar DB review queue. This page intentionally does not
// expose grammar data to ordinary reader flows.

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getTeacherBackLink } from "../../components/teacherBackLink";
import { isSuperTeacherFlag } from "../../books/_shared/bookAttentionHelpers";

type GrammarStatus = "needs_review" | "in_progress" | "complete" | "excluded";
type GrammarFilter = "all" | GrammarStatus;

type GrammarSense = {
  id: string;
  grammar_point_id: string;
  sense_number: number;
  meaning_en: string;
  nuance_en: string | null;
  usage_note_en: string | null;
  register_tags: string[] | null;
  spoken_written_tendency: string | null;
  sort_order: number;
};

type GrammarConstruction = {
  id: string;
  grammar_point_id: string;
  grammar_point_sense_id: string | null;
  construction_text: string;
  construction_note_en: string | null;
  sort_order: number;
};

type GrammarAlias = {
  id: string;
  grammar_point_id: string;
  alias_text: string;
  normalized_alias: string;
  sort_order: number;
};

type GrammarRelation = {
  id: string;
  grammar_point_id: string;
  related_grammar_point_id: string;
  relationship_type: string;
  relationship_note_en: string | null;
  sort_order: number;
};

type GrammarExample = {
  id: string;
  grammar_point_id: string;
  grammar_point_sense_id: string | null;
  sentence_ja: string;
  translation_en: string | null;
  example_note_en: string | null;
  source_type: "original" | "licensed" | "public_domain";
  source_label: string | null;
  source_url: string | null;
  sort_order: number;
};

type GrammarPoint = {
  id: string;
  slug: string;
  pattern: string;
  basic_meaning_en: string | null;
  reading: string | null;
  jlpt_level: string | null;
  register_tags: string[];
  spoken_written_tendency: string | null;
  register_note_en: string | null;
  status: GrammarStatus;
  review_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  source_label: string | null;
  source_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  grammar_point_senses?: GrammarSense[];
  grammar_point_constructions?: GrammarConstruction[];
  grammar_point_aliases?: GrammarAlias[];
  grammar_point_relations?: GrammarRelation[];
  grammar_point_examples?: GrammarExample[];
};

type PointDraft = {
  pattern: string;
  slug: string;
  basicMeaningEn: string;
  reading: string;
  jlptLevel: string;
  registerTags: string[];
  spokenWrittenTendency: string;
  registerNoteEn: string;
  status: GrammarStatus;
  reviewNote: string;
  sourceLabel: string;
  sourceUrl: string;
  isActive: boolean;
};

type GrammarChildKey =
  | "grammar_point_senses"
  | "grammar_point_constructions"
  | "grammar_point_aliases"
  | "grammar_point_relations"
  | "grammar_point_examples";

type DeletedGrammarChildren = Record<GrammarChildKey, string[]>;

const STATUS_OPTIONS: Array<{ value: GrammarStatus; label: string }> = [
  { value: "needs_review", label: "Needs review" },
  { value: "in_progress", label: "In progress" },
  { value: "complete", label: "Complete" },
  { value: "excluded", label: "Excluded" },
];

const FILTER_OPTIONS: Array<{ value: GrammarFilter; label: string }> = [
  { value: "all", label: "All" },
  ...STATUS_OPTIONS,
];

const JLPT_OPTIONS = ["", "N5", "N4", "N3", "N2", "N1"];
const SOURCE_TYPE_OPTIONS = ["original", "licensed", "public_domain"] as const;
const REGISTER_TAG_OPTIONS = [
  "neutral",
  "casual",
  "polite",
  "formal",
  "conversational",
  "emphatic",
  "literary",
  "business",
  "stiff",
  "archaic",
  "other",
] as const;

const SPOKEN_WRITTEN_OPTIONS = [
  { value: "", label: "Not set" },
  { value: "spoken", label: "Spoken" },
  { value: "written", label: "Written" },
  { value: "both", label: "Both" },
  { value: "strongly_spoken", label: "Strongly spoken" },
  { value: "strongly_written", label: "Strongly written" },
  { value: "other", label: "Other" },
] as const;

const KNOWN_REGISTER_TAGS = new Set<string>(REGISTER_TAG_OPTIONS);
const KNOWN_SPOKEN_WRITTEN_VALUES = new Set<string>(
  SPOKEN_WRITTEN_OPTIONS.map((option) => option.value).filter(Boolean)
);

const EMPTY_DELETED_CHILDREN: DeletedGrammarChildren = {
  grammar_point_senses: [],
  grammar_point_constructions: [],
  grammar_point_aliases: [],
  grammar_point_relations: [],
  grammar_point_examples: [],
};

function clean(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeAlias(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function slugFromPattern(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[〜~]/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    || `grammar-${Date.now()}`;
}

function statusLabel(value: string | null | undefined) {
  return STATUS_OPTIONS.find((option) => option.value === value)?.label ?? "Needs review";
}

function pointDraftFrom(point: GrammarPoint): PointDraft {
  return {
    pattern: point.pattern ?? "",
    slug: point.slug ?? "",
    basicMeaningEn: point.basic_meaning_en ?? "",
    reading: point.reading ?? "",
    jlptLevel: point.jlpt_level ?? "",
    registerTags: point.register_tags ?? [],
    spokenWrittenTendency: point.spoken_written_tendency ?? "",
    registerNoteEn: point.register_note_en ?? "",
    status: point.status ?? "needs_review",
    reviewNote: point.review_note ?? "",
    sourceLabel: point.source_label ?? "",
    sourceUrl: point.source_url ?? "",
    isActive: point.is_active ?? true,
  };
}

function missingIndicators(point: GrammarPoint) {
  const missing: string[] = [];
  if (!point.basic_meaning_en?.trim()) missing.push("basic meaning");
  if (!(point.grammar_point_senses ?? []).some((sense) => sense.meaning_en?.trim())) {
    missing.push("meaning");
  }
  if (!(point.grammar_point_constructions ?? []).some((item) => item.construction_text?.trim())) {
    missing.push("construction");
  }
  if (!point.jlpt_level) missing.push("JLPT");
  if (!point.register_tags?.length && !point.register_note_en?.trim()) missing.push("register");
  if (!(point.grammar_point_aliases ?? []).some((item) => item.alias_text?.trim())) {
    missing.push("aliases");
  }
  if (!(point.grammar_point_relations ?? []).length) missing.push("related grammar");
  if (!point.source_label?.trim() && !point.source_url?.trim()) missing.push("source");
  return missing;
}

function sortByOrder<T extends { sort_order: number; id: string }>(items: T[] | undefined) {
  return [...(items ?? [])].sort((a, b) => {
    if ((a.sort_order ?? 0) !== (b.sort_order ?? 0)) return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    return a.id.localeCompare(b.id);
  });
}

function tempId(prefix: string) {
  return `new-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isTempId(id: string) {
  return id.startsWith("new-");
}

function cloneEmptyDeletedChildren(): DeletedGrammarChildren {
  return {
    grammar_point_senses: [],
    grammar_point_constructions: [],
    grammar_point_aliases: [],
    grammar_point_relations: [],
    grammar_point_examples: [],
  };
}

function nextSortOrder(items: Array<{ sort_order: number }> | undefined) {
  return Math.max(0, ...(items ?? []).map((item) => Number(item.sort_order) || 0)) + 1;
}

function primaryConstructionFor(point: GrammarPoint | null) {
  const constructions = sortByOrder(point?.grammar_point_constructions);
  return (
    constructions.find((item) => Number(item.sort_order) === 0) ??
    constructions.find((item) => !isTempId(item.id)) ??
    null
  );
}

function relationRegisterSummary(point: GrammarPoint | undefined) {
  if (!point) return "Register details not loaded.";
  const parts = [
    point.register_tags?.length ? point.register_tags.join(", ") : null,
    point.spoken_written_tendency,
    point.register_note_en,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No register metadata yet.";
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-stone-400">
      {children}
    </span>
  );
}

export default function TeacherGrammarNeedsAttentionPage() {
  const searchParams = useSearchParams();
  const backLink = getTeacherBackLink(searchParams.get("from"));

  const [loading, setLoading] = useState(true);
  const [canAccess, setCanAccess] = useState(false);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<GrammarFilter>("needs_review");
  const [points, setPoints] = useState<GrammarPoint[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PointDraft | null>(null);
  const [savingBasicInfo, setSavingBasicInfo] = useState(false);
  const [savingDeepDive, setSavingDeepDive] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [deletingPoint, setDeletingPoint] = useState(false);
  const [newPattern, setNewPattern] = useState("");
  const [creatingPoint, setCreatingPoint] = useState(false);
  const [deletedChildren, setDeletedChildren] = useState<DeletedGrammarChildren>(
    EMPTY_DELETED_CHILDREN
  );

  const selectedPoint = points.find((point) => point.id === selectedId) ?? points[0] ?? null;
  const primaryConstruction = primaryConstructionFor(selectedPoint);
  const customRegisterTags =
    draft?.registerTags.filter((tag) => !KNOWN_REGISTER_TAGS.has(tag)) ?? [];
  const spokenWrittenSelectValue =
    draft?.spokenWrittenTendency && KNOWN_SPOKEN_WRITTEN_VALUES.has(draft.spokenWrittenTendency)
      ? draft.spokenWrittenTendency
      : draft?.spokenWrittenTendency
        ? "other"
        : "";
  const shouldShowRegisterDetails =
    Boolean(draft?.registerTags.includes("other")) || spokenWrittenSelectValue === "other";
  const relatedPointOptions = useMemo(
    () => points.filter((point) => point.id !== selectedPoint?.id),
    [points, selectedPoint?.id]
  );

  useEffect(() => {
    void loadGrammarQueue();
  }, [filter]);

  useEffect(() => {
    if (!selectedPoint) {
      setDraft(null);
      return;
    }
    setSelectedId(selectedPoint.id);
    setDraft(pointDraftFrom(selectedPoint));
  }, [selectedPoint?.id]);

  async function loadGrammarQueue() {
    setLoading(true);
    setMessage("");

    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      const user = auth?.user;

      if (authError || !user) {
        setCanAccess(false);
        setMessage("Please sign in.");
        setPoints([]);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_super_teacher")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const isTeacher =
        profile?.role === "teacher" ||
        profile?.role === "super_teacher" ||
        isSuperTeacherFlag(profile?.is_super_teacher);

      if (!isTeacher) {
        setCanAccess(false);
        setMessage("Teacher access is required.");
        setPoints([]);
        return;
      }

      setCanAccess(true);

      let query = supabase
        .from("grammar_points")
        .select(
          `
          id,
          slug,
          pattern,
          basic_meaning_en,
          reading,
          jlpt_level,
          register_tags,
          spoken_written_tendency,
          register_note_en,
          status,
          review_note,
          reviewed_at,
          reviewed_by,
          source_label,
          source_url,
          is_active,
          created_at,
          updated_at,
          grammar_point_senses (*),
          grammar_point_constructions (*),
          grammar_point_aliases (*),
          grammar_point_examples (*)
        `
        )
        .eq("is_active", true)
        .order("updated_at", { ascending: false });

      if (filter !== "all") query = query.eq("status", filter);

      const { data, error } = await query;
      if (error) throw error;

      const basePoints = (data ?? []) as GrammarPoint[];
      const pointIds = basePoints.map((point) => point.id);
      let relationsByPointId = new Map<string, GrammarRelation[]>();

      if (pointIds.length > 0) {
        const { data: relationRows, error: relationError } = await supabase
          .from("grammar_point_relations")
          .select("*")
          .in("grammar_point_id", pointIds)
          .order("sort_order", { ascending: true });

        if (relationError) throw relationError;

        relationsByPointId = ((relationRows ?? []) as GrammarRelation[]).reduce(
          (map, relation) => {
            const rows = map.get(relation.grammar_point_id) ?? [];
            rows.push(relation);
            map.set(relation.grammar_point_id, rows);
            return map;
          },
          new Map<string, GrammarRelation[]>()
        );
      }

      const nextPoints = basePoints.map((point) => ({
        ...point,
        grammar_point_senses: sortByOrder(point.grammar_point_senses),
        grammar_point_constructions: sortByOrder(point.grammar_point_constructions),
        grammar_point_aliases: sortByOrder(point.grammar_point_aliases),
        grammar_point_relations: sortByOrder(relationsByPointId.get(point.id)),
        grammar_point_examples: sortByOrder(point.grammar_point_examples),
      }));

      setPoints(nextPoints);
      setDeletedChildren(cloneEmptyDeletedChildren());
      setSelectedId((current) =>
        current && nextPoints.some((point) => point.id === current)
          ? current
          : nextPoints[0]?.id ?? null
      );
    } catch (error: any) {
      setMessage(error?.message ?? "Could not load grammar queue.");
      setPoints([]);
    } finally {
      setLoading(false);
    }
  }

  async function createPoint() {
    const pattern = newPattern.trim();
    if (!pattern) {
      setMessage("Add a grammar pattern first.");
      return;
    }

    setCreatingPoint(true);
    setMessage("");

    try {
      const slug = slugFromPattern(pattern);
      const { data, error } = await supabase
        .from("grammar_points")
        .insert({
          pattern,
          slug,
          status: "needs_review",
        })
        .select("id")
        .single();

      if (error) throw error;

      setNewPattern("");
      setSelectedId((data as { id: string }).id);
      await loadGrammarQueue();
      setMessage("Grammar point created.");
    } catch (error: any) {
      setMessage(error?.message ?? "Could not create grammar point.");
    } finally {
      setCreatingPoint(false);
    }
  }

  async function saveBasicInformation() {
    if (!selectedPoint || !draft) return;

    setSavingBasicInfo(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("grammar_points")
        .update({
          pattern: draft.pattern.trim(),
          slug: draft.slug.trim() || slugFromPattern(draft.pattern),
          basic_meaning_en: clean(draft.basicMeaningEn),
          reading: clean(draft.reading),
          jlpt_level: clean(draft.jlptLevel),
          register_tags: draft.registerTags,
          spoken_written_tendency: clean(draft.spokenWrittenTendency),
          register_note_en: clean(draft.registerNoteEn),
        })
        .eq("id", selectedPoint.id);

      if (error) throw error;

      const primaryText = primaryConstruction?.construction_text.trim() ?? "";
      let savedPrimaryConstruction: GrammarConstruction | null = primaryConstruction;

      if (primaryText) {
        const payload = {
          grammar_point_id: selectedPoint.id,
          grammar_point_sense_id: null,
          construction_text: primaryText,
          construction_note_en: primaryConstruction?.construction_note_en ?? null,
          sort_order: 0,
        };

        if (primaryConstruction && !isTempId(primaryConstruction.id)) {
          const { error: constructionError } = await supabase
            .from("grammar_point_constructions")
            .update(payload)
            .eq("id", primaryConstruction.id);

          if (constructionError) throw constructionError;
          savedPrimaryConstruction = { ...primaryConstruction, ...payload };
        } else {
          const { data: constructionData, error: constructionError } = await supabase
            .from("grammar_point_constructions")
            .insert(payload)
            .select("*")
            .single();

          if (constructionError) throw constructionError;
          savedPrimaryConstruction = constructionData as GrammarConstruction;
        }
      } else if (primaryConstruction && !isTempId(primaryConstruction.id)) {
        const { error: deleteError } = await supabase
          .from("grammar_point_constructions")
          .delete()
          .eq("id", primaryConstruction.id);

        if (deleteError) throw deleteError;
        savedPrimaryConstruction = null;
      } else if (primaryConstruction) {
        savedPrimaryConstruction = null;
      }

      setPoints((prev) =>
        prev.map((point) => {
          if (point.id !== selectedPoint.id) return point;
          const withoutPrimary = (point.grammar_point_constructions ?? []).filter(
            (item) => item.id !== primaryConstruction?.id
          );
          return {
            ...point,
            pattern: draft.pattern.trim(),
            slug: draft.slug.trim() || slugFromPattern(draft.pattern),
            basic_meaning_en: clean(draft.basicMeaningEn),
            reading: clean(draft.reading),
            jlpt_level: clean(draft.jlptLevel),
            register_tags: draft.registerTags,
            spoken_written_tendency: clean(draft.spokenWrittenTendency),
            register_note_en: clean(draft.registerNoteEn),
            grammar_point_constructions: sortByOrder(
              savedPrimaryConstruction
                ? [savedPrimaryConstruction, ...withoutPrimary]
                : withoutPrimary
            ),
          };
        })
      );

      setMessage("Basic grammar information saved.");
    } catch (error: any) {
      setMessage(error?.message ?? "Could not save basic grammar information.");
    } finally {
      setSavingBasicInfo(false);
    }
  }

  async function deleteSelectedPoint() {
    if (!selectedPoint) return;

    const confirmed = window.confirm(
      `Delete ${selectedPoint.pattern}? This will also delete its meanings, constructions, aliases, relations, and examples.`
    );

    if (!confirmed) return;

    setDeletingPoint(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("grammar_points")
        .delete()
        .eq("id", selectedPoint.id);

      if (error) throw error;

      const nextSelectedId =
        points.find((point) => point.id !== selectedPoint.id)?.id ?? null;
      setSelectedId(nextSelectedId);
      setDraft(null);
      await loadGrammarQueue();
      setMessage("Grammar point deleted.");
    } catch (error: any) {
      setMessage(error?.message ?? "Could not delete grammar point.");
    } finally {
      setDeletingPoint(false);
    }
  }

  async function saveDeepDive() {
    if (!selectedPoint || !draft) return;

    setSavingDeepDive(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("grammar_points")
        .update({
          register_note_en: clean(draft.registerNoteEn),
        })
        .eq("id", selectedPoint.id);

      if (error) throw error;

      await deletePersistedChildren("grammar_point_senses", "grammar_point_senses");
      await deletePersistedChildren("grammar_point_constructions", "grammar_point_constructions");
      await deletePersistedChildren("grammar_point_relations", "grammar_point_relations");
      await deletePersistedChildren("grammar_point_examples", "grammar_point_examples");

      const savedSenses = await saveSenses(selectedPoint);
      const senseIdMap = new Map<string, string>();
      selectedPoint.grammar_point_senses?.forEach((sense, index) => {
        const savedSense = savedSenses[index];
        if (savedSense) senseIdMap.set(sense.id, savedSense.id);
      });

      const savedConstructions = await saveDetailedConstructions(
        selectedPoint,
        senseIdMap,
        primaryConstruction?.id
      );
      const savedRelations = await saveRelations(selectedPoint);
      const savedExamples = await saveExamples(selectedPoint, senseIdMap);

      setPoints((prev) =>
        prev.map((point) =>
          point.id === selectedPoint.id
            ? {
                ...point,
                register_note_en: clean(draft.registerNoteEn),
                grammar_point_senses: sortByOrder(savedSenses),
                grammar_point_constructions: sortByOrder([
                  ...(primaryConstruction ? [primaryConstruction] : []),
                  ...savedConstructions,
                ]),
                grammar_point_relations: sortByOrder(savedRelations),
                grammar_point_examples: sortByOrder(savedExamples),
              }
            : point
        )
      );
      setDeletedChildren((prev) => ({
        ...prev,
        grammar_point_senses: [],
        grammar_point_constructions: [],
        grammar_point_relations: [],
        grammar_point_examples: [],
      }));
      setMessage("Deep dive saved.");
    } catch (error: any) {
      setMessage(error?.message ?? "Could not save deep dive.");
    } finally {
      setSavingDeepDive(false);
    }
  }

  async function saveSourcesAndReview() {
    if (!selectedPoint || !draft) return;

    setSavingReview(true);
    setMessage("");

    try {
      const { data: auth } = await supabase.auth.getUser();
      const shouldStampReview = draft.status === "complete" || draft.status === "excluded";
      const reviewedAt = shouldStampReview ? new Date().toISOString() : null;
      const reviewedBy = shouldStampReview ? auth.user?.id ?? null : null;

      const { error } = await supabase
        .from("grammar_points")
        .update({
          status: draft.status,
          review_note: clean(draft.reviewNote),
          source_label: clean(draft.sourceLabel),
          source_url: clean(draft.sourceUrl),
          is_active: draft.isActive,
          reviewed_at: reviewedAt,
          reviewed_by: reviewedBy,
        })
        .eq("id", selectedPoint.id);

      if (error) throw error;

      await deletePersistedChildren("grammar_point_aliases", "grammar_point_aliases");
      const savedAliases = await saveAliases(selectedPoint);

      setPoints((prev) =>
        prev.map((point) =>
          point.id === selectedPoint.id
            ? {
                ...point,
                status: draft.status,
                review_note: clean(draft.reviewNote),
                source_label: clean(draft.sourceLabel),
                source_url: clean(draft.sourceUrl),
                is_active: draft.isActive,
                reviewed_at: reviewedAt,
                reviewed_by: reviewedBy,
                grammar_point_aliases: sortByOrder(savedAliases),
              }
            : point
        )
      );
      setDeletedChildren((prev) => ({ ...prev, grammar_point_aliases: [] }));
      setMessage("Sources and internal review saved.");
    } catch (error: any) {
      setMessage(error?.message ?? "Could not save sources and internal review.");
    } finally {
      setSavingReview(false);
    }
  }

  function addSense() {
    if (!selectedPoint) return;
    const nextNumber = (selectedPoint.grammar_point_senses?.length ?? 0) + 1;
    addChild<GrammarSense>("grammar_point_senses", {
      id: tempId("sense"),
      grammar_point_id: selectedPoint.id,
      sense_number: nextNumber,
      meaning_en: "New meaning",
      nuance_en: null,
      usage_note_en: null,
      register_tags: null,
      spoken_written_tendency: null,
      sort_order: nextNumber,
    });
  }

  function addConstruction() {
    if (!selectedPoint) return;
    addChild<GrammarConstruction>("grammar_point_constructions", {
      id: tempId("construction"),
      grammar_point_id: selectedPoint.id,
      grammar_point_sense_id: null,
      construction_text: "New construction",
      construction_note_en: null,
      sort_order: nextSortOrder(selectedPoint.grammar_point_constructions),
    });
  }

  function addAlias() {
    if (!selectedPoint) return;
    const alias = draft?.pattern || selectedPoint.pattern;
    addChild<GrammarAlias>("grammar_point_aliases", {
      id: tempId("alias"),
      grammar_point_id: selectedPoint.id,
      alias_text: alias,
      normalized_alias: normalizeAlias(alias),
      sort_order: nextSortOrder(selectedPoint.grammar_point_aliases),
    });
  }

  function addRelation() {
    if (!selectedPoint || relatedPointOptions.length === 0) return;
    addChild<GrammarRelation>("grammar_point_relations", {
      id: tempId("relation"),
      grammar_point_id: selectedPoint.id,
      related_grammar_point_id: relatedPointOptions[0].id,
      relationship_type: "related_usage",
      relationship_note_en: null,
      sort_order: nextSortOrder(selectedPoint.grammar_point_relations),
    });
  }

  function addExample() {
    if (!selectedPoint) return;
    addChild<GrammarExample>("grammar_point_examples", {
      id: tempId("example"),
      grammar_point_id: selectedPoint.id,
      grammar_point_sense_id: null,
      sentence_ja: "新しい例文。",
      translation_en: null,
      example_note_en: null,
      source_type: "original",
      source_label: null,
      source_url: null,
      sort_order: nextSortOrder(selectedPoint.grammar_point_examples),
    });
  }

  function deleteChild(key: GrammarChildKey, id: string) {
    if (!window.confirm("Remove this grammar detail row? Save the section to commit the deletion.")) return;

    setDeletedChildren((prev) =>
      isTempId(id)
        ? prev
        : {
            ...prev,
            [key]: [...prev[key], id],
          }
    );

    setPoints((prev) =>
      prev.map((point) => {
        if (point.id !== selectedPoint?.id) return point;

        if (key === "grammar_point_senses") {
          return {
            ...point,
            grammar_point_senses: (point.grammar_point_senses ?? []).filter(
              (item) => item.id !== id
            ),
            grammar_point_constructions: (point.grammar_point_constructions ?? []).filter(
              (item) => item.grammar_point_sense_id !== id
            ),
            grammar_point_examples: (point.grammar_point_examples ?? []).map((item) =>
              item.grammar_point_sense_id === id
                ? { ...item, grammar_point_sense_id: null }
                : item
            ),
          };
        }

        const rows = (((point[key] as unknown) as Array<{ id: string }> | undefined) ?? []).filter(
          (row) => row.id !== id
        );
        return { ...point, [key]: rows };
      })
    );
  }

  async function deletePersistedChildren(key: GrammarChildKey, tableName: string) {
    for (const id of deletedChildren[key]) {
      if (isTempId(id)) continue;
      const { error } = await supabase.from(tableName).delete().eq("id", id);
      if (error) throw error;
    }
  }

  async function saveSenses(point: GrammarPoint) {
    const savedRows: GrammarSense[] = [];

    for (const sense of point.grammar_point_senses ?? []) {
      const payload = {
        grammar_point_id: point.id,
        sense_number: Number(sense.sense_number) || 1,
        meaning_en: sense.meaning_en.trim() || "New meaning",
        nuance_en: clean(sense.nuance_en ?? ""),
        usage_note_en: clean(sense.usage_note_en ?? ""),
        register_tags: sense.register_tags?.length ? sense.register_tags : null,
        spoken_written_tendency: clean(sense.spoken_written_tendency ?? ""),
        sort_order: Number(sense.sort_order) || 0,
      };

      if (isTempId(sense.id)) {
        const { data, error } = await supabase
          .from("grammar_point_senses")
          .insert(payload)
          .select("*")
          .single();

        if (error) throw error;
        savedRows.push(data as GrammarSense);
      } else {
        const { error } = await supabase
          .from("grammar_point_senses")
          .update(payload)
          .eq("id", sense.id);

        if (error) throw error;
        savedRows.push({ ...sense, ...payload });
      }
    }

    return savedRows;
  }

  async function saveDetailedConstructions(
    point: GrammarPoint,
    senseIdMap: Map<string, string>,
    primaryConstructionId: string | undefined
  ) {
    const savedRows: GrammarConstruction[] = [];

    for (const item of point.grammar_point_constructions ?? []) {
      if (item.id === primaryConstructionId) continue;

      const payload = {
        grammar_point_id: point.id,
        grammar_point_sense_id: item.grammar_point_sense_id
          ? senseIdMap.get(item.grammar_point_sense_id) ?? item.grammar_point_sense_id
          : null,
        construction_text: item.construction_text.trim() || "New construction",
        construction_note_en: clean(item.construction_note_en ?? ""),
        sort_order: Number(item.sort_order) || 1,
      };

      if (isTempId(item.id)) {
        const { data, error } = await supabase
          .from("grammar_point_constructions")
          .insert(payload)
          .select("*")
          .single();

        if (error) throw error;
        savedRows.push(data as GrammarConstruction);
      } else {
        const { error } = await supabase
          .from("grammar_point_constructions")
          .update(payload)
          .eq("id", item.id);

        if (error) throw error;
        savedRows.push({ ...item, ...payload });
      }
    }

    return savedRows;
  }

  async function saveAliases(point: GrammarPoint) {
    const savedRows: GrammarAlias[] = [];

    for (const item of point.grammar_point_aliases ?? []) {
      const aliasText = item.alias_text.trim() || draft?.pattern || point.pattern || "alias";
      const payload = {
        grammar_point_id: point.id,
        alias_text: aliasText,
        normalized_alias: normalizeAlias(item.normalized_alias || aliasText),
        sort_order: Number(item.sort_order) || 0,
      };

      if (isTempId(item.id)) {
        const { data, error } = await supabase
          .from("grammar_point_aliases")
          .insert(payload)
          .select("*")
          .single();

        if (error) throw error;
        savedRows.push(data as GrammarAlias);
      } else {
        const { error } = await supabase
          .from("grammar_point_aliases")
          .update(payload)
          .eq("id", item.id);

        if (error) throw error;
        savedRows.push({ ...item, ...payload });
      }
    }

    return savedRows;
  }

  async function saveRelations(point: GrammarPoint) {
    const savedRows: GrammarRelation[] = [];

    for (const item of point.grammar_point_relations ?? []) {
      const payload = {
        grammar_point_id: point.id,
        related_grammar_point_id: item.related_grammar_point_id,
        relationship_type: item.relationship_type.trim() || "related_usage",
        relationship_note_en: clean(item.relationship_note_en ?? ""),
        sort_order: Number(item.sort_order) || 0,
      };

      if (isTempId(item.id)) {
        const { data, error } = await supabase
          .from("grammar_point_relations")
          .insert(payload)
          .select("*")
          .single();

        if (error) throw error;
        savedRows.push(data as GrammarRelation);
      } else {
        const { error } = await supabase
          .from("grammar_point_relations")
          .update(payload)
          .eq("id", item.id);

        if (error) throw error;
        savedRows.push({ ...item, ...payload });
      }
    }

    return savedRows;
  }

  async function saveExamples(point: GrammarPoint, senseIdMap: Map<string, string>) {
    const savedRows: GrammarExample[] = [];

    for (const item of point.grammar_point_examples ?? []) {
      const payload = {
        grammar_point_id: point.id,
        grammar_point_sense_id: item.grammar_point_sense_id
          ? senseIdMap.get(item.grammar_point_sense_id) ?? item.grammar_point_sense_id
          : null,
        sentence_ja: item.sentence_ja.trim() || "新しい例文。",
        translation_en: clean(item.translation_en ?? ""),
        example_note_en: clean(item.example_note_en ?? ""),
        source_type: item.source_type,
        source_label: clean(item.source_label ?? ""),
        source_url: clean(item.source_url ?? ""),
        sort_order: Number(item.sort_order) || 0,
      };

      if (isTempId(item.id)) {
        const { data, error } = await supabase
          .from("grammar_point_examples")
          .insert(payload)
          .select("*")
          .single();

        if (error) throw error;
        savedRows.push(data as GrammarExample);
      } else {
        const { error } = await supabase
          .from("grammar_point_examples")
          .update(payload)
          .eq("id", item.id);

        if (error) throw error;
        savedRows.push({ ...item, ...payload });
      }
    }

    return savedRows;
  }

  function addChild<T extends { id: string; sort_order: number }>(key: GrammarChildKey, row: T) {
    setPoints((prev) =>
      prev.map((point) => {
        if (point.id !== selectedPoint?.id) return point;
        const rows = (((point[key] as unknown) as T[] | undefined) ?? []);
        return { ...point, [key]: sortByOrder([...rows, row]) };
      })
    );
  }

  function updatePrimaryConstructionText(value: string) {
    setPoints((prev) =>
      prev.map((point) => {
        if (point.id !== selectedPoint?.id) return point;
        const currentPrimary = primaryConstructionFor(point);

        if (!currentPrimary && !value.trim()) return point;

        if (!currentPrimary) {
          const nextPrimary: GrammarConstruction = {
            id: tempId("primary-construction"),
            grammar_point_id: point.id,
            grammar_point_sense_id: null,
            construction_text: value,
            construction_note_en: null,
            sort_order: 0,
          };
          return {
            ...point,
            grammar_point_constructions: sortByOrder([
              ...(point.grammar_point_constructions ?? []),
              nextPrimary,
            ]),
          };
        }

        return {
          ...point,
          grammar_point_constructions: sortByOrder(
            (point.grammar_point_constructions ?? []).map((item) =>
              item.id === currentPrimary.id
                ? {
                    ...item,
                    construction_text: value,
                    grammar_point_sense_id: null,
                    sort_order: 0,
                  }
                : item
            )
          ),
        };
      })
    );
  }

  function toggleRegisterTag(tag: string) {
    if (!draft) return;
    setDraft({
      ...draft,
      registerTags: draft.registerTags.includes(tag)
        ? draft.registerTags.filter((value) => value !== tag)
        : [...draft.registerTags, tag],
    });
  }

  function updateSpokenWrittenTendency(value: string) {
    if (!draft) return;
    setDraft({
      ...draft,
      spokenWrittenTendency: value === "other" ? "other" : value,
    });
  }

  function updateSelectedPointPatch<T extends keyof GrammarPoint>(
    key: T,
    value: GrammarPoint[T]
  ) {
    setPoints((prev) =>
      prev.map((point) =>
        point.id === selectedPoint?.id ? { ...point, [key]: value } : point
      )
    );
  }

  function updateChild<T extends { id: string }>(
    key: keyof GrammarPoint,
    id: string,
    patch: Partial<T>
  ) {
    setPoints((prev) =>
      prev.map((point) => {
        if (point.id !== selectedPoint?.id) return point;
        const rows = (((point[key] as unknown) as T[] | undefined) ?? []).map((row) =>
          row.id === id ? { ...row, ...patch } : row
        );
        return { ...point, [key]: rows };
      })
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <Link href={backLink.href} className="text-sm font-semibold text-stone-500 hover:text-stone-900">
          {backLink.label}
        </Link>

        <section className="mt-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
            Grammar Needs Attention
          </p>
          <h1 className="mt-2 text-3xl font-black text-stone-900">
            Grammar DB Review Queue
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
            Phase 1 shared grammar knowledge review. This data is teacher-visible only for now and is not connected to reader Add Word, Follow-Along, or Book Hub grammar behavior.
          </p>
        </section>

        {message ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            {message}
          </p>
        ) : null}

        {!canAccess && !loading ? (
          <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
            {message || "Teacher access is required."}
          </section>
        ) : null}

        {canAccess ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
                <FieldLabel>Status filter</FieldLabel>
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value as GrammarFilter)}
                  className="w-full rounded-2xl border border-stone-300 bg-white px-3 py-2 text-sm"
                >
                  {FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <div className="mt-4 border-t border-stone-100 pt-4">
                  <FieldLabel>Add grammar point</FieldLabel>
                  <input
                    value={newPattern}
                    onChange={(event) => setNewPattern(event.target.value)}
                    placeholder="〜てくる"
                    className="w-full rounded-2xl border border-stone-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void createPoint()}
                    disabled={creatingPoint}
                    className="mt-2 w-full rounded-2xl bg-stone-900 px-4 py-2 text-sm font-black text-white hover:bg-black disabled:opacity-50"
                  >
                    {creatingPoint ? "Creating..." : "Create"}
                  </button>
                </div>
              </section>

              <section className="rounded-3xl border border-stone-200 bg-white p-3 shadow-sm">
                {loading ? <p className="p-3 text-sm text-stone-500">Loading grammar points...</p> : null}

                {!loading && points.length === 0 ? (
                  <p className="p-3 text-sm text-stone-500">No grammar points match this filter.</p>
                ) : null}

                <div className="space-y-2">
                  {points.map((point) => {
                    const missing = missingIndicators(point);
                    const active = point.id === selectedPoint?.id;

                    return (
                      <button
                        key={point.id}
                        type="button"
                        onClick={() => setSelectedId(point.id)}
                        className={`w-full rounded-2xl border p-3 text-left transition ${
                          active
                            ? "border-stone-900 bg-stone-900 text-white"
                            : "border-stone-200 bg-white text-stone-900 hover:bg-stone-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-black">{point.pattern}</div>
                          <div className={active ? "text-xs text-stone-200" : "text-xs text-stone-500"}>
                            {statusLabel(point.status)}
                          </div>
                        </div>
                        <div className={active ? "mt-1 text-xs text-stone-200" : "mt-1 text-xs text-stone-500"}>
                          {point.reading || "No reading"} · {point.jlpt_level || "No JLPT"}
                        </div>
                        {missing.length ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {missing.slice(0, 4).map((label) => (
                              <span
                                key={label}
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                  active
                                    ? "border-white/30 bg-white/10 text-white"
                                    : "border-amber-200 bg-amber-50 text-amber-900"
                                }`}
                              >
                                Missing {label}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            </aside>

            {selectedPoint && draft ? (
              <section className="space-y-5">
                <section className="rounded-3xl border border-stone-300 bg-white p-5 shadow-sm ring-1 ring-white">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
                        Basic Grammar Info
                      </p>
                      <h2 className="mt-1 text-2xl font-black text-stone-900">{draft.pattern}</h2>
                      <p className="mt-1 text-sm text-stone-500">
                        Compact learner-facing information for real reading and future Follow-Along cards.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void saveBasicInformation()}
                      disabled={savingBasicInfo || deletingPoint}
                      className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-black text-white hover:bg-black disabled:opacity-50"
                    >
                      {savingBasicInfo ? "Saving..." : "Save basic information"}
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <label>
                      <FieldLabel>Pattern</FieldLabel>
                      <input
                        value={draft.pattern}
                        onChange={(event) => setDraft({ ...draft, pattern: event.target.value })}
                        className="w-full rounded-2xl border border-stone-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label>
                      <FieldLabel>Reading</FieldLabel>
                      <input
                        value={draft.reading}
                        onChange={(event) => setDraft({ ...draft, reading: event.target.value })}
                        className="w-full rounded-2xl border border-stone-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label>
                      <FieldLabel>JLPT</FieldLabel>
                      <select
                        value={draft.jlptLevel}
                        onChange={(event) => setDraft({ ...draft, jlptLevel: event.target.value })}
                        className="w-full rounded-2xl border border-stone-300 bg-white px-3 py-2 text-sm"
                      >
                        {JLPT_OPTIONS.map((level) => (
                          <option key={level || "none"} value={level}>
                            {level || "Not set"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="md:col-span-3">
                      <FieldLabel>Basic meaning</FieldLabel>
                      <input
                        value={draft.basicMeaningEn}
                        onChange={(event) => setDraft({ ...draft, basicMeaningEn: event.target.value })}
                        placeholder="to come to; to begin to; to have been doing"
                        className="w-full rounded-2xl border border-stone-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="md:col-span-3">
                      <FieldLabel>Primary construction</FieldLabel>
                      <input
                        value={primaryConstruction?.construction_text ?? ""}
                        onChange={(event) => updatePrimaryConstructionText(event.target.value)}
                        placeholder="Verb て-form + くる"
                        className="w-full rounded-2xl border border-stone-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <div className="md:col-span-3">
                      <FieldLabel>Register</FieldLabel>
                      <div className="flex flex-wrap gap-2">
                        {REGISTER_TAG_OPTIONS.map((tag) => {
                          const checked = draft.registerTags.includes(tag);
                          return (
                            <label
                              key={tag}
                              className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                                checked
                                  ? "border-stone-900 bg-stone-900 text-white"
                                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleRegisterTag(tag)}
                                className="sr-only"
                              />
                              {tag}
                            </label>
                          );
                        })}
                        {customRegisterTags.map((tag) => (
                          <label
                            key={tag}
                            className="flex cursor-pointer items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900"
                          >
                            <input
                              type="checkbox"
                              checked
                              onChange={() => toggleRegisterTag(tag)}
                              className="sr-only"
                            />
                            Custom: {tag}
                          </label>
                        ))}
                      </div>
                    </div>
                    <label>
                      <FieldLabel>Spoken / Written tendency</FieldLabel>
                      <select
                        value={spokenWrittenSelectValue}
                        onChange={(event) => updateSpokenWrittenTendency(event.target.value)}
                        className="w-full rounded-2xl border border-stone-300 bg-white px-3 py-2 text-sm"
                      >
                        {SPOKEN_WRITTEN_OPTIONS.map((option) => (
                          <option key={option.value || "none"} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {draft.spokenWrittenTendency &&
                    !KNOWN_SPOKEN_WRITTEN_VALUES.has(draft.spokenWrittenTendency) ? (
                      <p className="self-end rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                        Preserved stored value: {draft.spokenWrittenTendency}
                      </p>
                    ) : null}
                    {shouldShowRegisterDetails ? (
                      <label className="md:col-span-3">
                        <FieldLabel>Other register / tendency explanation</FieldLabel>
                        <textarea
                          value={draft.registerNoteEn}
                          onChange={(event) => setDraft({ ...draft, registerNoteEn: event.target.value })}
                          rows={2}
                          placeholder="Use this for custom register details or why this is marked Other."
                          className="w-full rounded-2xl border border-stone-300 px-3 py-2 text-sm"
                        />
                      </label>
                    ) : null}
                  </div>
                </section>

                <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
                        Deep Dive - Optional
                      </p>
                      <h3 className="mt-1 text-xl font-black text-stone-900">Research, nuance, examples, and relationships</h3>
                      <p className="mt-1 text-sm text-stone-500">
                        Add richer detail gradually. These fields do not need to be complete for basic reading support.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void saveDeepDive()}
                      disabled={savingDeepDive || deletingPoint}
                      className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-black text-white hover:bg-black disabled:opacity-50"
                    >
                      {savingDeepDive ? "Saving..." : "Save deep dive"}
                    </button>
                  </div>

                  <label className="mt-4 block">
                    <FieldLabel>Register & nuance details</FieldLabel>
                    <textarea
                      value={draft.registerNoteEn}
                      onChange={(event) => setDraft({ ...draft, registerNoteEn: event.target.value })}
                      rows={3}
                      className="w-full rounded-2xl border border-stone-300 px-3 py-2 text-sm"
                    />
                  </label>
                </section>

                <DetailSection title="Meanings & Senses" onAdd={() => addSense()}>
                  {(selectedPoint.grammar_point_senses ?? []).map((sense) => (
                    <div key={sense.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
                      <div className="grid gap-3 md:grid-cols-[90px_minmax(0,1fr)]">
                        <label>
                          <FieldLabel>#</FieldLabel>
                          <input
                            type="number"
                            value={sense.sense_number}
                            onChange={(event) =>
                              updateChild<GrammarSense>("grammar_point_senses", sense.id, {
                                sense_number: Number(event.target.value),
                              })
                            }
                            className="w-full rounded-xl border border-stone-300 px-2 py-2 text-sm"
                          />
                        </label>
                        <label>
                          <FieldLabel>Meaning EN</FieldLabel>
                          <input
                            value={sense.meaning_en}
                            onChange={(event) =>
                              updateChild<GrammarSense>("grammar_point_senses", sense.id, {
                                meaning_en: event.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-stone-300 px-2 py-2 text-sm"
                          />
                        </label>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <label>
                          <FieldLabel>Nuance</FieldLabel>
                          <textarea
                            value={sense.nuance_en ?? ""}
                            onChange={(event) =>
                              updateChild<GrammarSense>("grammar_point_senses", sense.id, {
                                nuance_en: event.target.value,
                              })
                            }
                            rows={2}
                            className="w-full rounded-xl border border-stone-300 px-2 py-2 text-sm"
                          />
                        </label>
                        <label>
                          <FieldLabel>Usage note</FieldLabel>
                          <textarea
                            value={sense.usage_note_en ?? ""}
                            onChange={(event) =>
                              updateChild<GrammarSense>("grammar_point_senses", sense.id, {
                                usage_note_en: event.target.value,
                              })
                            }
                            rows={2}
                            className="w-full rounded-xl border border-stone-300 px-2 py-2 text-sm"
                          />
                        </label>
                        <label>
                          <FieldLabel>Sense register override</FieldLabel>
                          <input
                            value={(sense.register_tags ?? []).join(", ")}
                            onChange={(event) =>
                              updateChild<GrammarSense>("grammar_point_senses", sense.id, {
                                register_tags: splitTags(event.target.value),
                              })
                            }
                            className="w-full rounded-xl border border-stone-300 px-2 py-2 text-sm"
                          />
                        </label>
                        <label>
                          <FieldLabel>Sense spoken/written tendency</FieldLabel>
                          <input
                            value={sense.spoken_written_tendency ?? ""}
                            onChange={(event) =>
                              updateChild<GrammarSense>("grammar_point_senses", sense.id, {
                                spoken_written_tendency: event.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-stone-300 px-2 py-2 text-sm"
                          />
                        </label>
                      </div>
                      <RowActions onDelete={() => deleteChild("grammar_point_senses", sense.id)} />
                    </div>
                  ))}
                </DetailSection>

                <DetailSection title="Detailed Constructions" onAdd={() => addConstruction()}>
                  {(selectedPoint.grammar_point_constructions ?? [])
                    .filter((item) => item.id !== primaryConstruction?.id)
                    .map((item) => (
                      <div key={item.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_90px]">
                          <label>
                            <FieldLabel>Construction</FieldLabel>
                            <input
                              value={item.construction_text}
                              onChange={(event) =>
                                updateChild<GrammarConstruction>("grammar_point_constructions", item.id, {
                                  construction_text: event.target.value,
                                })
                              }
                              className="w-full rounded-xl border border-stone-300 px-2 py-2 text-sm"
                            />
                          </label>
                          <label>
                            <FieldLabel>Sense</FieldLabel>
                            <select
                              value={item.grammar_point_sense_id ?? ""}
                              onChange={(event) =>
                                updateChild<GrammarConstruction>("grammar_point_constructions", item.id, {
                                  grammar_point_sense_id: event.target.value || null,
                                })
                              }
                              className="w-full rounded-xl border border-stone-300 bg-white px-2 py-2 text-sm"
                            >
                              <option value="">Whole point</option>
                              {(selectedPoint.grammar_point_senses ?? []).map((sense) => (
                                <option key={sense.id} value={sense.id}>
                                  Meaning {sense.sense_number}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <FieldLabel>Order</FieldLabel>
                            <input
                              type="number"
                              value={item.sort_order}
                              onChange={(event) =>
                                updateChild<GrammarConstruction>("grammar_point_constructions", item.id, {
                                  sort_order: Number(event.target.value),
                                })
                              }
                              className="w-full rounded-xl border border-stone-300 px-2 py-2 text-sm"
                            />
                          </label>
                        </div>
                        <label className="mt-3 block">
                          <FieldLabel>Construction note</FieldLabel>
                          <textarea
                            value={item.construction_note_en ?? ""}
                            onChange={(event) =>
                              updateChild<GrammarConstruction>("grammar_point_constructions", item.id, {
                                construction_note_en: event.target.value,
                              })
                            }
                            rows={2}
                            className="w-full rounded-xl border border-stone-300 px-2 py-2 text-sm"
                          />
                        </label>
                        <RowActions onDelete={() => deleteChild("grammar_point_constructions", item.id)} />
                      </div>
                    ))}
                </DetailSection>

                <DetailSection title="Related Grammar" onAdd={() => addRelation()}>
                  {(selectedPoint.grammar_point_relations ?? []).map((item) => {
                    const relatedPoint = points.find((point) => point.id === item.related_grammar_point_id);
                    return (
                      <div key={item.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
                        <div className="grid gap-3 md:grid-cols-[220px_180px_90px]">
                          <label>
                            <FieldLabel>Related point</FieldLabel>
                            <select
                              value={item.related_grammar_point_id}
                              onChange={(event) =>
                                updateChild<GrammarRelation>("grammar_point_relations", item.id, {
                                  related_grammar_point_id: event.target.value,
                                })
                              }
                              className="w-full rounded-xl border border-stone-300 bg-white px-2 py-2 text-sm"
                            >
                              {relatedPointOptions.map((point) => (
                                <option key={point.id} value={point.id}>
                                  {point.pattern}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <FieldLabel>Type</FieldLabel>
                            <input
                              value={item.relationship_type}
                              onChange={(event) =>
                                updateChild<GrammarRelation>("grammar_point_relations", item.id, {
                                  relationship_type: event.target.value,
                                })
                              }
                              className="w-full rounded-xl border border-stone-300 px-2 py-2 text-sm"
                            />
                          </label>
                          <label>
                            <FieldLabel>Order</FieldLabel>
                            <input
                              type="number"
                              value={item.sort_order}
                              onChange={(event) =>
                                updateChild<GrammarRelation>("grammar_point_relations", item.id, {
                                  sort_order: Number(event.target.value),
                                })
                              }
                              className="w-full rounded-xl border border-stone-300 px-2 py-2 text-sm"
                            />
                          </label>
                        </div>
                        <p className="mt-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-500">
                          Related register: {relationRegisterSummary(relatedPoint)}
                        </p>
                        <label className="mt-3 block">
                          <FieldLabel>Relationship note</FieldLabel>
                          <textarea
                            value={item.relationship_note_en ?? ""}
                            onChange={(event) =>
                              updateChild<GrammarRelation>("grammar_point_relations", item.id, {
                                relationship_note_en: event.target.value,
                              })
                            }
                            rows={2}
                            className="w-full rounded-xl border border-stone-300 px-2 py-2 text-sm"
                          />
                        </label>
                        <RowActions onDelete={() => deleteChild("grammar_point_relations", item.id)} />
                      </div>
                    );
                  })}
                </DetailSection>

                <DetailSection title="Examples" onAdd={() => addExample()}>
                  {(selectedPoint.grammar_point_examples ?? []).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_90px]">
                        <label>
                          <FieldLabel>Japanese sentence</FieldLabel>
                          <input
                            value={item.sentence_ja}
                            onChange={(event) =>
                              updateChild<GrammarExample>("grammar_point_examples", item.id, {
                                sentence_ja: event.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-stone-300 px-2 py-2 text-sm"
                          />
                        </label>
                        <label>
                          <FieldLabel>Sense</FieldLabel>
                          <select
                            value={item.grammar_point_sense_id ?? ""}
                            onChange={(event) =>
                              updateChild<GrammarExample>("grammar_point_examples", item.id, {
                                grammar_point_sense_id: event.target.value || null,
                              })
                            }
                            className="w-full rounded-xl border border-stone-300 bg-white px-2 py-2 text-sm"
                          >
                            <option value="">Whole point</option>
                            {(selectedPoint.grammar_point_senses ?? []).map((sense) => (
                              <option key={sense.id} value={sense.id}>
                                Meaning {sense.sense_number}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <FieldLabel>Order</FieldLabel>
                          <input
                            type="number"
                            value={item.sort_order}
                            onChange={(event) =>
                              updateChild<GrammarExample>("grammar_point_examples", item.id, {
                                sort_order: Number(event.target.value),
                              })
                            }
                            className="w-full rounded-xl border border-stone-300 px-2 py-2 text-sm"
                          />
                        </label>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <label>
                          <FieldLabel>Translation EN</FieldLabel>
                          <textarea
                            value={item.translation_en ?? ""}
                            onChange={(event) =>
                              updateChild<GrammarExample>("grammar_point_examples", item.id, {
                                translation_en: event.target.value,
                              })
                            }
                            rows={2}
                            className="w-full rounded-xl border border-stone-300 px-2 py-2 text-sm"
                          />
                        </label>
                        <label>
                          <FieldLabel>Example note</FieldLabel>
                          <textarea
                            value={item.example_note_en ?? ""}
                            onChange={(event) =>
                              updateChild<GrammarExample>("grammar_point_examples", item.id, {
                                example_note_en: event.target.value,
                              })
                            }
                            rows={2}
                            className="w-full rounded-xl border border-stone-300 px-2 py-2 text-sm"
                          />
                        </label>
                        <label>
                          <FieldLabel>Source type</FieldLabel>
                          <select
                            value={item.source_type}
                            onChange={(event) =>
                              updateChild<GrammarExample>("grammar_point_examples", item.id, {
                                source_type: event.target.value as GrammarExample["source_type"],
                              })
                            }
                            className="w-full rounded-xl border border-stone-300 bg-white px-2 py-2 text-sm"
                          >
                            {SOURCE_TYPE_OPTIONS.map((sourceType) => (
                              <option key={sourceType} value={sourceType}>
                                {sourceType}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <FieldLabel>Source label</FieldLabel>
                          <input
                            value={item.source_label ?? ""}
                            onChange={(event) =>
                              updateChild<GrammarExample>("grammar_point_examples", item.id, {
                                source_label: event.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-stone-300 px-2 py-2 text-sm"
                          />
                        </label>
                      </div>
                      <label className="mt-3 block">
                        <FieldLabel>Source URL</FieldLabel>
                        <input
                          value={item.source_url ?? ""}
                          onChange={(event) =>
                            updateChild<GrammarExample>("grammar_point_examples", item.id, {
                              source_url: event.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-stone-300 px-2 py-2 text-sm"
                        />
                      </label>
                      <RowActions onDelete={() => deleteChild("grammar_point_examples", item.id)} />
                    </div>
                  ))}
                </DetailSection>

                <details className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm" open>
                  <summary className="cursor-pointer text-lg font-black text-stone-900">
                    Sources & Internal Review
                  </summary>
                  <p className="mt-1 text-sm text-stone-500">
                    Research and admin metadata. This is intentionally quieter than the learning-facing fields.
                  </p>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <label>
                      <FieldLabel>Source label</FieldLabel>
                      <input
                        value={draft.sourceLabel}
                        onChange={(event) => setDraft({ ...draft, sourceLabel: event.target.value })}
                        className="w-full rounded-2xl border border-stone-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label>
                      <FieldLabel>Source URL</FieldLabel>
                      <input
                        value={draft.sourceUrl}
                        onChange={(event) => setDraft({ ...draft, sourceUrl: event.target.value })}
                        className="w-full rounded-2xl border border-stone-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label>
                      <FieldLabel>Status</FieldLabel>
                      <select
                        value={draft.status}
                        onChange={(event) => setDraft({ ...draft, status: event.target.value as GrammarStatus })}
                        className="w-full rounded-2xl border border-stone-300 bg-white px-3 py-2 text-sm"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-end gap-2 rounded-2xl border border-stone-200 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.isActive}
                        onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
                      />
                      Active
                    </label>
                    <label className="md:col-span-2">
                      <FieldLabel>Review note</FieldLabel>
                      <textarea
                        value={draft.reviewNote}
                        onChange={(event) => setDraft({ ...draft, reviewNote: event.target.value })}
                        rows={3}
                        className="w-full rounded-2xl border border-stone-300 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  <div className="mt-5">
                    <DetailSection title="Aliases" onAdd={() => addAlias()}>
                      {(selectedPoint.grammar_point_aliases ?? []).map((item) => (
                        <div key={item.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
                          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_90px]">
                            <label>
                              <FieldLabel>Alias</FieldLabel>
                              <input
                                value={item.alias_text}
                                onChange={(event) =>
                                  updateChild<GrammarAlias>("grammar_point_aliases", item.id, {
                                    alias_text: event.target.value,
                                    normalized_alias: normalizeAlias(event.target.value),
                                  })
                                }
                                className="w-full rounded-xl border border-stone-300 px-2 py-2 text-sm"
                              />
                            </label>
                            <label>
                              <FieldLabel>Normalized</FieldLabel>
                              <input
                                value={item.normalized_alias}
                                onChange={(event) =>
                                  updateChild<GrammarAlias>("grammar_point_aliases", item.id, {
                                    normalized_alias: event.target.value,
                                  })
                                }
                                className="w-full rounded-xl border border-stone-300 px-2 py-2 text-sm"
                              />
                            </label>
                            <label>
                              <FieldLabel>Order</FieldLabel>
                              <input
                                type="number"
                                value={item.sort_order}
                                onChange={(event) =>
                                  updateChild<GrammarAlias>("grammar_point_aliases", item.id, {
                                    sort_order: Number(event.target.value),
                                  })
                                }
                                className="w-full rounded-xl border border-stone-300 px-2 py-2 text-sm"
                              />
                            </label>
                          </div>
                          <RowActions onDelete={() => deleteChild("grammar_point_aliases", item.id)} />
                        </div>
                      ))}
                    </DetailSection>
                  </div>

                  <div className="mt-4 flex flex-wrap justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => void deleteSelectedPoint()}
                      disabled={deletingPoint || savingBasicInfo || savingDeepDive || savingReview}
                      className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-black text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                    >
                      {deletingPoint ? "Deleting..." : "Delete grammar point"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveSourcesAndReview()}
                      disabled={savingReview || deletingPoint}
                      className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-black text-white hover:bg-black disabled:opacity-50"
                    >
                      {savingReview ? "Saving..." : "Save sources & review"}
                    </button>
                  </div>
                </details>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function DetailSection({
  title,
  onAdd,
  children,
}: {
  title: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-black text-stone-900">{title}</h3>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-2xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs font-black text-stone-800 hover:bg-white"
        >
          Add
        </button>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function RowActions({ onDelete }: { onDelete: () => void }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" onClick={onDelete} className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-black text-rose-700">
        Remove row
      </button>
    </div>
  );
}
