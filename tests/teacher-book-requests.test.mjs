import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const libraryPage = fs.readFileSync(
  'app/(protected)/users/[username]/books/page.tsx',
  'utf8'
);
const requestsPage = fs.readFileSync(
  'app/(protected)/teacher/books/requests/page.tsx',
  'utf8'
);

test('dedicated book requests page owns the Add to Library action and refreshes handled requests', () => {
  const approveRequestCall = /supabase\.rpc\("approve_book_request",\s*\{\s*request_id_input: requestId,?\s*\}\)/;

  assert.doesNotMatch(libraryPage, approveRequestCall);
  assert.match(requestsPage, approveRequestCall);
  assert.match(requestsPage, /await loadRequests\(\{ preserveMessage: true \}\)/);
  assert.match(requestsPage, /setMessage\("Book added to library!"\)/);
  assert.match(requestsPage, /Could not add the requested book to the library/);
  assert.match(requestsPage, /onClick=\{\(\) => void addRequestToLibrary\(request\.id\)\}/);
  assert.match(requestsPage, /addingRequestId === request\.id \? "Adding\.\.\." : "Add to Library"/);
  assert.match(requestsPage, /Open Catalog Editor/);
  assert.match(requestsPage, /Reject Request/);
});
