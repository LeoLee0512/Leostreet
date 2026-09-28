import type { MissionCondition } from "@/lib/story/mission";

export function StoryMissionReview({
  conditions,
  en,
}: {
  conditions?: MissionCondition[];
  en: boolean;
}) {
  return (
    <section className="vic-panel my-4 p-4" data-testid="mission-review">
      <h3 className="vic-kicker">
        {en ? "Victory check · final settlement" : "通关核对 · 最终结算"}
      </h3>
      {conditions?.length ? (
        <table className="vic-table mt-3">
          <thead>
            <tr>
              <th scope="col">{en ? "Condition" : "通关条件"}</th>
              <th scope="col">{en ? "Final" : "最终"}</th>
              <th scope="col">{en ? "Required" : "要求"}</th>
              <th scope="col" className="text-right">{en ? "Verdict" : "判定"}</th>
            </tr>
          </thead>
          <tbody>
            {conditions.map((c) => (
              <tr key={c.id}>
                <td className="font-bold">{en ? c.en : c.zh}</td>
                <td className="font-mono text-xs text-ink-soft">{c.current}</td>
                <td className="font-mono text-xs text-ink-soft">{c.target}</td>
                <td
                  className={
                    c.met
                      ? "text-right font-bold text-up"
                      : "text-right font-bold text-down"
                  }
                >
                  {c.met ? "✓ " : "× "}
                  {c.met ? (en ? "Passed" : "达标") : en ? "Not met" : "未达标"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mt-3 text-sm text-muted">
          {en
            ? "This older report did not save final victory metrics. Its exact failed condition cannot be recovered."
            : "这份旧战报未保存最终通关指标，无法还原具体哪项未达标。"}
        </p>
      )}
      <p className="mt-3 border-t border-line pt-3 text-sm leading-relaxed text-ink-soft">
        {en
          ? "Recovery stars and social milestones are additional achievements. They do not replace the financial victory conditions."
          : "复苏星级和民生阶段目标是额外成果；即使拿到 3 星，也仍需满足金融通关条件。"}
      </p>
    </section>
  );
}
