import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Note: React.StrictMode disabled in dev to avoid double-rendering
// which causes duplicate API calls and rate limiting issues
ReactDOM.createRoot(document.getElementById("root")).render(
  <App />
);
