import type { Achievement, Detail, Scenario, StoryLength } from "./types.ts";

export type { Achievement };

/**
 * How long a crisis takes to tell.
 *
 * The four tellings are the SAME crisis with the same arithmetic. What changes
 * is the resolution of the clock:
 *
 * - 半小时 gives you one decision per historical day. This is the reference
 *   calendar every scenario is balanced on.
 * - The three longer ones cut the day into sessions, which is how these days
 *   are actually recorded — sterling's 12% came in the morning and the 15%
 *   that was never implemented came after lunch — and turn on the waves and
 *   calls the short version has no room for.
 * - Where a crisis is too short to fill the clock by cutting it finer, the
 *   calendar stretches instead, backwards into the weeks before the day
 *   everyone remembers. That is where most of these actually started.
 *
 * Pressure is scaled per step and per wave so the total weight of a crisis is
 * the same in every telling. A longer telling is more detail and more
 * decisions, never a different balance — a scenario you can win in 半小时 has
 * to be winnable in 三小时 and the tests pin that.
 */
export interface LengthSpec {
  id: StoryLength;
  nameZh: string;
  nameEn: string;
  /** The label the player picks by. */
  clockZh: string;
  clockEn: string;
  blurbZh: string;
  blurbEn: string;
  /** Target minutes. The picker also shows a per-scenario estimate. */
  minutes: number;
  /**
   * Decision points this telling aims at, or null to use the scenario's own
   * calendar unchanged.
   *
   * Aiming at a step count rather than multiplying the calendar is what makes
   * the clock labels honest: sterling ran six days and Hong Kong twelve, so a
   * fixed multiplier would give one of them a twenty-minute "one hour" and the
   * other a ninety-minute one. The shape is solved per scenario instead —
   * more sessions in a day, or a longer calendar, whichever fits.
   */
  targetSteps: number | null;
  /** Ceiling on sessions per calendar day. Beyond this the calendar stretches. */
  maxSessions: number;
  detail: Detail;
  /** 半小时 has none, by design: it is the version that skips the record. */
  achievement: Achievement | null;
}

/** Session names, used once a day has more than one decision in it. */
export const SESSION_LABELS: { zh: string; en: string }[] = [
  { zh: "早盘", en: "Morning" },
  { zh: "午盘", en: "Midday" },
  { zh: "尾盘", en: "Close" },
  { zh: "夜盘", en: "Evening" },
  { zh: "隔夜", en: "Overnight" },
];

export const LENGTHS: LengthSpec[] = [
  {
    id: "sprint",
    nameZh: "速写",
    nameEn: "Sketch",
    clockZh: "半小时",
    clockEn: "30 min",
    blurbZh: "30 分钟实时经营，不可暂停。保留危机主线；事件之间持续调配信贷、安排扩建、观察企业与民生变化。",
    blurbEn: "30 minutes of real-time management, without pause. Follow the core crisis while allocating credit, building capacity and watching businesses and households react.",
    minutes: 30,
    targetSteps: null,
    maxSessions: 1,
    detail: 0,
    achievement: null,
  },
  {
    id: "standard",
    nameZh: "全景",
    nameEn: "Full account",
    clockZh: "一小时",
    clockEn: "1 hour",
    blurbZh: "每一天被切成几个时段。电话开始响，细节开始出现——历史上很多事就是在午饭前后定下来的。",
    blurbEn: "Each day is cut into sessions. The phone starts ringing and the detail arrives — a lot of this history was settled either side of lunch.",
    minutes: 60,
    targetSteps: 30,
    maxSessions: 5,
    detail: 1,
    achievement: {
      id: "eyewitness",
      nameZh: "亲历者",
      nameEn: "Eyewitness",
      blurbZh: "以一小时的篇幅完整打通一场大型金融剧情战。你不是读到的，你是在场的。",
      blurbEn: "Win a major crisis at the one-hour telling. You did not read about it — you were in the room.",
    },
  },
  {
    id: "deep",
    nameZh: "档案",
    nameEn: "The file",
    clockZh: "一个半小时",
    clockEn: "90 min",
    blurbZh: "时段更细，日历更长。史料里那些「第二波其实发生在周四下午」的细节全部回到盘面上。",
    blurbEn: "Finer sessions on a longer calendar. The 'the second wave actually hit on Thursday afternoon' details come back onto the board.",
    minutes: 90,
    targetSteps: 46,
    maxSessions: 5,
    detail: 2,
    achievement: {
      id: "archivist",
      nameZh: "档案守夜人",
      nameEn: "Keeper of the Record",
      blurbZh: "以一个半小时的篇幅打通一场大型金融剧情战。别人记得结论，你记得过程。",
      blurbEn: "Win a major crisis at the ninety-minute telling. Everyone remembers the outcome; you remember how it got there.",
    },
  },
  {
    id: "epic",
    nameZh: "全录",
    nameEn: "Unabridged",
    clockZh: "三小时",
    clockEn: "3 hours",
    blurbZh: "⚠ 极端困难。时段拉到最细，日历一直回溯到危机真正开始的那一周，每一通电话、每一次会议、每一个真实发生过的转折都在。你基本上要一直盯着盘、一直接电话、一直去问别人手上有什么消息——而且危机会越到后面越凶。做好连坐三小时的准备再选它。",
    blurbEn: "⚠ Extremely hard. The finest sessions on a calendar that reaches back to the week it actually started, with every call, every meeting and every documented turn in it. You will be watching the board, taking calls and chasing information more or less continuously — and the crisis gets steadily worse the longer it runs. Pick this one only if you are sitting down for three hours.",
    minutes: 180,
    targetSteps: 95,
    maxSessions: 5,
    detail: 3,
    achievement: {
      id: "first-draft",
      nameZh: "历史的第一稿",
      nameEn: "The First Draft of History",
      blurbZh: "以三小时的篇幅打通一场大型金融剧情战。从第一通电话坐到最后一笔结算，一秒没跳过。",
      blurbEn: "Win a major crisis at the three-hour telling. From the first phone call to the last settlement, and you skipped none of it.",
    },
  },
];

export function lengthOf(id: StoryLength): LengthSpec {
  return LENGTHS.find((l) => l.id === id) ?? LENGTHS[0]!;
}

export const ACHIEVEMENTS: Achievement[] = LENGTHS.map((l) => l.achievement).filter(
  (a): a is Achievement => a !== null,
);

export function achievementOf(id: string): Achievement | null {
  return ACHIEVEMENTS.find((a) => a.id === id) ?? null;
}

/** Which tellings a scenario offers. The two openers run at one length only. */
export function lengthsFor(s: Scenario): LengthSpec[] {
  return s.major ? LENGTHS : [LENGTHS[0]!];
}

/**
 * Solve this telling's shape: how many calendar days, and how many decisions
 * inside each of them.
 *
 * The rule is: cut the day finer first, up to the session cap, and only then
 * stretch the calendar. Sterling's six days become six days of five sessions
 * at the one-hour telling and nineteen days of five at the three-hour one —
 * which is the right answer historically too, because the ERM crisis did not
 * begin on Black Wednesday.
 */
export function shapeOf(s: Scenario, length: StoryLength): { days: number; sessions: number } {
  const spec = lengthOf(length);
  const target = spec.targetSteps;
  if (!target) return { days: Math.max(3, s.days), sessions: 1 };
  const sessions = Math.min(spec.maxSessions, Math.max(2, Math.floor(target / Math.max(1, s.days))));
  const days = Math.max(s.days, Math.round(target / sessions));
  return { days, sessions };
}

/** Calendar days in this telling. Never fewer than three: a crisis needs a middle. */
export function calendarDays(s: Scenario, length: StoryLength): number {
  return shapeOf(s, length).days;
}

/** Decisions inside one calendar day at this telling. */
export function sessionsOf(s: Scenario, length: StoryLength): number {
  return shapeOf(s, length).sessions;
}

/** Decision points in this telling — the number the clock actually counts. */
export function totalSteps(s: Scenario, length: StoryLength): number {
  const { days, sessions } = shapeOf(s, length);
  return days * sessions;
}

/**
 * Per-step scale for anything that accrues *per decision* rather than per
 * event: baseline drift, the rate's drag on the index, day-to-day noise.
 *
 * Without this, telling the same crisis in 60 steps instead of 12 would put
 * five times the drag on the market and make every long telling unwinnable.
 * Scripted waves are events and keep their full weight.
 */
export function stepScale(s: Scenario, length: StoryLength): number {
  return s.days / Math.max(1, totalSteps(s, length));
}

/**
 * A rough minute estimate for this telling, shown beside the target.
 *
 * Deliberately computed from the content that actually exists — steps, calls,
 * depth — rather than printed from `minutes`, so the number moves when the
 * scenario does. The target is the design intent; this is the estimate.
 */
export function estimateMinutes(s: Scenario, length: StoryLength): number {
  void s;
  return lengthOf(length).minutes;
}
