import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { ServerProvider } from "./context/ServerContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ServerProvider>
        <App />
      </ServerProvider>
    </BrowserRouter>
  </StrictMode>
);
