import React, { createContext, useContext, useState, useEffect } from "react";

const ServerContext = createContext();
export const useServer = () => useContext(ServerContext);

export const ServerProvider = ({ children }) => {
  const [serverURL, setServerURL] = useState(
    localStorage.getItem("serverURL") || "http://pi.local:8000"
  );

  const [history, setHistory] = useState(
    JSON.parse(localStorage.getItem("serverURLHistory") || "[]")
  );

  // persist both values
  useEffect(() => {
    localStorage.setItem("serverURL", serverURL);
  }, [serverURL]);

  useEffect(() => {
    localStorage.setItem("serverURLHistory", JSON.stringify(history));
  }, [history]);

  // Save button handler
  const saveServerURL = (newURL) => {
    if (!newURL) return;
    setServerURL(newURL);
    setHistory((prev) => {
      const updated = prev.filter((url) => url !== newURL);
      return [newURL, ...updated].slice(0, 5);
    });
  };

  return (
    <ServerContext.Provider value={{ serverURL, saveServerURL, history }}>
      {children}
    </ServerContext.Provider>
  );
};
