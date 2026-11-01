import { useEffect } from "react";
import { resumeGiftPurchases } from "../services/gift-store";
import { useAuth } from "../state/Auth";

/** Once signed in, sends any gift bought while the app closed before it went (services/gift-store). */
export function useGiftPurchases(ready: boolean) {
  const userId = useAuth().user?.id;
  useEffect(() => { if (ready && userId) resumeGiftPurchases().catch(() => undefined); }, [ready, userId]);
}
