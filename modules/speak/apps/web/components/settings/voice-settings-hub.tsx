"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Volume2,
  Mic,
  Sliders,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  Loader2,
  Star,
  Check,
  Zap,
  Radio,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VoiceProfile, AudioSettings } from "@/types/audio";
import { audioApi } from "@/features/audio/services/audio-api";
import { useTTS } from "@/features/audio/hooks/useTTS";
import { TtsEngineCard } from "./tts-engine-card";
import { STTModelManagerCard } from "@/features/audio/components/STTModelManagerCard";
import { MicGainStudioCard } from "./mic-gain-studio-card";
import { WebSpeechStudioCard } from "./web-speech-studio-card";
import { MicrophoneCalibrationModal } from "@/features/audio/components/MicrophoneCalibrationModal";
import { getVoiceCharacterMeta } from "@/features/audio/services/voice-meta";
import {
  saveLobbyPreferences,
  syncLobbyPreferencesFromAudioSettings,
} from "@/features/speaking/services/lobby-preferences";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";

const PREVIEW_PHRASE = "こんにちは！今日も一緒に楽しく日本語を練習しましょう。";

export function VoiceSettingsHub() {
  // Settings & Voices State
  const [settings, setSettings] = useState<AudioSettings | null>(null);
  const [provider, setProvider] = useState<"edge_tts">("edge_tts");
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [defaultVoiceId, setDefaultVoiceId] = useState<string>("");
  const [speed, setSpeed] = useState<number>(1.0);

  // Status & Feedback
  const [loading, setLoading] = useState(true);
  const [savingVoiceId, setSavingVoiceId] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Microphone quick test state
  const [isCalibratingMic, setIsCalibratingMic] = useState(false);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micAudioLevel, setMicAudioLevel] = useState(0);
  const [micTestResult, setMicTestResult] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Accordion drawer for deep technical configs
  const [showAdvancedAudio, setShowAdvancedAudio] = useState(false);

  // TTS Hook
  const { isGenerating, isPlaying, previewVoice, stop } = useTTS({
    onPlaybackEnded: () => setPlayingVoiceId(null),
    onError: () => setPlayingVoiceId(null),
  });

  // Load voices for current provider
  const loadVoices = async (targetProvider: "edge_tts") => {
    try {
      const fetched = await audioApi.getVoices(targetProvider);
      setVoices(fetched || []);
    } catch (e) {
      console.warn("Failed to load voices:", e);
      setVoices([]);
    }
  };

  // Initial load
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [fetchedSettings, fetchedVoices] = await Promise.all([
        audioApi.getSettings().catch(() => null),
        audioApi.getVoices("edge_tts").catch(() => []),
      ]);

      if (fetchedSettings) {
        setSettings(fetchedSettings);
        setSpeed(fetchedSettings.default_tts_speed || 1.0);
        setProvider("edge_tts");
        setDefaultVoiceId(fetchedSettings.default_voice_profile_id || "");
        syncLobbyPreferencesFromAudioSettings(fetchedSettings);
      }
      setVoices(fetchedVoices || []);
    } catch (e) {
      console.warn("Failed to load voice hub data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    return () => {
      stopMicTest();
    };
  }, []);

  // Switch Provider
  const handleSwitchProvider = async (newProvider: "edge_tts") => {
    if (newProvider === provider) return;
    soundFX.playFurin();
    if (isPlaying) {
      stop();
      setPlayingVoiceId(null);
    }
    setProvider(newProvider);
    await loadVoices(newProvider);
  };

  // Toggle Voice Preview
  const handleTogglePreview = (targetVoice: VoiceProfile) => {
    if (playingVoiceId === targetVoice.voice_id && isPlaying) {
      stop();
      setPlayingVoiceId(null);
    } else {
      setPlayingVoiceId(targetVoice.voice_id);
      previewVoice(
        PREVIEW_PHRASE,
        targetVoice.voice_id,
        targetVoice.provider,
        speed,
        0.0,
        targetVoice.style || undefined
      );
    }
  };

  // Set Voice as Default
  const handleSetAsDefault = async (targetVoice: VoiceProfile) => {
    setSavingVoiceId(targetVoice.voice_id);
    setFeedbackMsg(null);
    try {
      await audioApi.updateSettings({
        default_tts_provider: targetVoice.provider,
        default_voice_profile_id: targetVoice.voice_id,
        default_tts_speed: speed,
      });
      syncLobbyPreferencesFromAudioSettings({
        default_tts_provider: targetVoice.provider,
        default_voice_profile_id: targetVoice.voice_id,
        default_tts_speed: speed,
      });
      setDefaultVoiceId(targetVoice.voice_id);
      setFeedbackMsg({
        type: "success",
        text: `Đã đặt giọng “${targetVoice.name}” làm giọng AI mặc định toàn hệ thống!`,
      });
      soundFX.playFurin();
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (e: any) {
      setFeedbackMsg({
        type: "error",
        text: `Lỗi: ${e.message || "Không thể lưu cài đặt"}`,
      });
    } finally {
      setSavingVoiceId(null);
    }
  };

  // Change Speech Speed
  const handleSpeedChange = async (newSpeed: number) => {
    setSpeed(newSpeed);
    saveLobbyPreferences({ tts_speed: newSpeed });
    try {
      await audioApi.updateSettings({ default_tts_speed: newSpeed });
    } catch (e) {
      console.warn("Failed to update speed:", e);
    }
  };

  // Toggle settings checkboxes
  const handleToggleSetting = async (key: keyof AudioSettings, value: boolean) => {
    if (!settings) return;
    const nextSettings = { ...settings, [key]: value };
    setSettings(nextSettings);
    try {
      await audioApi.updateSettings({ [key]: value });
    } catch (e) {
      console.warn("Failed to update setting:", key, e);
    }
  };

  // Microphone Quick Tester
  const startMicTest = async () => {
    try {
      setIsTestingMic(true);
      setMicTestResult(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setMicAudioLevel(normalized);
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();

      setTimeout(() => {
        setMicTestResult("Âm lượng micro tốt, độ nhạy cao! Bạn đã sẵn sàng luyện nói.");
      }, 2500);
    } catch (err: any) {
      setIsTestingMic(false);
      setMicTestResult("Không thể truy cập Micro. Vui lòng cấp quyền micro trên trình duyệt.");
    }
  };

  const stopMicTest = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsTestingMic(false);
    setMicAudioLevel(0);
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <span className="text-sm font-medium">Đang tải cấu hình giọng nói & âm thanh...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-2 shadow-sm ${
            feedbackMsg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span className="font-medium">{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-xs font-bold px-2 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5"
          >
            ✕
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* KHỐI 1: GIỌNG ĐỌC AI ĐỒNG HÀNH & TỐC ĐỘ PHÁT ÂM        */}
      {/* ======================================================== */}
      <div className="rounded-2xl border border-border/70 bg-card/75 backdrop-blur-xl p-5 sm:p-6 shadow-glass-sm space-y-5">
        {/* Header & Engine Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Volume2 className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">Giọng Đọc AI Đồng Hành</h2>
                <span className="font-jp text-xs font-bold text-muted-foreground">音声アシスタント</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Chọn giọng tiếng Nhật đồng hành cùng bạn khi luyện phản xạ và hội thoại.
              </p>
            </div>
          </div>

          {/* Engine Selector Segmented Control */}
          <div className="flex items-center p-1 rounded-xl bg-muted/60 border border-border/70 self-start sm:self-center">
            <button
              onClick={() => handleSwitchProvider("edge_tts")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                provider === "edge_tts"
                  ? "bg-card text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className={cn("h-3.5 w-3.5", provider === "edge_tts" ? "text-primary" : "text-muted-foreground")} />
              <span>Edge-TTS</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-normal hidden sm:inline">
                Chuẩn Tokyo
              </span>
            </button>
          </div>
        </div>

        {/* Voice Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {voices.map((v) => {
            const meta = getVoiceCharacterMeta(v);
            const isDefault = v.voice_id === defaultVoiceId;
            const isCurrentlyPlaying = playingVoiceId === v.voice_id && isPlaying;
            const isCurrentlyGenerating = playingVoiceId === v.voice_id && isGenerating;
            const isSavingThis = savingVoiceId === v.voice_id;

            return (
              <div
                key={v.voice_id}
                className={cn(
                  "rounded-xl border p-3.5 transition-all flex flex-col justify-between gap-3 relative",
                  isDefault
                    ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20 shadow-xs"
                    : "bg-muted/30 border-border/70 hover:bg-muted/50 hover:border-border"
                )}
              >
                {/* Card Top: Avatar, Name & Default Badge */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center font-bold text-foreground text-base shrink-0 font-jp">
                    {meta.avatarLetter}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-sm font-bold text-foreground truncate font-jp">{v.name}</h4>
                      {isDefault && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold border border-primary/30 shrink-0 inline-flex items-center gap-1">
                          <Star className="h-2.5 w-2.5 fill-current" /> Mặc định
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                      <span>{meta.genderLabel}</span>
                      <span>·</span>
                      <span className="truncate">{meta.vibeLabel}</span>
                    </div>
                  </div>
                </div>

                {/* Card Middle: Description */}
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {meta.descriptionVi}
                </p>

                {/* Card Bottom: Actions */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                  {/* Audition Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTogglePreview(v)}
                    disabled={isCurrentlyGenerating}
                    className="h-8 px-3 text-xs gap-1.5 rounded-lg border-border/80 hover:bg-card shrink-0"
                  >
                    {isCurrentlyGenerating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        <span>Đang tạo...</span>
                      </>
                    ) : isCurrentlyPlaying ? (
                      <>
                        <Square className="h-3.5 w-3.5 fill-current text-primary animate-pulse" />
                        <span className="text-primary font-semibold">Dừng</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 fill-current text-muted-foreground" />
                        <span>Nghe thử</span>
                      </>
                    )}
                  </Button>

                  {/* Set as Default Button */}
                  {isDefault ? (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10">
                      <Check className="h-3.5 w-3.5" /> Đang dùng
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSetAsDefault(v)}
                      disabled={isSavingThis}
                      className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-card"
                    >
                      {isSavingThis ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <span>Đặt làm chính</span>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Speed Adjustment Bar */}
        <div className="pt-3 border-t border-border/70 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">Tốc độ phát âm (Speed):</span>
              <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                {speed.toFixed(2)}x
              </span>
            </div>

            {/* Fast Presets */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSpeedChange(0.85)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                  speed === 0.85
                    ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                    : "bg-muted/40 border-border/70 text-muted-foreground hover:text-foreground"
                )}
              >
                0.85x (Chậm N5-N4)
              </button>
              <button
                type="button"
                onClick={() => handleSpeedChange(1.0)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                  speed === 1.0
                    ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                    : "bg-muted/40 border-border/70 text-muted-foreground hover:text-foreground"
                )}
              >
                1.00x (Chuẩn N3)
              </button>
              <button
                type="button"
                onClick={() => handleSpeedChange(1.15)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                  speed === 1.15
                    ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                    : "bg-muted/40 border-border/70 text-muted-foreground hover:text-foreground"
                )}
              >
                1.15x (Nhanh N1)
              </button>
            </div>
          </div>

          <input
            type="range"
            min="0.7"
            max="1.4"
            step="0.05"
            value={speed}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            className="w-full accent-primary cursor-pointer h-1.5 bg-muted rounded-lg"
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* KHỐI 2: MICROPHONE & TÙY CHỌN TỰ ĐỘNG PHÁT ÂM           */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Live VU Meter Microphone Test */}
        <div className="rounded-2xl border border-border/70 bg-card/75 backdrop-blur-xl p-5 shadow-glass-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Mic className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Kiểm Tra Microphone</h3>
                  <p className="text-xs text-muted-foreground">Nhận diện phát âm tiếng Nhật</p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCalibratingMic(true)}
                className="text-xs h-8 rounded-lg"
              >
                <Sliders className="h-3.5 w-3.5 mr-1" />
                Cân chỉnh
              </Button>
            </div>

            {/* Live Audio Level Bar */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground text-[11px]">Cường độ âm lượng micro:</span>
                <span className="font-mono font-bold text-xs text-foreground">{micAudioLevel}%</span>
              </div>
              <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border/60">
                <div
                  className={cn(
                    "h-full transition-all duration-100 rounded-full",
                    micAudioLevel > 75
                      ? "bg-amber-500"
                      : micAudioLevel > 20
                      ? "bg-emerald-500"
                      : "bg-muted-foreground/30"
                  )}
                  style={{ width: `${micAudioLevel}%` }}
                />
              </div>
            </div>

            {micTestResult && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{micTestResult}</span>
              </div>
            )}
          </div>

          <div>
            {!isTestingMic ? (
              <Button
                size="sm"
                onClick={startMicTest}
                className="w-full text-xs h-9 gap-2 font-bold rounded-xl"
              >
                <Mic className="h-4 w-4 mr-1" />
                Bắt đầu thử Micro
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={stopMicTest}
                className="w-full text-xs h-9 gap-2 border-primary text-primary hover:bg-primary/10 font-bold rounded-xl"
              >
                <Radio className="h-4 w-4 animate-pulse text-primary mr-1" />
                Đang lắng nghe... Bấm để dừng
              </Button>
            )}
          </div>
        </div>

        {/* Card 2: Speaking Automation & Preferences */}
        <div className="rounded-2xl border border-border/70 bg-card/75 backdrop-blur-xl p-5 shadow-glass-sm space-y-3.5">
          <div className="flex items-center gap-3">
            <span className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">Tùy Chọn Tương Tác</h3>
              <p className="text-xs text-muted-foreground">Tự động phát câu trả lời và chuyển tiếp dự phòng</p>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            {/* Auto Play AI Response */}
            <label className="p-3 rounded-xl bg-muted/30 border border-border/70 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-foreground">
                  Tự động đọc câu trả lời của AI
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Phát giọng nói của AI ngay sau khi hoàn thành lượt đối thoại.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings?.auto_play_ai_response ?? true}
                onChange={(e) => handleToggleSetting("auto_play_ai_response", e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary shrink-0 accent-primary cursor-pointer"
              />
            </label>

            {/* TTS Fallback */}
            <label className="p-3 rounded-xl bg-muted/30 border border-border/70 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-foreground">
                  Tự động chuyển tiếp dự phòng (TTS Fallback)
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Tự động thử lại khi Edge-TTS gặp sự cố mạng.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings?.tts_fallback_enabled ?? true}
                onChange={(e) => handleToggleSetting("tts_fallback_enabled", e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary shrink-0 accent-primary cursor-pointer"
              />
            </label>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* KHỐI 3: CẤU HÌNH KỸ THUẬT NÂNG CAO (ACCORDION DRAWER)    */}
      {/* ======================================================== */}
      <div className="rounded-2xl border border-border/70 bg-card/75 backdrop-blur-xl overflow-hidden shadow-glass-sm">
        <button
          type="button"
          onClick={() => setShowAdvancedAudio((prev) => !prev)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/40 transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <span className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Sliders className="h-4 w-4" />
            </span>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-foreground">
                Cấu hình Kỹ thuật & Engine Nâng cao (Model weights, Whisper, Pre-Amp)
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Quản lý mô hình Whisper STT và bộ tiền khuếch đại Mic Gain
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20 shrink-0 inline-flex items-center gap-1">
            {showAdvancedAudio ? (
              <>
                <span>Thu gọn</span>
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <span>Mở rộng</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </span>
        </button>

        {showAdvancedAudio && (
          <div className="p-4 sm:p-5 pt-2 space-y-4 border-t border-border/60">
            <TtsEngineCard onEngineReload={loadInitialData} />
            <STTModelManagerCard />
            <MicGainStudioCard />
            <WebSpeechStudioCard />
          </div>
        )}
      </div>

      {/* Deep Mic Calibration Modal */}
      <MicrophoneCalibrationModal
        isOpen={isCalibratingMic}
        onClose={() => setIsCalibratingMic(false)}
      />
    </div>
  );
}
