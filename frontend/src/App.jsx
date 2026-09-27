import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import TopicStep from "./components/TopicStep.jsx";
import PersonaStep from "./components/PersonaStep.jsx";
import ConversationStep from "./components/ConversationStep.jsx";
import ReportStep from "./components/ReportStep.jsx";
import HistoryStep from "./components/HistoryStep.jsx";
import RoleStep from "./components/RoleStep.jsx";
import AccessStep from "./components/AccessStep.jsx";
import GuardianDashboard from "./components/GuardianDashboard.jsx";
import { api } from "./api.js";

export default function App() {
  const {
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
    user,
  } = useAuth0();

  const [step, setStep] = useState("topic"); // topic | persona | conversation | report | history | access
  const [topic, setTopic] = useState("");
  const [persona, setPersona] = useState(null);
  const [report, setReport] = useState(null);
  const [streak, setStreak] = useState(null);
  const [account, setAccount] = useState(null); // { sub, email, role, roleSelected }
  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef(null);

  const getToken = useCallback(() => getAccessTokenSilently(), [getAccessTokenSilently]);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const token = await getToken();
        const acct = await api.getAccount(token);
        setAccount(acct);
        if (acct.role === "student") {
          const data = await api.getPersonas(token);
          setStreak(data.streak);
        }
      } catch {
        // Non-fatal — account/streak just won't show yet.
      }
    })();
  }, [isAuthenticated, getToken]);

  // Close the account dropdown when clicking anywhere outside it.
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e) {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  function restart() {
    setTopic("");
    setPersona(null);
    setReport(null);
    setStep("topic");
  }

  const initial = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();
  const onHistory = step === "history";

  return (
    <div className="app-shell">
      <header className="masthead">
        <span className="wordmark">Please help me study!</span>
        {isLoading ? null : isAuthenticated ? (
          <div className="account" ref={accountRef}>
            <button
              className="avatar-button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-label="Account menu"
            >
              <span className="avatar" title={user?.name || user?.email}>
                {user?.picture ? <img src={user.picture} alt="" /> : initial}
              </span>
            </button>

            {menuOpen && (
              <div className="account-menu">
                {account?.role === "student" && (
                  <>
                    <button
                      className="auth-action"
                      onClick={() => {
                        setMenuOpen(false);
                        onHistory ? restart() : setStep("history");
                      }}
                    >
                      {onHistory ? "New session" : "History"}
                    </button>
                    <button
                      className="auth-action"
                      onClick={() => {
                        setMenuOpen(false);
                        setStep("access");
                      }}
                    >
                      Access
                    </button>
                  </>
                )}
                <button
                  className="auth-action"
                  onClick={() => {
                    setMenuOpen(false);
                    logout({ logoutParams: { returnTo: window.location.origin } });
                  }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="auth-action" onClick={() => loginWithRedirect()}>
            Log in
          </button>
        )}
      </header>

      {!isLoading && !isAuthenticated ? (
        <section>
          <h1>Find out what you don't actually know.</h1>
          <p className="lede">
            Explain a topic to a listener at the depth you choose. The
            follow-up question it asks is exactly the thing you glossed over.
          </p>
          <div className="actions">
            <button className="btn btn-primary" onClick={() => loginWithRedirect()}>
              Log in to start
            </button>
          </div>
        </section>
      ) : (
        <>
          {!account ? null : !account.roleSelected ? (
            <RoleStep
              onSelect={async (role) => {
                const token = await getToken();
                await api.setRole(token, role);
                setAccount((a) => ({ ...a, role, roleSelected: true }));
              }}
            />
          ) : account.role !== "student" ? (
            <GuardianDashboard getToken={getToken} />
          ) : (
            <>
              {step === "topic" && (
                <TopicStep
                  onContinue={(t) => {
                    setTopic(t);
                    setStep("persona");
                  }}
                />
              )}

              {step === "persona" && (
                <PersonaStep
                  topic={topic}
                  onSelect={(p) => {
                    setPersona(p);
                    setStep("conversation");
                  }}
                  onBack={() => setStep("topic")}
                />
              )}

              {step === "conversation" && (
                <ConversationStep
                  topic={topic}
                  persona={persona}
                  getToken={getToken}
                  onFinish={(result) => {
                    setReport(result);
                    setStreak(result.streak);
                    setStep("report");
                  }}
                  onBack={() => setStep("persona")}
                />
              )}

              {step === "report" && (
                <ReportStep topic={topic} report={report} streak={streak} onRestart={restart} />
              )}

              {step === "history" && <HistoryStep getToken={getToken} onStartNew={restart} />}

              {step === "access" && (
                <AccessStep getToken={getToken} onBack={() => setStep("topic")} />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
