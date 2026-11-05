import React, { createContext, useContext, useState, useEffect } from "react";

const ServerContext = createContext();
export const useServer = () => useContext(ServerContext);

export const ServerProvider = ({ children }) => {
  const [serverURL, setServerURL] = useState(
    localStorage.getItem("serverURL") || "http://pi.local:8000"
  );
  const [cameraURL, setCameraURL] = useState(
    localStorage.getItem("cameraURL") || ""
  );

  const [history, setHistory] = useState(
    JSON.parse(localStorage.getItem("serverURLHistory") || "[]")
  );
  const [cameraHistory, setCameraHistory] = useState(
    JSON.parse(localStorage.getItem("cameraURLHistory") || "[]")
  );

  // persist both values
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

  // Save button handler
  const saveServerURL = (newURL) => {
    if (!newURL) return;
    setServerURL(newURL);
    setHistory((prev) => {
      const updated = prev.filter((url) => url !== newURL);
      return [newURL, ...updated].slice(0, 5);
    });
  };

  const saveCameraURL = (newURL) => {
    if (!newURL) return;
    setCameraURL(newURL);
    setCameraHistory((prev) => {
      const updated = prev.filter((url) => url !== newURL);
      return [newURL, ...updated].slice(0, 5);
    });
  };

  return (
    <ServerContext.Provider
      value={{
        serverURL,
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
