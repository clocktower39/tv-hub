import React, { createContext, useContext, useState, useEffect } from "react";

const ServerContext = createContext();
export const useServer = () => useContext(ServerContext);

// Before the HTTPS proxy, the app talked to the server directly at this URL.
// Over HTTPS the browser would block it as mixed content, so a saved copy of
// the old default is treated as "use this origin".
const LEGACY_DEFAULT = "http://pi.local:8000";

const readStoredServerURL = () => {
  const stored = localStorage.getItem("serverURL") || "";
  return stored === LEGACY_DEFAULT ? "" : stored;
};

// Strip trailing slashes so `${apiBase}/api/key` is always well formed.
const normalize = (url) => url.trim().replace(/\/+$/, "");

export const ServerProvider = ({ children }) => {
  // Empty string means "same origin" (the Vite proxy forwards to the server).
  const [serverURL, setServerURL] = useState(readStoredServerURL);
  const [cameraURL, setCameraURL] = useState(
    localStorage.getItem("cameraURL") || ""
  );

  const [history, setHistory] = useState(() =>
    JSON.parse(localStorage.getItem("serverURLHistory") || "[]").filter(
      (url) => url !== LEGACY_DEFAULT
    )
  );
  const [cameraHistory, setCameraHistory] = useState(() =>
    JSON.parse(localStorage.getItem("cameraURLHistory") || "[]")
  );

  useEffect(() => {
    localStorage.setItem("serverURL", serverURL);
  }, [serverURL]);
  useEffect(() => {
    localStorage.setItem("cameraURL", cameraURL);
  }, [cameraURL]);
  useEffect(() => {
    localStorage.setItem("serverURLHistory", JSON.stringify(history));
  }, [history]);
  useEffect(() => {
    localStorage.setItem("cameraURLHistory", JSON.stringify(cameraHistory));
  }, [cameraHistory]);

  const saveServerURL = (newURL) => {
    const url = normalize(newURL || "");
    setServerURL(url);
    if (!url) return;
    setHistory((prev) => [url, ...prev.filter((u) => u !== url)].slice(0, 5));
  };

  // An empty value removes the camera (Watch then hides the source switch).
  const saveCameraURL = (newURL) => {
    if (!newURL) {
      setCameraURL("");
      return;
    }
    setCameraURL(newURL);
    setCameraHistory((prev) =>
      [newURL, ...prev.filter((u) => u !== newURL)].slice(0, 5)
    );
  };

  return (
    <ServerContext.Provider
      value={{
        serverURL,
        // Base for fetch() and io(): "" resolves against the current origin.
        apiBase: serverURL,
        socketURL: serverURL || undefined,
        saveServerURL,
        history,
        cameraURL,
        saveCameraURL,
        cameraHistory,
      }}
    >
      {children}
    </ServerContext.Provider>
  );
};
