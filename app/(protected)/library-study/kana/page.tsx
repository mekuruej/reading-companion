"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    BASIC_KANA,
    DAKUTEN_KANA,
    YOON_KANA,
    type KanaItem,
} from "@/lib/japanese/kana";
import KanjiStudyModeSelector from "../components/KanjiStudyModeSelector";
import { KanaStudyCharacterSetSelector } from "./components/KanaStudyCharacterSetSelector";
import { KanaStudyCompletionPanel } from "./components/KanaStudyCompletionPanel";
import { KanaStudyCurrentCardSummary } from "./components/KanaStudyCurrentCardSummary";
import { KanaStudyFeedbackPanel } from "./components/KanaStudyFeedbackPanel";
import { KanaStudyHeader } from "./components/KanaStudyHeader";
import { KanaStudyPrompt } from "./components/KanaStudyPrompt";

const KANA_AUTO_ADVANCE_MS = 3000;

function isSameKanaItem(a: KanaItem, b: KanaItem): boolean {
    return (
        a.hiragana === b.hiragana &&
        a.katakana === b.katakana &&
        a.romaji === b.romaji
    );
}

function getMatchingKanaPool(item: KanaItem): KanaItem[] {
    if (YOON_KANA.some((kana) => isSameKanaItem(kana, item))) {
        return YOON_KANA;
    }

    if (DAKUTEN_KANA.some((kana) => isSameKanaItem(kana, item))) {
        return DAKUTEN_KANA;
    }

    return BASIC_KANA;
}

type StudyMode =
    | "hiragana-to-katakana"
    | "katakana-to-hiragana"
    | "kana-to-romaji"
    | "romaji-to-hiragana"
    | "romaji-to-katakana"
    | "mixed";

type StudyCard = {
    item: KanaItem;
    mode: Exclude<StudyMode, "mixed">;
    prompt: string;
    promptLabel: string;
    answer: string;
    answerLabel: string;
    choices: string[];
};

type KanaSetOptions = {
    includeDakuten: boolean;
    includeYoon: boolean;
};

const STUDY_MODES: { value: StudyMode; label: string; description: string }[] = [
    {
        value: "romaji-to-hiragana",
        label: "Romaji → Hiragana",
        description: "See ka and choose か.",
    },
    {
        value: "hiragana-to-katakana",
        label: "Hiragana → Katakana",
        description: "See か and choose カ.",
    },
    {
        value: "romaji-to-katakana",
        label: "Romaji → Katakana",
        description: "See ka and choose カ.",
    },
    {
        value: "katakana-to-hiragana",
        label: "Katakana → Hiragana",
        description: "See メ and choose め.",
    },
    {
        value: "kana-to-romaji",
        label: "Kana → Romaji",
        description: "See き or キ and choose ki.",
    },
    {
        value: "mixed",
        label: "Mixed Review",
        description: "A mix of kana matching and romaji prompts.",
    },
];

const MIXED_MODES: Exclude<StudyMode, "mixed">[] = [
    "hiragana-to-katakana",
    "katakana-to-hiragana",
    "kana-to-romaji",
    "romaji-to-hiragana",
    "romaji-to-katakana",
];

const DEFAULT_KANA_SET: KanaSetOptions = {
    includeDakuten: true,
    includeYoon: true,
};

function shuffleArray<T>(items: readonly T[]): T[] {
    return [...items].sort(() => Math.random() - 0.5);
}

function pickRandom<T>(items: readonly T[]): T {
    const item = items[Math.floor(Math.random() * items.length)];

    if (!item) {
        throw new Error("Cannot pick from an empty kana list.");
    }

    return item;
}

function makeChoices(
    correctAnswer: string,
    answerPool: readonly string[],
    choiceCount = 4
): string[] {
    const uniqueAnswerPool = Array.from(new Set(answerPool));

    const wrongChoices = shuffleArray(
        uniqueAnswerPool.filter((choice) => choice !== correctAnswer)
    ).slice(0, choiceCount - 1);

    return shuffleArray([correctAnswer, ...wrongChoices]);
}

function resolveConcreteMode(mode: StudyMode): Exclude<StudyMode, "mixed"> {
    if (mode === "mixed") {
        return pickRandom(MIXED_MODES);
    }

    return mode;
}

function buildKanaPool({ includeDakuten, includeYoon }: KanaSetOptions): KanaItem[] {
    return [
        ...BASIC_KANA,
        ...(includeDakuten ? DAKUTEN_KANA : []),
        ...(includeYoon ? YOON_KANA : []),
    ];
}

const PRONUNCIATION_MEMORY_CUES: Record<string, string> = {
    a: "ah 😮",
    i: "ee(l) 🪱",
    u: "ooze 🫧",
    e: "e(gg) 🥚",
    o: "o(cean) 🌊",
    ka: "ca(r) 🚗",
    ki: "key 🔑",
    ku: "coo(l) 🧊",
    ke: "ke(ttle) 🫖",
    ko: "co(ne) 🍦",
    sa: "saw 🪚",
    shi: "she 👩",
    su: "sou(p) 🍲",
    se: "se(t) 🎬",
    so: "soa(p) 🧼",
    ta: "ta(co) 🌮",
    chi: "chee(se) 🧀",
    tsu: "tsu(nami) 🌊",
    te: "te(nnis) 🎾",
    to: "to(ast) 🍞",
    na: "na(cho) 🧀",
    ni: "knee 🦵",
    nu: "noo(dle) 🍜",
    ne: "net 🥅",
    no: "no(te) 🎵",
    ha: "ha(ha) 😄",
    hi: "hee(l) 🦶",
    fu: "foo(d) 🍱",
    he: "he(ad) 🧢",
    ho: "ho(me) 🏠",
    ma: "ma(ma) 👩",
    mi: "me 👤",
    mu: "moo 🐄",
    me: "me(dal) 🏅",
    mo: "mow 🌾",
    ya: "ya(cht) ⛵",
    yu: "you 👉",
    yo: "yo(-yo) 🪀",
    ra: "ra(men) 🍜",
    ri: "ri(ng) 💍",
    ru: "ru(by) 💎",
    re: "re(d) 🟥",
    ro: "roa(d) 🛣️",
    wa: "wa(ter) 💧",
    wo: "whoa ✋",
    n: "hmm 🤔",
    ga: "ga(rden) 🪴",
    gi: "gee(se) 🪿",
    gu: "ghou(l) 👻",
    ge: "ge(t) 🎯",
    go: "goa(l) 🥅",
    za: "(piz)za 🍕",
    ji: "jee(p) 🚙",
    zu: "zoo(m) 🔎",
    ze: "ze(n) 🧘",
    zo: "zo(ne) 🗺️",
    da: "dau(ghter) 👧",
    de: "day ☀️",
    do: "do(g) 🐕",
    ba: "ba(ll) ⚽",
    bi: "bee 🐝",
    bu: "boo(t) 👢",
    be: "be(ll) 🔔",
    bo: "boa(t) ⛵",
    pa: "po(pcorn) 🍿",
    pi: "pi(zza) 🍕",
    pu: "poo(l) 🏊",
    pe: "pe(n) 🖊️",
    po: "po(tion) 🧪",
    kyu: "kyu",
    shu: "shu",
    chu: "chu",
    nyu: "nyu",
    hyu: "hyu",
    myu: "myu",
    ryu: "ryu",
    gyu: "gyu",
    ju: "ju",
    byu: "byu",
    pyu: "pyu",
};

function pronunciationHintForRomaji(romaji: string): string {
    const normalized = romaji.trim().toLowerCase();
    const memoryCue = PRONUNCIATION_MEMORY_CUES[normalized];

    if (memoryCue) {
        return memoryCue;
    }

    if (normalized === "n") return "nn";
    if (normalized === "tsu") return "tsu";
    if (normalized === "fu") return "foo";

    const vowelSounds: Record<string, string> = {
        a: "ah",
        i: "ee",
        u: "oo",
        e: "eh",
        o: "oh",
    };
    const vowel = normalized.at(-1);

    if (!vowel || !vowelSounds[vowel]) {
        return normalized;
    }

    return `${normalized.slice(0, -1)}${vowelSounds[vowel]}`;
}

function createStudyCard(mode: StudyMode, item: KanaItem): StudyCard {
    const concreteMode = resolveConcreteMode(mode);
    const matchingKanaPool = getMatchingKanaPool(item);

    if (concreteMode === "hiragana-to-katakana") {
        return {
            item,
            mode: concreteMode,
            prompt: item.hiragana,
            promptLabel: "Choose the katakana equivalent.",
            answer: item.katakana,
            answerLabel: `${item.hiragana} → ${item.katakana} (${item.romaji})`,
            choices: makeChoices(
                item.katakana,
                matchingKanaPool.map((kana) => kana.katakana)
            ),
        };
    }

    if (concreteMode === "katakana-to-hiragana") {
        return {
            item,
            mode: concreteMode,
            prompt: item.katakana,
            promptLabel: "Choose the hiragana equivalent.",
            answer: item.hiragana,
            answerLabel: `${item.katakana} → ${item.hiragana} (${item.romaji})`,
            choices: makeChoices(
                item.hiragana,
                matchingKanaPool.map((kana) => kana.hiragana)
            ),
        };
    }

    if (concreteMode === "kana-to-romaji") {
        const prompt = Math.random() > 0.5 ? item.hiragana : item.katakana;

        return {
            item,
            mode: concreteMode,
            prompt,
            promptLabel: "Choose the romaji reading.",
            answer: item.romaji,
            answerLabel: `${item.hiragana} / ${item.katakana} = ${item.romaji}`,
            choices: makeChoices(
                item.romaji,
                matchingKanaPool.map((kana) => kana.romaji)
            ),
        };
    }

    if (concreteMode === "romaji-to-hiragana") {
        return {
            item,
            mode: concreteMode,
            prompt: item.romaji,
            promptLabel: "Choose the hiragana.",
            answer: item.hiragana,
            answerLabel: `${item.romaji} → ${item.hiragana}`,
            choices: makeChoices(
                item.hiragana,
                matchingKanaPool.map((kana) => kana.hiragana)
            ),
        };
    }

    return {
        item,
        mode: concreteMode,
        prompt: item.romaji,
        promptLabel: "Choose the katakana.",
        answer: item.katakana,
        answerLabel: `${item.romaji} → ${item.katakana}`,
        choices: makeChoices(
            item.katakana,
            matchingKanaPool.map((kana) => kana.katakana)
        ),
    };
}

function createStudyDeck(mode: StudyMode, kanaPool: readonly KanaItem[]): StudyCard[] {
    return shuffleArray(kanaPool).map((item) => createStudyCard(mode, item));
}

function nextStudyMode(mode: StudyMode): StudyMode {
    const currentIndex = STUDY_MODES.findIndex((option) => option.value === mode);
    const nextOption = STUDY_MODES[(currentIndex + 1) % STUDY_MODES.length];

    return nextOption?.value ?? STUDY_MODES[0].value;
}

export default function KanaStudyPage() {
    const router = useRouter();
    const [studyMode, setStudyMode] = useState<StudyMode>("hiragana-to-katakana");
    const [includeDakuten, setIncludeDakuten] = useState(DEFAULT_KANA_SET.includeDakuten);
    const [includeYoon, setIncludeYoon] = useState(DEFAULT_KANA_SET.includeYoon);
    const activeKanaPool = useMemo(
        () => buildKanaPool({ includeDakuten, includeYoon }),
        [includeDakuten, includeYoon]
    );
    const [deck, setDeck] = useState<StudyCard[]>(() =>
        createStudyDeck(
            "hiragana-to-katakana",
            buildKanaPool(DEFAULT_KANA_SET)
        )
    );
    const [cardIndex, setCardIndex] = useState(0);
    const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
    const [answeredCount, setAnsweredCount] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [autoAdvancePaused, setAutoAdvancePaused] = useState(false);

    const selectedMode = useMemo(
        () => STUDY_MODES.find((mode) => mode.value === studyMode),
        [studyMode]
    );

    const card = deck[cardIndex] ?? null;
    const isComplete = cardIndex >= deck.length;
    const isAnswered = selectedChoice !== null;
    const isCorrect = !!card && selectedChoice === card.answer;
    const kanaSetSummary = [
        "Basic Kana",
        includeDakuten ? "Dakuten & Handakuten" : null,
        includeYoon ? "Combo Sounds" : null,
    ]
        .filter(Boolean)
        .join(" + ");

    useEffect(() => {
        if (!isAnswered) return;
        if (autoAdvancePaused) return;

        const timer = window.setTimeout(() => {
            setCardIndex((current) => Math.min(current + 1, deck.length));
            setSelectedChoice(null);
            setAutoAdvancePaused(false);
        }, KANA_AUTO_ADVANCE_MS);

        return () => window.clearTimeout(timer);
    }, [isAnswered, autoAdvancePaused, deck.length]);

    function resetDeck(nextMode: StudyMode, kanaPool: readonly KanaItem[]) {
        setDeck(createStudyDeck(nextMode, kanaPool));
        setCardIndex(0);
        setSelectedChoice(null);
        setAnsweredCount(0);
        setCorrectCount(0);
        setAutoAdvancePaused(false);
    }

    function handleModeChange(nextMode: StudyMode) {
        setStudyMode(nextMode);
        resetDeck(nextMode, activeKanaPool);
    }

    function handleKanaSetChange(nextOptions: KanaSetOptions) {
        const nextKanaPool = buildKanaPool(nextOptions);

        setIncludeDakuten(nextOptions.includeDakuten);
        setIncludeYoon(nextOptions.includeYoon);
        resetDeck(studyMode, nextKanaPool);
    }

    function handleChoice(choice: string) {
        if (!card || isComplete) return;
        if (selectedChoice !== null) return;

        setSelectedChoice(choice);
        setAnsweredCount((current) => current + 1);

        if (choice === card.answer) {
            setCorrectCount((current) => current + 1);
        }
    }

    function handleStudySetAgain() {
        resetDeck(studyMode, activeKanaPool);
    }

    function handleNextMode() {
        const nextMode = nextStudyMode(studyMode);

        setStudyMode(nextMode);
        resetDeck(nextMode, activeKanaPool);
    }

    return (
        <main className="flex min-h-screen flex-col items-center bg-slate-100 px-6 py-4 text-slate-900">
            <KanaStudyHeader />

            <KanjiStudyModeSelector
                value={studyMode}
                options={STUDY_MODES}
                onChange={(value) => handleModeChange(value as StudyMode)}
            />

            <KanaStudyCharacterSetSelector
                kanaSetSummary={kanaSetSummary}
                includeDakuten={includeDakuten}
                includeYoon={includeYoon}
                onChange={handleKanaSetChange}
            />

            {isComplete ? (
                <KanaStudyCompletionPanel
                    correctCount={correctCount}
                    answeredCount={answeredCount}
                    onStudySetAgain={handleStudySetAgain}
                    onNextMode={handleNextMode}
                    onBackToLibraryStudy={() => router.push("/library-study")}
                />
            ) : card ? (
                <>
                    <KanaStudyCurrentCardSummary
                        modeLabel={selectedMode?.label}
                        promptLabel={card.promptLabel}
                        cardNumber={cardIndex + 1}
                        cardCount={deck.length}
                        correctCount={correctCount}
                        answeredCount={answeredCount}
                    />

                    <section className="relative mt-6 flex min-h-72 w-[90vw] max-w-xl select-none items-center justify-center rounded-2xl border border-slate-500 bg-white p-8 text-center shadow-2xl">
                        <div className="flex w-full flex-col items-center justify-center gap-6">
                            <KanaStudyPrompt
                                promptLabel={card.promptLabel}
                                prompt={card.prompt}
                            />

                            <div className="grid w-full max-w-sm grid-cols-2 gap-3">
                                {card.choices.map((choice, index) => {
                                    const isSelectedChoice = selectedChoice === choice;
                                    const isCorrectChoice = choice === card.answer;

                                    let choiceClass = "border-slate-200 bg-white hover:bg-gray-50";

                                    if (isAnswered && isCorrectChoice) {
                                        choiceClass = "border-green-400 bg-green-100";
                                    } else if (isAnswered && isSelectedChoice && !isCorrectChoice) {
                                        choiceClass = "border-red-400 bg-red-100";
                                    }

                                    return (
                                        <button
                                            key={`${choice}-${index}`}
                                            type="button"
                                            onClick={() => handleChoice(choice)}
                                            disabled={isAnswered}
                                            className={`w-full rounded border px-4 py-4 text-2xl font-bold transition disabled:cursor-default sm:text-3xl ${choiceClass}`}
                                        >
                                            {choice}
                                        </button>
                                    );
                                })}
                            </div>

                            <KanaStudyFeedbackPanel
                                isAnswered={isAnswered}
                                isCorrect={isCorrect}
                                answer={card.answer}
                                romaji={card.item.romaji}
                                pronunciationHint={pronunciationHintForRomaji(card.item.romaji)}
                                autoAdvancePaused={autoAdvancePaused}
                                onToggleAutoAdvancePaused={() =>
                                    setAutoAdvancePaused((current) => !current)
                                }
                            />
                        </div>
                    </section>
                </>
            ) : null}
        </main>
    );
}
