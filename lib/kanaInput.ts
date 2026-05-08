const ROMAJI_TO_HIRAGANA = [
  ["kyo", "きょ"],
  ["kyu", "きゅ"],
  ["kya", "きゃ"],
  ["gyo", "ぎょ"],
  ["gyu", "ぎゅ"],
  ["gya", "ぎゃ"],
  ["sho", "しょ"],
  ["shu", "しゅ"],
  ["sha", "しゃ"],
  ["syo", "しょ"],
  ["syu", "しゅ"],
  ["sya", "しゃ"],
  ["jo", "じょ"],
  ["ju", "じゅ"],
  ["ja", "じゃ"],
  ["jyo", "じょ"],
  ["jyu", "じゅ"],
  ["jya", "じゃ"],
  ["cho", "ちょ"],
  ["chu", "ちゅ"],
  ["cha", "ちゃ"],
  ["tyo", "ちょ"],
  ["tyu", "ちゅ"],
  ["tya", "ちゃ"],
  ["nyo", "にょ"],
  ["nyu", "にゅ"],
  ["nya", "にゃ"],
  ["hyo", "ひょ"],
  ["hyu", "ひゅ"],
  ["hya", "ひゃ"],
  ["byo", "びょ"],
  ["byu", "びゅ"],
  ["bya", "びゃ"],
  ["pyo", "ぴょ"],
  ["pyu", "ぴゅ"],
  ["pya", "ぴゃ"],
  ["myo", "みょ"],
  ["myu", "みゅ"],
  ["mya", "みゃ"],
  ["ryo", "りょ"],
  ["ryu", "りゅ"],
  ["rya", "りゃ"],
  ["fyu", "ふゅ"],
  ["fa", "ふぁ"],
  ["fi", "ふぃ"],
  ["fe", "ふぇ"],
  ["fo", "ふぉ"],
  ["tsa", "つぁ"],
  ["tsi", "つぃ"],
  ["tse", "つぇ"],
  ["tso", "つぉ"],
  ["che", "ちぇ"],
  ["she", "しぇ"],
  ["je", "じぇ"],
  ["thi", "てぃ"],
  ["dhi", "でぃ"],
  ["wi", "うぃ"],
  ["we", "うぇ"],
  ["wo", "を"],
  ["shi", "し"],
  ["chi", "ち"],
  ["tsu", "つ"],
  ["fu", "ふ"],
  ["ji", "じ"],
  ["di", "ぢ"],
  ["du", "づ"],
  ["ka", "か"],
  ["ki", "き"],
  ["ku", "く"],
  ["ke", "け"],
  ["ko", "こ"],
  ["ga", "が"],
  ["gi", "ぎ"],
  ["gu", "ぐ"],
  ["ge", "げ"],
  ["go", "ご"],
  ["sa", "さ"],
  ["si", "し"],
  ["su", "す"],
  ["se", "せ"],
  ["so", "そ"],
  ["za", "ざ"],
  ["zi", "じ"],
  ["zu", "ず"],
  ["ze", "ぜ"],
  ["zo", "ぞ"],
  ["ta", "た"],
  ["ti", "ち"],
  ["tu", "つ"],
  ["te", "て"],
  ["to", "と"],
  ["da", "だ"],
  ["de", "で"],
  ["do", "ど"],
  ["na", "な"],
  ["ni", "に"],
  ["nu", "ぬ"],
  ["ne", "ね"],
  ["no", "の"],
  ["ha", "は"],
  ["hi", "ひ"],
  ["he", "へ"],
  ["ho", "ほ"],
  ["ba", "ば"],
  ["bi", "び"],
  ["bu", "ぶ"],
  ["be", "べ"],
  ["bo", "ぼ"],
  ["pa", "ぱ"],
  ["pi", "ぴ"],
  ["pu", "ぷ"],
  ["pe", "ぺ"],
  ["po", "ぽ"],
  ["ma", "ま"],
  ["mi", "み"],
  ["mu", "む"],
  ["me", "め"],
  ["mo", "も"],
  ["ya", "や"],
  ["yu", "ゆ"],
  ["yo", "よ"],
  ["ra", "ら"],
  ["ri", "り"],
  ["ru", "る"],
  ["re", "れ"],
  ["ro", "ろ"],
  ["wa", "わ"],
  ["a", "あ"],
  ["i", "い"],
  ["u", "う"],
  ["e", "え"],
  ["o", "お"],
] as const;

function kataToHira(value: string) {
  return (value ?? "").replace(/[ァ-ヶ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

function normalizeRomaji(value: string) {
  return value
    .replace(/[ōŌ]/g, "ou")
    .replace(/[ūŪ]/g, "uu")
    .replace(/[āĀ]/g, "aa")
    .replace(/[īĪ]/g, "ii")
    .replace(/[ēĒ]/g, "ee")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z']/g, "");
}

function romajiToHiragana(value: string) {
  let input = normalizeRomaji(value);
  let output = "";

  while (input.length > 0) {
    if (input[0] === "'") {
      input = input.slice(1);
      continue;
    }

    if (
      input.length >= 2 &&
      input[0] === input[1] &&
      !"aeioun".includes(input[0])
    ) {
      output += "っ";
      input = input.slice(1);
      continue;
    }

    if (input[0] === "n") {
      const next = input[1] ?? "";
      if (!next || next === "'" || !"aeiouy".includes(next)) {
        output += "ん";
        input = input.slice(next === "'" ? 2 : 1);
        continue;
      }
    }

    const match = ROMAJI_TO_HIRAGANA.find(([romaji]) => input.startsWith(romaji));
    if (match) {
      output += match[1];
      input = input.slice(match[0].length);
      continue;
    }

    output += input[0];
    input = input.slice(1);
  }

  return output;
}

export function normalizeKanaReading(value: string) {
  const cleaned = (value ?? "").trim();
  const kanaSource = /[a-zA-ZāīūēōĀĪŪĒŌ]/.test(cleaned)
    ? romajiToHiragana(cleaned)
    : kataToHira(cleaned);

  return kataToHira(kanaSource)
    .trim()
    .replace(/\s+/g, "")
    .replace(/[・･]/g, "")
    .replace(/ー/g, "")
    .toLowerCase();
}
