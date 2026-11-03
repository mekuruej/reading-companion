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
        return { displayBookTitle: (book) => book.title };
      if (name === "../libraryRelationship") return {};
      return require(name);
    },
    mod,
    mod.exports,
  );
  return mod.exports;
}

test("My Library uses the branded cover only for books awaiting review", () => {
  const Card = load(
    "app/(protected)/users/[username]/books/components/LibraryBookCard.tsx",
  ).default;
  const render = (needsReview, coverUrl = null) =>
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
            needs_review: needsReview,
          },
        },
        href: "/books/book-1",
        formatRelativeDate: () => "",
      }),
    );
  const pending = render(true);
  assert.match(pending, /Your book is ready/);
  assert.match(pending, /Book details being updated/);
  assert.match(pending, /p-2 pb-3/);
  assert.match(pending, /h-48 w-32/);
  assert.match(render(false), /No cover/);
  assert.doesNotMatch(render(false), /Your book is ready/);
  assert.match(render(true, "/cover.jpg"), /src="\/cover.jpg"/);
});

test("Book Hub selects and passes the review flag to the pending-cover treatment", () => {
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
  assert.match(page, /cover_url,\s*needs_review,/);
  assert.match(page, /isPendingReview=\{book\.needs_review === true\}/);
  assert.match(hero, /w-\[140px\] shrink-0 md:w-\[150px\]/);
  assert.match(hero, /PendingBookCover className="rounded-2xl"/);
  assert.match(hero, /isPendingReview \? \(/);
  assert.match(hero, /No cover/);
});
