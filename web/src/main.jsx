import { createRoot } from "react-dom/client";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "./app.css";
import "./home.css";
import App from "./App.jsx";

createRoot(document.getElementById("app")).render(<App />);

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
