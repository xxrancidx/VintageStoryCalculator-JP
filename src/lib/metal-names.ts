// 金属・合金・鉱石名の日本語表示ヘルパー。
//
// データファイル（metals.json / alloys.json）は英語名のままで、
// 内部マッチングキー・色パレット参照・URL共有パラメータに使われる。
// 表示の直前にこれらのヘルパーを通すことで「銅（Copper）」形式に変換する。

const METAL_JP: Record<string, string> = {
  Copper: "銅（Copper）",
  Gold: "金（Gold）",
  Silver: "銀（Silver）",
  Tin: "錫（Tin）",
  Zinc: "亜鉛（Zinc）",
  Bismuth: "ビスマス（Bismuth）",
  Lead: "鉛（Lead）",
  Nickel: "ニッケル（Nickel）"
};

const ALLOY_JP: Record<string, string> = {
  Brass: "真鍮（Brass）",
  "Tin Bronze": "錫青銅（Tin Bronze）",
  "Bismuth Bronze": "ビスマス青銅（Bismuth Bronze）",
  "Black Bronze": "黒青銅（Black Bronze）",
  "Lead Solder": "鉛半田（Lead Solder）",
  Molybdochalkos: "モリブドカルコス（Molybdochalkos）",
  "Silver Solder": "銀半田（Silver Solder）",
  Electrum: "エレクトラム（Electrum）",
  Cupronickel: "キュプロニッケル（Cupronickel）"
};

const ORE_JP: Record<string, string> = {
  "Native copper": "自然銅（Native copper）",
  Malachite: "孔雀石（Malachite）",
  "Native gold": "自然金（Native gold）",
  "Native silver": "自然銀（Native silver）",
  Cassiterite: "錫石（Cassiterite）",
  Sphalerite: "閃亜鉛鉱（Sphalerite）",
  Bismuthinite: "輝蒼鉛鉱（Bismuthinite）",
  Galena: "方鉛鉱（Galena）",
  Pentlandite: "ペントランド鉱（Pentlandite）"
};

export const displayMetal = (name: string): string =>
  METAL_JP[name] ?? name;

export const displayAlloy = (name: string): string =>
  ALLOY_JP[name] ?? name;

export const displayOre = (name: string): string =>
  ORE_JP[name] ?? name;
