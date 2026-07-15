# Live Lesson Add Word — Future Features

## Optional Follow-Along split view

Later, Live Lesson Add Word may offer an optional **Open with Follow-Along** mode.

The idea is to let a teacher use Follow-Along on one side and Live Lesson Capture on the other side:

```text
┌───────────────────────────┬───────────────────────────┐
│                           │                           │
│      MY FOLLOW-ALONG      │     LIVE LESSON CAPTURE   │
│                           │                           │
│  Page 87                  │  Chapter 4                │
│  vocabulary / support     │  Current page: 87         │
│  notes / teacher extras   │                           │
│                           │  [ word___________ ] Add  │
│                           │                           │
└───────────────────────────┴───────────────────────────┘
```

The teacher should eventually be able to choose between:

* Live Lesson Capture only
* Follow-Along only
* Side-by-side split view

## Architectural boundary

Do not tightly merge Follow-Along and Live Lesson Add Word prematurely.

They should remain distinct capabilities underneath so MEKURU can preserve permissions, data ownership, teacher-only enhancements, and future simplification safely.

## Future page coordination

The page number shown in Follow-Along and Live Lesson Capture may eventually be coordinated, but automatic syncing is not automatically correct.

Potential future options:

* manual independent page state
* optional sync
* sync confirmation
* one-direction sync

Automatic syncing could accidentally save words to the wrong page if one side changes unexpectedly, so this should remain a future design decision rather than a v1 implementation requirement.

## Product principle

The teacher is a reader who teaches, not a separate teacher identity disconnected from reading.

The split-view idea supports that by letting the teacher follow the book and capture vocabulary in one connected working environment.

Do not build this split-view feature in Phase 1.
