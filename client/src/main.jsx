import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CssBaseline, GlobalStyles, ThemeProvider } from "@mui/material";
import "./index.css";
import App from "./App.jsx";
import { ServerProvider } from "./context/ServerContext";
import { theme, cssVariables } from "./theme";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={cssVariables()} />
      <BrowserRouter>
        <ServerProvider>
          <App />
        </ServerProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
);
