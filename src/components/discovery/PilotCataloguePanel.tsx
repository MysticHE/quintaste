import { useState } from "react";
import { View } from "react-native";
import { Button, T, common } from "../ui";
import { Chip, Chips, SearchField } from "../food/Controls";
import { PilotVenueEntry } from "./PilotVenueEntry";
import { PilotSourceLinks } from "./PilotSourceLinks";
import { usePilotCatalogue } from "../../hooks/usePilotCatalogue";
import { useMinuteClock } from "../food/Timers";
import { pilotClusters } from "../../config/pilot-catalogue";
import { pilotEvidenceState } from "../../utils/pilot-evidence";
import { usePreferences } from "../../state/Preferences";
import type { LocalReviewRequest } from "../../types/local-review";
import type { PilotCluster } from "../../types/pilot-catalogue";

export function PilotCataloguePanel({ request, busy }: { request: LocalReviewRequest; busy: boolean }) {
  const { data, error, loading, load, review } = usePilotCatalogue(request), { theme } = usePreferences(), now = useMinuteClock();
  const [query, setQuery] = useState(""), [cluster, setCluster] = useState<PilotCluster | "all">("all");
  const [filter, setFilter] = useState("All"), [candidatesOpen, setCandidatesOpen] = useState(false);
  const catalogue = data?.catalogue;
  const visible = catalogue?.venues.filter(venue => {
    const words = [venue.name, venue.branch, venue.address, ...catalogue.dishes.filter(d => d.venueId === venue.id).map(d => d.name)].join(" ").toLowerCase();
    if (cluster !== "all" && venue.clusterId !== cluster || !words.includes(query.trim().toLowerCase())) return false;
    const state = pilotEvidenceState(venue, catalogue, data?.states.find(s => s.venueId === venue.id), now);
    return filter === "All" || (filter === "Reviewed" ? state.kind === "source-reviewed" : filter === "Withdrawn" ? state.kind === "withdrawn"
      : state.kind !== "source-reviewed" && state.kind !== "withdrawn");
  }) ?? [];
  return <View style={common.stack}>
    <T variant="subtitle" accessibilityRole="header">Pilot Catalogue</T>
    <T variant="caption" muted>Local research · ingredients unconfirmed</T>
    <Button label="Refresh Pilot Catalogue" icon="refresh-outline" variant="secondary" loading={loading} disabled={busy} onPress={() => void load()} />
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    {catalogue ? <>
      <T variant="small" muted>{catalogue.venues.length} places · {catalogue.dishes.length} menu items · {catalogue.sources.length} sources</T>
      <SearchField value={query} onChange={setQuery} placeholder="Search pilot places or dishes" />
      <Chips label="Pilot Area"><Chip label="All Pilots" role="radio" compact selected={cluster === "all"} onPress={() => setCluster("all")} />
        {pilotClusters.map(item => <Chip key={item.id} label={item.short} role="radio" compact selected={cluster === item.id} onPress={() => setCluster(item.id)} />)}</Chips>
      <Chips label="Catalogue Status">{["All", "Needs attention", "Reviewed", "Withdrawn"].map(item => <Chip key={item} label={item} role="radio"
        compact selected={filter === item} onPress={() => setFilter(item)} />)}</Chips>
      {!visible.length && <T muted>No matching pilot entries</T>}
      {visible.map(venue => <PilotVenueEntry key={venue.id} venue={venue} catalogue={catalogue}
        state={data!.states.find(s => s.venueId === venue.id)!} busy={busy} review={review} now={now} />)}
      <Button label={(candidatesOpen ? "Hide" : "Show") + " pending candidates (" + catalogue.candidates.length + ")"} variant="link" onPress={() => setCandidatesOpen(!candidatesOpen)} />
      {candidatesOpen && catalogue.candidates.map(item => <View key={item.id} style={common.stack}>
        <T variant="subtitle">{item.name}</T><T variant="small" muted>{item.reason}</T>
        <PilotSourceLinks sources={catalogue.sources.filter(s => item.sourceIds.includes(s.id))} />
      </View>)}
      <T variant="caption" muted>Facts and source links only. Menu artwork and photos are not imported. Entries stay outside public Explore until release review.</T>
    </> : !loading && !error ? <T muted>Catalogue unavailable</T> : null}
  </View>;
}
