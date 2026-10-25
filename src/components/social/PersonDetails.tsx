import { useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Icon, T, common, type IconName } from "../ui";
import { AskBox } from "./PersonCard";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import type { Person } from "../../types/community";

/** Bio, hobbies on one line, then their "Ask me about" opener. Shared by profile pages and dinner invites. */
export function PersonAbout({ p }: { p: Person }) {
  const t = useT("social"), { theme } = usePreferences(), hobbies = p.hobbies.map(value => t("optHobby", { value }));
  if (!p.about && !hobbies.length && !p.opening) return null;
  return <View style={{ gap: 8 }}>
    {!!p.about && <T variant="small">{p.about}</T>}
    {!!hobbies.length && <View style={[common.row, { gap: 4, alignItems: "flex-start" }]}>
      <View style={{ marginTop: 2 }}><Icon name="heart-outline" size={14} color={theme.accent} /></View><T variant="small" muted style={common.flex}>{hobbies.join(" · ")}</T>
    </View>}
    <AskBox text={p.opening} />
  </View>;
}
/** A choice that says nothing about the member ("Prefer not to say") is left off the profile. */
const said = (value: string) => value === "Prefer not to say" ? "" : value;
/** "None" alone reads "No pets"; next to a pet (older profiles allowed both) it is dropped. */
const petsShown = (pets: string[]) => pets.length > 1 ? pets.filter(pet => pet !== "None") : pets;
/**
 * Lifestyle details, which the server sends only between Dining members of the opposite gender (owner, 26 Oct 2026): facts two
 * to a row (one when the card is narrow or the text large) with what each is under it, then habits as short phrases ("Doesn't smoke").
 */
export function LifestyleDetails({ p }: { p: Person }) {
  const t = useT("social"), { theme, textMultiplier } = usePreferences(), { width, fontScale } = useWindowDimensions(), [inner, setInner] = useState(0);
  const list = (values: string[], word: "optWhy" | "optLanguage" | "petPhrase") => values.map(value => t(word, { value })).join(t("listSep"));
  const education = said(p.education), religion = said(p.religion), ethnicity = said(p.ethnicity);
  const facts = ([
    [t("work"), p.work, "briefcase-outline"], [t("education"), education && t("optEducation", { value: education }), "school-outline"],
    [t("grewUp"), p.grewUp, "home-outline"], [t("height"), p.height ? t("heightValue", { cm: p.height }) : "", "resize-outline"],
    [t("languages"), list(p.languages, "optLanguage"), "chatbubbles-outline"], [t("whyPlantBased"), list(p.why, "optWhy"), "leaf-outline"],
    [t("religion"), religion && t("optReligion", { value: religion }), "sparkles-outline"],
    [t("ethnicity"), ethnicity && t("optEthnicity", { value: ethnicity }), "people-outline"],
  ] as [string, string, IconName][]).filter(([, value]) => value);
  const habits = ([
    [p.drinking && t("drinkPhrase", { value: p.drinking }), "wine-outline"], [p.smoking && t("smokePhrase", { value: p.smoking }), "flame-outline"],
    [list(petsShown(p.pets), "petPhrase"), "paw-outline"],
  ] as [string, IconName][]).filter(([text]) => text);
  if (!facts.length && !habits.length) return null;
  // Two columns need about 150 points each at the member's text size; until the card is measured, the screen width stands in.
  const cell = (inner || width - 60) / (textMultiplier * fontScale) >= 300 ? "50%" : "100%";
  return <View style={{ gap: 6 }}>
    <T variant="small" muted style={[common.bold, s.heading]} accessibilityRole="header">{t("detailsHeading")}</T>
    <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {!!facts.length && <View style={s.facts} onLayout={event => setInner(event.nativeEvent.layout.width)}>{facts.map(([title, value, icon]) =>
        <View key={title} accessible accessibilityLabel={title + ": " + value} style={[common.row, s.fact, { width: cell }]}>
          <Icon name={icon} size={18} color={theme.mutedForeground} />
          <View style={[common.flex, { minWidth: 0 }]}><T variant="small" style={common.bold}>{value}</T><T variant="caption" muted>{title}</T></View>
        </View>)}</View>}
      {!!facts.length && !!habits.length && <View style={[s.divider, { backgroundColor: theme.divider }]} />}
      {!!habits.length && <View style={s.habits}>{habits.map(([text, icon]) =>
        <View key={icon} style={[common.row, { gap: 6 }]}><Icon name={icon} size={16} color={theme.mutedForeground} /><T variant="small" style={common.bold}>{text}</T></View>)}</View>}
    </View>
  </View>;
}
const s = StyleSheet.create({
  heading: { paddingHorizontal: 4 },
  card: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  facts: { flexDirection: "row", flexWrap: "wrap" },
  fact: { gap: 10, paddingVertical: 8, paddingRight: 8, alignItems: "flex-start" },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  habits: { flexDirection: "row", flexWrap: "wrap", columnGap: 18, rowGap: 8, paddingVertical: 10 },
});
