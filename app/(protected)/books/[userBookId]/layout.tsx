"use client";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { BookProgressProvider } from "@/components/books/BookProgressProvider";
export default function BookLayout({ children }: { children: ReactNode }) {
  const { userBookId } = useParams<{ userBookId: string }>();
  return <BookProgressProvider key={userBookId} userBookId={userBookId}>{children}</BookProgressProvider>;
}
