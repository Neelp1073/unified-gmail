import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Popup } from "@/popup/Popup";
import "@/styles/index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element missing");

createRoot(root).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
);
