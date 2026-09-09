import { apiClient, RequestOptions } from "./api-client";

export interface HealthStatus {
  status: string;
  app_name: string;
  environment: string;
  version: string;
}

export interface ComponentHealth {
  status: string;
  component: string;
  connected: boolean;
  error?: string;
  message?: string;
}

export const healthApi = {
  getHealth: (options?: RequestOptions) => apiClient.get<HealthStatus>("/health", options),
  getDbHealth: (options?: RequestOptions) => apiClient.get<ComponentHealth>("/health/db", options),
  getRedisHealth: (options?: RequestOptions) => apiClient.get<ComponentHealth>("/health/redis", options),
};

