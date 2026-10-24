import { useState, useEffect, useRef } from "react";
import { Image, Linking, Share, StyleSheet, View } from "react-native";
import type { PhotoKey, SavedKind, Venue } from "../../types/food";
import { photos } from "../../data/photos";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { Button, Card, Field, T, common } from "../ui";
import { Chip, Chips, InfoBox, IconButton } from "./Controls";
import { useCompactUI } from "../ui-density";
import { directionsUrl } from "../../utils/directions";
import { useT } from "../../i18n";

export function HeroPhoto({ photo }: { photo: PhotoKey }) {
  const compact = useCompactUI(), t = useT("explore");
  return <View style={s.hero}><View style={[s.image, compact && { aspectRatio: 2.4, borderRadius: 16 }, { overflow: "hidden" }]}><Image source={photos[photo]} style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" accessible={false} /></View><T variant="small" muted style={s.caption}>{t(compact ? "illustrativePhoto" : "illustrativePreview")}</T></View>;
}
export function SaveAction({ kind, id }: { kind: SavedKind; id: string }) {
  const compact = useCompactUI();
  const { isSaved, toggleSave, readable } = useFood(), t = useT("explore"), tc = useT("common");
  const [busy, setBusy] = useState(false);
  const saved = isSaved(kind, id), noun = t("savedKind", { kind });
  const toggle = async () => { setBusy(true); try { await toggleSave(kind, id); } finally { setBusy(false); } };
  return <Button label={tc(saved ? "saved" : "save")} accessibilityLabel={t(saved ? "removeSavedName" : "saveName", { name: noun })} icon={saved ? "bookmark" : "bookmark-outline"}
    variant={saved || compact ? "secondary" : "primary"} disabled={!readable} loading={busy} onPress={() => void toggle()} />;
}
export function DetailActions({ kind, id, venue, shareText }: { kind: SavedKind; id: string; venue?: Venue; shareText: string }) {
  const compact = useCompactUI();
  const { setNotice } = usePreferences(), t = useT("explore"), tc = useT("common");
  const [sharing, setSharing] = useState(false), [busy, setBusy] = useState(false), [more, setMore] = useState(false);
  const share = async () => {
    setBusy(true);
    try { await Share.share({ message: shareText }); }
    catch { setNotice({ text: t("shareUnavailablePreview"), error: true }); }
    finally { setBusy(false); }
  };
  const directions = async () => {
    if (!venue?.address || !venue.googlePlaceId) { setNotice({ text: t("fictionalNoAddress") }); return; }
    try { await Linking.openURL(directionsUrl(venue.address, venue.googlePlaceId)); }
    catch { setNotice({ text: t("directionsFailed"), error: true }); }
  };
  const call = async () => {
    if (!venue?.phone) { setNotice({ text: t("noPhonePreview") }); return; }
    try { await Linking.openURL("tel:" + venue.phone.replace(/[^+\d]/g, "")); }
    catch { setNotice({ text: t("callingUnavailable"), error: true }); }
  };
  return <View style={common.stack}>
    <View style={common.row}><View style={common.flex}><SaveAction kind={kind} id={id} /></View>
      <IconButton label={t(compact ? "shareRecipe" : "moreItemActions")} icon={compact ? "share-outline" : "ellipsis-horizontal"} selected={compact ? sharing : more} onPress={() => compact ? setSharing(!sharing) : setMore(!more)} /></View>
    {more && <Chips>{venue && <Chip label={t("directions")} icon="navigate-outline" onPress={() => void directions()} />}
      <Chip label={tc("share")} icon="share-outline" onPress={() => setSharing(!sharing)} />
      {venue && <Chip label={t("call")} icon="call-outline" onPress={() => void call()} />}</Chips>}
    {sharing && <InfoBox title={t(compact ? "shareRecipe" : "sharePreview")} text={t(compact ? "privateNotesExcluded" : "sharePreviewText")}>
      <T style={s.shareText} selectable>{shareText}</T>
      <Button label={t("openSystemShare")} variant="secondary" loading={busy} onPress={() => void share()} />
      <Button label={t("cancelShare")} variant="link" onPress={() => setSharing(false)} />
    </InfoBox>}
  </View>;
}
export function PrivateNote({ noteKey }: { noteKey: string }) {
  const compact = useCompactUI(), Container = compact ? View : Card;
  const { doc, saveNote, readable } = useFood();
  const { setNotice } = usePreferences(), t = useT("explore");
  const [note, setNote] = useState(doc.notes[noteKey] ?? ""), [busy, setBusy] = useState(false), [edited, setEdited] = useState(false);
  const editRevision = useRef(0);
  useEffect(() => {
    if (!readable || edited) return;
    let active = true;
    const revision = editRevision.current;
    void Promise.resolve().then(() => { if (active && revision === editRevision.current) setNote(doc.notes[noteKey] ?? ""); });
    return () => { active = false; };
  }, [doc.notes, noteKey, readable, edited]);
  const save = async () => {
    const revision = editRevision.current;
    setBusy(true);
    try { if (await saveNote(noteKey, note)) { if (editRevision.current === revision) setEdited(false); setNotice({ text: t("privateNoteSaved") }); } }
    finally { setBusy(false); }
  };
  return <Container style={{ gap: 10 }}>{!compact && <><T variant="subtitle" accessibilityRole="header">{t("privateNoteTitle")}</T>
    <T variant="small" muted>{t("privateNoteHint")}</T></>}
    <Field label={t("yourNote")} multiline editable={readable} placeholder={t(compact ? "notePlaceholderCompact" : "notePlaceholder")} value={note} onChangeText={text => { editRevision.current += 1; setNote(text); setEdited(true); }} maxLength={2000} style={[s.note, compact && { minHeight: 60 }]} />
    <Button label={t(compact ? "saveNote" : "savePrivateNote")} variant="secondary" disabled={!readable || (compact && !edited)} loading={busy} onPress={() => void save()} />
  </Container>;
}
const s = StyleSheet.create({
  hero: { gap: 6 }, image: { width: "100%", aspectRatio: 1.55, borderRadius: 22 },
  caption: { paddingHorizontal: 3 }, note: { minHeight: 88, textAlignVertical: "top" },
  shareText: { marginVertical: 12 },
});
