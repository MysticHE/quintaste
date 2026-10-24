import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import { usePreferences } from "../state/Preferences";
import { useFood } from "../state/Food";
import { safeReturn } from "../utils/navigation";
import { useT } from "../i18n";
type Errors = Partial<Record<"name" | "email" | "password" | "ack", string>>;
type Say = ReturnType<typeof useT<"me">>;
function validate(name: string, email: string, password: string, signup: boolean, ack: boolean, t: Say): Errors {
  const errors: Errors = {};
  if (signup && !name.trim()) errors.name = t("enterDisplayName");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = t("previewEmailError");
  if (password.length < 8) errors.password = t("previewPasswordError");
  if (signup && !ack) errors.ack = t("previewAckError");
  return errors;
}
export function usePreviewAuth(signup: boolean) {
  const { setNotice, theme } = usePreferences(), t = useT("me");
  const { openPreview, setPendingSignup } = useFood();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [name, setName] = useState(""), [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false), [ack, setAck] = useState(false), [busy, setBusy] = useState(false), [errors, setErrors] = useState<Errors>({});
  const submit = async () => {
    const next = validate(name, email, password, signup, ack, t);
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
  const provider = (name: string) => setNotice({ text: t("providerNotConnected", { name }) });
  return { name, setName, email, setEmail, password, setPassword, visible, setVisible, ack, setAck, errors, submit, provider, theme, busy };
}
export type AuthState = ReturnType<typeof usePreviewAuth>;
