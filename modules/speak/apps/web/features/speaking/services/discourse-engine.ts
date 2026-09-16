/**
 * Japanese Speaking Discourse Engine
 * Implements 5-stage conversational progression and scenario-specific twists.
 * Stages:
 *  1. 🤝 rapport (Khởi động)
 *  2. 🔍 discovery (Khai thác)
 *  3. ⚡ twist_conflict (Biến cố bất ngờ)
 *  4. ⚖️ negotiation (Thương lượng & xử lý)
 *  5. 🎯 resolution (Đúc kết & hoàn tất)
 */

export type DiscourseStage =
  | "rapport"
  | "discovery"
  | "twist_conflict"
  | "negotiation"
  | "resolution";

export interface DiscourseStageInfo {
  stage: DiscourseStage;
  labelVi: string;
  labelJa: string;
  icon: string;
  descriptionVi: string;
  colorClass: string;
  stepNumber: number;
}

export interface ConversationalTwist {
  id: string;
  personaId?: string;
  titleVi: string;
  descriptionJa: string;
  descriptionVi: string;
  suggestedTacticVi: string;
  severity: "mild" | "high";
  injectedAtTurn: number;
}

export interface TurnSayItBetterSet {
  casual: {
    ja: string;
    vi: string;
    nuance: string;
  };
  polite: {
    ja: string;
    vi: string;
    nuance: string;
  };
  idiomatic: {
    ja: string;
    vi: string;
    nuance: string;
  };
}

export const DISCOURSE_STAGES_CONFIG: Record<DiscourseStage, DiscourseStageInfo> = {
  rapport: {
    stage: "rapport",
    labelVi: "Khởi động",
    labelJa: "挨拶・導入",
    icon: "🤝",
    descriptionVi: "Chào hỏi, tạo ấn tượng mở đầu thoải mái và kết nối tự nhiên.",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    stepNumber: 1,
  },
  discovery: {
    stage: "discovery",
    labelVi: "Khai thác",
    labelJa: "展開・深掘り",
    icon: "🔍",
    descriptionVi: "Trao đổi sâu về chủ đề chính, đặt câu hỏi và chia sẻ quan điểm.",
    colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    stepNumber: 2,
  },
  twist_conflict: {
    stage: "twist_conflict",
    labelVi: "Biến cố bất ngờ",
    labelJa: "ハプニング・課題",
    icon: "⚡",
    descriptionVi: "Tình huống phát sinh đột ngột thử thách phản xạ và tư duy ứng biến.",
    colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    stepNumber: 3,
  },
  negotiation: {
    stage: "negotiation",
    labelVi: "Thương lượng",
    labelJa: "交渉・解決策",
    icon: "⚖️",
    descriptionVi: "Đưa ra giải pháp, thỏa hiệp và thương thảo tìm tiếng nói chung.",
    colorClass: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    stepNumber: 4,
  },
  resolution: {
    stage: "resolution",
    labelVi: "Đúc kết",
    labelJa: "合意・まとめ",
    icon: "🎯",
    descriptionVi: "Chốt lại thỏa thuận, tổng kết hành động tiếp theo và chào kết thúc.",
    colorClass: "text-sakura-400 bg-sakura-500/10 border-sakura-500/20",
    stepNumber: 5,
  },
};

/**
 * Calculates current discourse stage based on user turns count
 */
export function getDiscourseStage(turnCount: number, targetTurns: number = 8): DiscourseStage {
  if (turnCount <= 1) return "rapport";
  if (turnCount === 2) return "discovery";
  if (turnCount === 3 || turnCount === 4) return "twist_conflict";
  if (turnCount === 5 || turnCount === 6) return "negotiation";
  return "resolution";
}

/**
 * Persona-tailored twists repository
 */
export const PERSONA_TWISTS: Record<string, ConversationalTwist> = {
  persona_it_lead: {
    id: "twist_it_outage",
    personaId: "persona_it_lead",
    titleVi: "Biến cố: Server Production quá tải (CPU 99%)",
    descriptionJa: "本番サーバーのCPU使用率が急上昇してサービスが応答停止しました。どう切り分けますか？",
    descriptionVi: "Hệ thống thực tế bị nghẽn tải nghiêm trọng. Sato yêu cầu bạn xác nhận log, đề xuất giải pháp cứu vãn khẩn cấp.",
    suggestedTacticVi: "Bình tĩnh xác nhận triệu chứng (ログ確認), đề xuất giải pháp tức thì (再起動/ロールバック), sau đó điều tra nguyên nhân gốc (根本原因).",
    severity: "high",
    injectedAtTurn: 3,
  },
  persona_scrum_pm: {
    id: "twist_pm_api_delay",
    personaId: "persona_scrum_pm",
    titleVi: "Biến cố: Đối tác trễ API 2 ngày, nguy cơ vỡ Sprint",
    descriptionJa: "他チームのAPI連携が2日遅れることになりました。今のタスクの優先度をどう調整しますか？",
    descriptionVi: "Team bên ngoài bàn giao API muộn, nguy cơ trễ demo sprint. Yamamoto PM cần bạn đề xuất phương án điều chỉnh.",
    suggestedTacticVi: "Đề xuất chuyển sang mock data (モックAPI), ưu tiên phần logic độc lập trước, và cập nhật lại tiến độ trên board.",
    severity: "high",
    injectedAtTurn: 3,
  },
  persona_izakaya_buddy: {
    id: "twist_izakaya_soldout",
    personaId: "persona_izakaya_buddy",
    titleVi: "Biến cố: Món nhắm đặc sản bán hết sạch",
    descriptionJa: "店員さんから『本日のおすすめの焼き鳥盛り合わせ』が売り切れちゃったって！代わりに何頼む？",
    descriptionVi: "Quán thông báo đĩa yakitori đặc sản vừa hết. Bạn nhậu Kenji hỏi ý bạn muốn đổi sang món gì.",
    suggestedTacticVi: "Đáp lại vui vẻ, hỏi ý kiến đối phương hoặc nhanh chóng chọn món nhắm khác (じゃあ、唐揚げか枝豆頼もう！).",
    severity: "mild",
    injectedAtTurn: 3,
  },
  persona_hotel_concierge: {
    id: "twist_hotel_ac_issue",
    personaId: "persona_hotel_concierge",
    titleVi: "Biến cố: Điều hòa phòng bị trục trặc kỹ thuật",
    descriptionJa: "大変恐れ入ります、本日ご予約いただいたお部屋の空調に不具合が発生いたしました。最上階の特別室へ無料アップグレードいたしますが、ご準備に15分ほど頂戴できますでしょうか？",
    descriptionVi: "Lễ tân thông báo sự cố phòng và đề xuất nâng hạng phòng VIP miễn phí với điều kiện đợi 15 phút.",
    suggestedTacticVi: "Cảm ơn khách sạn vì đã nâng hạng (ご親切にありがとうございます), đồng ý đợi ở sảnh hoặc ghé quán cà phê (ロビーで待っています).",
    severity: "mild",
    injectedAtTurn: 3,
  },
  persona_ramen_owner: {
    id: "twist_ramen_shokken_jam",
    personaId: "persona_ramen_owner",
    titleVi: "Biến cố: Máy bán vé không nhận tiền giấy 1000¥",
    descriptionJa: "おっと！食券機の千円札の読み取りが詰まっちまった！小銭はあるかい？なければ両替するよ！",
    descriptionVi: "Máy bán vé ăn kẹt tiền giấy, bác chủ quán hỏi bạn có tiền lẻ hay cần đổi tiền.",
    suggestedTacticVi: "Nhanh nhẹn kiểm tra ví, nhờ đổi tiền hoặc thanh toán xu lẻ (すみません、両替をお願いできますか？).",
    severity: "mild",
    injectedAtTurn: 3,
  },
  persona_demanding_client: {
    id: "twist_client_urgent_defect",
    personaId: "persona_demanding_client",
    titleVi: "Biến cố: Khách hàng khiếu nại phát hiện 3 lỗi nghiêm trọng",
    descriptionJa: "先ほど納品されたファイルですが、仕様書の必須要件が3点抜けています！今日中に修正対応できますか？",
    descriptionVi: "Đối tác Kobayashi tức giận vì spec bị thiếu 3 tiêu chí, yêu cầu khắc phục ngay trong ngày.",
    suggestedTacticVi: "Thành thật xin lỗi lịch sự chuẩn keigo (大変申し訳ございません), xác nhận phạm vi lỗi (直ちに確認いたします), cam kết mốc bàn giao bản vá.",
    severity: "high",
    injectedAtTurn: 3,
  },
  persona_interviewer: {
    id: "twist_interviewer_conflict",
    personaId: "persona_interviewer",
    titleVi: "Biến cố: Tình huống bất đồng quan điểm kỹ thuật với cấp trên",
    descriptionJa: "もしプロジェクト進行中に、PMとアーキテクチャの選定で真っ向から意見が衝突した場合、あなたはどう対処しますか？",
    descriptionVi: "Tanaka Bucho đặt câu hỏi hóc búa để thử thách khả năng thương lượng và kỹ năng mềm.",
    suggestedTacticVi: "Lắng nghe mục tiêu của PM trước, trình bày ưu nhược điểm bằng số liệu thực tế (データとトレードオフ), và ưu tiên lợi ích dự án.",
    severity: "high",
    injectedAtTurn: 3,
  },
  persona_senpai: {
    id: "twist_senpai_rain",
    personaId: "persona_senpai",
    titleVi: "Biến cố: Trời đổ mưa rào bất ngờ",
    descriptionJa: "あっ、急に雨が降ってきた！傘持ってきてないや… どこかで雨宿りするかカフェ寄る？",
    descriptionVi: "Cơn mưa bất chợt kéo đến giữa đường khi không ai mang dù.",
    suggestedTacticVi: "Đồng ý ghé quán cà phê gần nhất, thể hiện sự quan tâm vui vẻ (あそこにカフェあるよ、入ろう！).",
    severity: "mild",
    injectedAtTurn: 3,
  },
  persona_teacher: {
    id: "twist_teacher_rephrase",
    personaId: "persona_teacher",
    titleVi: "Biến cố: Thầy gợi ý chỉnh sửa câu cho tự nhiên hơn",
    descriptionJa: "今の表現でも意味は通じますが、より自然な日本語にするならどう言い換えますか？もう一度挑戦してみましょう！",
    descriptionVi: "Sensei muốn thử thách phản xạ diễn đạt lại ý tưởng bằng cấu trúc khác.",
    suggestedTacticVi: "Cảm ơn thầy và tự tin thử nói lại một cách diễn đạt ngắn gọn hơn (教えていただきありがとうございます、もう一度言ってみます).",
    severity: "mild",
    injectedAtTurn: 3,
  },
  persona_friend: {
    id: "twist_friend_wallet",
    personaId: "persona_friend",
    titleVi: "Biến cố: Bạn thân quên mang ví tiền",
    descriptionJa: "やばい、財布家に忘れてきちゃった！電子マネーも使えない店らしい… 今日立て替えてもらってもいい？",
    descriptionVi: "Ren hốt hoảng vì quên ví ở quán chỉ nhận tiền mặt.",
    suggestedTacticVi: "Đáp lại thân thiện (タメ口), sẵn sàng bao hoặc cho mượn tiền (全然いいよ！今日は俺が出しとくね).",
    severity: "mild",
    injectedAtTurn: 3,
  },
  default: {
    id: "twist_default_change",
    titleVi: "Biến cố: Tình huống phát sinh đột xuất",
    descriptionJa: "ちょっと予期せぬ変更がありまして、計画を少し見直す必要があります。どう思われますか？",
    descriptionVi: "Có một thay đổi phát sinh ngoài dự kiến cần bàn bạc thêm.",
    suggestedTacticVi: "Bình tĩnh hỏi chi tiết thay đổi và đề xuất hướng xử lý từng bước.",
    severity: "mild",
    injectedAtTurn: 3,
  },
};

/**
 * Gets the active twist for a persona at the specified turn index
 */
export function getScenarioTwist(personaId: string, turnIndex: number): ConversationalTwist | null {
  if (turnIndex < 3 || turnIndex > 4) return null;
  return PERSONA_TWISTS[personaId] || PERSONA_TWISTS.default;
}

/**
 * Generates Say It Better 3-tier variants for a given Japanese input
 */
export function generateSayItBetter(userText: string): TurnSayItBetterSet {
  const clean = userText.trim();

  // Pattern: Casual greeting / agreement
  if (/はい|そう|うん|いいよ|大丈夫|分かりました/.test(clean)) {
    return {
      casual: {
        ja: "うん、わかった！任せて！",
        vi: "Ừ, mình hiểu rồi! Cứ để đó cho mình!",
        nuance: "Thân mật (タメ口) dùng với bạn bè đồng trang lứa",
      },
      polite: {
        ja: "承知いたしました。迅速に対応いたします。",
        vi: "Tôi đã hiểu rõ. Tôi sẽ nhanh chóng xử lý ạ.",
        nuance: "Lịch sự công sở (謙譲語/丁寧語) chuẩn tác phong doanh nghiệp",
      },
      idiomatic: {
        ja: "なるほど、了解です！すぐに手配しますね。",
        vi: "Ra là vậy, nắm rõ rồi ạ! Tôi thu xếp ngay nhé.",
        nuance: "Khẩu ngữ tự nhiên, bắt nhịp mượt mà (なるほど + 了解)",
      },
    };
  }

  // Pattern: Apology / trouble / delay
  if (/すみません|ごめん|申し訳|遅れ|ミス|問題|エラー/.test(clean)) {
    return {
      casual: {
        ja: "ごめんね！すぐ直すからちょっと待ってて！",
        vi: "Xin lỗi nha! Mình sửa liền đây, chờ xíu nhé!",
        nuance: "Thân mật, ấm áp, không trang trọng",
      },
      polite: {
        ja: "大変ご迷惑をおかけして申し訳ございません。直ちに是正いたします。",
        vi: "Thành thật xin lỗi vì đã gây phiền hà. Tôi xin phép khắc phục ngay lập tức.",
        nuance: "Kính ngữ trang trọng khi xin lỗi đối tác / khách hàng",
      },
      idiomatic: {
        ja: "失礼いたしました！すぐにリカバリー策を共有します。",
        vi: "Thất lễ quá ạ! Tôi sẽ gửi ngay phương án khắc phục.",
        nuance: "Phong cách IT hiện đại, hướng thẳng tới giải pháp",
      },
    };
  }

  // Pattern: Question / confirmation
  if (/ですか|でしょうか|どう|なに|何|どこ|いつ/.test(clean)) {
    return {
      casual: {
        ja: "これってどういうこと？もう少し教えて！",
        vi: "Cái này nghĩa là sao vậy? Kể thêm cho mình với!",
        nuance: "Hỏi han bạn bè thoải mái, tò mò",
      },
      polite: {
        ja: "恐れ入りますが、詳細についてご教示いただけますでしょうか？",
        vi: "Xin thứ lỗi, anh/chị có thể vui lòng chỉ dẫn chi tiết hơn được không ạ?",
        nuance: "Kính ngữ khi nhờ vả cấp trên hoặc khách hàng hướng dẫn",
      },
      idiomatic: {
        ja: "念のため確認させていただけますか？ポイントは〜ですね。",
        vi: "Để cho chắc chắn xin cho tôi xác nhận lại, mấu chốt là... đúng không ạ?",
        nuance: "Cách bắt nhịp xác nhận kinh điển trong họp bàn công việc",
      },
    };
  }

  // Default fallback 3 variants
  return {
    casual: {
      ja: `${clean.replace(/です|ます/g, "")}よ！`,
      vi: "Diễn đạt ngắn gọn, tự nhiên và gần gũi",
      nuance: "Thân mật (タメ口)",
    },
    polite: {
      ja: `〜につきまして、${clean}と考えております。`,
      vi: "Về vấn đề này, tôi đang cân nhắc là...",
      nuance: "Lịch sự công sở (ビジネス丁寧語)",
    },
    idiomatic: {
      ja: `そうですね、${clean}という認識で合っていますでしょうか。`,
      vi: "Đúng vậy nhỉ, tôi hiểu theo hướng này đã chuẩn xác chưa ạ?",
      nuance: "Khẩu ngữ chuẩn bản xứ, đệm từ khéo léo",
    },
  };
}
