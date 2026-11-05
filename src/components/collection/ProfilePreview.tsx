import { View, useWindowDimensions } from "react-native";
import { useT } from "../../i18n";
import { usePreferences } from "../../state/Preferences";
import { useAuth } from "../../state/Auth";
import { badgeArt, borderArt, type BadgeTier } from "../../config/collection";
import type { SocialMe } from "../../types/community";
import { ProfilePicture } from "../social/ProfilePicture";
import { T, common } from "../ui";
import { BorderFrame, ItemArt } from "./Glint";
import { BadgeRow, tierTone } from "./CollectionParts";
import { StatusPill } from "../GroupedList";

/** Real member identity and the same artwork renderers used on Social. */
export function ProfilePreview({ me, border, badges, previewOnly = false }: { me: SocialMe | undefined; border: string | null; badges: string[]; previewOnly?: boolean }) {
  const t = useT("collection"), { user } = useAuth(), { theme } = usePreferences();
  const name = me?.profile.firstName || user?.name || me?.accountName;
  return <View testID="collection-profile-preview" style={{ gap: 10, paddingVertical: 8 }}>
    <T variant="small" muted>{t(previewOnly ? "previewOnly" : "profilePreview")}</T>
    <View style={[common.row, { gap: 16, alignItems: "center" }]}>
      <View style={{ width: 112, height: 112, alignItems: "center", justifyContent: "center" }}>
        <BorderFrame art={border ? borderArt(border) : undefined} size={80} shine><ProfilePicture data={me} size={80} /></BorderFrame>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        {!!name && <T variant="subtitle" style={common.bold}>{name}</T>}
        {!!me?.handle && <T variant="small" muted>{"@" + me.handle}</T>}
        <BadgeRow ids={badges} />
        {!badges.length && <T variant="small" color={theme.mutedForeground}>{t("noShownBadges")}</T>}
      </View>
    </View>
  </View>;
}

/** A selected badge is a focal object, independent of the compact gallery/preview sizes. */
export function BadgeFocus({ id, dim, tier, status, level }: { id: string; dim: boolean; tier: string; status: string; level: BadgeTier }) {
  const { width, height } = useWindowDimensions();
  const size = Math.min(240, width - 64, Math.max(160, height * 0.3));
  return <View testID="badge-focus" style={{ alignItems: "center", gap: 14, paddingVertical: 16 }}>
    <ItemArt art={badgeArt(id)} size={size} fx dim={dim} />
    <View style={[common.row, { justifyContent: "center", flexWrap: "wrap", gap: 8 }]}>
      <StatusPill label={tier} tone={tierTone[level]} /><StatusPill label={status} tone={dim ? "muted" : "success"} />
    </View>
  </View>;
}
