import { View } from "react-native";
import { Avatar } from "./SocialPhoto";
import { AvatarPortrait } from "../avatar/AvatarPortrait";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import type { SocialMe } from "../../types/community";

/** One picture for the member everywhere they see themselves (owner, 25 Oct 2026): their first profile photo, else their cartoon avatar, else their initial. */
export function ProfilePicture({ data, name, size }: { data: SocialMe | undefined; name: string; size: number }) {
  const { doc } = useFood(), { theme } = usePreferences(), photo = data?.photos[0]?.thumb;
  if (photo || !doc.avatar) return <Avatar uri={photo} name={name} size={size} />;
  return <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", backgroundColor: theme.accentSoft }}>
    <AvatarPortrait avatar={doc.avatar} size={size} />
  </View>;
}
