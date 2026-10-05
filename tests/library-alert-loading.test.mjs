import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const file = 'app/(protected)/users/[username]/books/page.tsx';
const source = fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('Library no longer queries or manages pending book requests', () => {
  assert.doesNotMatch(source, /\.from\(["']book_requests["']\)/);
  assert.doesNotMatch(source, /loadPendingBookRequests|handleApproveRequest|handleRejectBookRequest/);
  assert.doesNotMatch(source, /PendingBookRequestsAlert|pendingBookRequestsSignature|pendingBookRequestsAlertHidden/);
  assert.match(source, /const \[viewingUserId, setViewingUserId\]/);
});
