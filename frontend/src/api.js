const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function request(path, { token, method = "GET", body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  getAccount: (token) => request("/api/account", { token }),
  setRole: (token, role) => request("/api/account/role", { token, method: "POST", body: { role } }),
  getPersonas: (token) => request("/api/personas", { token }),
  postTurn: (token, payload) => request("/api/session/turn", { token, method: "POST", body: payload }),
  completeSession: (token, payload) =>
    request("/api/session/complete", { token, method: "POST", body: payload }),
  getHistory: (token) => request("/api/history", { token }),
  getStudentHistory: (token, studentSub) =>
    request(`/api/history/student/${studentSub}`, { token }),
  generateLinkCode: (token) => request("/api/link/code", { token, method: "POST" }),
  redeemLinkCode: (token, code) =>
    request("/api/link/redeem", { token, method: "POST", body: { code } }),
  getLinkedStudents: (token) => request("/api/link/students", { token }),
  getGuardians: (token) => request("/api/link/guardians", { token }),
  removeLink: (token, otherSub) => request(`/api/link/${otherSub}`, { token, method: "DELETE" }),
  getVoiceStatus: (token) => request("/api/voice/status", { token }),
  // Returns a Blob (audio/mpeg), not JSON — can't reuse request() for this.
  speakText: async (token, { text, voiceId }) => {
    const res = await fetch(`${BASE_URL}/api/voice/speak`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text, voiceId }),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error(detail.error || `Request failed (${res.status})`);
    }
    return res.blob();
  },
};