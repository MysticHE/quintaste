import { Pressable, StyleSheet, View } from "react-native";
import { Button, Icon, T, common } from "../ui";
import { StatusPill } from "../GroupedList";
import { DietLabels } from "../food/DietLabels";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import type { Person } from "../../types/community";
import { OnPhoto, PhotoCarousel } from "./SocialPhoto";
import { openSocial } from "./Shared";

/** "Bedok · 3.2 km away", or the area alone when the distance is unknown. */
export function useWhere() {
  const t = useT("social");
  return (p: Pick<Person, "area" | "km">) => [p.area, p.km === null ? "" : p.km < 1 ? t("sameArea") : t("kmAway", { km: p.km })].filter(Boolean).join(" · ");
}
/** Name, age and the ✓ on a photo. */
export function NameOnPhoto({ person, verified = true }: { person: Pick<Person, "firstName" | "age">; verified?: boolean }) {
  const { theme } = usePreferences(), t = useT("social");
  return <View style={[common.row, { gap: 6 }]}>
    <OnPhoto variant="title" bold>{person.age ? t("nameAge", { name: person.firstName, age: person.age }) : person.firstName}</OnPhoto>
    {verified && <View accessible accessibilityLabel={t("verified")}><Icon name="checkmark-circle" size={22} color={theme.mediaForeground} /></View>}
  </View>;
}
/** Diet labels with their rule (a tap explains them), then up to `max` hobbies as small pills. */
export function PersonPills({ person, max = 2 }: { person: Pick<Person, "diets" | "hobbies">; max?: number }) {
  const t = useT("social"), hobbies = person.hobbies.slice(0, max);
  return <View style={{ gap: 8 }}>
    <DietLabels labels={person.diets} />
    {!!hobbies.length && <View style={s.pills}>{hobbies.map(h => <StatusPill key={h} label={t("optHobby", { value: h })} tone="accent" />)}</View>}
  </View>;
}
/** "Ask me about …" as a quiet box: an easy first line for a hello. */
export function AskBox({ text }: { text: string }) {
  const { theme } = usePreferences(), t = useT("social");
  if (!text) return null;
  return <View style={[s.ask, { backgroundColor: theme.muted }]}>
    <T variant="small" muted style={common.bold}>{t("askMeAbout")}</T><T>{text}</T>
  </View>;
}
/** One person in People: their photos first, then food, an easy opener and Add Friend. */
export function PersonCard({ person, onAdd }: { person: Person; onAdd: () => void }) {
  const { theme } = usePreferences(), t = useT("social"), where = useWhere()(person), open = () => openSocial("/person/" + person.id);
  return <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <PhotoCarousel photos={person.photos} name={person.firstName} height={400}>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={t("openPerson", { name: person.firstName })} style={{ gap: 2 }}>
        <NameOnPhoto person={person} />
        {!!where && <OnPhoto variant="small">{where}</OnPhoto>}
      </Pressable>
    </PhotoCarousel>
    <View style={s.body}>
      <Pressable onPress={open} accessible={false} style={{ gap: 10 }}>
        <PersonPills person={person} />
        <AskBox text={person.opening} />
      </Pressable>
      <Button label={t("addFriend")} accessibilityLabel={t("addFriendNamed", { name: person.firstName })} icon="person-add-outline" onPress={onAdd} />
    </View>
  </View>;
}
const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  body: { padding: 14, gap: 12 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  ask: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, gap: 2 },
});
