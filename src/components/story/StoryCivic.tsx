import { Check, Clock3, Handshake, Mail, ScrollText, Star, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useStory } from "@/lib/story/store";
import {
  FACTIONS,
  REFORMS,
  PETITIONS,
  getCivicOverview,
  getRecoveryRating,
  reformSupport,
  type CivicChoice,
} from "@/lib/story/civic";
import { scenarioOf, usableReserves } from "@/lib/story/scenarios";
import { SILENCE_WARNING_EN, SILENCE_WARNING_ZH } from "@/lib/story/realtime";

export function StoryCivic({ paused = false }: { paused?: boolean }) {
  const st = useStory();
  const en = useI18n((s) => s.lang) === "en";
  const c = st.civic;
  const pending = st.pendingCivic;
  const petition = c.petition ? PETITIONS.find((p) => p.id === c.petition!.template) : null;
  const respond = (choice: CivicChoice) => {
    if (c.petition) st.civicAction({ type: "petition", id: c.petition.id, choice });
  };
  if (paused)
    return (
      <section
        className="vic-panel space-y-4 p-4 text-ink"
        data-testid="paused-civic-orders"
      >
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Handshake className="size-5" />
          {en ? "Civic decisions" : "议事决策"}
        </h2>
        <p className="text-xs text-muted">
          {en
            ? "Requests are queued and checked on resume. Current support, petitions and outcomes are hidden."
            : "决定将在恢复时间后依次核验和执行。此处隐藏支持度、请愿内容与执行结果。"}
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {FACTIONS.map((f) => (
            <button
              type="button"
              key={f.id}
              className="min-h-11 rounded-lg bg-paper p-2 text-sm font-bold"
              onClick={() => st.civicAction({ type: "caucus", faction: f.id })}
            >
              {en ? "Meet " + f.en : "召集" + f.zh}
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {REFORMS.map((r) => (
            <button
              type="button"
              key={r.id}
              className="min-h-11 rounded-md border border-brass p-2 text-sm font-bold text-brass-deep"
              onClick={() => st.civicAction({ type: "reform", id: r.id })}
            >
              {en ? "Propose " + r.en : "提出" + r.zh}
            </button>
          ))}
        </div>
        {c.petition && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="min-h-11 rounded-md bg-seal px-3 py-2 text-sm font-bold text-paper"
              onClick={() => respond("support")}
            >
              {en ? "Fund current petition" : "拨款回应当前请愿"}
            </button>
            <button
              type="button"
              className="min-h-11 rounded-lg bg-paper px-3 py-2 text-sm font-bold"
              onClick={() => respond("compromise")}
            >
              {en ? "Negotiate a deferral" : "协商缓办"}
            </button>
            <button
              type="button"
              className="min-h-11 rounded-lg bg-paper px-3 py-2 text-sm font-bold"
              onClick={() => respond("decline")}
            >
              {en ? "Explicitly decline" : "明确拒绝"}
            </button>
            <button
              type="button"
              className="min-h-11 rounded-lg border border-down px-3 py-2 text-sm font-bold text-down"
              onClick={() => respond("silence")}
            >
              {en ? "Remain silent" : "保持沉默"}
            </button>
          </div>
        )}
        {c.petition && (
          <p className="text-xs font-bold leading-relaxed text-down">
            {en ? SILENCE_WARNING_EN : SILENCE_WARNING_ZH}
          </p>
        )}
        {pending.length > 0 && (
          <p className="text-xs text-teal-deep">
            {en ? "Queued decisions: " : "已排入决策："}
            {pending.length}
          </p>
        )}
      </section>
    );
  if (!st.run) return null;
  const pot = usableReserves(scenarioOf(st.run.scenarioId));
  const overview = getCivicOverview(c, st.economy, st.run);
  const recovery = getRecoveryRating(c);
  return (
    <section id="story-civic" className="scroll-mt-32 space-y-5" data-testid="story-civic">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="vic-kicker">
            {en ? "PEOPLE BEHIND THE NUMBERS" : "数字背后，是生活"}
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold">
            {en ? "The civic desk" : "街区议事厅"}
          </h2>
        </div>
        <div className="rounded-md border border-brass/60 bg-teal-soft px-4 py-2 text-teal-deep shadow-[var(--shadow-border)]">
          <span className="text-xs">{en ? "Influence" : "协调力"}</span>
          <span className="ml-3 vic-letterpress text-2xl font-bold tabular-nums" style={{ color: "inherit" }}>
            {Math.floor(c.capital)}
          </span>
          <span className="ml-1 text-xs">/100</span>
        </div>
      </header>
      {petition && c.petition ? (
        <article
          className="vic-frame overflow-hidden rounded-xl border border-line bg-paper shadow-[var(--shadow-border)]"
          data-testid="civic-petition"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-teal-soft px-4 py-3 text-teal-deep">
            <span className="flex items-center gap-2 text-sm font-bold">
              <Mail className="size-4" />
              {en ? "A letter from the district" : "一封来自街区的请愿"}
            </span>
            <span className="flex items-center gap-1 font-mono text-xs tabular-nums">
              <Clock3 className="size-3" />
              {Math.max(0, Math.ceil((c.petition.expires - c.ticks) * 5 - st.economy.remainder))}s
            </span>
          </div>
          <div className="p-4 sm:p-5">
            <h3 className="font-display text-xl font-semibold">{en ? petition.en : petition.zh}</h3>
            <p className="mt-1 text-xs text-muted">{en ? petition.actorEn : petition.actorZh}</p>
            <p className="vic-dropcap my-4 max-w-prose text-sm leading-relaxed">
              {en ? petition.bodyEn : petition.bodyZh}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={st.run.reserves < pot * petition.cost}
                className="min-h-11 rounded-md border border-seal/70 bg-seal p-3 text-left text-paper shadow-[inset_0_1px_0_#ffffff33,var(--shadow-border)] disabled:opacity-40"
                onClick={() => respond("support")}
              >
                <span className="block text-sm font-bold">
                  {en ? "Fund the request" : "拨款兑现"} ·{" "}
                  {Math.round(pot * petition.cost).toLocaleString()}
                </span>
                <span className="mt-1 block text-xs leading-relaxed">
                  {en ? petition.aidEn : petition.aidZh}
                </span>
                <span className="mt-1 block text-xs">
                  {en ? "Faction support +6" : "相关群体支持 +6"}
                  {petition.faction !== "financiers"
                    ? en
                      ? " · Credit Council −1"
                      : " · 信贷公议会 −1"
                    : ""}
                </span>
              </button>
              <button
                type="button"
                disabled={c.capital < 4}
                className="min-h-11 rounded-xl border border-line bg-surface-2 p-3 text-left disabled:opacity-40"
                onClick={() => respond("compromise")}
              >
                <span className="block text-sm font-bold">
                  {en ? "Negotiate a deferral" : "协商缓办"}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted">
                  {en
                    ? "Influence −4 · support +3. Keeps cash; the economic shortfall remains."
                    : "协调力 −4 · 支持 +3。保留现金，经营缺口仍然存在。"}
                </span>
              </button>
              <button
                type="button"
                className="min-h-11 rounded-xl border border-line p-3 text-left"
                onClick={() => respond("decline")}
              >
                <span className="block text-sm font-bold">
                  {en ? "Explain and decline" : "明确说明，拒绝请求"}
                </span>
                <span className="mt-1 block text-xs text-muted">
                  {en
                    ? "Support −3. No spending, no silence rumor."
                    : "支持 −3。保留资金，避免沉默猜测。"}
                </span>
              </button>
              <button
                type="button"
                className="min-h-11 rounded-xl border border-down p-3 text-left text-down"
                onClick={() => respond("silence")}
              >
                <span className="block text-sm font-bold">{en ? "Remain silent" : "保持沉默"}</span>
                <span className="mt-1 block text-xs leading-relaxed">
                  {en
                    ? "Support −4. Unanswered requests fuel market rumors. The timer has the same consequence."
                    : "支持 −4；不作答会引发市场猜测，超时视为同样选择。"}
                </span>
              </button>
            </div>
            <p className="mt-3 text-xs font-bold leading-relaxed text-down">
              {en ? SILENCE_WARNING_EN : SILENCE_WARNING_ZH}
            </p>
          </div>
        </article>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-paper p-4 text-sm">
          <Mail className="size-5 shrink-0 text-teal-deep" />
          <div>
            <p className="font-bold">
              {en ? "The correspondence desk is clear" : "这一轮来信已处理"}
            </p>
            <p className="mt-1 text-xs text-muted">
              {en
                ? "Watch production and living standards. New letters follow the district's needs."
                : "接下来留意生产与民生。新的来信会根据街区的处境出现。"}
            </p>
          </div>
        </div>
      )}
      {c.lastOutcome && (
        <p
          className="rounded-xl border-l-4 border-teal bg-teal-soft px-4 py-3 text-sm leading-relaxed text-teal-deep"
          role="status"
        >
          {en ? c.lastOutcome.en : c.lastOutcome.zh}
        </p>
      )}
      <section>
        <h3 className="flex items-center gap-2 text-base font-bold">
          <Users className="size-4" />
          {en ? "A coalition with different interests" : "利益不同，也需要坐到一起"}
        </h3>
        <p className="mb-3 mt-1 text-xs leading-relaxed text-muted">
          {en
            ? "Support follows the actual economy. Meetings buy room to negotiate; they cannot replace jobs or goods. Influence recovers gradually."
            : "支持度会跟随实际经济变化。协商可以争取空间，无法代替工作和商品。协调力会缓慢恢复。"}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {FACTIONS.map((f) => {
            const support = c.factions[f.id];
            const remaining = Math.max(0, (c.caucusUntil[f.id] - c.ticks) * 5);
            return (
              <article className="rounded-xl border border-line bg-paper p-4" key={f.id}>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold">{en ? f.en : f.zh}</h4>
                  <span className="font-mono text-lg font-bold tabular-nums">
                    {Math.round(support)}
                  </span>
                </div>
                <div className="my-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={
                      "h-full transition-[width] " + (support < 45 ? "bg-down" : "bg-teal")
                    }
                    style={{ width: support + "%" }}
                  />
                </div>
                <p className="min-h-8 text-xs leading-relaxed text-muted">
                  {en ? f.concernEn : f.concernZh}
                </p>
                <button
                  type="button"
                  disabled={remaining > 0 || c.capital < 5}
                  className="mt-3 min-h-11 w-full rounded-lg border border-line px-2 py-2 text-xs font-bold text-teal-deep disabled:opacity-40"
                  onClick={() => st.civicAction({ type: "caucus", faction: f.id })}
                >
                  {remaining
                    ? (en ? "Talks settling · " : "共识落实中 · ") + remaining + "s"
                    : en
                      ? "Meet · influence −5 / support +9"
                      : "召集协商 · 协调力 −5 / 支持 +9"}
                </button>
              </article>
            );
          })}
        </div>
      </section>
      <section>
        <h3 className="flex items-center gap-2 text-base font-bold">
          <Handshake className="size-4" />
          {en ? "Make a lasting agreement" : "把短期承诺，变成长期安排"}
        </h3>
        <p className="mb-3 mt-1 text-xs leading-relaxed text-muted">
          {en
            ? "Each accord costs 20 influence and 2% of opening funds. Only one negotiation at a time. Average support ≥55 advances it, taking at least 75 seconds; below 55, progress retreats."
            : "每项协定需要 20 协调力和 2% 初始可用资金；一次协商一项。相关两方平均支持 ≥55 才推进，最快 75 秒生效；支持不足时进度回退。"}
        </p>
        <div className="space-y-2">
          {REFORMS.map((r) => {
            const enacted = c.enacted.includes(r.id);
            const active = c.reform?.id === r.id;
            const support = reformSupport(c, r.id);
            return (
              <article key={r.id} className="rounded-xl border border-line bg-paper p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold">{en ? r.en : r.zh}</h4>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      {en ? r.effectEn : r.effectZh}
                    </p>
                    <p className="mt-2 text-xs text-muted">
                      {r.factions
                        .map((id) => {
                          const f = FACTIONS.find((x) => x.id === id)!;
                          return en ? f.en : f.zh;
                        })
                        .join(" + ")}{" "}
                      ·{" "}
                      <span
                        className={
                          support < 55 ? "font-bold text-down" : "font-bold text-teal-deep"
                        }
                      >
                        {en ? "Support " : "平均支持 "}
                        {Math.round(support)}/55
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={
                      enacted || !!c.reform || c.capital < 20 || st.run!.reserves < pot * 0.02
                    }
                    className="min-h-11 rounded-md border border-brass px-3 py-2 text-sm font-bold text-brass-deep disabled:opacity-50"
                    onClick={() => st.civicAction({ type: "reform", id: r.id })}
                  >
                    {enacted
                      ? en
                        ? "In force"
                        : "已生效"
                      : active
                        ? en
                          ? "Negotiating"
                          : "正在协商"
                        : en
                          ? "Propose accord"
                          : "提出协定"}
                  </button>
                </div>
                {active && (
                  <div className="mt-3">
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full bg-teal transition-[width]"
                        style={{ width: c.reform!.progress + "%" }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {Math.round(c.reform!.progress)}% ·{" "}
                      {support >= 55
                        ? en
                          ? "Coalition holds; moving forward"
                          : "共识足够，协商推进中"
                        : en
                          ? "Support lacking; progress is retreating"
                          : "共识不足，进度正在回退"}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
      <section className="rounded-xl bg-surface-2 p-4">
        <h3 className="flex items-center gap-2 text-base font-bold">
          <ScrollText className="size-4" />
          {en ? "What this district will remember" : "这座街区会记住什么"}
        </h3>
        <div
          className="my-4 rounded-xl border border-line bg-paper p-4"
          data-testid="recovery-rating"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-muted">
                {en ? "SOCIAL RECOVERY · BONUS ACHIEVEMENT" : "社会复苏评级 · 额外成果"}
              </p>
              <p
                className={
                  "mt-1 font-display text-xl font-semibold " +
                  (recovery.ready && recovery.stars === 0 ? "text-down" : "text-teal-deep")
                }
              >
                {en ? recovery.en : recovery.zh}
              </p>
            </div>
            <div
              className="flex gap-1 text-brass"
              role="img"
              aria-label={
                recovery.ready
                  ? en
                    ? recovery.stars + " of 3 stars"
                    : recovery.stars + " 星，共 3 星"
                  : en
                    ? "Observation in progress"
                    : "尚在观察中"
              }
            >
              {[1, 2, 3].map((star) => (
                <Star
                  key={star}
                  className={
                    "size-6 " +
                    (recovery.ready && recovery.stars >= star ? "fill-current" : "text-muted")
                  }
                />
              ))}
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed">
            {recovery.ready
              ? (en ? "Last 60 seconds: real income " : "最近 60 秒平均：实薪 ") +
                recovery.income.toFixed(1) +
                (en ? " · employment " : " · 就业 ") +
                recovery.employment.toFixed(1) +
                "%"
              : (en ? "Observing settled living conditions: " : "积累结算后的民生记录：") +
                c.recentLiving.length * 5 +
                "/60s"}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            {en
              ? "This rating is separate from historical victory. Zero stars is not a defeat, but means households are still under strain even if the financial system holds. It uses twelve settlements; a last-minute payment cannot replace sustained recovery."
              : "评级与历史胜负分别评价。0 星不等于失败，但即使守住金融体系，也说明街坊生活仍在承压。按最近 12 次结算均值评价，临终局的一笔拨款无法代替持续复苏。"}
          </p>
          <div className="mt-3 grid gap-2 border-t border-line pt-3 text-xs sm:grid-cols-3">
            <p>
              <strong className="text-teal-deep">
                {en ? "1 · Stabilized" : "1 星 · 稳住生计"}
              </strong>
              <span className="mt-1 block text-muted">
                {en ? "Income ≥65, employment ≥65%" : "平均实薪 ≥65、就业 ≥65%"}
              </span>
            </p>
            <p>
              <strong className="text-teal-deep">{en ? "2 · Recovery" : "2 星 · 温和复苏"}</strong>
              <span className="mt-1 block text-muted">
                {en
                  ? "Income ≥75, employment ≥75%, 1 active accord"
                  : "平均实薪 ≥75、就业 ≥75%，1 项协定生效"}
              </span>
            </p>
            <p>
              <strong className="text-teal-deep">
                {en ? "3 · Prosperity" : "3 星 · 共同繁荣"}
              </strong>
              <span className="mt-1 block text-muted">
                {en
                  ? "Income ≥85, employment ≥80%, 2 active accords"
                  : "平均实薪 ≥85、就业 ≥80%，2 项协定生效"}
              </span>
            </p>
          </div>
        </div>
        <p className="mt-1 text-xs text-muted">
          {en
            ? "Bonus social achievements, not victory requirements. See Victory Conditions above. Each awards 6 influence once."
            : "额外民生成果：全部完成会获得奖励，但不会直接通关。胜负请看页面上方「通关条件」，每项首次完成奖励 6 协调力。"}
        </p>
        <div className="mt-3 space-y-3">
          {overview.milestones.map((m) => (
            <div key={m.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1 text-sm font-bold">
                    {c.achievements.includes(m.id) && <Check className="size-4 text-teal-deep" />}
                    {en ? m.en : m.zh}
                  </p>
                  <p className="mt-1 text-xs text-muted">{en ? m.detailEn : m.detailZh}</p>
                </div>
                <span className="font-mono text-xs tabular-nums">
                  {Math.round(m.value)}/{m.target}
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-paper">
                <div
                  className="h-full bg-teal"
                  style={{ width: Math.min(100, (m.value / m.target) * 100) + "%" }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
