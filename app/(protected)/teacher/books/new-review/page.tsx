"use client";
import Link from "next/link";
import CatalogReviewQueue from "@/components/books/CatalogReviewQueue";
export default function NewBooksReviewPage(){
  return <main className="mx-auto max-w-5xl p-6"><Link href="/teacher/admin">← Admin Hub</Link><CatalogReviewQueue /></main>;
}
