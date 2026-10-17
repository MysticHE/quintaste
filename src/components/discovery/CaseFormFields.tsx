import { View } from "react-native";
import { Field, T, common } from "../ui";
import { Chip, Chips } from "../food/Controls";
import { caseTopics } from "../../config/explore-local";
import type { CaseDraft } from "../../types/explore-local";
import { CasePhotoField } from "./CasePhotoField";
import { MenuCorrectionFields } from "./MenuCorrectionFields";
import { emptyMenuChange } from "../../utils/menu-correction";

export function CaseFormFields({ draft, change, error }: {
  draft: CaseDraft; change: (patch: Partial<CaseDraft>) => void; error: (message: string) => void;
}) {
  return <View style={common.stack}>
    <T variant="subtitle" accessibilityRole="header">What needs attention?</T>
    <Chips label="Correction Or Report Topic">{caseTopics(draft.kind).map(topic => <Chip key={topic} label={topic} role="radio"
      compact selected={draft.category === topic} onPress={() => change({ category: topic,
        menuChange: topic === "Menu" ? draft.menuChange ?? emptyMenuChange(draft.menuVenueId) : undefined })} />)}</Chips>
    {draft.kind === "correction" && draft.category === "Menu" && <MenuCorrectionFields value={draft.menuChange ?? emptyMenuChange(draft.menuVenueId)}
      placeId={draft.placeId} change={menuChange => change({ menuChange })} />}
    <Field label={draft.category === "Menu" && draft.menuChange?.action !== "remove" ? "Details (Optional)" : "Details"}
      placeholder={draft.kind === "correction" ? "What should be corrected?" : "What happened?"}
      multiline maxLength={2000} value={draft.details} onChangeText={details => change({ details })} style={{ minHeight: 120, textAlignVertical: "top" }} />
    <Field label="Source (Optional)" placeholder="Your visit, staff or website" maxLength={300} value={draft.source} style={{ minHeight: 48 }}
      onChangeText={source => change({ source })} />
    <Field label="Observed On" placeholder="YYYY-MM-DD" maxLength={10} value={draft.observedOn} style={{ minHeight: 48 }}
      onChangeText={observedOn => change({ observedOn })} />
    <CasePhotoField value={draft.photoUri} change={photoUri => change({ photoUri })} error={error} />
  </View>;
}
