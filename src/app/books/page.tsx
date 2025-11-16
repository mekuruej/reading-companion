'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Book = {
  id: string
  title: string
  author: string | null
  translator: string | null
  illustrator: string | null
  cover_url: string | null
  started_at: string | null
  finished_at: string | null
}

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [translator, setTranslator] = useState('')
  const [illustrator, setIllustrator] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [finishingBookId, setFinishingBookId] = useState<string | null>(null)
  const [finishDate, setFinishDate] = useState('')

  useEffect(() => {
    fetchBooks()
  }, [])

  async function fetchBooks() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) console.error('Error fetching books:', error)
    else setBooks(data)
  }

  async function addBook(e: React.FormEvent) {
    e.preventDefault()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert('Please sign in first!')

    const { error } = await supabase.from('books').insert([
      {
        title,
        author,
        translator,
        illustrator,
        cover_url: coverUrl,
        user_id: user.id,
        started_at: null,
        finished_at: null,
      },
    ])

    if (error) console.error('Error adding book:', error)
    else {
      setTitle('')
      setAuthor('')
      setTranslator('')
      setIllustrator('')
      setCoverUrl('')
      fetchBooks()
    }
  }

  async function saveFinishedDate(bookId: string) {
    if (!finishDate) return

    const { error } = await supabase
      .from('books')
      .update({ finished_at: finishDate })
      .eq('id', bookId)

    if (error) console.error('Error saving finished date:', error)
    else {
      setFinishingBookId(null)
      fetchBooks()
    }
  }

  return (
    <main
      className="min-h-screen p-8"
      style={{
        backgroundImage: `
          repeating-linear-gradient(
            to bottom,
            #f9f6ef 0px,
            #f9f6ef 180px,
            #d1b58f 181px,
            #d1b58f 183px
          ),
          linear-gradient(to right, #f8f3e8 0%, #f3ede2 100%)
        `,
        backgroundSize: '100% 183px',
      }}
    >
      <h1 className="text-2xl font-semibold mb-4">📚 My Books</h1>

      {/* Add Book Form */}
      <form onSubmit={addBook} className="flex flex-col gap-3 mb-6">
        <input
          type="text"
          placeholder="Book title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <input
          type="text"
          placeholder="Author (optional)"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Translator (optional)"
          value={translator}
          onChange={(e) => setTranslator(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Illustrator (optional)"
          value={illustrator}
          onChange={(e) => setIllustrator(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Cover image URL (optional)"
          value={coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
          className="border p-2 rounded"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add
        </button>
      </form>

      {/* Book Grid */}
      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {books.map((book) => (
          <li
            key={book.id}
            className="flex flex-col items-center p-2 rounded-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-200/40"
          >
            {book.cover_url ? (
              <img
                src={book.cover_url}
                alt={`${book.title} cover`}
                className="w-28 h-40 object-cover rounded-md shadow-md"
              />
            ) : (
              <div className="w-28 h-40 bg-gray-200 rounded-md mb-2 flex items-center justify-center text-gray-400 text-sm">
                No cover
              </div>
            )}

            <span className="text-center font-medium text-sm">{book.title}</span>
            {book.author && (
              <span className="text-gray-600 text-xs">著：{book.author}</span>
            )}
            {book.translator && (
              <span className="text-gray-500 text-xs">訳：{book.translator}</span>
            )}
            {book.illustrator && (
              <span className="text-gray-500 text-xs">絵：{book.illustrator}</span>
            )}

            {/* Dates */}
            <div className="mt-1 text-[11px] text-gray-500 text-center">
              {book.started_at && (
                <div>Started: {new Date(book.started_at).toLocaleDateString()}</div>
              )}

              {book.finished_at ? (
                <div>Finished: {new Date(book.finished_at).toLocaleDateString()}</div>
              ) : (
                <>
                  {finishingBookId === book.id ? (
                    <div className="mt-1 flex flex-col gap-1 text-[11px]">
                      <input
                        type="date"
                        value={finishDate}
                        onChange={(e) => setFinishDate(e.target.value)}
                        className="border p-1 rounded text-xs"
                      />

                      <div className="flex gap-2">
                        <button
                          onClick={() => saveFinishedDate(book.id)}
                          className="text-blue-600 underline hover:text-blue-800"
                        >
                          Save
                        </button>

                        <button
                          onClick={() => setFinishingBookId(null)}
                          className="text-gray-500 underline hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    book.started_at && (
                      <button
                        onClick={() => {
                          setFinishingBookId(book.id)
                          setFinishDate(new Date().toISOString().split('T')[0])
                        }}
                        className="mt-1 text-[11px] text-blue-600 underline hover:text-blue-800"
                      >
                        Mark as Finished
                      </button>
                    )
                  )}
                </>
              )}
            </div>

            {/* ⭐ NEW FLASHCARDS BUTTON ⭐ */}
            <a
              href={`/flashcards/book/${book.id}`}
              className="mt-2 text-[12px] px-3 py-1 bg-amber-500 text-white rounded hover:bg-amber-600 transition"
            >
              Study Flashcards
            </a>
            <a
              href={`/vocab?bookId=${book.id}`}
              className="mt-1 text-[12px] px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            >
              Add Vocab
</a>
          </li>
        ))}
      </ul>
    </main>
  )
}
