import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

// 🔧 Load environment variables
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 🔧 Create Supabase client
const client = createClient(url, key);

async function repairStrokes() {
  console.log('🔍 Checking for broken stroke data...');

  // 1. Fetch all vocab rows
  const { data: rows, error } = await client
    .from('vocab')
    .select('id, word, strokes');

  if (error) {
    console.error('❌ Error fetching rows:', error);
    return;
  }

  let fixedCount = 0;

  for (const row of rows!) {
    const { id, strokes, word } = row;

    // Skip if strokes are already an array of objects
    try {
      const parsed =
        typeof strokes === 'string' ? JSON.parse(strokes) : strokes;

      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].char) {
        continue; // already correct
      }
    } catch {
      // continue to fix
    }

    // ───────────────────────────────
    // 🛠 FIX: Convert old stroke format
    // e.g. "students: 12" → [{char:'学', strokes:12}, ...]
    // ───────────────────────────────

    const KANJI_REGEX = /[\u3400-\u9FFF]/g;
    const kanjiList = word.match(KANJI_REGEX) || [];

    if (kanjiList.length === 0) continue;

    const repaired = kanjiList.map((ch: string) => ({
      char: ch,
      strokes: null, // unknown → leave null
    }));

    // Save fixed strokes
    const { error: updateErr } = await client
      .from('vocab')
      .update({ strokes: JSON.stringify(repaired) })
      .eq('id', id);

    if (updateErr) {
      console.error(`❌ Failed to update ${word}:`, updateErr);
    } else {
      console.log(`🔧 Fixed stroke data for: ${word}`);
      fixedCount++;
    }
  }

  console.log(`\n✅ Repair complete! Fixed ${fixedCount} entries.`);
}

// Run script
repairStrokes();
