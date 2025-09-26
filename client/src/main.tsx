import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Force cache bust - debug logs removed v5
createRoot(document.getElementById("root")!).render(<App />);
