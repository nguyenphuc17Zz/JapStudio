import React from "react";
import { ZenLoadingState } from "@/components/ui/zen-loading-state";

export default function InterpretLoading() {
  return (
    <ZenLoadingState
      variant="studio"
      title="Đang chuẩn bị phòng Phiên Dịch Việt-Nhật..."
      ja="通訳道場準備中..."
      description="Hệ thống đang soạn đề Việt, ý chính JA và bản dịch mẫu cho bạn..."
    />
  );
}
