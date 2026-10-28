import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ensureMember, useMember } from "../CommunityGate";
import { ReviewPhotos } from "../discovery/ReviewPhotos";
import { SectionTitle } from "../food/Controls";
import { Button, T, common } from "../ui";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { cookedPhotos, type CookedPhoto } from "../../services/cooked-photos-api";
import { CookedPhotoDialog, type CookedAction } from "./CookedPhotoDialog";
import { useT } from "../../i18n";

/**
 * Members' "I cooked this" photos on a recipe (owner, 28 Oct 2026): yours first, then the newest, as one sideways strip; a tap
 * opens the photo with its author and note. Members add, change or delete their own and report others'. Load errors stay quiet:
 * the section simply keeps its add button.
 */
export function CookedPhotos({ recipeId }: { recipeId: string }) {
  const member = useMember(), t = useT("cook"), prefix = "cooked-photos:" + recipeId + ":", returnTo = "/cook/recipe/" + recipeId;
  const { data } = useRemote(prefix + (member.userId ?? "guest"), signal => cookedPhotos(recipeId, signal));
  const [dialog, setDialog] = useState<{ action: CookedAction; photo?: CookedPhoto } | null>(null);
  const photos = [...(data?.mine ? [data.mine] : []), ...(data?.items ?? [])];
  const add = () => { if (data?.mine) setDialog({ action: "post", photo: data.mine }); else if (ensureMember(member, returnTo)) setDialog({ action: "post" }); };
  return <View testID="cooked-photos" style={s.section}>
    <SectionTitle title={t("cookedPhotosTitle")} aside={data?.count ? String(data.count) : undefined} />
    {photos.length > 0 && <ReviewPhotos strip cache photos={photos.map(photo => photo.photo)}
      label={index => t("cookedPhotoBy", { name: photos[index].name })}
      caption={index => <View style={s.caption}><T style={common.bold}>{photos[index].name}</T>{!!photos[index].note && <T variant="small">{photos[index].note}</T>}</View>}
      actions={(index, close) => photos[index].id === data?.mine?.id
        ? <Button label={t("deleteCookedPhoto")} variant="link" onPress={() => { close(); setDialog({ action: "delete", photo: photos[index] }); }} />
        : <Button label={t("reportCookedPhoto")} variant="link" onPress={() => { close(); if (ensureMember(member, returnTo)) setDialog({ action: "report", photo: photos[index] }); }} />} />}
    {data?.mine?.hidden && <T variant="caption" muted>{t("cookedHidden")}</T>}
    <View style={s.add}><Button label={t(data?.mine ? "changeCookedPhoto" : "addCookedPhoto")} icon="camera-outline" variant="secondary"
      disabled={member.pending || !member.enabled} onPress={add} /></View>
    {dialog && <CookedPhotoDialog recipeId={recipeId} {...dialog} onClose={() => setDialog(null)} onSaved={() => invalidate(prefix)} />}
  </View>;
}
const s = StyleSheet.create({
  section: { gap: 8 },
  add: { alignSelf: "flex-start" },
  caption: { gap: 2 },
});
