import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Screen } from "../../components/Screen";
import { Button, Card, T, common } from "../../components/ui";
import { Chip, Chips, InfoBox } from "../../components/food/Controls";
import { PrivateNote } from "../../components/food/DetailParts";
import { usePreferences } from "../../state/Preferences";
import { dishById } from "../../data/dishes";
import { venueById } from "../../data/venues";
import { stallQuestions } from "../../data/stall-questions";
import { recalledPlace, savedGoogleId } from "../../utils/live-place-cache";
import { useMinuteClock } from "../../components/food/Timers";
import { useT } from "../../i18n";

export function AskStallScreen() {
  const { id, kind = "dish" } = useLocalSearchParams<{ id: string; kind?: "dish" | "place" }>();
  const { draft, textMultiplier } = usePreferences(), t = useT("explore");
  const [language, setLanguage] = useState("Both");
  const item = kind === "place" ? venueById(id) : dishById(id);
  const now = useMinuteClock(), googleId = kind === "place" ? savedGoogleId(id) : null;
  const name = item?.name ?? (googleId ? recalledPlace(googleId, now)?.name : undefined);
  const questions = stallQuestions(draft.diets, draft.excluded);
  return <Screen title={t("askTheStall")} subtitle={name ?? t("questionsForNextMeal")}>
    <InfoBox title={t("readyOffline")} icon="chatbubbles-outline" text={t("readyOfflineText")} />
    <Chips>{["Both", "English", "中文"].map(value => <Chip key={value} label={value === "Both" ? t("askBoth") : value} selected={language === value} onPress={() => setLanguage(value)} />)}</Chips>
    {questions.map((question, index) => <Card key={index} style={common.stack}>
      <T variant="small" muted>{t("questionN", { n: index + 1 })}</T>
      {language !== "中文" && <T style={{ fontSize: 20 * textMultiplier }}>{question.en}</T>}
      {language !== "English" && <T style={{ fontSize: 22 * textMultiplier }} accessibilityLanguage="zh-CN">{question.zh}</T>}
    </Card>)}
    <InfoBox title={t("ifUnsure")} text={t("ifUnsureText")} />
    <PrivateNote key={kind + ":" + id} noteKey={kind + ":" + id} />
    {__DEV__ && <Button label={t("draftCorrection")} variant="secondary" onPress={() => router.push({ pathname: "/contribute", params: { target: name ?? id, kind: "correction" } })} />}
  </Screen>;
}
