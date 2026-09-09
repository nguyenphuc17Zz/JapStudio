export interface ScenarioCompleteBannerProps {
  score: number | null
  xp: number | null
}

export function ScenarioCompleteBanner({ score, xp }: ScenarioCompleteBannerProps) {
  return (
    <div className="jw-studio-scenario-banner" aria-live="polite">
      <span className="jw-studio-scenario-banner-icon" aria-hidden="true">
        ✦
      </span>
      <p className="jw-studio-scenario-banner-title">Tình huống hoàn thành</p>
      {score !== null ? (
        <p className="jw-studio-scenario-banner-score">{Math.round(score)} / 100</p>
      ) : null}
      {xp !== null && xp > 0 ? (
        <p className="jw-studio-scenario-banner-xp">+{xp} XP</p>
      ) : null}
    </div>
  )
}