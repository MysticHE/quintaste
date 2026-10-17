import { useState } from "react";
import { View } from "react-native";
import { Button, Card, Divider, T, common } from "../ui";
import { PilotMenuFacts } from "./PilotMenuFacts";
import { PilotReviewForm, type PilotReviewAction } from "./PilotReviewForm";
import { PilotSourceLinks } from "./PilotSourceLinks";
import { pilotCheckedDate, pilotEvidenceState, pilotSourcesForVenue } from "../../utils/pilot-evidence";
import type { PilotCatalogue, PilotVenue, PilotVenueState } from "../../types/pilot-catalogue";

export function PilotVenueEntry({ venue, catalogue, state, busy, review, now }: {
  venue: PilotVenue; catalogue: PilotCatalogue; state: PilotVenueState; busy: boolean; review: PilotReviewAction; now: number;
}) {
  const [expanded, setExpanded] = useState(false), [sourcesOpen, setSourcesOpen] = useState(false);
  const evidence = pilotEvidenceState(venue, catalogue, state, now), sources = pilotSourcesForVenue(venue, catalogue);
  const dishes = catalogue.dishes.filter(item => item.venueId === venue.id), claims = { vegetarian: "Vegetarian", vegan: "Vegan", "no-onion-garlic": "No onion / garlic", "no-alcohol": "No alcohol" };
  return <View style={common.stack} testID={"pilot-entry-" + venue.id}>
    <Card style={common.stack}>
      <T variant="subtitle">{venue.name}</T><T variant="small" muted>{venue.branch}</T><T variant="small">{venue.address}</T>
      <T variant="small" style={common.bold}>{evidence.label}</T>
      <T variant="caption" muted>{dishes.length ? dishes.length + " menu items" : "Menu missing"} · Checked {pilotCheckedDate([...sources].sort((a, b) => a.checkedAt.localeCompare(b.checkedAt))[0].checkedAt)}</T>
      {!!state.review?.reason && <T variant="small">{state.review.reason}</T>}
      <Button label={expanded ? "Close Catalogue Entry" : "Inspect Catalogue Entry"} accessibilityLabel={(expanded ? "Close catalogue entry: " : "Inspect catalogue entry: ") + venue.name + " " + venue.branch}
        variant="secondary" disabled={busy} onPress={() => setExpanded(!expanded)} />
    </Card>
    {expanded && <View style={{ gap: 18, paddingHorizontal: 8 }}>
      <PilotMenuFacts venue={venue} catalogue={catalogue} />
      <Divider /><T variant="subtitle" accessibilityRole="header">Merchant Claims</T>
      {venue.claims.length ? venue.claims.map((claim, i) => <View key={i} style={{ gap: 4 }}>
        <T variant="small">{claims[claim.kind]} · {claim.scope} claim</T><T variant="caption" muted>{claim.note}</T>
      </View>) : <T muted>No current merchant dietary claim verified</T>}
      <T variant="subtitle" accessibilityRole="header">Still To Verify</T>
      {venue.gaps.map((gap, i) => <T key={i} variant="small" muted>{gap}</T>)}
      <T variant="small" muted>{venue.googlePlaceId ? "Google place ID linked" : "Google place ID not linked"} · Publication permission unconfirmed</T>
      <Button label={(sourcesOpen ? "Hide" : "Show") + " sources (" + sources.length + ")"} variant="secondary" disabled={busy} onPress={() => setSourcesOpen(!sourcesOpen)} />
      {sourcesOpen && <PilotSourceLinks sources={sources} />}
      <Divider /><PilotReviewForm key={state.revision + state.fingerprint} state={state} initialStatus={venue.sourceCheck === "needs-information" ? "needs-information" : "source-reviewed"} busy={busy} save={review} />
    </View>}
  </View>;
}
