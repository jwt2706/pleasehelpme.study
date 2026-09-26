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
  getPersonas: (token) => request("/api/personas", { token }),
  postTurn: (token, payload) =>
    request("/api/session/turn", { token, method: "POST", body: payload }),
  completeSession: (token, payload) =>
    request("/api/session/complete", { token, method: "POST", body: payload }),
};