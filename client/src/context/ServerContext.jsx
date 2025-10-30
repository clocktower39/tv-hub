import React, { createContext, useContext, useState, useEffect } from "react";

const ServerContext = createContext();

export const useServer = () => useContext(ServerContext);

export const ServerProvider = ({ children }) => {
  const [serverURL, setServerURL] = useState(
    localStorage.getItem("serverURL") || "http://pi.local:8000"
  );

  useEffect(() => {
    localStorage.setItem("serverURL", serverURL);
  }, [serverURL]);

  return (
    <ServerContext.Provider value={{ serverURL, setServerURL }}>
      {children}
    </ServerContext.Provider>
  );
};
