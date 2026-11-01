import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { T, common } from "../../components/ui";
import { TopTabs } from "../../components/TopTabs";
import { RemoteStatus } from "../../components/CommunityGate";
import { MemberGate, useSocialMe } from "../../components/social/SocialState";
import { BadgesTab, BordersTab, TasksTab } from "../../components/collection/CollectionTabs";
import { useGifts } from "../../components/collection/Gifts";
import { GiftsTab } from "../../components/collection/GiftsTab";
import { useRemote } from "../../hooks/useRemote";
import { useLiveInbox } from "../../components/InboxCounts";
import { collectionKey, loadCollection } from "../../services/collection-api";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import type collectionMessages from "../../i18n/en/collection";

type Tab = "tasks" | "badges" | "borders" | "gifts";
/** The credit balance in the title bar, with a small gold coin. */
function CreditsChip({ n }: { n: number }) {
  const { theme } = usePreferences(), t = useT("collection");
  return <View style={[common.row, { gap: 6, backgroundColor: theme.muted, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }]} accessible accessibilityLabel={t("creditsChip", { n })}>
    <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: theme.lotus.golden, borderWidth: 1.5, borderColor: theme.warning }} />
    <T variant="small" style={[common.bold, { fontVariant: ["tabular-nums"] }]}>{n.toLocaleString()}</T>
  </View>;
}

/**
 * Collection (docs/COLLECTION_PLAN.md): Tasks that earn credits, Badges earned from task lists, and avatar Borders bought
 * with credits, and Gifts. Opening it settles: new credits and badges are announced once. It opens on Gifts while a gift is
 * waiting or one you sent was liked or thanked.
 */
export function CollectionScreen() {
  const t = useT("collection"), { setNotice } = usePreferences(), inbox = useLiveInbox();
  const [tab, setTab] = useState<Tab>((inbox?.gifts ?? 0) + (inbox?.giftNews ?? 0) > 0 ? "gifts" : "tasks");
  const remote = useRemote(collectionKey, loadCollection), me = useSocialMe().data, data = remote.data, told = useRef("");
  const gifts = useGifts(!!me?.hasProfile).data;
  useEffect(() => {
    const just = data?.just, key = just ? `${just.credits}|${just.badges.join()}` : "";
    if (!just || key === told.current || (!just.credits && !just.badges.length)) return;
    told.current = key;
    const badge = just.badges[0];
    setNotice({ text: badge ? t("newBadge", { name: t(("badge_" + badge) as keyof typeof collectionMessages) as string }) : t("earnedNotice", { n: just.credits }) });
  }, [data, setNotice, t]);
  return <Screen title={t("title")} headerAction={data ? <CreditsChip n={data.credits} /> : undefined}>
    <MemberGate returnTo="/social/collection">
      <TopTabs label={t("tabsLabel")} value={tab} onChange={setTab}
        tabs={[{ id: "tasks", label: t("tabTasks") }, { id: "badges", label: t("tabBadges") }, { id: "borders", label: t("tabBorders") },
          ...(gifts ? [{ id: "gifts" as const, label: t("tabGifts") }] : [])]} />
      <RemoteStatus remote={remote} icon="trophy-outline" returnTo="/social/collection" />
      {data && tab === "tasks" && <TasksTab data={data} />}
      {data && tab === "badges" && <BadgesTab data={data} />}
      {data && tab === "borders" && <BordersTab data={data} me={me} />}
      {data && gifts && tab === "gifts" && <GiftsTab data={gifts} />}
    </MemberGate>
  </Screen>;
}
