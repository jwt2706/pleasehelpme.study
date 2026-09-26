import { useCallback, useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import TopicStep from "./components/TopicStep.jsx";
import PersonaStep from "./components/PersonaStep.jsx";
import ConversationStep from "./components/ConversationStep.jsx";
import ReportStep from "./components/ReportStep.jsx";
import { api } from "./api.js";

export default function App() {
  const {
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
  } = useAuth0();

  const [step, setStep] = useState("topic"); // topic | persona | conversation | report
  const [topic, setTopic] = useState("");
  const [persona, setPersona] = useState(null);
  const [report, setReport] = useState(null);
  const [unlockedIds, setUnlockedIds] = useState(null);
  const [streak, setStreak] = useState(null);

  const getToken = useCallback(() => getAccessTokenSilently(), [getAccessTokenSilently]);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const token = await getToken();
        const data = await api.getPersonas(token);
        setUnlockedIds(data.personas.filter((p) => !p.locked).map((p) => p.id));
        setStreak(data.streak);
      } catch {
        // Non-fatal: fall back to showing all personas unlocked.
        setUnlockedIds(null);
      }
    })();
  }, [isAuthenticated, getToken]);

  function restart() {
    setTopic("");
    setPersona(null);
    setReport(null);
    setStep("topic");
  }

  return (
    <div className="app-shell">
      <header className="masthead">
        <span className="wordmark">Please help me study!</span>
        {isLoading ? null : isAuthenticated ? (
          <button className="auth-action" onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
            Log out
          </button>
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
            Explain a topic to a skeptical little persona. The follow-up
            question it asks is exactly the thing you glossed over.
          </p>
          <div className="actions">
            <button className="btn btn-primary" onClick={() => loginWithRedirect()}>
              Log in to start
            </button>
          </div>
        </section>
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
              unlockedIds={unlockedIds}
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
        </>
      )}
    </div>
  );
}
