import { useState } from "react";
import { EmptyState } from "../../components/food/Controls";
import { FirstRunState } from "../../components/BrowseControls";
import { RemoteStatus } from "../../components/CommunityGate";
import { StandingRow } from "../../components/social/SocialState";
import { PersonCard } from "../../components/social/PersonCard";
import { RequestSheet } from "../../components/social/PersonSheets";
import { useMeet } from "../../hooks/useMeet";
import { useDebounced } from "../../hooks/useDebounced";
import { useRemote } from "../../hooks/useRemote";
import { people, peopleKey } from "../../services/social-api";
import { useT } from "../../i18n";
import { defaultMeetFilters, type MeetFilters } from "../../types/meet";
import type { Person, SocialMe } from "../../types/community";

export const activePeopleFilters = (f: MeetFilters) => f.diets.length > 0 || f.ages.length > 0 || f.languages.length > 0 || f.hobbies.length > 0 || f.km > 0;

/** People to meet: public, verified members of the opposite gender aged 21+, nearest areas first. Your own profile row sits on top. */
export function PeopleTab({ query, me }: { query: string; me: SocialMe }) {
  const { network: n, commit } = useMeet(), t = useT("social"), search = useDebounced(query), key = peopleKey(search, n.filters);
  // Sending a request refetches People, and the server leaves out anyone with an open request, so the card simply goes.
  const remote = useRemote(key, signal => people(key, signal)), [adding, setAdding] = useState<Person | null>(null);
  const filtered = activePeopleFilters(n.filters) || !!search.trim(), items = remote.data?.items ?? [];
  return <>
    <StandingRow data={me} />
    <RemoteStatus remote={remote} icon="people-outline" returnTo="/social" />
    {remote.data && (items.length ? items.map(person => <PersonCard key={person.id} person={person} onAdd={() => setAdding(person)} />)
      : filtered ? <EmptyState title={t("peopleNoneFiltered")} text="" action={activePeopleFilters(n.filters) ? t("clearFilters") : undefined}
        onPress={() => void commit({ type: "filters", filters: defaultMeetFilters() })} />
      : <FirstRunState icon="people-outline" title={t("peopleNoneTitle")} text={t("peopleNoneText")} />)}
    {adding && <RequestSheet person={adding} visible onClose={() => setAdding(null)} onSent={() => setAdding(null)} />}
  </>;
}
