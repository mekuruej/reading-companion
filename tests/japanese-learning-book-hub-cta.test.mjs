import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const filename = 'lib/access/japaneseLearningBookHubCta.ts';
const source = fs.readFileSync(filename, 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exports = {};
new Function('exports', code)(exports);
const { getJapaneseLearningBookHubCta } = exports;
const bookHub = fs.readFileSync('app/(protected)/books/[userBookId]/page.tsx', 'utf8');
const grid = fs.readFileSync('app/(protected)/books/[userBookId]/components/BookHubActionGrid.tsx', 'utf8');
const promo = fs.readFileSync('components/japanese-learning/JapaneseLearningPromoCard.tsx', 'utf8');

test('Book Hub CTA destination and label follow access, subscription eligibility, or approval state', () => {
  assert.deepEqual(getJapaneseLearningBookHubCta({ hasAccess: true, canSubscribe: false, requiresApproval: true }), {
    label: 'Open Japanese Learning', href: '/library-study',
  });
  assert.deepEqual(getJapaneseLearningBookHubCta({ hasAccess: false, canSubscribe: true, requiresApproval: false }), {
    label: 'Get Japanese Learning access', href: '/reading-access',
  });
  assert.deepEqual(getJapaneseLearningBookHubCta({ hasAccess: false, canSubscribe: false, requiresApproval: false }), {
    label: 'Request Japanese Learning access', href: '/japanese-learning?source=book_hub',
  });
  assert.deepEqual(getJapaneseLearningBookHubCta({ hasAccess: false, canSubscribe: null, requiresApproval: false }), {
    label: 'Get Japanese Learning access', href: '/reading-access',
  });
  assert.deepEqual(getJapaneseLearningBookHubCta({ hasAccess: false, canSubscribe: true, requiresApproval: true }), {
    label: 'Request Japanese Learning access', href: '/japanese-learning?source=book_hub',
  });
});

test('Book Hub reuses billing eligibility and existing Japanese Learning entitlement state', () => {
  assert.match(bookHub, /fetch\("\/api\/billing\/status"/);
  assert.match(bookHub, /billingStatus\.canSubscribe === true \|\| billingStatus\.reason === "eligible"/);
  assert.match(bookHub, /fetch\("\/api\/japanese-learning\/request"/);
  assert.match(bookHub, /status === "pending" \|\| status === "approved"/);
  assert.match(bookHub, /hasAccess: canUseJapaneseLearningActions/);
  assert.match(bookHub, /onJapaneseLearningCtaClick=\{\(event\) => \{\s*if \(!confirmLeaveIfTimerActive\(\)\) event\.preventDefault\(\);/);
  assert.match(grid, /japaneseLearningCta\.label/);
  assert.match(grid, /href=\{japaneseLearningCta\.href\}/);
});

test('Promo card destination is overridable for Book Hub while other uses retain their existing default', () => {
  assert.match(promo, /const destination = href \?\? `\/japanese-learning\?source=\$\{source\}`/);
  assert.match(promo, /href=\{destination\}/);
});
