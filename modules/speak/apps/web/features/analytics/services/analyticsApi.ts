import {
  AnalyticsDashboardDTO,
  GoalProgressDTO,
  InsightDTO,
  MetricValueDTO,
  WeeklyReviewDTO,
} from "../types/analytics";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errData.detail || errData.message || `API Error: ${res.status}`);
  }

  return res.json();
}

export const analyticsApi = {
  getDashboard: (period = "30d", forceRefresh = false): Promise<AnalyticsDashboardDTO> =>
    fetchJson<AnalyticsDashboardDTO>(`/analytics/dashboard?period=${period}&force_refresh=${forceRefresh}`),

  getMetrics: (period = "30d"): Promise<MetricValueDTO[]> =>
    fetchJson<MetricValueDTO[]>(`/analytics/metrics?period=${period}`),

  getMetricDetail: (metricKey: string, period = "30d"): Promise<MetricValueDTO> =>
    fetchJson<MetricValueDTO>(`/analytics/metrics/${encodeURIComponent(metricKey)}?period=${period}`),

  getGoals: (): Promise<GoalProgressDTO[]> => fetchJson<GoalProgressDTO[]>("/analytics/goals"),

  getWeeklyReview: (weekStart?: string): Promise<WeeklyReviewDTO> => {
    const query = weekStart ? `?week_start=${encodeURIComponent(weekStart)}` : "";
    return fetchJson<WeeklyReviewDTO>(`/analytics/weekly${query}`);
  },

  getInsights: (): Promise<InsightDTO[]> => fetchJson<InsightDTO[]>("/analytics/insights"),

  markInsightSeen: (insightId: string): Promise<{ status: string; id: string }> =>
    fetchJson<{ status: string; id: string }>(`/analytics/insights/${insightId}/seen`, {
      method: "POST",
    }),

  refreshSnapshot: (): Promise<{ status: string; snapshot_date: string }> =>
    fetchJson<{ status: string; snapshot_date: string }>("/analytics/snapshot/refresh", {
      method: "POST",
    }),

  getDiagnostic: (period = "30d"): Promise<any> =>
    fetchJson<any>(`/analytics/diagnostic?period=${period}`),
};
