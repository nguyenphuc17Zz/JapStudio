import React from "react";
import { ZenLoadingState } from "@/components/ui/zen-loading-state";

export default function AizuchiLoading() {
  return (
    <ZenLoadingState
      variant="studio"
      title="Đang chuẩn bị phòng Luyện Phản Hồi (Aizuchi Dojo)..."
      ja="相づち道場準備中..."
      description="Hệ thống đang nạp NPC, cửa sổ pause và bảng aizuchi mẫu..."
    />
  );
}
