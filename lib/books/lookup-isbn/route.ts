import { NextResponse } from "next/server";

import { lookupBookByIsbn13 } from "@/lib/books/bookLookup";
import { normalizeIsbn13 } from "@/lib/books/isbn";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawIsbn = searchParams.get("isbn") ?? "";

  const isbn13 = normalizeIsbn13(rawIsbn);

  if (!isbn13) {
    return NextResponse.json(
      {
        error: "Please enter a valid ISBN-13.",
      },
      { status: 400 }
    );
  }

  try {
    const book = await lookupBookByIsbn13(isbn13);

    if (!book) {
      return NextResponse.json(
        {
          error:
            "I couldn't find book information for that ISBN. You can request this book for review instead.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      book,
    });
  } catch (error) {
    console.error("Book ISBN lookup failed:", error);

    return NextResponse.json(
      {
        error:
          "Something went wrong while looking up this book. Please try again.",
      },
      { status: 500 }
    );
  }
}