// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "./pages/Dashboard.jsx";
import OCBCOnboardingFlow from "./ocbc/OCBCOnboardingFlow.jsx";

/** Normalize hash to a route key. Accepts:
 *  "#/onboarding", "#/onboarding/", "#onboarding", "#onboarding/",
 *  "#/onboarding?x=1", etc.
 */
function parseRouteFromHash(rawHash) {
  const h = (rawHash || "").trim();
  if (!h) return "dashboard";
  const clean = h.replace(/^#\/?/, "").toLowerCase(); // strip "#" and optional "/"
  if (clean.startsWith("onboarding")) return "onboarding";
  return "dashboard";
}

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash);
  const route = useMemo(() => parseRouteFromHash(hash), [hash]);

  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    // handle direct load + any changes
    window.addEventListener("hashchange", onHash);
    onHash();
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Helper to navigate and force a re-render even if hash is same
  const navigate = (to) => {
    const next = to.startsWith("#") ? to : `#/${to}`;
    if (window.location.hash === next) {
      // Force a synthetic hashchange to re-evaluate the route
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } else {
      window.location.hash = next;
    }
  };

  return { route, navigate };
}

// Minimal error boundary to avoid "blank screen" if a child throws.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  componentDidCatch(err, info) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", err, info);
  }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
          <h1 style={{ fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "#6b7280" }}>
            The page failed to render. Check the console for details.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const { route } = useHashRoute();

  // Debug log (safe to keep in dev)
  // eslint-disable-next-line no-console
  console.log("[App] hash:", window.location.hash, "→ route:", route);

  return (
    <ErrorBoundary>
      {route === "onboarding" ? <OCBCOnboardingFlow /> : <Dashboard />}
    </ErrorBoundary>
  );
}
