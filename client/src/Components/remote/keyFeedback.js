import { createContext, useContext } from "react";

// Lets any remote key report a failed press to the page's snackbar.
export const KeyFeedbackContext = createContext(() => {});
export const useKeyFeedback = () => useContext(KeyFeedbackContext);
