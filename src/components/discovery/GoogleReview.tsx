import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { LiveReview } from "../../types/discovery";
import { usePreferences } from "../../state/Preferences";
import { T, common } from "../ui";

export function GoogleReview({ review }: { review: LiveReview }) {
  const [expanded, setExpanded] = useState(false), { theme, setNotice } = usePreferences();
  const open = async (uri: string) => { try { await Linking.openURL(uri); } catch { setNotice({ text: "The review source could not open.", error: true }); } };
  return <View style={[s.review, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <View style={common.row}>{!!review.authorPhotoUri && <Image source={{ uri: review.authorPhotoUri }} cachePolicy="none" style={s.avatar} accessible={false} />}
      <View style={common.flex}>{review.authorUri ? <Pressable accessibilityRole="link" onPress={() => void open(review.authorUri!)} style={s.link}>
        <T style={common.bold}>{review.author}</T></Pressable> : <T style={common.bold}>{review.author}</T>}
        <T variant="small" muted>{review.rating !== undefined ? review.rating + "/5" : "Unrated"}{review.publishedAt ? " · " + new Intl.DateTimeFormat("en-SG", { dateStyle: "medium" }).format(new Date(review.publishedAt)) : ""}</T>
      </View></View>
    {!!review.text && <T>{expanded || review.text.length <= 300 ? review.text : review.text.slice(0, 300) + "…"}</T>}
    {review.text.length > 300 && <Pressable accessibilityRole="button" style={s.link} onPress={() => setExpanded(!expanded)}>
      <T variant="small" color={theme.accent}>{expanded ? "Show less" : "Read full review"}</T></Pressable>}
    {!!review.uri && <Pressable accessibilityRole="link" style={s.link} onPress={() => void open(review.uri!)}><T variant="small" color={theme.accent}>View review</T></Pressable>}
  </View>;
}
const s = StyleSheet.create({ review: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 6 }, avatar: { width: 40, height: 40, borderRadius: 20 }, link: { minHeight: 44, justifyContent: "center" } });
