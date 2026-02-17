import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App"; // or ./YourRootComponent if named differently
import "./styles/globals.css";    // optional: only if you have global styles
import "./styles/tailwind.css";    // optional: only if you have global styles

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);