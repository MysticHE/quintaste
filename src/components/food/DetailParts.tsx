import { useState, useEffect, useRef } from "react";
import { Image, Linking, Share, StyleSheet, View } from "react-native";
import type { PhotoKey, SavedKind, Venue } from "../../types/food";
import { photos } from "../../data/photos";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { Button, Card, Field, T, common } from "../ui";
import { Chip, Chips, InfoBox, IconButton } from "./Controls";
import { useCompactUI } from "../ui-density";

export function HeroPhoto({ photo }: { photo: PhotoKey }) {
  const compact = useCompactUI();
  return <View style={s.hero}><View style={[s.image, compact && { aspectRatio: 2.4, borderRadius: 16 }, { overflow: "hidden" }]}><Image source={photos[photo]} style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" accessible={false} /></View><T variant="small" muted style={s.caption}>{compact ? "Illustrative photo" : "Illustrative photo · preview collection"}</T></View>;
}
export function SaveAction({ kind, id }: { kind: SavedKind; id: string }) {
  const compact = useCompactUI();
  const { isSaved, toggleSave, readable } = useFood();
  const [busy, setBusy] = useState(false);
  const saved = isSaved(kind, id);
  const toggle = async () => { setBusy(true); try { await toggleSave(kind, id); } finally { setBusy(false); } };
  return <Button label={saved ? "Saved" : "Save"} accessibilityLabel={saved ? "Remove saved " + kind : "Save " + kind} icon={saved ? "bookmark" : "bookmark-outline"}
    variant={saved || compact ? "secondary" : "primary"} disabled={!readable} loading={busy} onPress={() => void toggle()} />;
}
export function DetailActions({ kind, id, venue, shareText }: { kind: SavedKind; id: string; venue?: Venue; shareText: string }) {
  const compact = useCompactUI();
  const { setNotice } = usePreferences();
  const [sharing, setSharing] = useState(false), [busy, setBusy] = useState(false), [more, setMore] = useState(false);
  const share = async () => {
    setBusy(true);
    try { await Share.share({ message: shareText }); }
    catch { setNotice({ text: "System sharing is not available here. Your share preview is still visible.", error: true }); }
    finally { setBusy(false); }
  };
  const directions = async () => {
    if (!venue?.address || !venue.googlePlaceId) { setNotice({ text: "This is a fictional preview venue. There is no real address to navigate to." }); return; }
    try { await Linking.openURL("https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(venue.address) + "&destination_place_id=" + encodeURIComponent(venue.googlePlaceId)); }
    catch { setNotice({ text: "Directions could not be opened. Please try again.", error: true }); }
  };
  const call = async () => {
    if (!venue?.phone) { setNotice({ text: "No phone number is listed for this preview venue." }); return; }
    try { await Linking.openURL("tel:" + venue.phone.replace(/[^+\d]/g, "")); }
    catch { setNotice({ text: "Calling is not available on this device.", error: true }); }
  };
  return <View style={common.stack}>
    <View style={common.row}><View style={common.flex}><SaveAction kind={kind} id={id} /></View>
      <IconButton label={compact ? "Share Recipe" : "More Item Actions"} icon={compact ? "share-outline" : "ellipsis-horizontal"} selected={compact ? sharing : more} onPress={() => compact ? setSharing(!sharing) : setMore(!more)} /></View>
    {more && <Chips>{venue && <Chip label="Directions" icon="navigate-outline" onPress={() => void directions()} />}
      <Chip label="Share" icon="share-outline" onPress={() => setSharing(!sharing)} />
      {venue && <Chip label="Call" icon="call-outline" onPress={() => void call()} />}</Chips>}
    {sharing && <InfoBox title={compact ? "Share Recipe" : "Share Preview"} text={compact ? "Private notes are excluded." : "Only this item and its public sample information are included. Your notes, exclusions, account and private locations stay out."}>
      <T style={s.shareText} selectable>{shareText}</T>
      <Button label="Open System Share" variant="secondary" loading={busy} onPress={() => void share()} />
      <Button label="Cancel Share" variant="link" onPress={() => setSharing(false)} />
    </InfoBox>}
  </View>;
}
export function PrivateNote({ noteKey }: { noteKey: string }) {
  const compact = useCompactUI(), Container = compact ? View : Card;
  const { doc, saveNote, readable } = useFood();
  const { setNotice } = usePreferences();
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
    try { if (await saveNote(noteKey, note)) { if (editRevision.current === revision) setEdited(false); setNotice({ text: "Private note saved on this device." }); } }
    finally { setBusy(false); }
  };
  return <Container style={{ gap: 10 }}>{!compact && <><T variant="subtitle" accessibilityRole="header">Private Note</T>
    <T variant="small" muted>Only you can see this. It is never part of a public share or a dietary claim.</T></>}
    <Field label="Your Note" multiline editable={readable} placeholder={compact ? "For next time…" : "What would you like to remember?"} value={note} onChangeText={text => { editRevision.current += 1; setNote(text); setEdited(true); }} maxLength={2000} style={[s.note, compact && { minHeight: 60 }]} />
    <Button label={compact ? "Save Note" : "Save Private Note"} variant="secondary" disabled={!readable || (compact && !edited)} loading={busy} onPress={() => void save()} />
  </Container>;
}
const s = StyleSheet.create({
  hero: { gap: 6 }, image: { width: "100%", aspectRatio: 1.55, borderRadius: 22 },
  caption: { paddingHorizontal: 3 }, note: { minHeight: 88, textAlignVertical: "top" },
  shareText: { marginVertical: 12 },
});
