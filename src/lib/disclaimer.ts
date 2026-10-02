/**
 * The permanent game disclaimer (owner's instruction, 2026-10-02: 「此为游戏，切勿当成投资建议，出现一切问题后果自负」).
 *
 * It is shown on every screen of the web and desktop builds (GameDisclaimer, mounted at both roots), at the end of
 * every shared run report, and before the desktop installer copies any file (desktop/免责声明.txt). Do not remove,
 * shorten, soften or hide it, and do not make it dismissable: src/lib/disclaimer.test.ts fails if any of those
 * places loses it.
 */
export const GAME_DISCLAIMER = {
  zh: "此为游戏，切勿当成投资建议，出现一切问题后果自负。",
  en: "This is a game. Never treat it as investment advice. You bear all consequences of any problem that arises.",
} as const;

export function gameDisclaimer(en = false): string {
  return en ? GAME_DISCLAIMER.en : GAME_DISCLAIMER.zh;
}
