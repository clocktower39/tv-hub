import React from "react";
import { Routes, Route } from "react-router-dom";
import NavBar from "./Components/NavBar";
import ControllerPage from "./pages/ControllerPage";
import StreamPage from "./pages/StreamPage";
import SettingsPage from "./pages/SettingsPage";
import "./App.css";

function App() {
  return (
    <div className="app-shell">
      <NavBar />
      <Routes>
        <Route path="/" element={<ControllerPage />} />
        <Route path="/stream" element={<StreamPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </div>
  );
}

export default App;
