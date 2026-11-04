import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = process.cwd();
const require = createRequire(import.meta.url);
function load(file) {
  const sourcePath = path.resolve(root, file);
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(sourcePath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  new Function("require", "module", "exports", code)(
    (name) => {
      if (name === "@/components/books/PendingBookCover")
        return load("components/books/PendingBookCover.tsx");
      if (name === "@/lib/books/bookIdentity")
        return {
          displayBookTitle: (book) => book.title,
          getBookIdentity: (book) => ({ title: book.title, titleReading: null, author: null, authorReading: null }),
        };
      if (name === "@/components/books/BookEditionLine") return () => null;
      if (name === "../libraryRelationship") return {};
      return require(name);
    },
    mod,
    mod.exports,
  );
  return mod.exports;
}

test("My Library shows the branded cover only for pending, uncovered reader-created books", () => {
  const page = fs.readFileSync(
    path.join(root, "app/(protected)/users/[username]/books/page.tsx"),
    "utf8",
  );
  assert.match(page, /reader_created,\s*catalog_reviewed_at,/);
  assert.doesNotMatch(page, /cover_url,\s*needs_review,/);

  const Card = load(
    "app/(protected)/users/[username]/books/components/LibraryBookCard.tsx",
  ).default;
  const render = (readerCreated, reviewedAt, coverUrl = null) =>
    renderToStaticMarkup(
      React.createElement(Card, {
        row: {
          id: "book-1",
          started_at: null,
          finished_at: null,
          dnf_at: null,
          books: {
            title: "New book",
            cover_url: coverUrl,
            reader_created: readerCreated,
            catalog_reviewed_at: reviewedAt,
          },
        },
        href: "/books/book-1",
        formatRelativeDate: () => "",
      }),
    );
  const pending = render(true, null);
  assert.match(pending, /Your book is ready/);
  assert.match(pending, /Book details being updated/);
  assert.match(pending, /p-2 pb-3/);
  assert.match(pending, /h-48 w-32/);
  for (const established of [render(true, "2026-10-30T00:00:00Z"), render(false, null)]) {
    assert.match(established, /No cover/);
    assert.doesNotMatch(established, /Your book is ready/);
  }
  assert.match(render(true, null, "/cover.jpg"), /src="\/cover.jpg"/);
});

test("Book Hub uses the production review fields and preserves cover fallbacks", () => {
  const page = fs.readFileSync(
    path.join(root, "app/(protected)/books/[userBookId]/page.tsx"),
    "utf8",
  );
  const hero = fs.readFileSync(
    path.join(
      root,
      "app/(protected)/books/[userBookId]/components/BookHubHero.tsx",
    ),
    "utf8",
  );
  assert.match(page, /cover_url,\s*reader_created,\s*catalog_reviewed_at,/);
  assert.match(page, /isPendingReview=\{book\.reader_created === true && book\.catalog_reviewed_at === null\}/);
  assert.doesNotMatch(page, /cover_url,\s*needs_review,/);
  assert.match(hero, /w-\[140px\] shrink-0 md:w-\[150px\]/);
  assert.match(hero, /PendingBookCover className="rounded-2xl"/);
  assert.match(hero, /isPendingReview \? \(/);
  assert.match(hero, /No cover/);

  const Hero = load("app/(protected)/books/[userBookId]/components/BookHubHero.tsx").default;
  const render = (readerCreated, reviewedAt, coverUrl = null) => {
    const isPendingReview = readerCreated === true && reviewedAt === null;
    return renderToStaticMarkup(React.createElement(Hero, {
      book: { title: "Book", author: null, title_reading: null, author_reading: null, cover_url: coverUrl },
      displayedCoverUrl: coverUrl,
      isPendingReview,
      bookHubContextLabel: "Reading",
      isViewingStudentBookHub: false,
    }));
  };
  assert.match(render(true, null), /Your book is ready/);
  for (const established of [render(true, "2026-10-30T00:00:00Z"), render(false, null)]) {
    assert.match(established, /No cover/);
    assert.doesNotMatch(established, /Your book is ready/);
  }
  assert.match(render(true, null, "/cover.jpg"), /src="\/cover.jpg"/);
});
