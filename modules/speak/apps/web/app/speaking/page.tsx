"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePersonas } from "@/hooks/use-personas";
import { ExerciseSourceBadge } from "@/components/ui/exercise-source-badge";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  Mic,
  Sparkles,
  Zap,
  Plus,
  Wand2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  Users,
  Dices,
  Search,
  X,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { soundFX } from "@/lib/sound-fx";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { Persona, PersonaCreateInput } from "@/types/persona";
import {
  useVoiceSession,
  SessionLobby,
  ActiveSessionRoom,
  SessionSummaryModal,
  MicrophonePermissionModal,
} from "@/features/speaking";
import { getSavedLobbyPreferences } from "@/features/speaking/services/lobby-preferences";

const DIFFICULTIES = [
  { id: "All", label: "Tất cả" },
  { id: "ADAPTIVE", label: "🌟 Tự thích ứng" },
  { id: "N5", label: "N5 (Vỡ lòng)" },
  { id: "N4", label: "N4 (Sơ cấp)" },
  { id: "N3", label: "N3 (Trung cấp)" },
  { id: "N2", label: "N2 (Thành thạo)" },
  { id: "N1", label: "N1 (Cao cấp)" },
  { id: "NATIVE", label: "👑 Bản xứ / Biz" },
];

const INSPIRATION_SCENARIOS = [
  { label: "Phỏng vấn IT Roppongi", icon: "💼", theme: "Phỏng vấn xin việc vị trí IT Engineer tại văn phòng Roppongi Hills Tokyo, trả lời về kinh nghiệm lập trình và lý do chuyển việc." },
  { label: "Omakase quán Izakaya", icon: "🍶", theme: "Ngồi tại quầy counter của quán Izakaya truyền thống ở Shinjuku, nhờ bác chủ quán giới thiệu các món nhắm ngon và rượu sake địa phương." },
  { label: "Đổi vé tàu Shinkansen", icon: "🚄", theme: "Tại phòng vé Midori no Madoguchi ga Tokyo, xin đổi giờ vé tàu Shinkansen Nozomi đi Kyoto sang chuyến sớm hơn." },
  { label: "Khám nha khoa đau răng", icon: "🦷", theme: "Đi khám tại phòng khám nha khoa ở Shibuya, giải thích với nha sĩ về chiếc răng hàm bị ê buốt khi uống nước lạnh." },
  { label: "Mua thuốc cảm Shinjuku", icon: "💊", theme: "Tại hiệu thuốc Matsumoto Kiyoshi, nhờ dược sĩ tư vấn loại thuốc cảm cúm không gây buồn ngủ vì chiều phải họp." },
  { label: "Khiếu nại khách sạn", icon: "🏨", theme: "Gọi lễ tân khách sạn ở Ginza phản ánh việc máy điều hòa trong phòng kêu to và không mát, yêu cầu đổi phòng." },
  { label: "Thuê căn hộ & phí trọ", icon: "🏠", theme: "Tại công ty bất động sản ở Koenji, trao đổi về việc thuê căn hộ 1LDK, hỏi rõ về tiền lễ (Reikin) và tiền cọc (Shikikin)." },
  { label: "Mua đồ Anime Akihabara", icon: "🎨", theme: "Tại cửa hàng mô hình Akihabara, hỏi nhân viên về tượng figure phiên bản giới hạn và cách gửi hàng an toàn." },
  { label: "Cắt tóc ở Omotesando", icon: "💇", theme: "Tại salon tóc Omotesando, trao đổi với thợ làm tóc về kiểu tóc mong muốn, nhuộm màu tự nhiên." },
  { label: "Gặp cảnh sát hỏi đường", icon: "👮", theme: "Tại bốt cảnh sát Koban ga Ikebukuro, hỏi đường đi đến bảo tàng nghệ thuật và báo mất một chiếc ô dù." },
  { label: "Thương lượng giá B2B", icon: "🤝", theme: "Cuộc họp thương mại với đối tác Nhật tại Osaka, đàm phán giảm giá 5% cho đơn hàng linh kiện số lượng lớn." },
  { label: "Lễ hội pháo hoa Hanabi", icon: "🎆", theme: "Mặc áo Yukata đi dạo lễ hội pháo hoa sông Sumida, nói chuyện với người bán đồ ăn dạo ở quầy Yatai." },
];

const INITIAL_FORM: PersonaCreateInput = {
  name: "",
  role: "",
  description: "",
  personality: "",
  speaking_style: "",
  system_prompt: "",
};

type PersonaCategory = "all" | "business" | "dining" | "hospitality" | "daily";

const CATEGORIES: Array<{ key: PersonaCategory; label: string; icon: string }> = [
  { key: "all", label: "Tất cả", icon: "🌐" },
  { key: "business", label: "IT & Công sở", icon: "💼" },
  { key: "dining", label: "Ẩm thực & Quán nhậu", icon: "🍜" },
  { key: "hospitality", label: "Khách sạn & Du lịch", icon: "🏨" },
  { key: "daily", label: "Đời sống & Bạn bè", icon: "☕" },
];

const CATEGORY_META: Record<PersonaCategory, { badge: string; color: string; bg: string }> = {
  all: { badge: "🌐 Tất cả", color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  business: { badge: "💼 Công sở", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  dining: { badge: "🍜 Ẩm thực", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  hospitality: { badge: "🏨 Dịch vụ", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  daily: { badge: "☕ Đời sống", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
};

function getPersonaCategory(p: Persona): PersonaCategory {
  const text = `${p.id} ${p.name} ${p.role} ${p.description}`.toLowerCase();
  if (/it|engineer|scrum|pm|project|bucho|client|interview|tech lead|họp|báo cáo|kỹ thuật/.test(text)) return "business";
  if (/izakaya|ramen|ẩm thực|quán|ăn|uống|món|nhậu/.test(text)) return "dining";
  if (/hotel|concierge|khách sạn|du lịch|lễ tân/.test(text)) return "hospitality";
  return "daily";
}

export default function SpeakingPage() {
  const {
    personas,
    loading,
    actionLoading,
    generating,
    createPersona,
    deletePersona,
    generateRandomPersona,
    restoreDefaults,
  } = usePersonas();

  const [selectedDifficulty, setSelectedDifficulty] = usePersistedState<string>(
    "speaking_personas_difficulty",
    "All"
  );
  const [selectedCategory, setSelectedCategory] = useState<PersonaCategory>("all");
  const [activePersona, setActivePersona] = useState<Persona | null>(null);
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);

  // Dynamic Custom Situation & Generator States
  const [customSituationInput, setCustomSituationInput] = useState("");
  const [isInstantGenerating, setIsInstantGenerating] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");

  // Persona Creation & Deletion States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState<PersonaCreateInput>(INITIAL_FORM);
  const [aiThemeHint, setAiThemeHint] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Persona | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const {
    session,
    turns,
    state,
    volumeLevel,
    isUserSpeaking,
    isInitializing,
    formattedElapsed,
    formattedSpeaking,
    isVoiceMuted,
    toggleVoiceMute,
    autoEndOfSpeech,
    toggleAutoEndOfSpeech,
    interimTranscript,
    latestUserTranscript,
    latestSttMetrics,
    startSession,
    sendTextTurn,
    isManualRecording,
    manualSeconds,
    startManualRecording,
    stopAndSendManualRecording,
    pauseSession,
    resumeSession,
    endSession,
    resetSession,
    replayVoice,
    hasPermission,
    requestPermission,
    summary,
  } = useVoiceSession();

  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  useEffect(() => {
    if (summary !== null && state === "ended") {
      setIsSummaryOpen(true);
    }
  }, [summary, state]);

  const handleCloseSummary = () => {
    setIsSummaryOpen(false);
    setActivePersona(null);
    resetSession();
  };

  const filteredPersonas = personas.filter((p) => {
    const pDiff = (p.difficulty || "N3").toUpperCase();
    const matchDiff =
      selectedDifficulty === "All" ||
      pDiff === selectedDifficulty ||
      (selectedDifficulty === "ADAPTIVE") ||
      (selectedDifficulty === "NATIVE" && (pDiff === "N1" || pDiff === "NATIVE" || pDiff.includes("NAT")));

    const matchCat =
      selectedCategory === "all" || getPersonaCategory(p) === selectedCategory;

    const matchSearch =
      !searchKeyword.trim() ||
      `${p.name} ${p.role} ${p.description} ${p.personality}`
        .toLowerCase()
        .includes(searchKeyword.toLowerCase().trim());

    return matchDiff && matchCat && matchSearch;
  });

  const handleInstantCreateAndStart = async (scenarioOverride?: string) => {
    const rawTarget = (scenarioOverride || customSituationInput).trim();
    let themeToUse = rawTarget;

    if (!themeToUse) {
      const randomScenario = INSPIRATION_SCENARIOS[Math.floor(Math.random() * INSPIRATION_SCENARIOS.length)];
      themeToUse = randomScenario.theme;
      setCustomSituationInput(randomScenario.label);
    }

    setIsInstantGenerating(true);
    setFeedback(null);
    soundFX.playFurin();

    try {
      const targetDiff = selectedDifficulty !== "All" ? selectedDifficulty : "ADAPTIVE";
      const { data: generated, error: genError } = await generateRandomPersona({
        theme: themeToUse,
        difficulty: targetDiff,
      });

      if (!generated || genError) {
        setFeedback({
          type: "error",
          msg: genError || "Không thể khởi tạo tình huống bằng AI. Vui lòng kiểm tra lại!",
        });
        setIsInstantGenerating(false);
        return;
      }

      // Automatically persist to user's persona collection
      const created = await createPersona({
        name: generated.name,
        role: generated.role,
        description: generated.description,
        personality: generated.personality,
        speaking_style: generated.speaking_style,
        difficulty: generated.difficulty || targetDiff,
        system_prompt: generated.system_prompt || "",
      });

      const personaToStart = created || ({
        ...generated,
        id: `ai_temp_${Date.now()}`,
        is_system: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Persona);

      setActivePersona(personaToStart);
      soundFX.playSuikinkutsu();

      // Launch session immediately using saved preferences (Zero-wait flow)
      const prefs = getSavedLobbyPreferences();
      await startSession(personaToStart, prefs.mode, {
        ai_provider: prefs.ai_provider,
        ai_model: prefs.ai_model,
        stt_provider: prefs.stt_provider,
        stt_model: prefs.stt_model,
        tts_provider: prefs.tts_provider,
        tts_engine: prefs.tts_engine,
        tts_enabled: prefs.tts_enabled,
        tts_voice: prefs.tts_voice,
        auto_end_of_speech: prefs.auto_end_of_speech,
        vad_sensitivity: prefs.vad_sensitivity,
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        msg: err.message || "Đã xảy ra lỗi khi tạo tình huống hội thoại.",
      });
    } finally {
      setIsInstantGenerating(false);
    }
  };

  const handleInfiniteRandomGen = async () => {
    const randomScenario = INSPIRATION_SCENARIOS[Math.floor(Math.random() * INSPIRATION_SCENARIOS.length)];
    setCustomSituationInput(randomScenario.label);
    await handleInstantCreateAndStart(randomScenario.theme);
  };

  const handleOpenLobby = (persona: Persona) => {
    setActivePersona(persona);
    setIsLobbyOpen(true);
  };

  const handleStartFromLobby = async (mode: any, config: any) => {
    if (!activePersona) return;
    setIsLobbyOpen(false);
    await startSession(activePersona, mode, config);
  };

  const resetCreateForm = () => {
    setFormData(INITIAL_FORM);
    setAiThemeHint("");
  };

  const handleOpenCreateModal = () => {
    resetCreateForm();
    setIsCreateModalOpen(true);
  };

  const handleCreatePersona = async () => {
    if (!formData.name.trim() || !formData.role.trim()) {
      setFeedback({ type: "error", msg: "Vui lòng nhập tên và vai trò của đối tác." });
      return;
    }
    const ok = await createPersona(formData);
    if (ok) {
      setIsCreateModalOpen(false);
      resetCreateForm();
      setFeedback({ type: "success", msg: `Đã tạo đối tác “${formData.name}” thành công!` });
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback({ type: "error", msg: "Không thể tạo đối tác. Vui lòng kiểm tra lại thông tin." });
    }
  };

  const handleGenerateAI = async () => {
    setFeedback(null);
    const targetDiff = formData.difficulty || (selectedDifficulty !== "All" ? selectedDifficulty : "N3");
    const { data: result, error: genError } = await generateRandomPersona({
      difficulty: targetDiff,
      theme: aiThemeHint.trim() || undefined,
    });

    if (result) {
      setFormData({
        name: result.name,
        role: result.role,
        description: result.description,
        personality: result.personality,
        speaking_style: result.speaking_style,
        difficulty: result.difficulty || targetDiff,
        system_prompt: result.system_prompt || "",
      });
      setIsCreateModalOpen(true);
      setFeedback({
        type: "success",
        msg: `✨ AI đã tạo đối tác “${result.name}” (${result.difficulty}). Bạn có thể chỉnh sửa rồi bấm Lưu.`,
      });
    } else {
      setFeedback({
        type: "error",
        msg: genError || "Không thể tạo đối tác bằng AI. Vui lòng kiểm tra cấu hình API Key trong mục Cài đặt.",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const ok = await deletePersona(deleteTarget.id);
    if (ok) {
      setFeedback({ type: "success", msg: `Đã xóa đối tác “${deleteTarget.name}”.` });
      setTimeout(() => setFeedback(null), 3500);
    } else {
      setFeedback({ type: "error", msg: "Không thể xóa đối tác. Vui lòng thử lại." });
    }
    setDeleteTarget(null);
  };

  const handleRestoreDefaults = async () => {
    setFeedback(null);
    const ok = await restoreDefaults();
    if (ok) {
      setFeedback({
        type: "success",
        msg: "Đã khôi phục thành công các đối tác mẫu mặc định (Yuki Senpai, Takahashi Sensei, Ren, Tanaka Bucho)!",
      });
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback({ type: "error", msg: "Không thể khôi phục đối tác mẫu. Vui lòng thử lại." });
    }
  };

  const isSessionActive =
    session !== null &&
    (state === "listening" ||
      state === "processing_stt" ||
      state === "ai_thinking" ||
      state === "ai_speaking" ||
      state === "paused" ||
      state === "ready");

  return (
    <div className="space-y-3.5 sm:space-y-4 animate-in fade-in duration-200">

      {/* Feedback Toast Banner */}
      {feedback && !isSessionActive && (
        <div
          className={`p-3.5 rounded-xl border text-sm flex items-center justify-between gap-3 shadow-sm ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            )}
            <span className="font-medium truncate">{feedback.msg}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold px-2 py-1 hover:opacity-75 rounded transition-opacity"
          >
            ✕
          </button>
        </div>
      )}

      {isSessionActive && activePersona ? (
        <div className="h-[calc(100vh-3.5rem)] overflow-hidden">
          <ActiveSessionRoom
            session={session!}
            persona={activePersona}
            turns={turns}
            state={state}
            volumeLevel={volumeLevel}
            isUserSpeaking={isUserSpeaking}
            formattedElapsed={formattedElapsed}
            formattedSpeaking={formattedSpeaking}
            isVoiceMuted={isVoiceMuted}
            onToggleVoiceMute={toggleVoiceMute}
            autoEndOfSpeech={autoEndOfSpeech}
            onToggleAutoEndOfSpeech={toggleAutoEndOfSpeech}
            latestUserTranscript={latestUserTranscript}
            interimTranscript={interimTranscript}
            latestSttMetrics={latestSttMetrics}
            isManualRecording={isManualRecording}
            manualSeconds={manualSeconds}
            onStartManualRecording={startManualRecording}
            onStopManualRecording={stopAndSendManualRecording}
            hasPermission={hasPermission}
            onRequestPermission={requestPermission}
            onSendTextTurn={sendTextTurn}
            onPause={pauseSession}
            onResume={resumeSession}
            onEndSession={endSession}
            onReplayVoice={replayVoice}
          />
        </div>
      ) : (
        <div className="space-y-3.5 sm:space-y-4">
          {/* Zen Toolbar */}
          <div className="rounded-2xl border border-border/70 bg-card/65 backdrop-blur-2xl p-3 sm:p-4 shadow-glass-card hover:shadow-glass-hover transition-all duration-300 space-y-3">
            {/* Top Bar: Title + Quick Link + Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-border/60">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="h-7 w-7 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center text-primary shadow-xs shrink-0">
                  <Mic className="h-3.5 w-3.5" />
                </span>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                    Phòng hội thoại AI
                  </h1>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted/80 text-muted-foreground border border-border/70 font-medium">
                    {filteredPersonas.length} đối tác
                  </span>
                </div>
                <Link
                  href="/ramp"
                  prefetch={true}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 hover:bg-primary/15 border border-primary/25 text-primary text-[11px] font-semibold transition-all ml-1"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Mode 6: Nấc thang nói</span>
                </Link>
              </div>

              {/* Partner Management Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRestoreDefaults}
                  isLoading={actionLoading}
                  className="text-[11px] text-muted-foreground hover:text-foreground border-border/80 rounded-full h-7 px-2.5"
                  title="Khôi phục lại các đối tác mẫu mặc định"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Mẫu
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenCreateModal}
                  className="text-[11px] rounded-full font-bold shadow-xs shadow-primary/25 h-7 px-3"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Tự tạo đối tác
                </Button>
              </div>
            </div>

            {/* Direct Custom Situation Input Bar */}
            <div className="pt-1 pb-1 space-y-2.5">
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-primary">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                  </div>
                  <input
                    type="text"
                    value={customSituationInput}
                    onChange={(e) => setCustomSituationInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleInstantCreateAndStart();
                      }
                    }}
                    placeholder="Nhập bất kỳ tình huống nào muốn luyện... (VD: Đi khám nha khoa, Phỏng vấn IT Roppongi, Lạc đường đêm Shinjuku...)"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-primary/30 bg-background/90 text-xs sm:text-sm font-medium placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-inner"
                  />
                  {customSituationInput && (
                    <button
                      type="button"
                      onClick={() => setCustomSituationInput("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isInstantGenerating}
                    onClick={() => handleInstantCreateAndStart()}
                    className="h-10 px-3.5 rounded-xl text-xs font-bold shadow-md shadow-primary/25 gap-1.5 cursor-pointer whitespace-nowrap"
                    title="AI sinh ngay nhân vật hoàn chỉnh và đưa bạn vào phòng luyện tập tức thì (Enter)"
                  >
                    {isInstantGenerating ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>AI Đang Thiết Kế...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Vào Luyện Ngay</span>
                        <kbd className="hidden md:inline-block text-[10px] font-mono px-1 py-0.2 rounded bg-black/20 text-white font-bold ml-0.5">
                          Enter
                        </kbd>
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isInstantGenerating}
                    onClick={handleInfiniteRandomGen}
                    className="h-10 px-3 rounded-xl text-xs font-bold border-border/80 hover:border-primary/50 text-foreground bg-card hover:bg-primary/10 gap-1.5 cursor-pointer whitespace-nowrap shadow-xs"
                    title="Sinh một tình huống & nhân vật hoàn toàn ngẫu nhiên và bắt đầu đàm thoại"
                  >
                    <Dices className="h-3.5 w-3.5 text-amber-500" />
                    <span className="hidden sm:inline">🎲 Sinh Ngẫu Nhiên</span>
                    <span className="sm:hidden">🎲 Random</span>
                  </Button>
                </div>
              </div>

              {/* Inspiration Chips Carousel */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 flex items-center gap-1">
                  <span>💡 Gợi ý thực chiến:</span>
                </span>
                {INSPIRATION_SCENARIOS.map((sc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCustomSituationInput(sc.label);
                      handleInstantCreateAndStart(sc.theme);
                    }}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-primary/15 border border-border/70 hover:border-primary/40 text-[11px] font-semibold text-foreground hover:text-primary transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                    title={sc.theme}
                  >
                    <span>{sc.icon}</span>
                    <span>{sc.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Deck: Search + Category Pills + Level Pills */}
            <div className="pt-2.5 border-t border-border/60 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                {/* Search Input */}
                <div className="relative min-w-[140px] max-w-[200px]">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="Tìm tên, vai trò..."
                    className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-border/70 bg-background/80 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {searchKeyword && (
                    <button
                      type="button"
                      onClick={() => setSearchKeyword("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-[10px]"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/40 border border-border/60 overflow-x-auto scrollbar-none">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedCategory(cat.key)}
                      className={cn(
                        "px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all whitespace-nowrap flex items-center gap-1",
                        selectedCategory === cat.key
                          ? "bg-primary text-primary-foreground shadow-xs font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span className="text-xs">{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>

                {/* Level Pills */}
                <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/40 border border-border/60 overflow-x-auto scrollbar-none">
                  {DIFFICULTIES.map((diff) => (
                    <button
                      key={diff.id}
                      onClick={() => setSelectedDifficulty(diff.id)}
                      className={cn(
                        "px-2 py-1 text-[11px] font-semibold rounded-md transition-all whitespace-nowrap",
                        selectedDifficulty === diff.id
                          ? "bg-primary text-primary-foreground shadow-xs font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {diff.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Persona Grid (Compact Cards, 5 columns on desktop) */}
          {loading ? (
            <div className="p-16 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <span>Đang tải danh sách đối tác hội thoại…</span>
            </div>
          ) : filteredPersonas.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border/80 bg-card/50 backdrop-blur-xl space-y-4 max-w-lg mx-auto">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto text-xl">
                👥
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Chưa có đối tác hội thoại nào</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedDifficulty !== "All"
                    ? `Không tìm thấy đối tác nào ở trình độ ${selectedDifficulty}. Bạn có thể tạo mới hoặc khôi phục các mẫu có sẵn.`
                    : "Danh sách đối tác đang trống. Hãy tạo đối tác riêng hoặc khôi phục lại các đối tác mẫu mặc định."}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2.5 flex-wrap pt-1">
                <Button variant="akane" size="sm" onClick={handleOpenCreateModal} className="rounded-full">
                  <Plus className="h-4 w-4" /> Tạo đối tác mới
                </Button>
                <Button variant="outline" size="sm" onClick={handleGenerateAI} isLoading={generating} className="rounded-full">
                  <Wand2 className="h-4 w-4 text-primary" /> Sinh bằng AI
                </Button>
                <Button variant="outline" size="sm" onClick={handleRestoreDefaults} isLoading={actionLoading} className="rounded-full">
                  <RotateCcw className="h-3.5 w-3.5" /> Khôi phục mẫu
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
              {filteredPersonas.map((persona) => {
                const catKey = getPersonaCategory(persona);
                const catMeta = CATEGORY_META[catKey];
                return (
                  <div
                    key={persona.id}
                    className="p-3 rounded-xl border border-border/70 bg-card/65 backdrop-blur-xl flex flex-col justify-between transition-all duration-200 hover:border-primary/50 hover:shadow-glass-hover hover:-translate-y-0.5 shadow-glass-sm group relative"
                  >
                    <div className="space-y-2">
                      {/* Avatar + Title + JLPT */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={cn(
                              "h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs border",
                              catMeta.bg,
                              catMeta.color
                            )}
                          >
                            {persona.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-xs font-bold text-foreground truncate block">
                                {persona.name}
                              </span>
                              <ExerciseSourceBadge
                                source={persona.is_system ? "sqlite" : "ai"}
                                className="text-[9px] px-1.5 py-0 h-4 rounded-full"
                              />
                            </div>
                            <span className="text-[10.5px] text-muted-foreground truncate block">
                              {persona.role}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-muted/80 text-foreground border border-border/80 shrink-0">
                          {persona.difficulty}
                        </span>
                      </div>

                      {/* 1-line description */}
                      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-1" title={persona.description}>
                        {persona.description}
                      </p>

                      {/* Style & Personality line */}
                      <div className="pt-1.5 border-t border-border/50 flex items-center justify-between gap-1 text-[10px] text-muted-foreground">
                        <span className="truncate max-w-[95px] font-medium" title={`Phong cách: ${persona.speaking_style}`}>
                          {persona.speaking_style}
                        </span>
                        <span className="truncate max-w-[85px] text-foreground/80 text-right" title={`Tính cách: ${persona.personality}`}>
                          • {persona.personality}
                        </span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-2 mt-2 border-t border-border/50 flex items-center gap-1.5">
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1 rounded-lg font-bold shadow-xs shadow-primary/20 h-7 text-[11px] px-2"
                        onClick={() => handleOpenLobby(persona)}
                      >
                        <Mic className="h-3 w-3 mr-1" />
                        Luyện nói
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
                        title="Xóa đối tác này"
                        onClick={() => setDeleteTarget(persona)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create / AI Generate Persona Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Tạo đối tác hội thoại mới"
        description="Điền thông tin đối tác hoặc dùng AI để sinh tự động theo chủ đề bạn chọn."
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* AI Quick Generator Box */}
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Tạo đối tác nhanh
              </span>
              <Badge variant="sakura" size="sm">
                Tự động
              </Badge>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="VD: Chủ tiệm ramen Tokyo, Bạn cùng lớp anime, Bác sĩ…"
                value={aiThemeHint}
                onChange={(e) => setAiThemeHint(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleGenerateAI();
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateAI}
                isLoading={generating}
                className="text-xs shrink-0"
              >
                <Wand2 className="h-3.5 w-3.5 text-primary mr-1" />
                Sinh AI
              </Button>
            </div>
          </div>

          {/* Form Fields */}
          <Input
            label="Tên đối tác (Kèm cách đọc)"
            placeholder="VD: Haruto (ハルト) hoặc Sakura (桜)"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Input
            label="Vai trò / Nghề nghiệp"
            placeholder="VD: Chủ quán trà truyền thống ở Kyoto"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">Trình độ JLPT</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="h-9 bg-background border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:border-primary"
              >
                {["N5", "N4", "N3", "N2", "N1"].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Phong cách nói"
              placeholder="VD: Lịch sự keigo, Thân mật casual…"
              value={formData.speaking_style}
              onChange={(e) => setFormData({ ...formData, speaking_style: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Mô tả bối cảnh & Tính cách</label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
              placeholder="VD: Thân thiện, chu đáo, thích kể chuyện văn hóa và ẩm thực Nhật Bản."
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                  personality: formData.personality || e.target.value,
                })
              }
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">System Prompt (Chỉ dẫn AI vai diễn)</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
              placeholder="You are Haruto, a ramen chef in Tokyo. Speak naturally in Japanese suitable for JLPT learners in 1-3 sentences."
              value={formData.system_prompt || ""}
              onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border sticky bottom-0 bg-card">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={actionLoading}
            >
              Hủy
            </Button>
            <Button
              variant="akane"
              size="sm"
              onClick={handleCreatePersona}
              isLoading={actionLoading}
              disabled={!formData.name.trim() || !formData.role.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Lưu đối tác
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Xóa đối tác hội thoại?"
        description={`Bạn có chắc chắn muốn xóa đối tác “${deleteTarget?.name || ""}”?`}
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Đối tác này và lịch sử các phiên luyện nói liên quan sẽ bị xóa hoàn toàn khỏi hệ thống. Hành động này không thể hoàn tác (nhưng bạn có thể khôi phục lại các đối tác mẫu bất cứ lúc nào).
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={actionLoading}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmDelete}
              isLoading={actionLoading}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Xác nhận xóa
            </Button>
          </div>
        </div>
      </Modal>

      {/* Speaking Room Session Lobby Modal */}
      {activePersona && (
        <Modal
          isOpen={isLobbyOpen}
          onClose={() => setIsLobbyOpen(false)}
          title={`Phòng chờ: ${activePersona.name}`}
          description="Thiết lập chế độ luyện tập và cấu hình âm thanh trước khi bắt đầu."
          className="max-w-2xl sm:max-w-3xl"
        >
          <SessionLobby
            persona={activePersona}
            volumeLevel={volumeLevel}
            isInitializing={isInitializing}
            onStartSession={handleStartFromLobby}
            onClose={() => setIsLobbyOpen(false)}
          />
        </Modal>
      )}

      {/* Permission Denied Modal */}
      <MicrophonePermissionModal
        isOpen={state === "permission_denied"}
        onClose={() => {}}
        onRetry={requestPermission}
      />

      {/* Session Summary Modal */}
      <SessionSummaryModal
        isOpen={isSummaryOpen}
        summary={summary}
        onClose={handleCloseSummary}
        onReplayVoice={replayVoice}
      />
    </div>
  );
}
