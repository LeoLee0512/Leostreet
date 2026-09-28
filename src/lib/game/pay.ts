import { storeItem } from "./storefront.ts";

/**
 * A LOCAL, UNVERIFIED order book. Nothing here proves anyone paid: orders live
 * in this browser's localStorage and `markPayPaid` is called by a button in the
 * UI, so a player can grant themselves any pack by editing one key.
 *
 * That is fine for a placeholder and NOT fine for real money. Taking real
 * payments needs all three of:
 *   1. a server that creates the order and holds the amount,
 *   2. the provider's async notify callback hitting that server (`notifyUrl`),
 *   3. entitlements read back from the server — never from this file.
 * Until that exists the cashier is labelled a demo in the UI, on purpose.
 */
export type PayMethod = "wechat" | "alipay";
export type PayStatus = "pending" | "paid" | "expired";

/** What an order buys. "cash" tops up Leo coins; the rest unlock content. */
export type PayKind = "cosmetic" | "mode";

export interface PayOrder {
  id: string;
  packId: string;
  kind: PayKind;
  rmb: number;
  method: PayMethod;
  status: PayStatus;
  createdAt: number;
  paidAt?: number;
  notifyUrl: string;
  codeUrl: string;
}

const KEY = "leo-street-pay-v1";
const TTL_MS = 15 * 60 * 1000;

function load(): PayOrder[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as PayOrder[];
    const now = Date.now();
    return list.map((o) => (o.status === "pending" && now - o.createdAt > TTL_MS ? { ...o, status: "expired" } : o));
  } catch {
    return [];
  }
}

function save(list: PayOrder[]) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(-40)));
}

function rid() {
  const t = Date.now().toString(36).toUpperCase();
  const n = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `LS${t}${n}`;
}

export function listPayOrders(): PayOrder[] {
  return load();
}

export function getPayOrder(id: string): PayOrder | undefined {
  return load().find((o) => o.id === id);
}

/** Every purchasable thing in one place. Cosmetics and modes only. */
function productOf(productId: string): { id: string; kind: PayKind; rmb: number } | null {
  const item = storeItem(productId);
  return item ? { id: item.id, kind: item.kind, rmb: item.rmb } : null;
}

/**
 * Create an order. Content unlocks go through here too — they used to be
 * granted straight from a button with no order behind them at all, so the
 * ¥39.9 broker and ¥19.9 quant SKUs were simply free.
 *
 * Swap `codeUrl` for the provider's real code_url when a merchant is attached.
 */
export function createPayOrder(productId: string, method: PayMethod): PayOrder | null {
  const product = productOf(productId);
  if (!product) return null;
  const id = rid();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const notifyUrl = `${origin}/api/pay/notify`;
  const order: PayOrder = {
    id,
    packId: product.id,
    kind: product.kind,
    rmb: product.rmb,
    method,
    status: "pending",
    createdAt: Date.now(),
    notifyUrl,
    codeUrl: `${origin}/pay/${id}?amt=${product.rmb}&ccy=CNY&method=${method}`,
  };
  const list = load();
  list.push(order);
  save(list);
  return order;
}

export function markPayPaid(id: string): PayOrder | null {
  const list = load();
  const i = list.findIndex((o) => o.id === id);
  if (i < 0) return null;
  if (list[i].status === "paid") return list[i];
  if (list[i].status !== "pending") return null;
  list[i] = { ...list[i], status: "paid", paidAt: Date.now() };
  save(list);
  return list[i];
}

export function spentRmb(): number {
  return load()
    .filter((o) => o.status === "paid")
    .reduce((s, o) => s + o.rmb, 0);
}
