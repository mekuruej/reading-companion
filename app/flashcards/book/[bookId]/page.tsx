'use client'

import { use, useEffect, useState } from 'react'
import { supabase } from "../../../../lib/supabaseClient";
import { useRouter } from 'next/navigation'

type Mode = "meaning" | "reading" | "both"

export default function BookFlashcardsPage(props: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(props.params)
  const router = useRouter()

  const [cards, setCards] = useState<any[]>([])
  const [index, setIndex] = useState(0)
  const [side, setSide] = useState<1 | 2 | 3>(1) // 1=word, 2=reading, 3=meaning
  const [mode, setMode] = useState<Mode>("meaning")
  const [firstTouch, setFirstTouch] = useState(true)
  const [jlptFilter, setJlptFilter] = useState("all")

  const [bookTitle, setBookTitle] = useState("")
  const [bookCover, setBookCover] = useState("")

  // ----------------------------------------------------
  // Load vocab + book info
  // ----------------------------------------------------
  useEffect(() => {
    async function loadData() {
      const { data: vocabData } = await supabase
        .from('vocab')
        .select('*')
        .eq('book_id', bookId)
        .order('created_at', { ascending: true })

      setCards(vocabData || [])

      const { data: bookData } = await supabase
        .from('books')
        .select('title, cover_url')
        .eq('id', bookId)
        .single()

      if (bookData) {
        setBookTitle(bookData.title || "")
        setBookCover(bookData.cover_url || "")
      }
    }

    loadData()
  }, [bookId])

  // ----------------------------------------------------
  // Apply JLPT filter
  // ----------------------------------------------------
  const filteredCards = jlptFilter === "all"
    ? cards
    : cards.filter(c => {
        if (!c.jlpt) return false
        if (jlptFilter === "nonjlpt") return c.jlpt.toLowerCase() === "non-jlpt word"
        return c.jlpt.toLowerCase() === `jlpt-${jlptFilter}`
      })

  // Reset index when filtering
  useEffect(() => {
    if (index >= filteredCards.length) setIndex(0)
  }, [filteredCards.length])

  // ----------------------------------------------------
  // Helper: jump between WORDS
  // ----------------------------------------------------
  function goToNextWord() {
    setIndex(prev => (prev + 1 < filteredCards.length ? prev + 1 : 0))
    setSide(1)
  }

  function goToPrevWord(finalSide: 2 | 3) {
    setIndex(prev => (prev - 1 >= 0 ? prev - 1 : filteredCards.length - 1))
    setSide(finalSide)
  }

  // ----------------------------------------------------
  // NEXT STEP (like tapping to flip)
  // ----------------------------------------------------
  function nextCard() {
    if (mode === "meaning") {
      if (side === 1) return setSide(3)       // word → meaning
      return goToNextWord()                  // meaning → next word
    }

    if (mode === "reading") {
      if (side === 1) return setSide(2)       // word → reading
      return goToNextWord()                  // reading → next word
    }

    // BOTH (3 steps)
    if (side === 1) return setSide(2)         // word → reading
    if (side === 2) return setSide(3)         // reading → meaning
    return goToNextWord()                     // meaning → next word
  }

  // ----------------------------------------------------
  // PREVIOUS STEP (reverse flip)
  // ----------------------------------------------------
  function prevCard() {
    if (mode === "meaning") {
      if (side === 3) return setSide(1)      // meaning → word
      return goToPrevWord(3)                // word → previous card meaning
    }

    if (mode === "reading") {
      if (side === 2) return setSide(1)      // reading → word
      return goToPrevWord(2)                // word → previous reading
    }

    // BOTH
    if (side === 3) return setSide(2)        // meaning → reading
    if (side === 2) return setSide(1)        // reading → word
    return goToPrevWord(3)                  // from word → previous meaning
  }

  // ----------------------------------------------------
  // TAP to flip
  // ----------------------------------------------------
  function flip() {
    if (firstTouch) setFirstTouch(false)
    nextCard()
  }

  // ----------------------------------------------------
  // Keyboard navigation
  // ----------------------------------------------------
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") nextCard()
      if (e.key === "ArrowLeft") prevCard()
      if (e.key === " ") flip()
    }

    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [filteredCards, index, side, mode])

  // ----------------------------------------------------
  // Empty States
  // ----------------------------------------------------
  if (cards.length === 0) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-lg">No vocabulary yet.</p>
        <button
          onClick={() => router.push('/books')}
          className="px-4 py-2 bg-amber-500 text-white rounded"
        >
          ← Back to Books
        </button>
      </main>
    )
  }

  if (filteredCards.length === 0) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-lg">No cards match this JLPT filter.</p>
        <button
          onClick={() => router.push('/books')}
          className="px-4 py-2 bg-amber-500 text-white rounded"
        >
          ← Back to Books
        </button>
      </main>
    )
  }

  const card = filteredCards[index]

  function DisplayCard() {
    if (side === 1) return <span className="font-bold">{card.word}</span>
    if (side === 2) return <span className="text-3xl sm:text-4xl">{card.reading}</span>
    return <span className="text-2xl sm:text-3xl">{card.meaning}</span>
  }

  // ----------------------------------------------------
  // UI
  // ----------------------------------------------------
  return (
    <main className="min-h-screen flex flex-col items-center p-6">

      {/* Header */}
      <div className="flex flex-col items-center mb-4">
        {bookCover && (
          <img
            src={bookCover}
            alt={`${bookTitle} cover`}
            className="w-20 h-28 object-cover rounded shadow mb-2"
          />
        )}

        <h1 className="text-xl font-semibold">
          {bookTitle ? `${bookTitle} Flashcards` : "Flashcards"}
        </h1>

        <p className="text-sm text-gray-500">
          Step {side} • Card {index + 1} / {filteredCards.length}
        </p>
      </div>

      {/* Mode Buttons */}
      <div className="flex gap-2 mb-4 flex-wrap justify-center">

        <button
          onClick={() => { setMode("meaning"); setSide(1) }}
          className={`px-3 py-1 rounded ${mode === "meaning" ? "bg-green-600 text-white" : "bg-gray-200"}`}
        >
          Meanings Only
        </button>

        <button
          onClick={() => { setMode("reading"); setSide(1) }}
          className={`px-3 py-1 rounded ${mode === "reading" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          Readings Only
        </button>

        <button
          onClick={() => { setMode("both"); setSide(1) }}
          className={`px-3 py-1 rounded ${mode === "both" ? "bg-amber-500 text-white" : "bg-gray-200"}`}
        >
          Study Both
        </button>

        {/* JLPT filter */}
        <select
          value={jlptFilter}
          onChange={(e) => { setJlptFilter(e.target.value); setIndex(0); setSide(1); }}
          className="mt-2 px-2 py-1 border rounded text-sm bg-white"
        >
          <option value="all">JLPT: All</option>
          <option value="n5">N5</option>
          <option value="n4">N4</option>
          <option value="n3">N3</option>
          <option value="n2">N2</option>
          <option value="n1">N1</option>
          <option value="nonjlpt">Non-JLPT</option>
        </select>

      </div>

      {/* First-touch hint */}
      {firstTouch && (
        <p className="mb-3 text-sm text-gray-500">
          Tap or press space to study →
        </p>
      )}

      {/* Flashcard */}
      <div
        onClick={flip}
        className="
          w-[90vw] max-w-xl
          h-72 sm:h-80
          bg-white rounded-2xl shadow-xl
          flex items-center justify-center
          cursor-pointer select-none text-center
          p-6 text-3xl sm:text-4xl border
          transition-transform duration-200 hover:scale-[1.02]
        "
      >
        <DisplayCard />
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-10 mt-6">
        <button
          onClick={prevCard}
          className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
        >
          ← Review
        </button>

        <button
          onClick={nextCard}
          className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
        >
          Answer →
        </button>
      </div>
    </main>
  )
}
