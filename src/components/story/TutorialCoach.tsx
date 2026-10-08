import { useEffect } from "react";
import { GraduationCap } from "lucide-react";
import { sfxClick, sfxGood } from "@/lib/game/audio";
import { useI18n } from "@/lib/i18n";
import { scenarioOf } from "@/lib/story/scenarios";
import { useStory } from "@/lib/story/store";
import { markTutorialDone } from "@/lib/story/tutorial";
import "./TutorialCoach.css";

type StoryState = ReturnType<typeof useStory.getState>;

interface Step {
  /** Which control to spotlight (matches a data-tut attribute). */
  focus?: "gauge" | "rate" | "spend" | "execute" | "skip" | "phone";
  /** Needs the policy desk open. */
  policy?: boolean;
  text: (st: StoryState, en: boolean) => string;
  /** Info steps advance on a button; action steps advance when this turns true. */
  done?: (st: StoryState) => boolean;
  cta?: { zh: string; en: string };
}

const lx = (st: StoryState) => scenarioOf(st.scenarioId).lexicon;

const STEPS: Step[] = [
  {
    text: (_, en) =>
      en
        ? "Autumn, and depositors are queuing to pull their money out of the banks: a bank run. You are the governor, and your job is to make the panic die down. Let's walk through it together — about five minutes, and you cannot lose."
        : "秋天，储户在银行门口排队取钱——这叫「挤兑」。你是央行行长，任务是让恐慌退下去。我带你走一遍，大约 5 分钟，不会输。",
    cta: { zh: "开始", en: "Start" },
  },
  {
    focus: "gauge",
    text: (st, en) =>
      en
        ? `First, look here: "${lx(st).lineEn}". The closer it gets to 100%, the closer the banks are to collapse. Our goal is to push it down.`
        : `先看这里：「${lx(st).lineZh}」。数字越接近 100%，银行就越危险。我们的目标是把它压下去。`,
    cta: { zh: "明白", en: "Got it" },
  },
  {
    focus: "rate",
    policy: true,
    text: (st, en) =>
      en
        ? `Drag "${lx(st).rateEn}" all the way to the right. When money is dear, people are in less of a hurry to pull it out.`
        : `把「${lx(st).rateZh}」滑块拉到最右边。借钱变贵了，大家就不急着把钱抽走。`,
    done: (st) => (st.draft.rate ?? st.run!.rate) >= scenarioOf(st.scenarioId).maxRate - 1e-9,
  },
  {
    focus: "spend",
    policy: true,
    text: (st, en) =>
      en
        ? `Now drag "${lx(st).spendEn}" to about 25%. That lends money straight to the banks, so the people in the queue can be paid.`
        : `再把「${lx(st).spendZh}」拉到 25% 左右。这是把钱直接借给银行，让排队的人取得到钱。`,
    done: (st) => {
      const s = scenarioOf(st.scenarioId);
      return (st.draft.spend ?? 0) >= 0.2 * (s.reserves - s.committedForward);
    },
  },
  {
    focus: "execute",
    policy: true,
    text: (_, en) => (en ? 'Press "Execute decision now". Your orders take effect at once.' : "点「立即执行决策」，命令马上生效。"),
    done: (st) => st.submitted === "orders",
  },
  {
    focus: "skip",
    text: (_, en) =>
      en
        ? 'Well done. Now press "End turn": time moves on to the next market reckoning, and you will see whether the panic eased.'
        : "很好！现在点「结束本回合」：时间会走到下一次市场检验，看看恐慌有没有退。",
    done: (st) => (st.run?.day ?? 1) >= 2,
  },
  {
    focus: "phone",
    text: (_, en) =>
      en
        ? "Someone is calling. Read what they say and pick an answer — any answer is fine while you are learning."
        : "有人打电话来了。读一读对方说什么，选一个回答就行——学习阶段选哪个都可以。",
    done: (st) => st.run!.callsDone.length >= 1 || !st.phone,
  },
  {
    text: (_, en) =>
      en
        ? "That's the whole loop: lend → execute → end turn. Keep the panic away from 100% until the last day and you win. Over to you."
        : "就这三步：注资 → 执行 → 结束回合。坚持到最后一天，别让恐慌冲到 100%，你就赢了。剩下的交给你。",
    cta: { zh: "开始独立指挥", en: "Take command" },
  },
];

const FOCUS_ATTR = "tutFocus";

/** The guided first crisis: one instruction at a time, the right control lit up. */
export function TutorialCoach({ desk, onGoPolicy }: { desk: string; onGoPolicy: () => void }) {
  const en = useI18n((s) => s.lang) === "en";
  const st = useStory();
  const step = st.tutorial;
  const def = step === null ? null : STEPS[step];

  // Advance automatically once the player has done what the step asks.
  useEffect(() => {
    if (step === null || !def?.done) return;
    if (def.done(useStory.getState())) {
      sfxGood();
      st.setTutorial(step + 1);
    }
  });

  // Spotlight the control this step is about.
  useEffect(() => {
    const body = document.body;
    if (def?.focus) body.dataset[FOCUS_ATTR] = def.focus;
    else delete body.dataset[FOCUS_ATTR];
    return () => {
      delete body.dataset[FOCUS_ATTR];
    };
  }, [def?.focus]);

  if (step === null || !def) return null;
  const finish = () => {
    markTutorialDone();
    st.setTutorial(null);
  };
  const wrongDesk = def.policy && desk !== "policy";

  return (
    <aside
      className="vic-panel fixed inset-x-3 bottom-10 z-40 px-4 py-3 shadow-[0_10px_30px_-10px_#3a2c1880] sm:inset-x-auto sm:left-5 sm:w-96"
      role="status"
      aria-live="polite"
    >
      <p className="vic-kicker flex items-center gap-1.5">
        <GraduationCap className="size-4" aria-hidden />
        {en ? `TUTORIAL · STEP ${step + 1}/${STEPS.length}` : `新手教学 · 第 ${step + 1}/${STEPS.length} 步`}
      </p>
      <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{def.text(st, en)}</p>
      {wrongDesk ? (
        <button type="button" onClick={onGoPolicy} className="mt-2 text-sm font-bold text-brass-deep underline underline-offset-4">
          {en ? "Open the Policy desk" : "先打开「政策与机构」页"}
        </button>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-2">
        <button type="button" onClick={finish} className="text-xs text-muted underline underline-offset-4 hover:text-ink">
          {en ? "Skip tutorial" : "跳过教学"}
        </button>
        {def.cta ? (
          <button
            type="button"
            onClick={() => {
              sfxClick();
              if (step === STEPS.length - 1) finish();
              else st.setTutorial(step + 1);
            }}
            className="rounded-[3px] border border-brass-deep bg-gradient-to-b from-[#ecd08a] to-[#b98f34] px-4 py-2 text-sm font-bold shadow-[inset_0_1px_0_#fff6]"
          >
            {en ? def.cta.en : def.cta.zh}
          </button>
        ) : (
          <span className="text-xs text-muted">{en ? "Waiting for you…" : "等你操作…"}</span>
        )}
      </div>
    </aside>
  );
}
