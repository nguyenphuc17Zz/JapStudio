"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ComponentHealth, HealthStatus, healthApi } from "@/services/health-api";
import { toast } from "@/lib/toast";

export function useHealth(pollIntervalMs = 30000) {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [dbHealth, setDbHealth] = useState<ComponentHealth | null>(null);
  const [redisHealth, setRedisHealth] = useState<ComponentHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Theo dõi trạng thái kết nối trước đó: null (chưa xác định), true (đang hoạt động tốt), false (mất kết nối)
  const prevHealthyRef = useRef<boolean | null>(null);

  const checkHealth = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
    }
    setError(null);

    let isNowHealthy = false;
    let failureReason = "";

    try {
      const [h, db, red] = await Promise.allSettled([
        healthApi.getHealth({ suppressToast: true, timeoutMs: 8000 }),
        healthApi.getDbHealth({ suppressToast: true, timeoutMs: 8000 }),
        healthApi.getRedisHealth({ suppressToast: true, timeoutMs: 8000 }),
      ]);

      const healthVal = h.status === "fulfilled" ? h.value : null;
      const dbVal = db.status === "fulfilled" ? db.value : null;
      const redVal = red.status === "fulfilled" ? red.value : null;

      if (healthVal) setHealth(healthVal);
      if (dbVal) setDbHealth(dbVal);
      if (redVal) setRedisHealth(redVal);

      if (healthVal?.status === "healthy" && (dbVal ? dbVal.connected : true)) {
        isNowHealthy = true;
      } else if (!healthVal) {
        failureReason = "Không thể kết nối đến máy chủ Backend";
      } else if (dbVal && !dbVal.connected) {
        failureReason = "Cơ sở dữ liệu Database bị ngắt kết nối";
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to backend API");
      failureReason = err.message || "Lỗi kết nối máy chủ";
    } finally {
      setLoading(false);
    }

    // Xử lý thông báo chuyển trạng thái
    if (!isNowHealthy) {
      // Nếu trước đó đang tốt hoặc đây là lần đầu kiểm tra mà backend bị sập
      if (prevHealthyRef.current !== false) {
        toast.error(
          failureReason
            ? `${failureReason} (Offline). Vui lòng kiểm tra lại dịch vụ Backend!`
            : "Máy chủ Backend đang ngoại tuyến (Offline). Vui lòng kiểm tra lại dịch vụ!"
        );
      }
      prevHealthyRef.current = false;
    } else {
      // Nếu trước đó bị sập và vừa khôi phục thành công
      if (prevHealthyRef.current === false) {
        toast.success("Kết nối đến máy chủ Backend đã được khôi phục thành công!");
      }
      prevHealthyRef.current = true;
    }
  }, []);

  useEffect(() => {
    checkHealth(false);

    // Quét nền định kỳ mỗi 30s
    const interval = setInterval(() => {
      checkHealth(true);
    }, pollIntervalMs);

    // Lắng nghe sự kiện mất mạng và có mạng trở lại của trình duyệt
    const handleBrowserOffline = () => {
      toast.error("Mất kết nối Internet! Vui lòng kiểm tra đường truyền mạng.");
    };
    const handleBrowserOnline = () => {
      toast.success("Đã khôi phục kết nối mạng Internet. Đang kiểm tra lại máy chủ...");
      checkHealth(false);
    };

    window.addEventListener("offline", handleBrowserOffline);
    window.addEventListener("online", handleBrowserOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("offline", handleBrowserOffline);
      window.removeEventListener("online", handleBrowserOnline);
    };
  }, [checkHealth, pollIntervalMs]);

  const isHealthy = health?.status === "healthy" && (dbHealth ? dbHealth.connected : true);

  return {
    health,
    dbHealth,
    redisHealth,
    loading,
    error,
    isHealthy,
    refetch: () => checkHealth(false),
  };
}

