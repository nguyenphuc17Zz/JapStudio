import { useCallback, useEffect, useRef, useState } from "react";
import {
  registerMediaStream,
  unregisterMediaStream,
  registerAudioContext,
  unregisterAudioContext,
} from "@/hooks/use-global-audio-cleanup";

export interface UseMicrophoneResult {
  hasPermission: boolean | null;
  isInitializing: boolean;
  isRecording: boolean;
  error: string | null;
  volumeLevel: number;
  micGain: number;
  setMicGain: (newGain: number) => void;
  isWhisperMode: boolean;
  toggleWhisperMode: () => void;
  setIsWhisperMode: (active: boolean) => void;
  stream: MediaStream | null;
  requestPermission: (deviceId?: string) => Promise<boolean>;
  releaseMicrophone: () => void;
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<Blob>;
}

export function useMicrophone(): UseMicrophoneResult {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);

  // Digital Pre-Amp Software Mic Gain (Default 2.0x for soft/whisper voices)
  const [micGain, setMicGainState] = useState<number>(2.0);
  const micGainRef = useRef<number>(micGain);
  micGainRef.current = micGain;

  const [isWhisperMode, setIsWhisperModeState] = useState<boolean>(false);
  const isWhisperModeRef = useRef<boolean>(isWhisperMode);
  isWhisperModeRef.current = isWhisperMode;

  useEffect(() => {
    try {
      const savedGain = localStorage.getItem("speaking_training_mic_gain");
      if (savedGain) {
        const val = parseFloat(savedGain);
        if (val) {
          setMicGainState(val);
          micGainRef.current = val;
        }
      }
      const savedWhisper = localStorage.getItem("speaking_training_whisper_mode");
      if (savedWhisper === "1") {
        setIsWhisperModeState(true);
        isWhisperModeRef.current = true;
      }
    } catch {}
  }, []);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const lastVolumeTimeRef = useRef<number>(0);

  const setMicGain = useCallback((newGain: number) => {
    const clamped = Math.max(1.0, Math.min(5.0, Number(newGain) || 1.0));
    micGainRef.current = clamped;
    setMicGainState(clamped);
    try {
      localStorage.setItem("speaking_training_mic_gain", clamped.toString());
      window.dispatchEvent(
        new CustomEvent("speaking_training_mic_gain_changed", { detail: clamped })
      );
    } catch {}
    if (gainNodeRef.current && audioContextRef.current) {
      try {
        gainNodeRef.current.gain.setTargetAtTime(clamped, audioContextRef.current.currentTime, 0.05);
      } catch {
        gainNodeRef.current.gain.value = clamped;
      }
    }
  }, []);

  const setIsWhisperMode = useCallback((active: boolean) => {
    isWhisperModeRef.current = active;
    setIsWhisperModeState(active);
    try {
      localStorage.setItem("speaking_training_whisper_mode", active ? "1" : "0");
      window.dispatchEvent(
        new CustomEvent("speaking_training_whisper_mode_changed", { detail: active })
      );
    } catch {}
    if (active) {
      setMicGain(3.5);
    } else {
      setMicGain(2.0);
    }
  }, [setMicGain]);

  const toggleWhisperMode = useCallback(() => {
    setIsWhisperMode(!isWhisperModeRef.current);
  }, [setIsWhisperMode]);

  // Global event listeners for real-time gain & whisper mode sync across components and header
  useEffect(() => {
    const handleGainChange = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (typeof customEvent.detail === "number" && customEvent.detail !== micGainRef.current) {
        micGainRef.current = customEvent.detail;
        setMicGainState(customEvent.detail);
        if (gainNodeRef.current && audioContextRef.current) {
          try {
            gainNodeRef.current.gain.setTargetAtTime(
              customEvent.detail,
              audioContextRef.current.currentTime,
              0.05
            );
          } catch {
            gainNodeRef.current.gain.value = customEvent.detail;
          }
        }
      }
    };

    const handleWhisperChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      if (typeof customEvent.detail === "boolean" && customEvent.detail !== isWhisperModeRef.current) {
        isWhisperModeRef.current = customEvent.detail;
        setIsWhisperModeState(customEvent.detail);
      }
    };

    window.addEventListener("speaking_training_mic_gain_changed", handleGainChange);
    window.addEventListener("speaking_training_whisper_mode_changed", handleWhisperChange);
    return () => {
      window.removeEventListener("speaking_training_mic_gain_changed", handleGainChange);
      window.removeEventListener("speaking_training_whisper_mode_changed", handleWhisperChange);
    };
  }, []);

  const releaseMicrophone = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      unregisterMediaStream(streamRef.current);
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    gainNodeRef.current = null;
    compressorRef.current = null;
    destinationRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      unregisterAudioContext(audioContextRef.current);
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setVolumeLevel(0);
    setIsRecording(false);
  }, []);

  const monitorVolume = useCallback(() => {
    if (!analyserRef.current) return;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkVolume = () => {
      if (!analyserRef.current) return;
      const now = performance.now();
      if (now - lastVolumeTimeRef.current >= 50) {
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        // Boosted sensitivity mapping: gives responsive visual feedback even for quiet voices
        const boost = isWhisperModeRef.current ? 1.6 : 1.0;
        const normalized = Math.min(1.0, Math.max(0.0, (avg / 60.0) * boost));
        setVolumeLevel(normalized);
        lastVolumeTimeRef.current = now;
      }
      animFrameRef.current = requestAnimationFrame(checkVolume);
    };

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    animFrameRef.current = requestAnimationFrame(checkVolume);
  }, []);

  const requestPermission = useCallback(
    async (deviceId?: string): Promise<boolean> => {
      setIsInitializing(true);
      setError(null);
      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error("Trình duyệt không hỗ trợ truy cập Microphone.");
        }

        // Reuse active stream if available
        if (streamRef.current && streamRef.current.active) {
          const liveTrack = streamRef.current.getAudioTracks().find((t) => t.readyState === "live");
          if (liveTrack) {
            setHasPermission(true);
            setIsInitializing(false);
            if (!analyserRef.current) monitorVolume();
            return true;
          }
        }

        releaseMicrophone();

        const constraints: MediaStreamConstraints = {
          audio: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            echoCancellation: true,
            // When in Whisper Mode, disable aggressive browser noise suppression so faint consonants aren't filtered out
            noiseSuppression: !isWhisperModeRef.current,
            autoGainControl: true,
            channelCount: 1,
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        registerMediaStream(stream);

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();

        const source = ctx.createMediaStreamSource(stream);

        // 0. 80Hz High-Pass Filter (HPF) to cut low desk vibration & fan rumble before pre-amp boost
        const hpf = ctx.createBiquadFilter();
        hpf.type = "highpass";
        hpf.frequency.setValueAtTime(80, ctx.currentTime);
        hpf.Q.setValueAtTime(0.7, ctx.currentTime);

        // 1. Digital Pre-Amp Software Gain Node (x1.0 - x5.0)
        const gainNode = ctx.createGain();
        const effectiveGain = isWhisperModeRef.current ? Math.max(3.5, micGainRef.current) : micGainRef.current;
        gainNode.gain.setValueAtTime(effectiveGain, ctx.currentTime);
        gainNodeRef.current = gainNode;

        // 2. Dynamics Compressor: boosts low signals (whispers) while preventing clipping
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(isWhisperModeRef.current ? -45 : -36, ctx.currentTime);
        compressor.knee.setValueAtTime(24, ctx.currentTime);
        compressor.ratio.setValueAtTime(isWhisperModeRef.current ? 6 : 4, ctx.currentTime);
        compressor.attack.setValueAtTime(0.003, ctx.currentTime);
        compressor.release.setValueAtTime(0.12, ctx.currentTime);
        compressorRef.current = compressor;

        // 3. Analyser Node for Volume Meter
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.4;
        analyserRef.current = analyser;

        // 4. MediaStreamDestination for amplified recording
        const destination = ctx.createMediaStreamDestination();
        destinationRef.current = destination;

        // Audio Pipeline: source -> hpf (80Hz cut) -> gainNode (boost) -> compressor -> analyser (UI)
        //                                                                            -> destination (MediaRecorder)
        source.connect(hpf);
        hpf.connect(gainNode);
        gainNode.connect(compressor);
        compressor.connect(analyser);
        compressor.connect(destination);

        audioContextRef.current = ctx;
        registerAudioContext(ctx);

        monitorVolume();
        setHasPermission(true);
        setIsInitializing(false);
        return true;
      } catch (err: any) {
        console.error("[useMicrophone] Permission error:", err);
        setHasPermission(false);
        setIsInitializing(false);
        const msg =
          err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
            ? "Quyền truy cập Microphone bị từ chối. Hãy cho phép micro trên thanh địa chỉ trình duyệt."
            : err.message || "Không thể khởi tạo Microphone.";
        setError(msg);
        return false;
      }
    },
    [monitorVolume, releaseMicrophone]
  );

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      if (!streamRef.current || !streamRef.current.active) {
        const ok = await requestPermission();
        if (!ok) return false;
      }

      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        try {
          await audioContextRef.current.resume();
        } catch {}
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        return true;
      }

      audioChunksRef.current = [];

      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/webm";
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/ogg;codecs=opus";
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "";
      }

      const recorderOptions: MediaRecorderOptions = {
        audioBitsPerSecond: 128000,
      };
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }

      // Record from amplified Pre-Amp destination stream if available, else raw stream
      const recordStream = destinationRef.current?.stream || streamRef.current!;
      const recorder = new MediaRecorder(recordStream, recorderOptions);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      return true;
    } catch (e: any) {
      console.error("[useMicrophone] Failed to start recorder:", e);
      setError(e.message || "Không thể bắt đầu thu âm.");
      setIsRecording(false);
      return false;
    }
  }, [requestPermission]);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        setIsRecording(false);
        mediaRecorderRef.current = null;
        resolve(new Blob([], { type: "audio/webm" }));
        return;
      }

      recorder.onstop = () => {
        setIsRecording(false);
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];
        mediaRecorderRef.current = null;
        resolve(blob);
      };

      recorder.onerror = () => {
        setIsRecording(false);
        mediaRecorderRef.current = null;
        resolve(new Blob([], { type: "audio/webm" }));
      };

      try {
        recorder.stop();
      } catch {
        setIsRecording(false);
        mediaRecorderRef.current = null;
        resolve(new Blob([], { type: "audio/webm" }));
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      releaseMicrophone();
    };
  }, [releaseMicrophone]);

  return {
    hasPermission,
    isInitializing,
    isRecording,
    error,
    volumeLevel,
    micGain,
    setMicGain,
    isWhisperMode,
    toggleWhisperMode,
    setIsWhisperMode,
    stream: streamRef.current,
    requestPermission,
    releaseMicrophone,
    startRecording,
    stopRecording,
  };
}
