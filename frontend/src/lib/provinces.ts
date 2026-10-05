import type { Lang } from "../api/types";

export const PROVINCES = ["ON", "QC", "BC", "AB", "MB", "SK", "NS", "NB", "NL", "PE", "YT", "NT", "NU"] as const;

const NAMES: Record<(typeof PROVINCES)[number], [string, string, string]> = {
  ON: ["Ontario", "安大略省", "安大略省"],
  QC: ["Quebec", "魁北克省", "魁北克省"],
  BC: ["British Columbia", "不列颠哥伦比亚省", "卑詩省"],
  AB: ["Alberta", "艾伯塔省", "亞伯達省"],
  MB: ["Manitoba", "马尼托巴省", "曼尼托巴省"],
  SK: ["Saskatchewan", "萨斯喀彻温省", "薩斯喀徹溫省"],
  NS: ["Nova Scotia", "新斯科舍省", "新斯科細亞省"],
  NB: ["New Brunswick", "新不伦瑞克省", "新伯倫瑞克省"],
  NL: ["Newfoundland and Labrador", "纽芬兰与拉布拉多省", "紐芬蘭與拉布拉多省"],
  PE: ["Prince Edward Island", "爱德华王子岛省", "愛德華王子島省"],
  YT: ["Yukon", "育空地区", "育空地區"],
  NT: ["Northwest Territories", "西北地区", "西北地區"],
  NU: ["Nunavut", "努纳武特地区", "努納武特地區"],
};

export function provinceName(code: string, lang: Lang): string {
  const n = NAMES[code as keyof typeof NAMES];
  return n ? n[{ en: 0, hans: 1, hant: 2 }[lang]] : code;
}
