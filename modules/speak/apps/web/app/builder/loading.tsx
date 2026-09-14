import React from "react";
import { ZenLoadingState } from "@/components/ui/zen-loading-state";

export default function BuilderLoading() {
  return (
    <ZenLoadingState
      variant="studio"
      title="Đang chuẩn bị phòng Xây Câu (Sentence Builder)..."
      ja="文立て道場準備中..."
      description="Hệ thống đang soạn từ khóa, starter và kỹ năng nối câu cho bạn..."
    />
  );
}
