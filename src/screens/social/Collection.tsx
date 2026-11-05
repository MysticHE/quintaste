import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { Sheet } from "../../components/Sheet";
import { CreditActivity } from "../../components/collection/CreditActivity";
import { BadgeReveal } from "../../components/collection/BadgeReveal";
import { Screen } from "../../components/Screen";
import { T, common } from "../../components/ui";
import { TopTabs } from "../../components/TopTabs";
import { RemoteStatus, useMember } from "../../components/CommunityGate";
import { MemberGate, useSocialMe } from "../../components/social/SocialState";
import { BadgesTab, BordersTab, TasksTab } from "../../components/collection/CollectionTabs";
import { useGifts } from "../../components/collection/Gifts";
import { GiftsTab } from "../../components/collection/GiftsTab";
import { useRemote } from "../../hooks/useRemote";
import { useLiveInbox } from "../../components/InboxCounts";
import { collectionKey, loadCollection } from "../../services/collection-api";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import { useAuth } from "../../state/Auth";

// Collection responses are cached in memory: revisiting must not replay a cached badge award.
const revealedAwards = new Set<string>();

type Tab = "tasks" | "badges" | "borders" | "gifts";
/** The credit balance in the title bar, with a small gold coin. */
function CreditsChip({ n, onPress }: { n: number; onPress: () => void }) {
  const { theme } = usePreferences(), t = useT("collection");
  return <Pressable onPress={onPress} accessibilityRole="button" style={[common.row, { minHeight: 48, gap: 6, backgroundColor: theme.muted, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }]} accessibilityLabel={t("openCreditActivity", { n })}>
    <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: theme.lotus.golden, borderWidth: 1.5, borderColor: theme.warning }} />
    <T variant="small" style={[common.bold, { fontVariant: ["tabular-nums"] }]}>{n.toLocaleString()}</T>
  </Pressable>;
}

/**
 * Collection (docs/COLLECTION_PLAN.md): Tasks that earn credits, Badges earned from task lists, and avatar Borders bought
 * with credits, and Gifts. Opening it settles: new credits and badges are announced once. It opens on Gifts while a gift is
 * waiting or one you sent was liked or thanked.
 */
export function CollectionScreen() {
  const { user } = useAuth();
  const t = useT("collection"), { setNotice } = usePreferences(), inbox = useLiveInbox();
  const [history, setHistory] = useState(false), [reveal, setReveal] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>((inbox?.gifts ?? 0) + (inbox?.giftNews ?? 0) > 0 ? "gifts" : "tasks");
  const choseTab = useRef(false), checkedInbox = useRef(!!inbox);
  useEffect(() => {
    if (!inbox || checkedInbox.current) return;
    checkedInbox.current = true;
    if (!choseTab.current && (inbox.gifts ?? 0) + (inbox.giftNews ?? 0) > 0) setTab("gifts");
  }, [inbox]);
  const member=useMember();
  const remote = useRemote(member.member?collectionKey:null, loadCollection, {poll:tab==="tasks"?5000:undefined}), me = useSocialMe().data, data = remote.data, told = useRef("");
  const giftsRemote = useGifts(member.member && !!me?.hasProfile), gifts = giftsRemote.data;
  useEffect(() => {
    const just = data?.just, key = just ? `${just.credits}|${just.badges.join()}` : "";
    if (!just || key === told.current || (!just.credits && !just.badges.length)) return;
    const awardKey = (id: string) => `${user?.id}|${id}|${data?.badges.find(b => b.id === id)?.earnedAt ?? "award"}`;
    const fresh = user ? just.badges.filter(id => data?.badges.some(b => b.id === id && b.earned && !b.revoked) && !revealedAwards.has(awardKey(id))) : [];
    // Present a reveal after the settled screen has committed, with cancellable lifecycle cleanup.
    const frame = requestAnimationFrame(() => {
      told.current = key;
      fresh.forEach(id => revealedAwards.add(awardKey(id)));
      if (fresh.length) setReveal(current => [...new Set([...current, ...fresh])]);
      if (just.credits) setNotice({ text: t("earnedNotice", { n: just.credits }) });
    });
    return () => cancelAnimationFrame(frame);
  }, [data, setNotice, t, user]);
  return <Screen title={t("title")} headerAction={data ? <CreditsChip n={data.credits} onPress={() => setHistory(true)} /> : undefined}>
    <MemberGate returnTo="/social/collection">
      <TopTabs label={t("tabsLabel")} value={tab} onChange={next => { choseTab.current = true; setTab(next); }}
        tabs={[{ id: "tasks", label: t("tabTasks") }, { id: "badges", label: t("tabBadges") }, { id: "borders", label: t("tabBorders") },
          ...(gifts || tab === "gifts" ? [{ id: "gifts" as const, label: t("tabGifts"), dot: (inbox?.gifts ?? 0) + (inbox?.giftNews ?? 0) > 0 }] : [])]} />
      <RemoteStatus remote={remote} icon="trophy-outline" returnTo="/social/collection" />
      {data && tab === "tasks" && <TasksTab data={data} />}
      {data && tab === "badges" && <BadgesTab data={data} me={me} />}
      {data && tab === "borders" && <BordersTab data={data} me={me} />}
      {data && tab === "gifts" && <RemoteStatus remote={giftsRemote} icon="gift-outline" returnTo="/social/collection" />}
      {data && gifts && tab === "gifts" && <GiftsTab data={gifts} />}
      <Sheet visible={history && reveal.length === 0} onClose={() => setHistory(false)} title={t("creditActivity")}>
        {history && data && reveal.length === 0 && <CreditActivity data={data} />}
      </Sheet>
      {data && reveal.length > 0 && <BadgeReveal ids={reveal} data={data} onNext={() => setReveal(current => current.slice(1))} onView={() => { setReveal([]); setTab("badges"); choseTab.current = true; }} />}
    </MemberGate>
  </Screen>;
}
