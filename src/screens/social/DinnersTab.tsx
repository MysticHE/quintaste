import { router } from "expo-router";
import { FirstRunState } from "../../components/BrowseControls";
import { RemoteStatus } from "../../components/CommunityGate";
import { ListGroup } from "../../components/GroupedList";
import { T } from "../../components/ui";
import { DinnerRow } from "../../components/social/DinnerParts";
import { useRemote } from "../../hooks/useRemote";
import { useDebounced } from "../../hooks/useDebounced";
import { dinners as loadDinners } from "../../services/social-api";
import { useT } from "../../i18n";
import type { Dinner } from "../../types/community";

const needsYou = (d: Dinner) => (d.status === "invited" && d.yourTurn) || (d.reportOpen && !d.reported);
/** Dinners that need you (an answer, or how it went), then upcoming ones, then the past year. */
export function DinnersTab({ query }: { query: string }) {
  const t = useT("social"), remote = useRemote("/api/social/dinners", loadDinners, 30000), q = useDebounced(query).trim().toLowerCase();
  const has = (d: Dinner) => !q || (d.placeName + " " + d.withName).toLowerCase().includes(q);
  const all = remote.data ? [...remote.data.upcoming, ...remote.data.past] : undefined;
  const shown = (all ?? []).filter(has), waiting = shown.filter(needsYou);
  const upcoming = shown.filter(d => !needsYou(d) && (d.status === "invited" || (d.status === "accepted" && !d.past)));
  const past = shown.filter(d => !needsYou(d) && !upcoming.includes(d));
  return <>
    <RemoteStatus remote={remote} icon="restaurant-outline" returnTo="/social?tab=dinners" />
    {!!waiting.length && <ListGroup title={t("needsYou")} inset={72}>{waiting.map(d => <DinnerRow key={d.id} dinner={d} />)}</ListGroup>}
    {!!upcoming.length && <ListGroup title={t("upcoming")} inset={72}>{upcoming.map(d => <DinnerRow key={d.id} dinner={d} />)}</ListGroup>}
    {!!past.length && <ListGroup title={t("pastHeading")} inset={72}>{past.map(d => <DinnerRow key={d.id} dinner={d} />)}</ListGroup>}
    {remote.data && !shown.length && (q ? <T muted style={{ textAlign: "center" }}>{t("noMatchingDinners")}</T>
      : <FirstRunState icon="restaurant-outline" title={t("dinnersNoneTitle")} text={t("dinnersNoneText")}
        action={{ label: t("openFriends"), icon: "chatbubbles-outline", onPress: () => router.push("/social/friends") }} />)}
  </>;
}
