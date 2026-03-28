import { useEffect, useState } from "react";
import { addAuthStatusListener, getAuthStatus, type AuthStatus } from "@/lib/auth";

export function useAuthStatus() {
  const [status, setStatus] = useState<AuthStatus>(() => getAuthStatus());

  useEffect(() => {
    const refreshStatus = () => {
      setStatus(getAuthStatus());
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshStatus();
      }
    };

    const removeAuthListener = addAuthStatusListener(refreshStatus);
    window.addEventListener("focus", refreshStatus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      removeAuthListener();
      window.removeEventListener("focus", refreshStatus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return status;
}
