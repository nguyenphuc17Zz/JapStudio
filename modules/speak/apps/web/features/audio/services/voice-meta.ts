import { VoiceProfile } from "@/types/audio";

export interface VoiceCharacterMeta {
  gender: "female" | "male" | "mascot";
  genderLabel: string;
  vibe: "cute" | "energetic" | "calm" | "cool" | "deep" | "gentle";
  vibeLabel: string;
  avatarLetter: string;
  gradient: string;
  borderAccent: string;
  badgeClass: string;
  recommendedFor: string;
  descriptionVi: string;
}

export interface SamplePhrase {
  id: string;
  category: "daily" | "beginner_n5" | "natural_n3" | "keigo" | "food";
  label: string;
  icon: string;
  text: string;
  romaji: string;
  translationVi: string;
}

export const SAMPLE_PHRASES: SamplePhrase[] = [
  {
    id: "daily",
    category: "daily",
    label: "Chào hỏi",
    icon: "🌸",
    text: "こんにちは！今日も一緒に楽しく日本語を練習しましょう。",
    romaji: "Konnichiwa! Kyou mo issho ni tanoshiku nihongo o renshuu shimashou.",
    translationVi: "Chào bạn! Hôm nay chúng ta hãy cùng vui vẻ luyện tiếng Nhật nhé.",
  },
  {
    id: "beginner_n5",
    category: "beginner_n5",
    label: "N5 Sơ cấp",
    icon: "🐢",
    text: "これは 私の 日本語の ノートです。",
    romaji: "Kore wa watashi no nihongo no nooto desu.",
    translationVi: "Đây là cuốn sổ tay tiếng Nhật của tôi.",
  },
  {
    id: "natural_n3",
    category: "natural_n3",
    label: "Hội thoại N3",
    icon: "💬",
    text: "週末は何をして過ごす予定ですか？",
    romaji: "Shuumatsu wa nani o shite sugosu yotei desu ka?",
    translationVi: "Cuối tuần này bạn dự định làm gì thế?",
  },
  {
    id: "keigo",
    category: "keigo",
    label: "Kính ngữ Keigo",
    icon: "👔",
    text: "お忙しいところ恐れ入りますが、ご確認のほどよろしくお願いいたします。",
    romaji: "Oisogashii tokoro osoreirimasu ga, gokakunin no hodo yoroshiku onegai itashimasu.",
    translationVi: "Xin thứ lỗi vì làm phiền lúc bận rộn, xin vui lòng kiểm tra giúp tôi.",
  },
  {
    id: "food",
    category: "food",
    label: "Quán café / Ăn uống",
    icon: "🍵",
    text: "すみません、アイスコーヒーをひとつお願いできますか？",
    romaji: "Sumimasen, aisu koohii o hitotsu onegai dekimasu ka?",
    translationVi: "Xin lỗi, cho tôi xin một ly cà phê đá được không ạ?",
  },
];

export function getVoiceCharacterMeta(voice: VoiceProfile): VoiceCharacterMeta {
  const name = (voice.name || "").toLowerCase();
  const id = (voice.voice_id || voice.id || "").toLowerCase();

  // 1. Edge-TTS Voices
  if (id.includes("nanami") || name.includes("nanami") || name.includes("七海")) {
    return {
      gender: "female",
      genderLabel: "Nữ",
      vibe: "calm",
      vibeLabel: "Chuẩn mực · Ấm áp",
      avatarLetter: "七",
      gradient: "from-pink-500 to-rose-600",
      borderAccent: "border-pink-500/40",
      badgeClass: "bg-pink-500/15 text-pink-600 dark:text-pink-300 border-pink-500/30",
      recommendedFor: "Chuẩn Pitch Accent Tokyo, Shadowing, Tin tức",
      descriptionVi: "Giọng nữ Tokyo chuẩn mực, phát âm rõ từng mora, ngữ điệu truyền hình tự nhiên tuyệt đối.",
    };
  }

  if (id.includes("keita") || name.includes("keita") || name.includes("圭太")) {
    return {
      gender: "male",
      genderLabel: "Nam",
      vibe: "cool",
      vibeLabel: "Lịch thiệp · Tự nhiên",
      avatarLetter: "圭",
      gradient: "from-blue-500 to-indigo-600",
      borderAccent: "border-blue-500/40",
      badgeClass: "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30",
      recommendedFor: "Giao tiếp công sở, Hội thoại thanh niên",
      descriptionVi: "Giọng nam lịch thiệp, giọng điệu tự nhiên, rất phù hợp luyện hội thoại thực tế.",
    };
  }

  if (id.includes("aoi") || name.includes("aoi") || name.includes("葵")) {
    return {
      gender: "female",
      genderLabel: "Nữ",
      vibe: "energetic",
      vibeLabel: "Tươi vui · Trẻ trung",
      avatarLetter: "葵",
      gradient: "from-amber-400 to-orange-500",
      borderAccent: "border-amber-500/40",
      badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
      recommendedFor: "Giao tiếp bạn bè, đời sống hàng ngày",
      descriptionVi: "Giọng nữ tươi tắn, năng động, mang năng lượng tích cực khi giao tiếp thường ngày.",
    };
  }

  if (id.includes("daichi") || name.includes("daichi") || name.includes("大智")) {
    return {
      gender: "male",
      genderLabel: "Nam",
      vibe: "deep",
      vibeLabel: "Trầm ấm · Đĩnh đạc",
      avatarLetter: "大",
      gradient: "from-slate-600 to-zinc-800",
      borderAccent: "border-slate-500/40",
      badgeClass: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
      recommendedFor: "Thuyết trình, Kính ngữ Keigo, Phỏng vấn",
      descriptionVi: "Giọng nam trầm ấm, phát âm dứt khoát, rất thích hợp luyện ngữ điệu trang trọng và kính ngữ.",
    };
  }

  if (id.includes("mayu") || name.includes("mayu") || name.includes("真夕")) {
    return {
      gender: "female",
      genderLabel: "Nữ",
      vibe: "gentle",
      vibeLabel: "Dịu dàng · Tình cảm",
      avatarLetter: "真",
      gradient: "from-teal-400 to-emerald-500",
      borderAccent: "border-teal-500/40",
      badgeClass: "bg-teal-500/15 text-teal-600 dark:text-teal-300 border-teal-500/30",
      recommendedFor: "Luyện nghe chậm, Hội thoại thân mật",
      descriptionVi: "Giọng nữ nhẹ nhàng, ân cần, giúp người nghe cảm thấy thư giãn và dễ tiếp thu.",
    };
  }

  if (id.includes("naoki") || name.includes("naoki") || name.includes("直樹")) {
    return {
      gender: "male",
      genderLabel: "Nam",
      vibe: "energetic",
      vibeLabel: "Hào hứng · Nhanh nhẹn",
      avatarLetter: "直",
      gradient: "from-cyan-500 to-blue-600",
      borderAccent: "border-cyan-500/40",
      badgeClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/30",
      recommendedFor: "Luyện phản xạ nhanh N3 - N1",
      descriptionVi: "Giọng nam trẻ trung, tốc độ linh hoạt, lý tưởng cho các bài tập phản xạ tốc độ cao.",
    };
  }

  if (id.includes("shiori") || name.includes("shiori") || name.includes("詩織")) {
    return {
      gender: "female",
      genderLabel: "Nữ",
      vibe: "calm",
      vibeLabel: "Truyền cảm · Điềm đạm",
      avatarLetter: "詩",
      gradient: "from-violet-500 to-purple-600",
      borderAccent: "border-violet-500/40",
      badgeClass: "bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30",
      recommendedFor: "Đọc diễn cảm, Thuyết minh bài học",
      descriptionVi: "Giọng đọc truyền cảm và rõ ràng, thích hợp cho đọc sách nói và bài khóa dài.",
    };
  }

  // Generic fallback
  const isMale = voice.gender === "male" || name.includes("nam") || name.includes("male");
  const avatarChar = (voice.name || "J").slice(0, 1).toUpperCase();

  return {
    gender: isMale ? "male" : "female",
    genderLabel: isMale ? "Nam" : "Nữ",
    vibe: isMale ? "deep" : "calm",
    vibeLabel: isMale ? "Nam tính · Rõ ràng" : "Nữ tính · Tự nhiên",
    avatarLetter: avatarChar,
    gradient: isMale ? "from-blue-500 to-indigo-600" : "from-rose-500 to-purple-600",
    borderAccent: isMale ? "border-blue-500/30" : "border-rose-500/30",
    badgeClass: isMale
      ? "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30"
      : "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30",
    recommendedFor: "Luyện giao tiếp tiếng Nhật",
    descriptionVi: voice.description || `Giọng đọc ${voice.name} tự nhiên.`,
  };
}

export const EDGE_TTS_VOICES_CATALOG: VoiceProfile[] = [
  { id: "ja-JP-NanamiNeural", voice_id: "ja-JP-NanamiNeural", provider: "edge_tts", name: "Nanami (七海 - Nữ Tokyo chuẩn mực)", style: "Polite", gender: "female", is_default: true },
  { id: "ja-JP-KeitaNeural", voice_id: "ja-JP-KeitaNeural", provider: "edge_tts", name: "Keita (圭太 - Nam tự nhiên, lịch thiệp)", style: "Polite", gender: "male" },
];

export const DEFAULT_VOICE_CATALOG: VoiceProfile[] = [
  ...EDGE_TTS_VOICES_CATALOG,
];
