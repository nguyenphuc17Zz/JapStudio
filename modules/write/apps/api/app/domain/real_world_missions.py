"""Domain taxonomy, metadata and definitions for Real-World Writing Missions (Phase 20).

Covers:
- 4 real-world categories: daily_life, work, services, social.
- 23 practical action types with descriptions, default registers and communicative goals.
- 3 prompt modes (Mode A: Vietnamese Scenario, Mode B: Japanese Scenario, Mode C: Contextual Simulation In-Basket).
- 10-dimensional evaluation metadata, descriptions and scoring weights.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

MissionCategoryType = Literal["daily_life", "work", "services", "social"]
PromptModeType = Literal["vietnamese_scenario", "japanese_scenario", "contextual_simulation"]

MISSION_CATEGORIES: list[str] = [
    "daily_life",
    "work",
    "services",
    "social",
]

CATEGORY_LABELS: dict[str, dict[str, str]] = {
    "daily_life": {
        "vi": "Đời sống hàng ngày",
        "ja": "日常生活",
        "icon": "home",
        "description": "Các tình huống giao tiếp thường nhật như lên kế hoạch, hủy hẹn, nhờ vả, giải thích vấn đề và xin lỗi.",
    },
    "work": {
        "vi": "Công việc & Công sở",
        "ja": "仕事・ビジネス",
        "icon": "briefcase",
        "description": "Giao tiếp công sở chuẩn mực: báo cáo tiến độ, hỏi ý kiến đồng nghiệp, xin nghỉ phép, dời deadline, viết email kinh doanh.",
    },
    "services": {
        "vi": "Dịch vụ & Mua sắm",
        "ja": "サービス・問い合わせ",
        "icon": "shopping-bag",
        "description": "Tương tác với các đơn vị dịch vụ: đặt bàn/phòng, khiếu nại lịch thiệp, yêu cầu đổi trả hàng, liên hệ hỗ trợ khách hàng.",
    },
    "social": {
        "vi": "Giao tiếp xã hội",
        "ja": "ソーシャル・交流",
        "icon": "users",
        "description": "Duy trì và phát triển các mối quan hệ xã hội: mời tham gia sự kiện, viết thư cảm ơn, cập nhật tình hình dạo này.",
    },
}


@dataclass(frozen=True)
class MissionActionDef:
    category: MissionCategoryType
    action_type: str
    label_vi: str
    label_ja: str
    default_register: str
    recommended_jlpt: list[str]
    default_medium: str
    typical_role_vi: str
    typical_recipient_vi: str
    communicative_purpose_vi: str


MISSION_ACTIONS: dict[str, MissionActionDef] = {
    # -- DAILY LIFE (6 actions) -----------------------------------------------
    "making_plans": MissionActionDef(
        category="daily_life",
        action_type="making_plans",
        label_vi="Lên kế hoạch & Hẹn gặp",
        label_ja="予定を立てる・約束",
        default_register="casual",
        recommended_jlpt=["N5", "N4", "N3"],
        default_medium="chat",
        typical_role_vi="Bạn bè / Người quen",
        typical_recipient_vi="Bạn cùng lớp / Đồng nghiệp thân thiết",
        communicative_purpose_vi="Đề xuất thời gian, địa điểm và hoạt động cụ thể để hẹn gặp.",
    ),
    "cancelling_plans": MissionActionDef(
        category="daily_life",
        action_type="cancelling_plans",
        label_vi="Hủy hẹn & Xin dời lịch",
        label_ja="約束のキャンセル・日程変更",
        default_register="polite",
        recommended_jlpt=["N5", "N4", "N3", "N2"],
        default_medium="chat",
        typical_role_vi="Người tham gia buổi hẹn",
        typical_recipient_vi="Bạn bè / Người hẹn",
        communicative_purpose_vi="Báo hủy hẹn kịp thời, giải thích lý do chính đáng và đề xuất thời gian hẹn lại một cách lịch thiệp.",
    ),
    "asking_for_help": MissionActionDef(
        category="daily_life",
        action_type="asking_for_help",
        label_vi="Nhờ vả & Xin giúp đỡ",
        label_ja="助けを求める・依頼",
        default_register="polite",
        recommended_jlpt=["N5", "N4", "N3"],
        default_medium="chat",
        typical_role_vi="Cư dân / Người cần hỗ trợ",
        typical_recipient_vi="Hàng xóm / Bạn bè / Nhân viên hỗ trợ",
        communicative_purpose_vi="Trình bày tình huống khó khăn và đưa ra lời nhờ vả lịch sự, không tạo áp lực.",
    ),
    "explaining_a_problem": MissionActionDef(
        category="daily_life",
        action_type="explaining_a_problem",
        label_vi="Trình bày sự cố & Vấn đề",
        label_ja="問題の説明・相談",
        default_register="polite",
        recommended_jlpt=["N4", "N3", "N2"],
        default_medium="chat",
        typical_role_vi="Người thuê nhà / Khách hàng",
        typical_recipient_vi="Chủ nhà / Quản lý tòa nhà",
        communicative_purpose_vi="Mô tả cụ thể sự cố (thiết bị hỏng, rò rỉ nước, tiếng ồn) và yêu cầu phương án xử lý.",
    ),
    "apologizing": MissionActionDef(
        category="daily_life",
        action_type="apologizing",
        label_vi="Xin lỗi & Tạ lỗi",
        label_ja="謝罪・お詫び",
        default_register="polite",
        recommended_jlpt=["N5", "N4", "N3", "N2"],
        default_medium="chat",
        typical_role_vi="Người gây ra sự cố hoặc chậm trễ",
        typical_recipient_vi="Người bị ảnh hưởng",
        communicative_purpose_vi="Bày tỏ sự hối tiếc chân thành, giải thích nguyên nhân và đưa ra hướng khắc phục.",
    ),
    "making_a_request": MissionActionDef(
        category="daily_life",
        action_type="making_a_request",
        label_vi="Đưa ra yêu cầu lịch sự",
        label_ja="丁寧な依頼",
        default_register="polite",
        recommended_jlpt=["N5", "N4", "N3", "N2"],
        default_medium="chat",
        typical_role_vi="Người gửi yêu cầu",
        typical_recipient_vi="Bạn cùng phòng / Quản lý / Hàng xóm",
        communicative_purpose_vi="Đưa ra yêu cầu cụ thể với câu đệm và ngữ điệu mềm mỏng, nhã nhặn.",
    ),
    # -- WORK (8 actions) -----------------------------------------------------
    "progress_update": MissionActionDef(
        category="work",
        action_type="progress_update",
        label_vi="Báo cáo tiến độ (進捗報告)",
        label_ja="進捗報告",
        default_register="business",
        recommended_jlpt=["N4", "N3", "N2", "N1"],
        default_medium="email",
        typical_role_vi="Kỹ sư phần mềm / Thành viên dự án",
        typical_recipient_vi="Trưởng nhóm (Team Lead) / Quản lý dự án (PM)",
        communicative_purpose_vi="Báo cáo tình trạng công việc đã hoàn thành, hạng mục đang làm và dự kiến hoàn tất.",
    ),
    "asking_a_colleague": MissionActionDef(
        category="work",
        action_type="asking_a_colleague",
        label_vi="Hỏi ý kiến & Nhờ đồng nghiệp (相談・質問)",
        label_ja="同僚への相談・質問",
        default_register="polite",
        recommended_jlpt=["N4", "N3", "N2", "N1"],
        default_medium="chat",
        typical_role_vi="Nhân viên / Lập trình viên",
        typical_recipient_vi="Đồng nghiệp cùng nhóm / Tiền bối (Senpai)",
        communicative_purpose_vi="Đặt câu hỏi rõ ràng về nghiệp vụ, xin tài liệu hoặc nhờ hỗ trợ kiểm tra mã nguồn.",
    ),
    "reporting_a_problem": MissionActionDef(
        category="work",
        action_type="reporting_a_problem",
        label_vi="Báo cáo sự cố khẩn cấp (トラブル報告)",
        label_ja="トラブル・問題の報告",
        default_register="business",
        recommended_jlpt=["N3", "N2", "N1"],
        default_medium="email",
        typical_role_vi="Kỹ sư phụ trách hệ thống / BrSE",
        typical_recipient_vi="Quản lý / Khách hàng / Các bên liên quan",
        communicative_purpose_vi="Thông báo sự cố khẩn, phạm vi ảnh hưởng, nguyên nhân sơ bộ và biện pháp tạm thời/lâu dài.",
    ),
    "scheduling": MissionActionDef(
        category="work",
        action_type="scheduling",
        label_vi="Sắp xếp & Điều chỉnh lịch họp (日程調整)",
        label_ja="日程調整・会議の設定",
        default_register="business",
        recommended_jlpt=["N4", "N3", "N2", "N1"],
        default_medium="email",
        typical_role_vi="Người tổ chức cuộc họp / Thành viên dự án",
        typical_recipient_vi="Đối tác / Khách hàng / Đồng nghiệp",
        communicative_purpose_vi="Đưa ra các khung giờ ứng viên (Candidate slots) và đề nghị đối tác xác nhận.",
    ),
    "absence_notice": MissionActionDef(
        category="work",
        action_type="absence_notice",
        label_vi="Báo nghỉ phép & Đi muộn (勤怠連絡)",
        label_ja="勤怠連絡・休暇申請",
        default_register="business",
        recommended_jlpt=["N5", "N4", "N3", "N2"],
        default_medium="email",
        typical_role_vi="Nhân viên công ty",
        typical_recipient_vi="Quản lý trực tiếp (Manager) & Phòng nhân sự",
        communicative_purpose_vi="Thông báo lý do vắng mặt/đi muộn, bàn giao công việc khẩn cấp và cách thức liên lạc.",
    ),
    "deadline_delay": MissionActionDef(
        category="work",
        action_type="deadline_delay",
        label_vi="Xin gia hạn deadline (納期・期限延長依頼)",
        label_ja="納期・期限延長の依頼",
        default_register="business",
        recommended_jlpt=["N3", "N2", "N1"],
        default_medium="email",
        typical_role_vi="Kỹ sư chịu trách nhiệm / Trưởng nhóm",
        typical_recipient_vi="Quản lý / Khách hàng",
        communicative_purpose_vi="Giải thích lý do chậm trễ khách quan, chân thành xin lỗi và cam kết thời hạn hoàn tất mới.",
    ),
    "internal_message": MissionActionDef(
        category="work",
        action_type="internal_message",
        label_vi="Tin nhắn trao đổi nội bộ (社内チャット)",
        label_ja="社内チャットメッセージ",
        default_register="polite",
        recommended_jlpt=["N5", "N4", "N3", "N2"],
        default_medium="chat",
        typical_role_vi="Thành viên nhóm",
        typical_recipient_vi="Kênh chung hoặc đồng nghiệp trên Slack/Teams",
        communicative_purpose_vi="Chia sẻ thông tin ngắn gọn, thông báo cập nhật hoặc nhờ việc nhanh gọn, súc tích.",
    ),
    "business_email": MissionActionDef(
        category="work",
        action_type="business_email",
        label_vi="Email công việc chuẩn mực (ビジネスメール)",
        label_ja="ビジネスメール",
        default_register="business",
        recommended_jlpt=["N3", "N2", "N1"],
        default_medium="email",
        typical_role_vi="Đại diện công ty / Kỹ sư BrSE",
        typical_recipient_vi="Khách hàng / Đối tác doanh nghiệp",
        communicative_purpose_vi="Soạn email chuẩn cấu trúc (Tiêu đề, Xưng hô, Lời chào đầu/cuối, Nội dung chính, Chữ ký).",
    ),
    # -- SERVICES (5 actions) -------------------------------------------------
    "complaint": MissionActionDef(
        category="services",
        action_type="complaint",
        label_vi="Khiếu nại dịch vụ (クレーム・意見)",
        label_ja="クレーム・意見の伝達",
        default_register="business",
        recommended_jlpt=["N3", "N2", "N1"],
        default_medium="email",
        typical_role_vi="Khách hàng / Người sử dụng dịch vụ",
        typical_recipient_vi="Bộ phận chăm sóc khách hàng / Ban quản lý",
        communicative_purpose_vi="Trình bày khiếm khuyết dịch vụ một cách lịch sự, khách quan và yêu cầu biện pháp giải quyết thích đáng.",
    ),
    "return_refund": MissionActionDef(
        category="services",
        action_type="return_refund",
        label_vi="Yêu cầu đổi trả & Hoàn tiền (返品・返金依頼)",
        label_ja="返品・返金・交換の依頼",
        default_register="polite",
        recommended_jlpt=["N4", "N3", "N2"],
        default_medium="email",
        typical_role_vi="Người mua hàng trực tuyến",
        typical_recipient_vi="Cửa hàng / Bộ phận hỗ trợ mua sắm",
        communicative_purpose_vi="Cung cấp mã đơn hàng, mô tả lỗi sản phẩm và yêu cầu thủ tục đổi hàng mới hoặc hoàn tiền.",
    ),
    "reservation": MissionActionDef(
        category="services",
        action_type="reservation",
        label_vi="Đặt chỗ nhà hàng & Khách sạn (予約)",
        label_ja="予約・リクエスト",
        default_register="polite",
        recommended_jlpt=["N5", "N4", "N3", "N2"],
        default_medium="email",
        typical_role_vi="Khách đặt dịch vụ",
        typical_recipient_vi="Nhà hàng / Khách sạn / Đại lý du lịch",
        communicative_purpose_vi="Nêu rõ số lượng người, ngày giờ, các yêu cầu đặc biệt (dị ứng thực phẩm, phòng không hút thuốc).",
    ),
    "appointment": MissionActionDef(
        category="services",
        action_type="appointment",
        label_vi="Đặt lịch hẹn khám & Thủ tục (窓口・診察予約)",
        label_ja="窓口・診察・面談の予約",
        default_register="polite",
        recommended_jlpt=["N4", "N3", "N2"],
        default_medium="email",
        typical_role_vi="Bệnh nhân / Người làm thủ tục hành chính",
        typical_recipient_vi="Phòng khám / Cơ quan hành chính (City Hall)",
        communicative_purpose_vi="Mô tả mục đích đến khám/làm thủ tục, chọn khung giờ thuận tiện và hỏi các giấy tờ cần mang theo.",
    ),
    "customer_support": MissionActionDef(
        category="services",
        action_type="customer_support",
        label_vi="Liên hệ hỗ trợ khách hàng (サポート問合せ)",
        label_ja="カスタマーサポートへの問い合わせ",
        default_register="polite",
        recommended_jlpt=["N4", "N3", "N2", "N1"],
        default_medium="email",
        typical_role_vi="Người dùng dịch vụ",
        typical_recipient_vi="Tổng đài CSKH / Đội ngũ kỹ thuật",
        communicative_purpose_vi="Hỏi về tính năng, xử lý lỗi đăng nhập, hoặc hướng dẫn sử dụng tài khoản.",
    ),
    # -- SOCIAL (4 actions) ---------------------------------------------------
    "invitation": MissionActionDef(
        category="social",
        action_type="invitation",
        label_vi="Mời tham gia sự kiện (招待・お誘い)",
        label_ja="イベント・食事への招待",
        default_register="casual",
        recommended_jlpt=["N5", "N4", "N3", "N2"],
        default_medium="chat",
        typical_role_vi="Người tổ chức / Bạn bè",
        typical_recipient_vi="Bạn bè / Đồng nghiệp / Thành viên câu lạc bộ",
        communicative_purpose_vi="Gửi lời mời tham gia tiệc mừng, bữa ăn hoặc sự kiện cuối tuần kèm thông tin thời gian địa điểm.",
    ),
    "thank_you_message": MissionActionDef(
        category="social",
        action_type="thank_you_message",
        label_vi="Thư & Tin nhắn cảm ơn (お礼メッセージ)",
        label_ja="お礼メッセージ",
        default_register="polite",
        recommended_jlpt=["N5", "N4", "N3", "N2"],
        default_medium="chat",
        typical_role_vi="Người nhận sự giúp đỡ hoặc tham dự sự kiện",
        typical_recipient_vi="Người đã giúp đỡ / Người tổ chức tiệc",
        communicative_purpose_vi="Bày tỏ lòng biết ơn cụ thể về hành động giúp đỡ hoặc trải nghiệm vui vẻ vừa qua.",
    ),
    "casual_update": MissionActionDef(
        category="social",
        action_type="casual_update",
        label_vi="Hỏi thăm & Cập nhật tình hình (近況報告)",
        label_ja="近況報告・挨拶",
        default_register="casual",
        recommended_jlpt=["N5", "N4", "N3", "N2"],
        default_medium="chat",
        typical_role_vi="Bạn bè / Người quen lâu ngày",
        typical_recipient_vi="Bạn bè cũ / Người quen",
        communicative_purpose_vi="Hỏi thăm sức khỏe, chia sẻ ngắn gọn về cuộc sống dạo này và duy trì mối quan hệ tốt đẹp.",
    ),
    "explanation": MissionActionDef(
        category="social",
        action_type="explanation",
        label_vi="Giải thích hoàn cảnh & Lý do (事情説明)",
        label_ja="事情説明・理由の説明",
        default_register="polite",
        recommended_jlpt=["N4", "N3", "N2", "N1"],
        default_medium="chat",
        typical_role_vi="Thành viên nhóm / Bạn bè",
        typical_recipient_vi="Người quen / Nhóm hoạt động",
        communicative_purpose_vi="Trình bày hoàn cảnh cá nhân hoặc lý do cho một quyết định một cách thấu đáo, tôn trọng.",
    ),
}

# -----------------------------------------------------------------------------
# Prompt Modes
# -----------------------------------------------------------------------------

PROMPT_MODES = ["vietnamese_scenario", "japanese_scenario", "contextual_simulation"]

PROMPT_MODE_INFO: dict[str, dict[str, str]] = {
    "vietnamese_scenario": {
        "mode_code": "MODE_A",
        "label_vi": "Mode A: Kịch bản Tiếng Việt",
        "description_vi": "Đọc bối cảnh và yêu cầu chi tiết bằng tiếng Việt, tự tư duy và diễn đạt hoàn toàn bằng tiếng Nhật.",
        "recommended_level": "N5 / N4",
    },
    "japanese_scenario": {
        "mode_code": "MODE_B",
        "label_vi": "Mode B: Kịch bản Tiếng Nhật",
        "description_vi": "Đọc bối cảnh, vai trò và chỉ dẫn trực tiếp bằng tiếng Nhật tự nhiên, rèn luyện phản xạ đọc hiểu và viết chuẩn mực.",
        "recommended_level": "N3",
    },
    "contextual_simulation": {
        "mode_code": "MODE_C",
        "label_vi": "Mode C: Mô phỏng Hộp thư In-Basket",
        "description_vi": "Nhận trực tiếp tin nhắn/email/ticket thực tế từ người gửi (AI) và viết phản hồi đạt mục tiêu giao tiếp.",
        "recommended_level": "N2 / N1",
    },
}


def recommend_prompt_mode_for_jlpt(jlpt: str | None) -> PromptModeType:
    """Recommends progressive immersion prompt mode based on JLPT level."""
    if not jlpt:
        return "vietnamese_scenario"
    normalized = jlpt.upper().strip()
    if normalized in ("N5", "N4"):
        return "vietnamese_scenario"
    if normalized == "N3":
        return "japanese_scenario"
    return "contextual_simulation"


# -----------------------------------------------------------------------------
# 10-Dimensional Evaluation Metadata
# -----------------------------------------------------------------------------

EVALUATION_DIMENSIONS: list[str] = [
    "task_completion",
    "factual_completeness",
    "naturalness",
    "grammar",
    "vocabulary",
    "register",
    "politeness",
    "tone",
    "clarity",
    "discourse",
]

EVALUATION_DIMENSION_META: dict[str, dict[str, Any]] = {
    "task_completion": {
        "label_vi": "Hoàn thành mục tiêu",
        "label_ja": "タスク達成度",
        "description_vi": "Mức độ hoàn thành mục đích giao tiếp cốt lõi của tình huống.",
        "weight": 0.15,
    },
    "factual_completeness": {
        "label_vi": "Đầy đủ thông tin",
        "label_ja": "情報網羅性",
        "description_vi": "Có bao hàm đầy đủ các điểm thông tin và điều kiện bắt buộc hay không.",
        "weight": 0.15,
    },
    "naturalness": {
        "label_vi": "Độ tự nhiên bản xứ",
        "label_ja": "自然さ・ネイティブ表現",
        "description_vi": "Cách diễn đạt có tự nhiên, trôi chảy và chuẩn thói quen ngôn ngữ người Nhật.",
        "weight": 0.10,
    },
    "grammar": {
        "label_vi": "Độ chính xác ngữ pháp",
        "label_ja": "文法の正確性",
        "description_vi": "Đúng trợ từ, chia thì động từ, cấu trúc câu và kết nối ngữ pháp.",
        "weight": 0.10,
    },
    "vocabulary": {
        "label_vi": "Vốn từ vựng",
        "label_ja": "語彙の適切さ",
        "description_vi": "Sử dụng từ vựng, cụm từ và thuật ngữ chính xác, phong phú theo ngữ cảnh.",
        "weight": 0.10,
    },
    "register": {
        "label_vi": "Đúng văn phong (Register)",
        "label_ja": "文体・敬体の一致",
        "description_vi": "Tuân thủ đúng văn phong yêu cầu (thân mật, lịch sự desu/masu, keigo thương mại).",
        "weight": 0.10,
    },
    "politeness": {
        "label_vi": "Mức độ lịch thiệp (Politeness)",
        "label_ja": "丁寧さ・敬意",
        "description_vi": "Mức độ tôn trọng tương xứng với mối quan hệ và thứ bậc giao tiếp.",
        "weight": 0.10,
    },
    "tone": {
        "label_vi": "Sắc thái cảm xúc (Tone)",
        "label_ja": "ニュアンス・感情の適切さ",
        "description_vi": "Sắc thái phù hợp (nhã nhặn, quả quyết, đồng cảm, xin lỗi chân thành).",
        "weight": 0.05,
    },
    "clarity": {
        "label_vi": "Độ rõ ràng mạch lạc",
        "label_ja": "明確さ・分かりやすさ",
        "description_vi": "Trình bày sáng sủa, không mập mờ hoặc gây hiểu lầm cho người nhận.",
        "weight": 0.08,
    },
    "discourse": {
        "label_vi": "Cấu trúc đoạn & Liên kết",
        "label_ja": "文章構成・結束性",
        "description_vi": "Bố cục mạch lạc, lời mở đầu - thân bài - kết thúc chuẩn tắc và từ nối mượt mà.",
        "weight": 0.07,
    },
}
