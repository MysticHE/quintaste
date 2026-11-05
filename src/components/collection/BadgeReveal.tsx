import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Sheet } from "../Sheet";
import { Button, T } from "../ui";
import { BadgeFocus } from "./ProfilePreview";
import { useT } from "../../i18n";
import { usePreferences } from "../../state/Preferences";
import { invalidate, setRemoteData } from "../../hooks/useRemote";
import { collectionKey, showBadges, type Collection } from "../../services/collection-api";
import { SHOWN_MAX } from "../../config/collection";
import type messages from "../../i18n/en/collection";

export function BadgeReveal({ ids, data, onNext, onView }: { ids: string[]; data: Collection; onNext: () => void; onView: () => void }) {
  const t = useT("collection"), { setNotice } = usePreferences(), [busy, setBusy] = useState(false), pending = useRef(false);
  const badge = data.badges.find(x => x.id === ids[0] && x.earned && !x.revoked), shown = !!badge && data.shown.includes(badge.id);
  useEffect(() => { if (!badge && ids.length) onNext(); }, [badge, ids.length, onNext]);
  const equip = async () => {
    if (!badge || shown || pending.current || data.shown.length >= SHOWN_MAX) return;
    pending.current = true; setBusy(true);
    try {
      setRemoteData(collectionKey, await showBadges([...data.shown, badge.id]));
      invalidate("/api/social/me"); setNotice({ text: t("shownNotice") });
    } catch { setNotice({ text: t("actionFailed"), error: true }); }
    finally { pending.current = false; setBusy(false); }
  };
  return <Sheet visible={!!badge} title={t("badgeEarnedTitle")} onClose={() => { if (!busy) onNext(); }}>
    {badge && <View style={{ gap: 14 }}>
      <T variant="title" style={{ textAlign: "center", fontWeight: "700" }}>{t(("badge_" + badge.id) as keyof typeof messages) as string}</T>
      <BadgeFocus id={badge.id} dim={false} level={badge.tier} tier={t(("tier_" + badge.tier) as keyof typeof messages) as string} status={t("earned")} />
      <T style={{ textAlign: "center" }}>{t("badgeEarnedBody")}</T>
      <Button label={t(shown ? "shown" : "showOnProfile")} loading={busy} disabled={shown || data.shown.length >= SHOWN_MAX} onPress={() => void equip()} />
      <Button variant="secondary" label={t("viewYourBadges")} disabled={busy} onPress={onView} />
      <Button variant="link" label={t(ids.length > 1 ? "nextBadge" : "revealDone")} disabled={busy} onPress={onNext} />
    </View>}
  </Sheet>;
}
