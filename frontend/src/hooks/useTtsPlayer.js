import { useCallback, useRef, useState } from "react";

/**
 * Plays narration audio through a persistent <audio> element wired into an
 * AnalyserNode, so callers get real frequency data to visualize while it
 * speaks. One AudioContext / element is reused across calls.
 */
export function useTtsPlayer({ getToken, apiSpeak }) {
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  function ensureGraph() {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener("ended", () => setIsSpeaking(false));
      audioRef.current.addEventListener("error", () => setIsSpeaking(false));
    }
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new Ctx();
      const source = audioCtxRef.current.createMediaElementSource(audioRef.current);
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioCtxRef.current.destination);
    }
  }

  const speak = useCallback(
    async (text, voiceId) => {
      ensureGraph();
      if (audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }
      const token = await getToken();
      const blob = await apiSpeak(token, { text, voiceId });
      const url = URL.createObjectURL(blob);
      audioRef.current.src = url;
      setIsSpeaking(true);
      try {
        await audioRef.current.play();
      } catch (err) {
        setIsSpeaking(false);
        throw err;
      }
    },
    [getToken, apiSpeak]
  );

  function stop() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  }

  return { speak, stop, isSpeaking, analyser: analyserRef.current };
}