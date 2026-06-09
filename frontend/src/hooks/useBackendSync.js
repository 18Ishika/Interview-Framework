import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import { API_BASE } from '../lib/config';

export function useBackendSync() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) return;

    const syncUser = async () => {
      try {
        const token = await getToken({ skipCache: true });
        
        const res = await fetch(`${API_BASE}/sync/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await res.json();
        console.log("User synced:", data);
      } catch (err) {
        console.error("Sync failed:", err);
      }
    };

    syncUser();
  }, [isSignedIn]);
}