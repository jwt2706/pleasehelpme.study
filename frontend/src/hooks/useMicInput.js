import { useCallback, useEffect, useRef, useState } from "react";

function getSpeechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/**
 * Live speech-to-text via the browser's built-in SpeechRecognition, plus a
 * separate getUserMedia stream just so callers can visualize mic input.
 * Not supported in Firefox — `supported` reflects that.
 */
export function useMicInput({ onResult }) {
  const [isRecording, setIsRecording] = useState(false);
  const [analyser, setAnalyser] = useState(null);
  const recognitionRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const baseTextRef = useRef("");

  const supported = !!getSpeechRecognitionCtor();

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setAnalyser(null);
    setIsRecording(false);
  }, []);

  const start = useCallback(
    async (currentText) => {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) return;

      baseTextRef.current = currentText ? `${currentText} ` : "";

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        // Mic permission denied, or no visualizer available — still try
        // recognition alone rather than blocking speech input entirely.
        console.error("Mic visualizer unavailable:", err);
      }

      const recognition = new Ctor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
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
        console.error("Speech recognition error:", event.error);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    },
    [onResult]
  );

  useEffect(() => stop, [stop]);

  return { supported, isRecording, analyser, start, stop };
}