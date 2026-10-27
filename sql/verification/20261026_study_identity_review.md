# Study identity view validation — 2026-10-26 (JST)

## Outcome
The two-view correction is logically consistent with the existing effective-identity contract. The migration remains unchanged: COALESCE(stored pinned identity, existing library_study_identity_key(surface, reading)). No indexes, schema/data repairs, eligibility changes, grants or policy changes were added. No Production/staging database was contacted or modified.

Not yet cleared for unconditional Production application: installed definitions, ACLs and security options remain unverified. In addition, the unchanged readiness consumer accepts null reading/meaning fields as usable; decide how to address this separately before relying on reminder readiness.

Branch release/2026-10-study-identity-views; worktree /private/tmp/mekuru-study-identity-views-8608a4a; HEAD/base 8608a4a94a08eef8a2c8326d8f203d558f3e841c. Uncommitted.

## Integration
The new migration-chain test uses disposable PGlite PostgreSQL and synthetic base tables with:
- Actual summary table/identity function migration (only pgcrypto extension installation omitted; built-in gen_random_uuid is available).
- Actual finalized predicate and reader view from 20261012, including SECURITY DEFINER function access to Live Lesson linkage.
- Entire actual 20261013 spelling-promotion migration: identity-preservation trigger, summary refresh functions/triggers, teacher form synchronization, session/link refresh triggers.
- Entire actual 20261014 personal visibility migration: table, RLS, RPC, views and grants.
- The forward migration and exact rollback.

Tests verify ordinary inserted null keys, fallback legacy cases (original fixture), real spelling promotion pinning and hidden pinned identity projection, duplicate occurrences/meanings, hidden-only versus mixed visibility, unfinished Live Lesson removal and completion restoring summaries, two-owner RLS isolation, anonymous denial, unchanged view owner/ACL/security options, and rollback. No production data fixtures.

The actual Advanced Study query projection/order/limit runs against generated summaries and feeds the unchanged real readiness and color helpers. This exposes a pre-existing consumer limitation: hasUsableText returns true for non-string values, including null. A synthetic incomplete word with null summary reading/meaning contributes to eligibleWordCount (3 rather than the 2 complete identities). The view correction does not add or alter that predicate. Blank surface yields no ordinary summary through the actual refresh function. This corrects the earlier review's overly broad assumption that unusable summary fields are always rejected downstream.

This is not a full Supabase installation replay: the repository lacks one complete foundational schema migration; base tables, base ownership RLS and auth.uid are fixture definitions. Some earlier migrations are superseded by the real 20261013 definitions. Actual Supabase auth.uid, every deployed policy, PostgREST caching and browser interaction remain unverified.

## Tests
New original fixture tests: 5 pass. New real migration-chain test: 1 pass. New scaled-plan test: 1 pass.
Existing readiness/personal visibility/Live Lesson/sense tests: 29 pass, 1 fail. Total including performance: 36 pass, 1 known failure, no skips.
The unrelated failure reproduces on untouched 8608a4a: tests/study-sense-independence.test.mjs:82, undefined colorStatus at line 87. Application/test files involved in that failure are unchanged. It was not fixed.
No TypeScript or app build was needed for this SQL/test-only follow-up.

## Performance
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON), median of three warm executions, PGlite/WASM. Synthetic Japanese-reading identities, one owner, 5% personally hidden. Counts aggregate all available summaries; consumer query orders last_seen_at/key with LIMIT 1001. Sizes are saved occurrences, all distinct before hiding.

| Occurrences | Prior available ms / matches | Corrected available ms / matches | Corrected hidden ms / identities | Corrected consumer ms |
|---|---|---|---|---|
| 200 | 0.378 / 0 | 1.291 / 190 | 0.802 / 10 | 1.243 |
| 2,000 | 2.476 / 0 | 9.277 / 1,900 | 6.697 / 100 | 10.203 |
| 10,000 | 11.926 / 0 | 46.034 / 9,500 | 32.149 / 500 | 47.808 |
| 50,000 | 37.325 / 0 | 239.199 / 47,500 | 148.127 / 2,500 | 242.324 |

Old hidden view emits one null row on this fixture, rather than the correct hidden identities; that output is also not a meaningful equal-work comparison.

Equal-output all-pinned control, prior/corrected available ms: 200: 0.354/0.358; 2,000: 3.000/2.876; 10,000: 14.718/14.775; 50,000: 74.043/74.137. This shows negligible COALESCE overhead when no fallback is required.

Independent scan versus identity-expression aggregate: 10,000: 3.478 versus 20.445 ms; 50,000: 17.541 versus 103.343 ms. Normalization (regex/kana translation) is a substantial cost. These are diagnostic controls, not additive causal percentages: join planning and expression evaluation differ between queries. Corrected matching also hashes/joins thousands of legitimate results that the old null-key comparison discarded. Exact fractions of the total slowdown cannot be assigned from these controls.

At 10,000, corrected availability uses a hash right semi join, scans 10,000 words and 10,000 summaries, and returns 9,500 matches; hidden uses a merge anti join with sorted visible identities. No per-summary repeated full-library scan appears in retained plans. BUFFERS is supported (e.g. available plan 173 shared-hit blocks, hidden 158 in this run), but fixture/WASM cache metrics are not Production IO forecasts.

The existing-style derived-expression index and summary unique index are present; the planner selects sequential scans for these high-selectivity whole-owner queries. The COALESCE expression is not the same indexed expression. This does not demonstrate that a new index is needed. Cross-owner cardinality, the real finalization predicate, cold disk IO, production RLS complexity and native PostgreSQL latency are not benchmarked by the reduced performance fixture.

A narrow OR alternative (stored match OR null-key derived match) was tested only at 200 rows: ~37.937 ms versus ~1.291 ms for COALESCE; it lost the efficient equality-join shape. It was rejected and not applied. Larger OR runs are intentionally excluded. No optimization or speculative index was retained. A future effective-identity expression index would consume per-word storage and add identity-expression/index maintenance on writes; do not add it without realistic installed plans demonstrating benefit.

## Production verification / rollback
The demo-count script now begins with read-only metadata inspection: installed view definitions, owners, ACLs, reloptions, identity/finalization function definitions, security attributes and function grants. All transactions have a 5-second statement timeout. Review snapshots before any separately approved change. If installed definitions differ from this baseline, stop and regenerate/review migration and rollback against those actual definitions.

The six demo queries use explicit transaction-local owner JWT contexts and roll back. They output labels/counts only. Occurrences, derived identities, effective identities, available summary rows/identities and personally-hidden rows/non-null identities are separate metrics; none is a due-card or entitlement count. Run in authorized admin SQL only; never expose owner impersonation to application clients. No queries have been executed on Production here. Browser metadata access timed out; no bypass or credential extraction was attempted.

Rollback passes against actual relevant local migration definitions and preserves owner, grants and security options. It restores the old faulty availability semantics without touching vocabulary or progress. It is reliable ONLY if the saved installed pre-change definitions match the reviewed baseline; never use it blindly over unknown Production drift.

Before Production approval: capture/compare installed metadata, inspect bounded owner-specific real plans, assess null-field readiness behavior separately, then obtain explicit authorization. Keep reminder implementation paused. Do not change Word Sky reference-only boundaries, claims, entitlements or scheduling.

## Files
1. sql/20261026_study_visibility_effective_identity.sql — unchanged from original candidate.
2. tests/study-visibility-effective-identity.test.mjs — unchanged from original candidate.
3. tests/study-visibility-migration-chain.test.mjs — new strengthened integration test.
4. tests/study-visibility-performance.test.mjs — new bounded scaled-plan/control test.
5. sql/verification/20261026_study_identity_demo_counts.sql — read-only metadata precheck and statement timeouts added.
6. sql/verification/20261026_study_identity_rollback.sql — live-drift safety prerequisite clarified; rollback SQL unchanged.
7. sql/verification/20261026_study_identity_review.md — updated evidence and limitations.

The Word Sky worktree remains clean at ff283d0306759e14dbeabeff917ef7ac98448089. No source modifications outside this isolated candidate, commits, deployments, live data writes, settings changes or backfills.

## Production application record (26 October 2026)

The owner manually applied exactly the approved migration. Post-change SQL Editor snapshot captured at 22:51:20 JST (13:51:20 UTC) was compared with the fresh 22:41:52 JST preflight. PostgreSQL canonical SELECT comparison matched both views against the forward migration. Available view remains 21 columns; hidden view remains study_identity_key text. Ownership, ACLs, options, all eight functions, indexes, policies and triggers are identical; only expected identity-function view dependencies were added. Actual installed demo availability: 35,8,9,99,0,0. Saved/null-key/summary aggregates unchanged. Owner-supplied base-table 21-column list matches view ordinals/names/types exactly.

Migration SHA-256: 4f588526431ba430cb3665ac12bb2bcde6e68e29c19bc36b36784a1dd7043934. Local file matches the reviewed SQL byte-for-byte. This commit records the already-applied database change; do not reapply it simply because a future application release contains the file. No application deployment is needed for bookkeeping. Production application remains 8608a4a. Integration into the canonical repository and future release ancestry is still required through the normal separately approved process; no merge/push is performed here.

Authenticated Production browsing was attempted again and browser control timed out. No authenticated application PASS is claimed. Manual read-only checks: sign in normally; open Advanced Study and inspect available vocabulary/readiness; open Ability Check without answering, revealing/grading, or Check Again Today; open an existing practice page without interaction that saves progress; open Word Sky without Green claims. Watch console/network errors, query failures and abnormal delays. Use existing hidden vocabulary to check it stays absent, without toggling preferences. Verify existing owner accounts see their own content, and existing authorized teacher/student paths retain context; do not impersonate unrelated users or change account settings. If a page auto-starts or any load behavior could write, stop rather than completing activity. This record does not establish runtime RLS or latency.

Readiness application correction is prepared separately; it is not part of the database-record commit. Remaining reminder blockers include complete owner-scoped reading/claim loading, identity union, sense-specific exact due scheduling and local daily-plan/seen state, entitlement checks, failure/unknown handling and the known null-field defect pending a reviewed application release. The old summary-based reminder due helper is not identical to current Ability Check: current scheduler hashes sense identities and includes pre-reading support cycles; daily plan katakana handling also differs. Do not use old helper counts as authoritative.
