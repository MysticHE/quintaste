import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Icon, T, common } from "../ui";
import { Avatar } from "./SocialPhoto";
import { openSocial } from "./Shared";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";

/** One member in a list (Add friend, Friends): photo, name and tick, a line under it, and the row's action; the row opens their profile. */
export function PersonRow({ id, name, photo, verified, line, spoken, trailing }: {
  id: string; name: string; photo: string | null; verified: boolean; line: ReactNode; spoken?: string; trailing: ReactNode;
}) {
  const { theme } = usePreferences(), t = useT("profile");
  return <View style={[common.row, { gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.divider }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={[name, verified ? t("verifiedTick") : "", spoken ?? ""].filter(Boolean).join(", ")}
      onPress={() => openSocial("/person/" + id)} style={[common.row, common.flex, { gap: 12, minHeight: 48 }]}>
      <Avatar uri={photo} size={46} />
      <View style={[common.flex, { minWidth: 0 }]}><View style={[common.row, { gap: 4 }]}><T style={common.bold} numberOfLines={1}>{name}</T>
        {verified && <Icon name="checkmark-circle" size={15} color={theme.success} />}</View>{line}</View>
    </Pressable>
    {trailing}
  </View>;
}
