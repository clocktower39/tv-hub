import React, { useCallback, useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import { KeyFeedbackContext } from "./keyFeedback";

// Shows one snackbar for the latest failed key press.
function KeyFeedbackProvider({ children }) {
  const [notice, setNotice] = useState(null);

  const report = useCallback((message) => {
    setNotice({ message, id: Date.now() });
  }, []);

  const close = (event, reason) => {
    if (reason !== "clickaway") setNotice(null);
  };

  return (
    <KeyFeedbackContext.Provider value={report}>
      {children}
      <Snackbar
        key={notice?.id}
        open={Boolean(notice)}
        autoHideDuration={3500}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ bottom: "calc(var(--tvh-nav-height) + env(safe-area-inset-bottom) + 16px) !important" }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={close}
          sx={{ borderRadius: "var(--tvh-radius-small)", fontWeight: 600 }}
        >
          {notice?.message}
        </Alert>
      </Snackbar>
    </KeyFeedbackContext.Provider>
  );
}

export default KeyFeedbackProvider;
