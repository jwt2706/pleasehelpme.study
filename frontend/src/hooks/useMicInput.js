import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";

function getSpeechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Brave exposes webkitSpeechRecognition, but the cloud backend it depends on
// is blocked for privacy reasons, and Brave's on-device replacement never
// finishes installing. Recognition either errors out almost immediately
// ("network") or just hangs with no results and no error. Since there's no
// reliable way to feature-detect this ahead of time, we start native
// recognition optimistically and fall back to recording raw audio + server-
// side transcription (via Gemini, see services/gemini.js) the moment either
// failure mode shows up. Firefox (which never had the native API at all)
// goes straight to the fallback.
const NATIVE_RESULT_GRACE_MS = 4000;

/**
 * Live-ish speech-to-text. Prefers the browser's built-in SpeechRecognition
 * when it actually works; otherwise records audio via MediaRecorder and
 * transcribes it server-side once recording stops. Also exposes a
 * getUserMedia-backed analyser so callers can visualize mic input either way.
 */
export function useMicInput({ onResult, getToken }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [analyser, setAnalyser] = useState(null);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const baseTextRef = useRef("");
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const usingFallbackRef = useRef(false);
  const gotNativeResultRef = useRef(false);
  const graceTimerRef = useRef(null);

  const supported =
    !!getSpeechRecognitionCtor() || !!(navigator.mediaDevices && window.MediaRecorder);

  function teardownStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setAnalyser(null);
  }

  function stopNativeRecognition() {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      try {
        recognitionRef.current.stop();
      } catch (_) {
        /* already stopped */
      }
      recognitionRef.current = null;
    }
    if (graceTimerRef.current) {
      clearTimeout(graceTimerRef.current);
      graceTimerRef.current = null;
    }
  }

  function startFallbackRecording(stream) {
    if (usingFallbackRef.current) return; // already switched over
    usingFallbackRef.current = true;
    chunksRef.current = [];

    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];
    const mimeType = candidates.find((t) => window.MediaRecorder.isTypeSupported?.(t)) || "";

    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
  }

  async function finishFallbackRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    const blob = await new Promise((resolve) => {
      recorder.onstop = () =>
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
      try {
        recorder.stop();
      } catch (_) {
        resolve(new Blob(chunksRef.current, { type: "audio/webm" }));
      }
    });
    mediaRecorderRef.current = null;
    if (!blob.size) return;

    setIsTranscribing(true);
    setError(null);
    try {
      const base64 = await blobToBase64(blob);
      const token = await getToken();
      const { text } = await api.transcribeAudio(token, { audio: base64, mimeType: blob.type });
      if (text) onResult((baseTextRef.current + text).trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setIsTranscribing(false);
    }
  }

  const stop = useCallback(() => {
    stopNativeRecognition();
    setIsRecording(false);
    if (usingFallbackRef.current) {
      finishFallbackRecording().finally(() => {
        usingFallbackRef.current = false;
        teardownStream();
      });
    } else {
      teardownStream();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(
    async (currentText) => {
      baseTextRef.current = currentText ? `${currentText} ` : "";
      gotNativeResultRef.current = false;
      usingFallbackRef.current = false;
      setError(null);

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
        if (audioCtxRef.current.state === "suspended") await audioCtxRef.current.resume();
        const source = audioCtxRef.current.createMediaStreamSource(stream);
        const node = audioCtxRef.current.createAnalyser();
        node.fftSize = 64;
        source.connect(node);
        setAnalyser(node);
      } catch (err) {
        setError("Microphone permission was denied.");
        return;
      }

      const Ctor = getSpeechRecognitionCtor();

      if (!Ctor) {
        // Firefox, etc — no native API at all, go straight to the fallback.
        if (window.MediaRecorder) {
          startFallbackRecording(stream);
          setIsRecording(true);
        } else {
          setError("Voice input isn't supported in this browser.");
        }
        return;
      }

      const recognition = new Ctor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        gotNativeResultRef.current = true;
        let finalText = "";
        let interimText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalText += transcript;
          else interimText += transcript;
        }
        if (finalText) baseTextRef.current += finalText;
        onResult(baseTextRef.current + interimText);
      };

      recognition.onerror = (event) => {
        // Brave's most common failure mode: an immediate "network" error,
        // because the recognition backend it depends on is blocked.
        console.error("Speech recognition error:", event.error);
        if (!gotNativeResultRef.current && window.MediaRecorder) {
          stopNativeRecognition();
          startFallbackRecording(stream);
        }
      };

      recognition.onend = () => {
        if (!usingFallbackRef.current) setIsRecording(false);
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
        setIsRecording(true);
      } catch (err) {
        stopNativeRecognition();
        if (window.MediaRecorder) startFallbackRecording(stream);
      }

      // Covers Brave's *other* failure mode: no error, just nothing ever
      // comes back (its on-device speech component hangs at "downloading"
      // forever and never actually installs).
      graceTimerRef.current = setTimeout(() => {
        if (!gotNativeResultRef.current && recognitionRef.current && window.MediaRecorder) {
          stopNativeRecognition();
          startFallbackRecording(stream);
        }
      }, NATIVE_RESULT_GRACE_MS);
    },
    [onResult, getToken]
  );

  useEffect(() => stop, [stop]);

  return { supported, isRecording, isTranscribing, analyser, error, start, stop };
}