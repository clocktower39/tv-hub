import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./Components/NavBar";
import ControllerPage from "./pages/ControllerPage";
import SettingsPage from "./pages/SettingsPage";
import BroadcastPage from "./pages/BroadcastPage";
import WatchPage from "./pages/WatchPage";
import "./App.css";

function App() {
  return (
    <div className="app-shell">
      <NavBar />
      <Routes>
        <Route path="/" element={<ControllerPage />} />
        {/* The old Camera tab now lives in Watch as a video source. */}
        <Route path="/stream" element={<Navigate to="/watch" replace />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/broadcast" element={<BroadcastPage />} />
        <Route path="/watch" element={<WatchPage />} />
      </Routes>
    </div>
  );
}

export default App;
