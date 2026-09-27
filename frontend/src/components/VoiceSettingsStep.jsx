import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function VoiceSettingsStep({
  getToken,
  voiceEnabled,
  onToggleEnabled,
  voiceId,
  onChangeVoice,
  onBack,
}) {
  const [status, setStatus] = useState(null); // { available, voices, error? }
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const result = await api.getVoiceStatus(token);
        setStatus(result);
        if (result.available && result.voices.length && !voiceId) {
          onChangeVoice(result.voices[0].voice_id);
        }
      } catch (err) {
        setStatus({ available: false, voices: [], error: err.message });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function preview() {
    if (!voiceId) return;
    setPreviewing(true);
    setPreviewError(null);
    try {
      const token = await getToken();
      const blob = await api.speakText(token, {
        text: "This is what I sound like.",
        voiceId,
      });
      const audio = new Audio(URL.createObjectURL(blob));
      audio.onended = () => setPreviewing(false);
      audio.onerror = () => setPreviewing(false);
      await audio.play();
    } catch (err) {
      setPreviewError(err.message);
      setPreviewing(false);
    }
  }

  return (
    <section>
      <h1>Voice.</h1>
      <p className="lede">Have the persona's replies read aloud as they arrive.</p>

      {!status ? (
        <p className="thinking">Checking voice setup…</p>
      ) : !status.available ? (
        <p className="error-note">
          {status.error ||
            "Voice narration isn't configured on the server yet — add an ElevenLabs API key on the backend to enable this."}
        </p>
      ) : (
        <>
          <div className="settings-row">
            <span>
              <p className="settings-label">Narrate responses</p>
              <p className="settings-desc">Read each reply aloud as it arrives.</p>
            </span>
            <label className="switch">
              <input
                type="checkbox"
                checked={voiceEnabled}
                onChange={(e) => onToggleEnabled(e.target.checked)}
              />
              <span className="switch-track">
                <span className="switch-thumb" />
              </span>
            </label>
          </div>

          <div className="settings-row">
            <span>
              <p className="settings-label">Voice</p>
              <p className="settings-desc">Which ElevenLabs voice to use.</p>
            </span>
            <select
              className="voice-select"
              value={voiceId || ""}
              onChange={(e) => onChangeVoice(e.target.value)}
            >
              {status.voices.map((v) => (
                <option key={v.voice_id} value={v.voice_id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div className="actions">
            <button className="btn btn-quiet" onClick={preview} disabled={!voiceId || previewing}>
              {previewing ? "Playing…" : "Preview voice"}
            </button>
          </div>
          {previewError && <p className="error-note">{previewError}</p>}
        </>
      )}

      <div className="actions">
        <button className="btn btn-quiet" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}