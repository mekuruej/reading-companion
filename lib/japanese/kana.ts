export type KanaItem = {
  hiragana: string;
  katakana: string;
  romaji: string;
  row: string;
  vowel: string;
  order: number;
};

export const BASIC_KANA: KanaItem[] = [
  { hiragana: "あ", katakana: "ア", romaji: "a", row: "vowel", vowel: "a", order: 1 },
  { hiragana: "い", katakana: "イ", romaji: "i", row: "vowel", vowel: "i", order: 2 },
  { hiragana: "う", katakana: "ウ", romaji: "u", row: "vowel", vowel: "u", order: 3 },
  { hiragana: "え", katakana: "エ", romaji: "e", row: "vowel", vowel: "e", order: 4 },
  { hiragana: "お", katakana: "オ", romaji: "o", row: "vowel", vowel: "o", order: 5 },

  { hiragana: "か", katakana: "カ", romaji: "ka", row: "k", vowel: "a", order: 6 },
  { hiragana: "き", katakana: "キ", romaji: "ki", row: "k", vowel: "i", order: 7 },
  { hiragana: "く", katakana: "ク", romaji: "ku", row: "k", vowel: "u", order: 8 },
  { hiragana: "け", katakana: "ケ", romaji: "ke", row: "k", vowel: "e", order: 9 },
  { hiragana: "こ", katakana: "コ", romaji: "ko", row: "k", vowel: "o", order: 10 },

  { hiragana: "さ", katakana: "サ", romaji: "sa", row: "s", vowel: "a", order: 11 },
  { hiragana: "し", katakana: "シ", romaji: "shi", row: "s", vowel: "i", order: 12 },
  { hiragana: "す", katakana: "ス", romaji: "su", row: "s", vowel: "u", order: 13 },
  { hiragana: "せ", katakana: "セ", romaji: "se", row: "s", vowel: "e", order: 14 },
  { hiragana: "そ", katakana: "ソ", romaji: "so", row: "s", vowel: "o", order: 15 },

  { hiragana: "た", katakana: "タ", romaji: "ta", row: "t", vowel: "a", order: 16 },
  { hiragana: "ち", katakana: "チ", romaji: "chi", row: "t", vowel: "i", order: 17 },
  { hiragana: "つ", katakana: "ツ", romaji: "tsu", row: "t", vowel: "u", order: 18 },
  { hiragana: "て", katakana: "テ", romaji: "te", row: "t", vowel: "e", order: 19 },
  { hiragana: "と", katakana: "ト", romaji: "to", row: "t", vowel: "o", order: 20 },

  { hiragana: "な", katakana: "ナ", romaji: "na", row: "n", vowel: "a", order: 21 },
  { hiragana: "に", katakana: "ニ", romaji: "ni", row: "n", vowel: "i", order: 22 },
  { hiragana: "ぬ", katakana: "ヌ", romaji: "nu", row: "n", vowel: "u", order: 23 },
  { hiragana: "ね", katakana: "ネ", romaji: "ne", row: "n", vowel: "e", order: 24 },
  { hiragana: "の", katakana: "ノ", romaji: "no", row: "n", vowel: "o", order: 25 },

  { hiragana: "は", katakana: "ハ", romaji: "ha", row: "h", vowel: "a", order: 26 },
  { hiragana: "ひ", katakana: "ヒ", romaji: "hi", row: "h", vowel: "i", order: 27 },
  { hiragana: "ふ", katakana: "フ", romaji: "fu", row: "h", vowel: "u", order: 28 },
  { hiragana: "へ", katakana: "ヘ", romaji: "he", row: "h", vowel: "e", order: 29 },
  { hiragana: "ほ", katakana: "ホ", romaji: "ho", row: "h", vowel: "o", order: 30 },

  { hiragana: "ま", katakana: "マ", romaji: "ma", row: "m", vowel: "a", order: 31 },
  { hiragana: "み", katakana: "ミ", romaji: "mi", row: "m", vowel: "i", order: 32 },
  { hiragana: "む", katakana: "ム", romaji: "mu", row: "m", vowel: "u", order: 33 },
  { hiragana: "め", katakana: "メ", romaji: "me", row: "m", vowel: "e", order: 34 },
  { hiragana: "も", katakana: "モ", romaji: "mo", row: "m", vowel: "o", order: 35 },

  { hiragana: "や", katakana: "ヤ", romaji: "ya", row: "y", vowel: "a", order: 36 },
  { hiragana: "ゆ", katakana: "ユ", romaji: "yu", row: "y", vowel: "u", order: 37 },
  { hiragana: "よ", katakana: "ヨ", romaji: "yo", row: "y", vowel: "o", order: 38 },

  { hiragana: "ら", katakana: "ラ", romaji: "ra", row: "r", vowel: "a", order: 39 },
  { hiragana: "り", katakana: "リ", romaji: "ri", row: "r", vowel: "i", order: 40 },
  { hiragana: "る", katakana: "ル", romaji: "ru", row: "r", vowel: "u", order: 41 },
  { hiragana: "れ", katakana: "レ", romaji: "re", row: "r", vowel: "e", order: 42 },
  { hiragana: "ろ", katakana: "ロ", romaji: "ro", row: "r", vowel: "o", order: 43 },

  { hiragana: "わ", katakana: "ワ", romaji: "wa", row: "w", vowel: "a", order: 44 },
  { hiragana: "を", katakana: "ヲ", romaji: "wo", row: "w", vowel: "o", order: 45 },
  { hiragana: "ん", katakana: "ン", romaji: "n", row: "n-final", vowel: "n", order: 46 },
];

export const DAKUTEN_KANA: KanaItem[] = [
  { hiragana: "が", katakana: "ガ", romaji: "ga", row: "g", vowel: "a", order: 101 },
  { hiragana: "ぎ", katakana: "ギ", romaji: "gi", row: "g", vowel: "i", order: 102 },
  { hiragana: "ぐ", katakana: "グ", romaji: "gu", row: "g", vowel: "u", order: 103 },
  { hiragana: "げ", katakana: "ゲ", romaji: "ge", row: "g", vowel: "e", order: 104 },
  { hiragana: "ご", katakana: "ゴ", romaji: "go", row: "g", vowel: "o", order: 105 },

  { hiragana: "ざ", katakana: "ザ", romaji: "za", row: "z", vowel: "a", order: 106 },
  { hiragana: "じ", katakana: "ジ", romaji: "ji", row: "z", vowel: "i", order: 107 },
  { hiragana: "ず", katakana: "ズ", romaji: "zu", row: "z", vowel: "u", order: 108 },
  { hiragana: "ぜ", katakana: "ゼ", romaji: "ze", row: "z", vowel: "e", order: 109 },
  { hiragana: "ぞ", katakana: "ゾ", romaji: "zo", row: "z", vowel: "o", order: 110 },

  { hiragana: "だ", katakana: "ダ", romaji: "da", row: "d", vowel: "a", order: 111 },
  { hiragana: "ぢ", katakana: "ヂ", romaji: "ji", row: "d", vowel: "i", order: 112 },
  { hiragana: "づ", katakana: "ヅ", romaji: "zu", row: "d", vowel: "u", order: 113 },
  { hiragana: "で", katakana: "デ", romaji: "de", row: "d", vowel: "e", order: 114 },
  { hiragana: "ど", katakana: "ド", romaji: "do", row: "d", vowel: "o", order: 115 },

  { hiragana: "ば", katakana: "バ", romaji: "ba", row: "b", vowel: "a", order: 116 },
  { hiragana: "び", katakana: "ビ", romaji: "bi", row: "b", vowel: "i", order: 117 },
  { hiragana: "ぶ", katakana: "ブ", romaji: "bu", row: "b", vowel: "u", order: 118 },
  { hiragana: "べ", katakana: "ベ", romaji: "be", row: "b", vowel: "e", order: 119 },
  { hiragana: "ぼ", katakana: "ボ", romaji: "bo", row: "b", vowel: "o", order: 120 },

  { hiragana: "ぱ", katakana: "パ", romaji: "pa", row: "p", vowel: "a", order: 121 },
  { hiragana: "ぴ", katakana: "ピ", romaji: "pi", row: "p", vowel: "i", order: 122 },
  { hiragana: "ぷ", katakana: "プ", romaji: "pu", row: "p", vowel: "u", order: 123 },
  { hiragana: "ぺ", katakana: "ペ", romaji: "pe", row: "p", vowel: "e", order: 124 },
  { hiragana: "ぽ", katakana: "ポ", romaji: "po", row: "p", vowel: "o", order: 125 },
];

export const YOON_KANA: KanaItem[] = [
  { hiragana: "きゃ", katakana: "キャ", romaji: "kya", row: "ky", vowel: "a", order: 201 },
  { hiragana: "きゅ", katakana: "キュ", romaji: "kyu", row: "ky", vowel: "u", order: 202 },
  { hiragana: "きょ", katakana: "キョ", romaji: "kyo", row: "ky", vowel: "o", order: 203 },

  { hiragana: "しゃ", katakana: "シャ", romaji: "sha", row: "sh", vowel: "a", order: 204 },
  { hiragana: "しゅ", katakana: "シュ", romaji: "shu", row: "sh", vowel: "u", order: 205 },
  { hiragana: "しょ", katakana: "ショ", romaji: "sho", row: "sh", vowel: "o", order: 206 },

  { hiragana: "ちゃ", katakana: "チャ", romaji: "cha", row: "ch", vowel: "a", order: 207 },
  { hiragana: "ちゅ", katakana: "チュ", romaji: "chu", row: "ch", vowel: "u", order: 208 },
  { hiragana: "ちょ", katakana: "チョ", romaji: "cho", row: "ch", vowel: "o", order: 209 },

  { hiragana: "にゃ", katakana: "ニャ", romaji: "nya", row: "ny", vowel: "a", order: 210 },
  { hiragana: "にゅ", katakana: "ニュ", romaji: "nyu", row: "ny", vowel: "u", order: 211 },
  { hiragana: "にょ", katakana: "ニョ", romaji: "nyo", row: "ny", vowel: "o", order: 212 },

  { hiragana: "ひゃ", katakana: "ヒャ", romaji: "hya", row: "hy", vowel: "a", order: 213 },
  { hiragana: "ひゅ", katakana: "ヒュ", romaji: "hyu", row: "hy", vowel: "u", order: 214 },
  { hiragana: "ひょ", katakana: "ヒョ", romaji: "hyo", row: "hy", vowel: "o", order: 215 },

  { hiragana: "みゃ", katakana: "ミャ", romaji: "mya", row: "my", vowel: "a", order: 216 },
  { hiragana: "みゅ", katakana: "ミュ", romaji: "myu", row: "my", vowel: "u", order: 217 },
  { hiragana: "みょ", katakana: "ミョ", romaji: "myo", row: "my", vowel: "o", order: 218 },

  { hiragana: "りゃ", katakana: "リャ", romaji: "rya", row: "ry", vowel: "a", order: 219 },
  { hiragana: "りゅ", katakana: "リュ", romaji: "ryu", row: "ry", vowel: "u", order: 220 },
  { hiragana: "りょ", katakana: "リョ", romaji: "ryo", row: "ry", vowel: "o", order: 221 },

  { hiragana: "ぎゃ", katakana: "ギャ", romaji: "gya", row: "gy", vowel: "a", order: 222 },
  { hiragana: "ぎゅ", katakana: "ギュ", romaji: "gyu", row: "gy", vowel: "u", order: 223 },
  { hiragana: "ぎょ", katakana: "ギョ", romaji: "gyo", row: "gy", vowel: "o", order: 224 },

  { hiragana: "じゃ", katakana: "ジャ", romaji: "ja", row: "j", vowel: "a", order: 225 },
  { hiragana: "じゅ", katakana: "ジュ", romaji: "ju", row: "j", vowel: "u", order: 226 },
  { hiragana: "じょ", katakana: "ジョ", romaji: "jo", row: "j", vowel: "o", order: 227 },

  { hiragana: "びゃ", katakana: "ビャ", romaji: "bya", row: "by", vowel: "a", order: 228 },
  { hiragana: "びゅ", katakana: "ビュ", romaji: "byu", row: "by", vowel: "u", order: 229 },
  { hiragana: "びょ", katakana: "ビョ", romaji: "byo", row: "by", vowel: "o", order: 230 },

  { hiragana: "ぴゃ", katakana: "ピャ", romaji: "pya", row: "py", vowel: "a", order: 231 },
  { hiragana: "ぴゅ", katakana: "ピュ", romaji: "pyu", row: "py", vowel: "u", order: 232 },
  { hiragana: "ぴょ", katakana: "ピョ", romaji: "pyo", row: "py", vowel: "o", order: 233 },
];

export const ALL_KANA: KanaItem[] = [
  ...BASIC_KANA,
  ...DAKUTEN_KANA,
  ...YOON_KANA,
];