import { useState } from "react";
import { StoryMissionReview } from "./StoryMissionReview";
import { ArrowLeft, BookOpen, Check, Copy, FileText, Palette, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  applyAppearance,
  readCollection,
  reportShareText,
  toggleStoryWish,
  type Appearance,
  type StoryReport,
  type Wish,
} from "@/lib/story/engagement";
import { cn } from "@/lib/utils";

/** Field-guide concepts for the free knowledge handbook (no tutorial attached). */
const LESSON_CONCEPTS = [
  {
    id: "exchange",
    title: { zh: "买卖", en: "Exchange" },
    text: {
      zh: "买面包时，你付钱，店主把面包给你。钱换了主人，没有凭空消失。",
      en: "You pay for bread and the shop gives you bread. The money changes hands; it does not disappear.",
    },
  },
  {
    id: "production",
    title: { zh: "生产", en: "Production" },
    text: {
      zh: "面包需要面粉和劳动。光给工厂钱，不能立刻变出所有东西。",
      en: "Bread needs flour and work. Giving a factory money does not instantly create everything it needs.",
    },
  },
  {
    id: "credit",
    title: { zh: "借钱", en: "Credit" },
    text: {
      zh: "借来的钱要按约定归还。借钱不是别人白送你钱。",
      en: "Borrowed money must be repaid as agreed. A loan is not a gift.",
    },
  },
  {
    id: "interest",
    title: { zh: "利息", en: "Interest" },
    text: {
      zh: "借 4 枚钱，约好还 5 枚，多还的 1 枚叫利息。不同借款的约定不同。",
      en: "Borrow 4 coins and agree to repay 5: the extra coin is interest. Different loans have different terms.",
    },
  },
  {
    id: "reserve",
    title: { zh: "留有余钱", en: "Reserves" },
    text: {
      zh: "把钱全部用完，下一件急事就可能没钱办。救急也要想想后面。",
      en: "Spend all your money now and the next emergency may go unfunded. Aid also needs a plan for what comes next.",
    },
  },
  {
    id: "silence",
    title: { zh: "沉默", en: "Silence" },
    text: {
      zh: "大家不知道你准备做什么，就可能乱猜。说清计划能减少一些猜测，但不能保证一切顺利。",
      en: "When people do not know your plan, they may guess. Clear communication can reduce uncertainty but cannot guarantee success.",
    },
  },
] as const;

type Section = "knowledge" | "reports" | "appearance";
export function StoryCollection({ onBack }: { onBack: () => void }) {
  const en = useI18n((s) => s.lang) === "en";
  const [section, setSection] = useState<Section>("knowledge");
  const [collection, setCollection] = useState(readCollection);
  const [bestOnly, setBestOnly] = useState(false);
  const [notice, setNotice] = useState("");
  const [shareText, setShareText] = useState("");
  const lengthLabels = en
    ? {
        sprint: "30-minute campaign",
        standard: "1-hour campaign",
        deep: "90-minute campaign",
        epic: "3-hour campaign",
      }
    : { sprint: "半小时战役", standard: "一小时战役", deep: "一个半小时战役", epic: "三小时战役" };
  const reports = bestOnly
    ? Object.values(collection.bestByScenario).sort((a, b) => b.completedAt - a.completedAt)
    : collection.reports;
  const tabs = [
    { id: "knowledge" as const, icon: BookOpen, zh: "知识手册", en: "Field guide" },
    { id: "reports" as const, icon: FileText, zh: "我的战报", en: "My reports" },
    { id: "appearance" as const, icon: Palette, zh: "指挥室外观", en: "Desk appearance" },
  ];
  const selectAppearance = (appearance: Appearance) => {
    const saved = applyAppearance(appearance);
    setCollection(readCollection());
    setNotice(
      saved
        ? en
          ? "Appearance applied. Both styles are free."
          : "外观已应用，两款都免费。"
        : en
          ? "This browser could not save the appearance. Please allow local storage."
          : "浏览器未能保存外观，请允许本地存储后重试。",
    );
  };
  const copyReport = async (report: StoryReport) => {
    const text = reportShareText(report, en);
    setShareText(text);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setNotice(
        en ? "Report copied. You choose where to share it." : "战报已复制，由你决定分享给谁。 ",
      );
    } catch {
      setNotice(
        en
          ? "Automatic copying was unavailable. Select the report text below to copy it."
          : "未能自动复制。可以选中下方战报文字自行复制。 ",
      );
    }
  };
  const wish = (id: Wish) => {
    const intended = toggleStoryWish(id);
    const stored = readCollection();
    setCollection(stored);
    setNotice(
      intended.wishlist.includes(id) === stored.wishlist.includes(id)
        ? en
          ? "Your preference is kept on this device. Nothing was sent or purchased."
          : "偏好只保存在这台设备，没有发送、预约或购买。"
        : en
          ? "This browser could not save the preference."
          : "浏览器未能保存偏好。",
    );
  };

  return (
    <div className="cabinet-shell min-h-dvh bg-paper text-ink">
      <header className="vic-masthead bg-surface px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="vic-rosette mt-1 shrink-0" aria-hidden />
            <div>
              <p className="vic-kicker">{en ? "THE PERSONAL ARCHIVE" : "私人档案室"}</p>
              <h1 className="vic-letterpress mt-1 text-2xl font-bold">
                {en ? "What you learned. What you changed." : "学过的知识，走过的路。"}
              </h1>
            </div>
          </div>
          <button
            className="vic-btn-ghost min-h-11 items-center gap-1.5 px-4"
            onClick={onBack}
          >
            <ArrowLeft size={16} aria-hidden />
            {en ? "Back" : "返回首页"}
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-8">
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          {en
            ? "Read every lesson freely, revisit your own decisions, and choose a desk that feels like yours. Archives stay on this device."
            : "所有知识都可以免费阅读，战报记录自己的进步，指挥室可以换成喜欢的样子。档案只保存在这台设备。"}
        </p>
        <nav
          className="flex overflow-x-auto border-b border-line"
          aria-label={en ? "Archive sections" : "档案分类"}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setSection(tab.id);
                setNotice("");
                setShareText("");
              }}
              className={cn("cabinet-tab", section === tab.id && "cabinet-tab-active")}
              aria-pressed={section === tab.id}
            >
              <tab.icon size={16} aria-hidden />
              {en ? tab.en : tab.zh}
            </button>
          ))}
        </nav>
        {notice && (
          <p
            className="border-l-2 border-brass bg-surface-2 px-4 py-3 text-sm text-ink"
            role="status"
          >
            {notice}
          </p>
        )}

        {section === "knowledge" && (
          <section aria-label={en ? "Free field guide" : "免费知识手册"}>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-xl font-bold">
                {en ? "Big ideas, everyday words" : "把大词，讲成身边的小事"}
              </h2>
              <p className="text-xs text-muted">
                {en ? "No unlocks or purchases needed" : "不需要通关或购买，随时翻阅"}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {LESSON_CONCEPTS.map((concept, i) => (
                <details
                  key={concept.id}
                  className="vic-panel p-4"
                  open={i === 0 || undefined}
                >
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-display text-base font-bold">
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-xs text-brass-deep">0{i + 1}</span>
                      {en ? concept.title.en : concept.title.zh}
                    </span>
                    <BookOpen size={16} className="shrink-0 text-muted" aria-hidden />
                  </summary>
                  <p className="mt-3 border-t border-line pt-3 text-sm leading-relaxed text-ink-soft">
                    {en ? concept.text.en : concept.text.zh}
                  </p>
                </details>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted">
              {en
                ? "Try explaining one idea to someone beside you, then look for it in your next game. These are simplified models for learning, not personal investment instructions."
                : "试着把一个道理讲给身边的人听，再到游戏里找找它。这里是帮助理解的简化模型，不是教你拿真钱去投资。"}
            </p>
          </section>
        )}

        {section === "reports" && (
          <section aria-label={en ? "Personal campaign reports" : "个人战役档案"}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-bold">
                {en ? "Your campaigns" : "每一次尝试都留下经验"}
              </h2>
              <div className="flex gap-2">
                <button
                  className={bestOnly ? "vic-btn-ghost min-h-11 px-4" : "vic-btn-brass min-h-11 px-4"}
                  aria-pressed={!bestOnly}
                  onClick={() => setBestOnly(false)}
                >
                  {en ? "Recent 30" : "最近 30 局"}
                </button>
                <button
                  className={bestOnly ? "vic-btn-brass min-h-11 px-4" : "vic-btn-ghost min-h-11 px-4"}
                  aria-pressed={bestOnly}
                  onClick={() => setBestOnly(true)}
                >
                  {en ? "Personal bests" : "各关最佳"}
                </button>
              </div>
            </div>
            {bestOnly && (
              <p className="mb-3 text-xs leading-relaxed text-muted">
                {en
                  ? "Compared within each chapter: victory first, then recovery stars, purchasing power and employment. Different campaign lengths are shown, not treated as a public competition."
                  : "同一关先比较是否胜利，再比较复苏星级、购买力和就业。记录保留战役时长，不作为公开竞赛排名。"}
              </p>
            )}
            {!reports.length ? (
              <div className="border-2 border-dashed border-line bg-surface px-5 py-10 text-center">
                <FileText size={28} className="mx-auto text-muted" aria-hidden />
                <h3 className="mt-3 font-display text-lg font-bold">
                  {en ? "Your first report is still ahead" : "第一份战报，等你亲手写下"}
                </h3>
                <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
                  {en
                    ? "Finish a campaign to keep its result here, whether you win or lose. Older runs played before the archive existed cannot be reconstructed."
                    : "完成一局剧情战，无论胜败，都会留下记录。档案功能加入前的旧对局无法补回。"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <article key={report.id} className="vic-panel p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs text-muted">
                          {new Date(report.completedAt).toLocaleDateString(en ? "en-US" : "zh-CN")}{" "}
                          · {en ? "seed" : "种子"} {report.seed}
                          {" · "}
                          {lengthLabels[report.length]}
                        </p>
                        <h3 className="vic-letterpress mt-1 text-lg font-bold">
                          {en ? report.scenarioNameEn : report.scenarioNameZh}
                        </h3>
                        <p
                          className={cn(
                            "mt-1 text-sm",
                            report.won ? "text-brass-deep" : "text-muted",
                          )}
                        >
                          {report.won
                            ? en
                              ? "Financial objective achieved"
                              : "守住金融目标"
                            : en
                              ? "A lesson for the next attempt"
                              : "带着经验再出发"}{" "}
                          · {en ? "Recovery" : "复苏"} {report.stars}/3 {en ? "stars" : "星"}
                        </p>
                      </div>
                      <button
                        className="vic-btn-ghost min-h-11 items-center gap-1.5 px-4"
                        onClick={() => void copyReport(report)}
                      >
                        <Copy size={15} aria-hidden />
                        {en ? "Copy report" : "复制战报"}
                      </button>
                    </div>
                    <StoryMissionReview conditions={report.conditions} en={en} />
                    <table className="vic-table mt-4 text-xs">
                      <thead>
                        <tr>
                          <th scope="col">{en ? "Purchasing power" : "生活购买力"}</th>
                          <th scope="col">{en ? "Employment" : "就业"}</th>
                          <th scope="col">{en ? "Time played" : "游玩时间"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="font-mono text-lg text-ink">{report.income.toFixed(1)}</td>
                          <td className="font-mono text-lg text-ink">
                            {report.employment.toFixed(1)}%
                          </td>
                          <td className="font-mono text-lg text-ink">
                            {Math.floor(report.elapsedSeconds / 60)} {en ? "min" : "分钟"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </article>
                ))}
              </div>
            )}
            {shareText && (
              <label className="mt-4 block text-sm font-semibold">
                {en ? "Report text — select to copy" : "战报文字 · 可以选中复制"}
                <textarea
                  readOnly
                  value={shareText}
                  rows={6}
                  onFocus={(event) => event.currentTarget.select()}
                  className="mt-2 w-full resize-y border border-line bg-surface p-3 font-mono text-xs leading-relaxed text-ink"
                />
              </label>
            )}
          </section>
        )}

        {section === "appearance" && (
          <section aria-label={en ? "Free desk appearances" : "免费指挥室外观"}>
            <div className="mb-4">
              <h2 className="font-display text-xl font-bold">
                {en ? "A different atmosphere, the same fair game" : "换一种氛围，实力由自己练出来"}
              </h2>
              <p className="mt-2 text-sm text-muted">
                {en
                  ? "Two original styles are available free. They change colors, never money, difficulty, or learning access."
                  : "两款原创外观都免费使用。只改变配色，不改变资金、难度或学习内容。"}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {(["naval", "slate"] as const).map((appearance) => (
                <article key={appearance} className="vic-panel overflow-hidden">
                  <div
                    data-appearance={appearance}
                    className="cabinet-shell collection-appearance-preview border-b border-line bg-paper p-5 text-ink"
                  >
                    <div className="flex items-center justify-between border-b border-line pb-3">
                      <span className="vic-kicker">
                        {en ? "CABINET / PREVIEW" : "危机内阁 / 配色预览"}
                      </span>
                      <ShieldCheck size={18} className="text-teal-deep" aria-hidden />
                    </div>
                    <p className="mt-4 font-display text-lg font-bold">
                      {appearance === "naval"
                        ? en
                          ? "Naval blue"
                          : "夜航蓝"
                        : en
                          ? "Archive slate"
                          : "档案灰"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {en ? "Every decision leaves a trace." : "每一个决定，都留下回声。"}
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-2" aria-hidden>
                      {["bg-teal", "bg-surface-2", "bg-ink-soft"].map((color) => (
                        <div key={color} className={cn("h-2", color)} />
                      ))}
                    </div>
                    <div className="mt-4 border border-line bg-surface p-3 text-xs">
                      <p className="font-bold text-ink">{en ? "Sample dispatch" : "示例电报"}</p>
                      <p className="mt-1 text-muted">
                        {en ? "The river crossing has reopened." : "河口通航，货船重新靠岸。"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 p-4">
                    <span className="text-xs text-muted">
                      {en ? "Free · permanent" : "免费 · 随时切换"}
                    </span>
                    <button
                      className={
                        collection.appearance === appearance
                          ? "vic-btn-brass min-h-11 items-center gap-1.5 px-4"
                          : "vic-btn-ghost min-h-11 items-center gap-1.5 px-4"
                      }
                      aria-pressed={collection.appearance === appearance}
                      onClick={() => selectAppearance(appearance)}
                    >
                      {collection.appearance === appearance ? (
                        <>
                          <Check size={15} aria-hidden />
                          {en ? "In use" : "正在使用"}
                        </>
                      ) : en ? (
                        "Apply free style"
                      ) : (
                        "免费应用"
                      )}
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <details className="mt-6 border-t border-line pt-4">
              <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">
                {en
                  ? "For adult players and parents: future development"
                  : "给成年玩家与家长：后续开发方向"}
              </summary>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
                {en
                  ? "We are considering complete extra stories and optional visual styles. They are ideas, not products for sale. Learning materials remain free. Future paid content would be a voluntary adult or guardian choice with clear contents and prices."
                  : "未来可以制作完整的新故事和可选外观。以下只是开发想法，并非正在销售的商品；知识教学保持免费。若以后推出付费内容，应由成年玩家或监护人在看清内容与价格后自愿决定。"}
              </p>
              <p className="mt-2 text-xs text-muted">
                {en
                  ? "Private wishlist only: it does not send a vote, order, reminder or contact details."
                  : "这里只记个人愿望清单：不会发送投票、订单、提醒或联系方式。"}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {(
                  [
                    { id: "new-stories", zh: "完整的新故事", en: "Complete new stories" },
                    { id: "desk-styles", zh: "更多指挥室外观", en: "More desk styles" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    aria-pressed={collection.wishlist.includes(item.id)}
                    className={
                      collection.wishlist.includes(item.id)
                        ? "vic-btn-brass min-h-11 items-center gap-1.5 px-4"
                        : "vic-btn-ghost min-h-11 px-4"
                    }
                    onClick={() => wish(item.id)}
                  >
                    {collection.wishlist.includes(item.id) && <Check size={14} aria-hidden />}
                    {en ? item.en : item.zh}
                  </button>
                ))}
              </div>
            </details>
          </section>
        )}
      </main>
    </div>
  );
}
