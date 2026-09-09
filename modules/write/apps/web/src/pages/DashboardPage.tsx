import { useState } from 'react'
import AiFocusCard from '../components/dashboard/AiFocusCard'
import GreetingHeader from '../components/dashboard/GreetingHeader'
import JourneyCard from '../components/dashboard/JourneyCard'
import MilestonesCard from '../components/dashboard/MilestonesCard'
import MissionCard from '../components/dashboard/MissionCard'
import ProgressCard from '../components/dashboard/ProgressCard'
import RecentImprovementCard from '../components/dashboard/RecentImprovementCard'
import RecommendedCard from '../components/dashboard/RecommendedCard'
import { WritingIntelligenceWidget } from '../components/dashboard/WritingIntelligenceWidget'
import { CrossStudioBanner } from '../components/dashboard/CrossStudioBanner'
import { PageContainer } from '../components/layout/PageContainer'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'

export default function DashboardPage() {
  const today = useAsync(() => api.getLearningToday())
  const gamification = useAsync(() => api.getGamificationToday())
  const milestones = useAsync(() => api.getMilestones())
  const journey = useAsync(() => api.getJourneyStatus())
  const analytics = useAsync(() => api.analyticsLearnerSummary('30d'))
  const health = useAsync(() => api.health())
  const [refreshing, setRefreshing] = useState(false)
  const [regeneratingMission, setRegeneratingMission] = useState(false)

  const refreshRecommendation = async () => {
    setRefreshing(true)
    try {
      await api.nextLearningRecommendation()
      await today.run()
    } finally {
      setRefreshing(false)
    }
  }

  const regenerateMission = async () => {
    setRegeneratingMission(true)
    try {
      await api.regenerateDailyMission()
      await gamification.run()
    } finally {
      setRegeneratingMission(false)
    }
  }

  const summary = gamification.data?.summary ?? null
  const mission = gamification.data?.mission ?? null

  return (
    <PageContainer size="wide">
      <span className="jw-sr-only">
        Trung tâm học tập hằng ngày — nhiệm vụ, trọng tâm và bài tập gợi ý cho bạn.
      </span>

      <GreetingHeader
        streak={summary?.current_streak ?? 0}
        mission={mission}
        missionCompleted={mission?.completed ?? false}
      />

      <CrossStudioBanner />

      <div className="jw-dash">
        <div className="jw-dash-main">
          <MissionCard
            mission={mission}
            regenerating={regeneratingMission}
            loading={gamification.loading}
            error={gamification.error}
            onRegenerate={() => void regenerateMission()}
          />
          <RecommendedCard
            recommendation={today.data?.recommendation ?? null}
            refreshing={refreshing}
            loading={today.loading}
            error={today.error}
            onRefresh={() => void refreshRecommendation()}
          />
          <JourneyCard
            journey={journey.data ?? null}
            loading={journey.loading}
            error={journey.error}
          />
          <ProgressCard
            summary={summary}
            loading={gamification.loading}
            error={gamification.error}
          />
        </div>

        <div className="jw-dash-side">
          <WritingIntelligenceWidget />
          <AiFocusCard
            focus={today.data?.focus ?? null}
            loading={today.loading}
            error={today.error}
          />
          <RecentImprovementCard
            skills={analytics.data?.skills}
            loading={analytics.loading}
            error={analytics.error}
          />
          <MilestonesCard
            milestones={milestones.data?.items}
            loading={milestones.loading}
            error={milestones.error}
          />
        </div>
      </div>

      <div
        className="jw-dash-health jw-text--caption jw-text--muted jw-mt-md"
        style={{ textAlign: 'center', opacity: 0.7 }}
      >
        <span>Trạng thái hệ thống</span>:{' '}
        {health.data
          ? `API ${health.data.status === 'ok' ? 'hoạt động bình thường' : health.data.status} · v${health.data.version}`
          : 'Đang kiểm tra kết nối...'}
      </div>
    </PageContainer>
  )
}