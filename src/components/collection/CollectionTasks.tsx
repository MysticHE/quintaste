import { useState } from "react";
import { router, type Href } from "expo-router";
import { View } from "react-native";
import { Icon, T, common, type IconName } from "../ui";
import { CollectionRow, CollectionSection, ProgressLine } from "./CollectionUI";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import type { Collection } from "../../services/collection-api";
import type collectionMessages from "../../i18n/en/collection";

type Key = keyof typeof collectionMessages;
const startActions: Record<string, { icon: IconName; route: Href }> = {
  profile: { icon: "person-outline", route: "/social/profile" },
  "photo-check": { icon: "shield-checkmark-outline", route: "/social/verify" },
  "first-friend": { icon: "person-add-outline", route: "/social/add-friend" },
  "first-review": { icon: "create-outline", route: "/" },
  "first-photo": { icon: "camera-outline", route: "/cook" },
  "first-dinner": { icon: "people-outline", route: "/social?tab=dining" },
};
const everydayActions: Record<string, { icon: IconName; route: Href }> = {
  cook: { icon: "restaurant-outline", route: "/cook" },
  review: { icon: "create-outline", route: "/" },
  photo: { icon: "camera-outline", route: "/cook" },
  dinner: { icon: "people-outline", route: "/social?tab=dining" },
};

function Reward({ n }: { n: number }) {
  const { theme } = usePreferences(), t = useT("collection");
  return <T variant="small" color={theme.accent} style={[common.bold, { fontVariant: ["tabular-nums"] }]}>{t("plus", { n })}</T>;
}

export function TasksTab({ data }: { data: Collection }) {
  const t = useT("collection"), { theme } = usePreferences(), { tasks } = data;
  const [allStart, setAllStart] = useState(false), [allMilestones, setAllMilestones] = useState(false);
  const completed = tasks.start.filter(task => task.done).length, first = tasks.start.find(task => !task.done);
  const start = allStart ? tasks.start : first ? [first] : [];
  const correction = tasks.correction;
  return <View style={{ gap: 8 }}>
    {data.owed > 0 && <View style={{ gap: 4, padding: 12, backgroundColor: theme.warningSoft, borderRadius: 12 }}>
      <T style={common.bold} color={theme.warning}>{t("owedTitle", { n: data.owed })}</T><T variant="small">{t("owedText")}</T>
    </View>}
    {!!tasks.start.length && <CollectionSection title={t("groupStart")} aside={t("completedCount", { done: completed, of: tasks.start.length })}
      expanded={allStart} onToggle={() => setAllStart(!allStart)}>
      {start.map(task => {
        const action = startActions[task.key], title = t(`start_${task.key}` as Key) as string;
        return <CollectionRow key={task.key} title={title} icon={action?.icon ?? "checkmark-circle-outline"} done={task.done}
          trailing={task.done ? <T variant="small" color={theme.success}>{t("done")}</T> : <Reward n={task.credits} />}
          label={[title, task.done ? t("done") : t("plus", { n: task.credits })].join(", ")}
          onPress={!task.done && action ? () => router.push(action.route) : undefined} />;
      })}
    </CollectionSection>}
    <CollectionSection title={t("groupEveryday")}>
      {tasks.everyday.map(task => {
        const action = everydayActions[task.key], title = t(`everyday_${task.key}` as Key) as string;
        const limit = t(task.per === "week" ? "weeklyUsage" : "dailyUsage", { used: task.used, limit: task.limit });
        return <CollectionRow key={task.key} title={title} icon={action?.icon ?? "checkmark-circle-outline"}
          label={[title, task.key === "cook" ? t("cookRequirement") : task.key === "review" ? t("reviewRequirement") : "", t("plus", { n: task.credits }), limit, task.waiting ? t("waiting", { n: task.waiting }) : ""].filter(Boolean).join(", ")}
          meta={<><T variant="small" muted>{[task.key === "cook" ? t("cookRequirement") : task.key === "review" ? t("reviewRequirement") : "", limit].filter(Boolean).join(" · ")}</T>{task.waiting > 0 && <T variant="small" color={theme.warning}>{t("waiting", { n: task.waiting })}</T>}</>}
          trailing={<Reward n={task.credits} />} onPress={action ? () => router.push(action.route) : undefined} />;
      })}
      {correction && <CollectionRow title={t("correctionTask")} icon="flag-outline"
        label={[t("correctionTask"), t("plus", { n: correction.credits }), t("confirmedUsage", { used: correction.used, limit: correction.limit }),
          t("correctionHint", { hours: correction.hours }), correction.waiting ? t("correctionWaiting", { n: correction.waiting }) : "",
          correction.held ? t("correctionHeld", { n: correction.held }) : ""].filter(Boolean).join(", ")}
        meta={<>
          <T variant="small" muted>{t("confirmedUsage", { used: correction.used, limit: correction.limit })}</T>
          <T variant="small" muted>{t("correctionHint", { hours: correction.hours })}</T>
          {correction.waiting > 0 && <View style={[common.row, { gap: 4 }]}><Icon name="time-outline" size={14} color={theme.warning} /><T variant="small" color={theme.warning}>{t("correctionWaiting", { n: correction.waiting })}</T></View>}
          {correction.held > 0 && <T variant="small" color={theme.warning}>{t("correctionHeld", { n: correction.held })}</T>}
        </>} trailing={<Reward n={correction.credits} />} onPress={() => router.push("/explore-contributions")} />}
      <T variant="caption" muted style={{ paddingTop: 8, paddingHorizontal: 4 }}>{t("settlementNote")}</T>
    </CollectionSection>
    {!!tasks.milestones.length && <CollectionSection title={t("groupMilestones")} expanded={allMilestones} onToggle={() => setAllMilestones(!allMilestones)}>
      {(allMilestones ? tasks.milestones : [tasks.milestones.find(task => task.steps.some(step => !step.done)) ?? tasks.milestones[0]]).map(task => {
        const next = task.steps.find(step => !step.done), target = next?.at ?? task.steps.at(-1)?.at ?? 0;
        return <CollectionRow key={task.key} title={t(`milestone_${task.key}` as Key) as string}
          icon={task.key === "recipes" ? "restaurant-outline" : task.key === "reviews" ? "create-outline" : "people-outline"}
          meta={<><T variant="small" muted>{next ? t("milestoneNext", { count: task.count, at: next.at, credits: next.credits }) : t("milestoneDone", { count: task.count })}</T>
            <ProgressLine done={task.count} of={target} /></>} />;
      })}
    </CollectionSection>}
  </View>;
}
