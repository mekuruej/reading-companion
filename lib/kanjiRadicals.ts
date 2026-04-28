// Kanji Radicals
//

export type KanjiRadicalInfo = {
  radical: string;
  name: string;
};

export const KANJI_RADICALS: Record<string, KanjiRadicalInfo> = {
  語: { radical: "言", name: "speech" },
  読: { radical: "言", name: "speech" },
  話: { radical: "言", name: "speech" },
  聞: { radical: "耳", name: "ear" },
  書: { radical: "曰", name: "say" },
  学: { radical: "子", name: "child" },
  校: { radical: "木", name: "tree" },
  人: { radical: "人", name: "person" },
  休: { radical: "人", name: "person" },
  体: { radical: "人", name: "person" },
  心: { radical: "心", name: "heart" },
  思: { radical: "心", name: "heart" },
  情: { radical: "心", name: "heart" },
  水: { radical: "水", name: "water" },
  海: { radical: "水", name: "water" },
  漢: { radical: "水", name: "water" },
  火: { radical: "火", name: "fire" },
  熱: { radical: "火", name: "fire" },
  土: { radical: "土", name: "earth" },
  地: { radical: "土", name: "earth" },
  金: { radical: "金", name: "gold" },
  銀: { radical: "金", name: "gold" },
  車: { radical: "車", name: "vehicle" },
  駅: { radical: "馬", name: "horse" },
  食: { radical: "食", name: "food" },
  飲: { radical: "食", name: "food" },
  目: { radical: "目", name: "eye" },
  見: { radical: "見", name: "see" },
  女: { radical: "女", name: "woman" },
  好: { radical: "女", name: "woman" },
  手: { radical: "手", name: "hand" },
  持: { radical: "手", name: "hand" },
};
