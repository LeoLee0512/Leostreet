/**
 * What money can buy.
 *
 * The rule, and the reason the old catalogue is gone: **nothing here touches
 * the tape.** A game whose premise is "financial skill keeps you alive" cannot
 * sell survival. Selling Ł6,480,000 for ¥648 did not make the game easier so
 * much as make it pointless — the player who paid skipped the thing they came
 * for, and the unlock also gated the role that makes the mode interesting.
 *
 * So the shelf is cosmetics and extra ways to play. A title, an accent colour,
 * and the sandbox. None of them move a price, a fill, a rating or a seat.
 */

export type StoreKind = "cosmetic" | "mode";

export interface StoreItem {
  id: string;
  kind: StoreKind;
  rmb: number;
  nameZh: string;
  nameEn: string;
  blurbZh: string;
  blurbEn: string;
  /** Cosmetic payload. A title shown by your name, or an accent colour. */
  title?: { zh: string; en: string };
  accent?: string;
}

export const STORE_ITEMS: StoreItem[] = [
  {
    id: "title-mane",
    kind: "cosmetic",
    rmb: 6,
    nameZh: "称号：金鬃",
    nameEn: "Title: Golden Mane",
    blurbZh: "名字前面挂一个金色称号。仅此而已。",
    blurbEn: "A gold title beside your name. That is all it is.",
    title: { zh: "金鬃", en: "Golden Mane" },
    accent: "#c98f2b",
  },
  {
    id: "title-nightdesk",
    kind: "cosmetic",
    rmb: 6,
    nameZh: "称号：夜盘",
    nameEn: "Title: Night Desk",
    blurbZh: "给通宵看盘的人。纯外观。",
    blurbEn: "For the ones still watching at 3am. Cosmetic only.",
    title: { zh: "夜盘", en: "Night Desk" },
    accent: "#3d5a80",
  },
  {
    id: "accent-set",
    kind: "cosmetic",
    rmb: 12,
    nameZh: "配色包：六色",
    nameEn: "Accent pack: six colours",
    blurbZh: "大厅与对局里你这一行的配色。不改任何数值。",
    blurbEn: "Recolours your row in the lobby and on the desk. Changes no number.",
  },
  {
    id: "mode-custom",
    kind: "mode",
    rmb: 18,
    nameZh: "自定义房间",
    nameEn: "Custom room",
    blurbZh: "练习场里开自定义局：自己定单局时长、对手强度和板面大小。只在练习场生效，不进排位。",
    blurbEn: "Custom rooms in practice: set the round length, the strength of the field and the size of the board. Practice only, never ranked.",
  },
];

/** The custom-room SKU, referenced by the lobby. */
export const CUSTOM_ROOM_ID = "mode-custom";

export function storeItem(id: string): StoreItem | undefined {
  return STORE_ITEMS.find((x) => x.id === id);
}

export function isStoreItem(id: string): boolean {
  return STORE_ITEMS.some((x) => x.id === id);
}
