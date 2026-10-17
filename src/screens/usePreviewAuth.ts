import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import { usePreferences } from "../state/Preferences";
import { useFood } from "../state/Food";
import { safeReturn } from "../utils/navigation";
type Errors = Partial<Record<"name" | "email" | "password" | "ack", string>>;
function validate(name: string, email: string, password: string, signup: boolean, ack: boolean): Errors {
  const errors: Errors = {};
  if (signup && !name.trim()) errors.name = "Enter a display name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = "Enter an email address, such as you@example.com.";
  if (password.length < 8) errors.password = "Use at least 8 characters for this preview.";
  if (signup && !ack) errors.ack = "Confirm that you understand this is a preview profile.";
  return errors;
}
export function usePreviewAuth(signup: boolean) {
  const { setNotice, theme } = usePreferences();
  const { openPreview, setPendingSignup } = useFood();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [name, setName] = useState(""), [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false), [ack, setAck] = useState(false), [busy, setBusy] = useState(false), [errors, setErrors] = useState<Errors>({});
  const submit = async () => {
    const next = validate(name, email, password, signup, ack);
    setErrors(next);
    if (Object.keys(next).length) {
      if (Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(Object.values(next).join(" "));
      return;
    }
    setPassword(""); setEmail("");
    const destination = safeReturn(returnTo);
    if (signup) {
      setPendingSignup({ name: name.trim(), returnTo: String(destination) });
      router.replace("/age-check"); return;
    }
    setBusy(true);
    try {
      const result = await openPreview();
      if (result) router.dismissTo(result.mergeCount ? { pathname: "/merge-saves", params: { returnTo: String(destination) } } : destination);
    } finally { setBusy(false); }
  };
  const provider = (name: string) => setNotice({ text: name + " sign-in is not connected. Use the local preview form or continue as a guest." });
  return { name, setName, email, setEmail, password, setPassword, visible, setVisible, ack, setAck, errors, submit, provider, theme, busy };
}
export type AuthState = ReturnType<typeof usePreviewAuth>;
