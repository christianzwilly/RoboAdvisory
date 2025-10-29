// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// ✅ Load Tailwind/global styles
import "./index.css";

const el = document.getElementById("root");
createRoot(el).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
