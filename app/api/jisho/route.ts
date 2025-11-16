import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const keyword = searchParams.get('keyword')

  if (!keyword) {
    return NextResponse.json({ error: 'Missing keyword' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(keyword)}`
    )

    if (!res.ok) throw new Error(`Jisho returned ${res.status}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching from Jisho:', error)
    return NextResponse.json({ error: 'Failed to fetch from Jisho' }, { status: 500 })
  }
}
