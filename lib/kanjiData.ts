export type KanjiEntry = {
  kanji: string;
  pieces: string[];
  reading?: string;
};

export const KANJI_DATA: KanjiEntry[] = [
  // 言
  { kanji: "言", pieces: ["言"] },
  { kanji: "読", pieces: ["言", "売"] },
  { kanji: "話", pieces: ["言", "舌"] },
  { kanji: "語", pieces: ["言", "五", "口"] },
  { kanji: "記", pieces: ["言", "己"] },
  { kanji: "計", pieces: ["言", "十"] },
  { kanji: "説", pieces: ["言", "兑"] },
  { kanji: "試", pieces: ["言", "式"] },
  { kanji: "調", pieces: ["言", "周"] },
  { kanji: "談", pieces: ["言", "炎"] },
  { kanji: "課", pieces: ["言", "果"] },
  { kanji: "議", pieces: ["言", "義"] },

  // 氵 / 水
  { kanji: "水", pieces: ["水"] },
  { kanji: "海", pieces: ["氵", "毎"] },
  { kanji: "河", pieces: ["氵", "可"] },
  { kanji: "池", pieces: ["氵", "也"] },
  { kanji: "酒", pieces: ["氵", "酉"] },
  { kanji: "洗", pieces: ["氵", "先"] },
  { kanji: "流", pieces: ["氵", "㐬"] },
  { kanji: "消", pieces: ["氵", "肖"] },
  { kanji: "深", pieces: ["氵", "罙"] },
  { kanji: "温", pieces: ["氵", "昷"] },
  { kanji: "港", pieces: ["氵", "巷"] },
  { kanji: "決", pieces: ["氵", "夬"] },

  // 木
  { kanji: "木", pieces: ["木"] },
  { kanji: "本", pieces: ["木"] },
  { kanji: "林", pieces: ["木", "木"] },
  { kanji: "森", pieces: ["木", "木", "木"] },
  { kanji: "校", pieces: ["木", "交"] },
  { kanji: "村", pieces: ["木", "寸"] },
  { kanji: "橋", pieces: ["木", "喬"] },
  { kanji: "植", pieces: ["木", "直"] },
  { kanji: "様", pieces: ["木", "羊", "水"] },
  { kanji: "機", pieces: ["木", "幾"] },
  { kanji: "板", pieces: ["木", "反"] },
  { kanji: "枝", pieces: ["木", "支"] },

  // 口
  { kanji: "口", pieces: ["口"] },
  { kanji: "古", pieces: ["十", "口"] },
  { kanji: "台", pieces: ["厶", "口"] },
  { kanji: "右", pieces: ["𠂇", "口"] },
  { kanji: "唱", pieces: ["口", "昌"] },
  { kanji: "味", pieces: ["口", "未"] },
  { kanji: "呼", pieces: ["口", "乎"] },
  { kanji: "品", pieces: ["口", "口", "口"] },
  { kanji: "員", pieces: ["口", "貝"] },
  { kanji: "和", pieces: ["禾", "口"] },
  { kanji: "器", pieces: ["口", "大", "犬"] },

  // 女
  { kanji: "女", pieces: ["女"] },
  { kanji: "好", pieces: ["女", "子"] },
  { kanji: "始", pieces: ["女", "台"] },
  { kanji: "妹", pieces: ["女", "未"] },
  { kanji: "姉", pieces: ["女", "市"] },
  { kanji: "婚", pieces: ["女", "昏"] },
  { kanji: "娘", pieces: ["女", "良"] },
  { kanji: "婦", pieces: ["女", "帚"] },
  { kanji: "妻", pieces: ["女", "又", "一"] },
  { kanji: "安", pieces: ["宀", "女"] },

  // 手 / 扌
  { kanji: "手", pieces: ["手"] },
  { kanji: "持", pieces: ["手", "寺"] },
  { kanji: "打", pieces: ["手", "丁"] },
  { kanji: "投", pieces: ["手", "殳"] },
  { kanji: "指", pieces: ["手", "旨"] },
  { kanji: "拾", pieces: ["手", "合"] },
  { kanji: "押", pieces: ["手", "甲"] },
  { kanji: "探", pieces: ["手", "罙"] },
  { kanji: "接", pieces: ["手", "妾"] },
  { kanji: "転", pieces: ["車", "云"] },
  { kanji: "技", pieces: ["手", "支"] },
  { kanji: "折", pieces: ["手", "斤"] },

  // 日
  { kanji: "日", pieces: ["日"] },
  { kanji: "早", pieces: ["日", "十"] },
  { kanji: "明", pieces: ["日", "月"] },
  { kanji: "時", pieces: ["日", "寺"] },
  { kanji: "映", pieces: ["日", "央"] },
  { kanji: "春", pieces: ["三", "人", "日"] },
  { kanji: "曜", pieces: ["日", "羽", "隹"] },
  { kanji: "昨", pieces: ["日", "乍"] },
  { kanji: "星", pieces: ["日", "生"] },
  { kanji: "暗", pieces: ["日", "音"] },

  // 月
  { kanji: "月", pieces: ["月"] },
  { kanji: "有", pieces: ["𠂇", "月"] },
  { kanji: "服", pieces: ["月", "卩"] },
  { kanji: "朝", pieces: ["十", "日", "十", "月"] },
  { kanji: "期", pieces: ["其", "月"] },
  { kanji: "朗", pieces: ["良", "月"] },

  // 人 / 亻
  { kanji: "人", pieces: ["人"] },
  { kanji: "今", pieces: ["人", "一"] },
  { kanji: "休", pieces: ["亻", "木"] },
  { kanji: "体", pieces: ["亻", "本"] },
  { kanji: "作", pieces: ["亻", "乍"] },
  { kanji: "何", pieces: ["亻", "可"] },
  { kanji: "住", pieces: ["亻", "主"] },
  { kanji: "使", pieces: ["亻", "吏"] },
  { kanji: "化", pieces: ["亻", "匕"] },
  { kanji: "便", pieces: ["亻", "更"] },
  { kanji: "信", pieces: ["亻", "言"] },
  { kanji: "働", pieces: ["亻", "動"] },

  // 心 / 忄
  { kanji: "心", pieces: ["心"] },
  { kanji: "思", pieces: ["田", "心"] },
  { kanji: "想", pieces: ["相", "心"] },
  { kanji: "忘", pieces: ["亡", "心"] },
  { kanji: "急", pieces: ["刍", "心"] },
  { kanji: "意", pieces: ["音", "心"] },
  { kanji: "感", pieces: ["咸", "心"] },
  { kanji: "忙", pieces: ["忄", "亡"] },
  { kanji: "快", pieces: ["忄", "夬"] },
  { kanji: "情", pieces: ["忄", "青"] },
  { kanji: "性", pieces: ["忄", "生"] },
  { kanji: "怖", pieces: ["忄", "布"] },

  // 糸
  { kanji: "糸", pieces: ["糸"] },
  { kanji: "紙", pieces: ["糸", "氏"] },
  { kanji: "線", pieces: ["糸", "泉"] },
  { kanji: "終", pieces: ["糸", "冬"] },
  { kanji: "絵", pieces: ["糸", "会"] },
  { kanji: "続", pieces: ["糸", "売"] },
  { kanji: "緑", pieces: ["糸", "录"] },

  // 火 / 灬
  { kanji: "火", pieces: ["火"] },
  { kanji: "灯", pieces: ["火", "丁"] },
  { kanji: "秋", pieces: ["禾", "火"] },
  { kanji: "焼", pieces: ["火", "尭"] },
  { kanji: "無", pieces: ["灬"] },
  { kanji: "熱", pieces: ["埶", "灬"] },
  { kanji: "黒", pieces: ["里", "灬"] },

  // 金
  { kanji: "金", pieces: ["金"] },
  { kanji: "鉄", pieces: ["金", "失"] },
  { kanji: "銀", pieces: ["金", "艮"] },
  { kanji: "銅", pieces: ["金", "同"] },
  { kanji: "録", pieces: ["金", "录"] },

  // 土
  { kanji: "土", pieces: ["土"] },
  { kanji: "地", pieces: ["土", "也"] },
  { kanji: "場", pieces: ["土", "昜"] },
  { kanji: "坂", pieces: ["土", "反"] },
  { kanji: "塩", pieces: ["土", "皿"] },

  // 石
  { kanji: "石", pieces: ["石"] },
  { kanji: "研", pieces: ["石", "开"] },
  { kanji: "砂", pieces: ["石", "少"] },
  { kanji: "確", pieces: ["石", "隺"] },
  { kanji: "破", pieces: ["石", "皮"] },

  // 雨
  { kanji: "雨", pieces: ["雨"] },
  { kanji: "電", pieces: ["雨", "申"] },
  { kanji: "雪", pieces: ["雨", "彗"] },
  { kanji: "雲", pieces: ["雨", "云"] },
  { kanji: "雷", pieces: ["雨", "田"] },

  // 車
  { kanji: "車", pieces: ["車"] },
  { kanji: "転", pieces: ["車", "云"] },
  { kanji: "軽", pieces: ["車", "圣"] },
  { kanji: "輪", pieces: ["車", "侖"] },
  { kanji: "輸", pieces: ["車", "俞"] },

  // 門
  { kanji: "門", pieces: ["門"], reading: "もん / かど" },
  { kanji: "問", pieces: ["門", "口"] },
  { kanji: "聞", pieces: ["門", "耳"] },
  { kanji: "間", pieces: ["門", "日"] },
  { kanji: "開", pieces: ["門", "开"] },

  // 食
  { kanji: "食", pieces: ["食"] },
  { kanji: "飲", pieces: ["食", "欠"] },
  { kanji: "飯", pieces: ["食", "反"] },
  { kanji: "館", pieces: ["食", "官"] },
  { kanji: "養", pieces: ["羊", "食"] },

  // 衣
  { kanji: "衣", pieces: ["衣"] },
  { kanji: "初", pieces: ["衣", "刀"] },
  { kanji: "表", pieces: ["衣", "土"] },
  { kanji: "袋", pieces: ["代", "衣"] },

  // 目
  { kanji: "目", pieces: ["目"] },
  { kanji: "見", pieces: ["目", "儿"] },
  { kanji: "相", pieces: ["木", "目"] },
  { kanji: "眠", pieces: ["目", "民"] },
  { kanji: "眼", pieces: ["目", "艮"] },

  // 耳
  { kanji: "耳", pieces: ["耳"] },
  { kanji: "聞", pieces: ["門", "耳"] },
  { kanji: "聴", pieces: ["耳", "直", "心"] },

  // 力
  { kanji: "力", pieces: ["力"] },
  { kanji: "助", pieces: ["且", "力"] },
  { kanji: "動", pieces: ["重", "力"] },
  { kanji: "勉", pieces: ["免", "力"] },

  // 刀
  { kanji: "刀", pieces: ["刀"] },
  { kanji: "初", pieces: ["衣", "刀"] },
  { kanji: "切", pieces: ["七", "刀"] },
  { kanji: "別", pieces: ["口", "刀", "刂"] },

  // 子
  { kanji: "子", pieces: ["子"] },
  { kanji: "好", pieces: ["女", "子"] },
  { kanji: "学", pieces: ["子", "冖", "⺍"] },
  { kanji: "字", pieces: ["宀", "子"] },
  { kanji: "季", pieces: ["禾", "子"] },
];