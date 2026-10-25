import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from "react-native";
import type { LivePhoto } from "../../types/discovery";
import { usePreferences } from "../../state/Preferences";
import { T } from "../ui";
import { GooglePhotoImage } from "./GooglePhoto";
import { GooglePhotoViewer } from "./GooglePhotoViewer";
import { useT } from "../../i18n";

export function GooglePhotoGallery({ photos, name, expiresAt }: { photos: LivePhoto[]; name: string; expiresAt: number }) {
  const { theme, reducedMotion } = usePreferences(), t = useT("explore");
  const scroll = useRef<ScrollViewInstance>(null), current = useRef(0);
  const [width, setWidth] = useState(0), [index, setIndex] = useState(0), [viewing, setViewing] = useState(false);
  const [visited, setVisited] = useState(() => new Set([0]));
  const visit = (values: number[]) => setVisited(previous => {
    if (values.every(value => previous.has(value))) return previous;
    return new Set([...previous, ...values]);
  });
  const move = (delta: number) => {
    const next = Math.max(0, Math.min(photos.length - 1, current.current + delta));
    visit([next]); current.current = next; setIndex(next);
    scroll.current?.scrollTo({ x: next * width, animated: !reducedMotion });
  };
  const track = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const position = Math.max(0, Math.min(photos.length - 1, event.nativeEvent.contentOffset.x / width));
    const next = Math.round(position);
    visit([Math.floor(position), Math.ceil(position)]); current.current = next; setIndex(next);
  };
  useEffect(() => { if (width) scroll.current?.scrollTo({ x: current.current * width, animated: false }); }, [width]);
  const photo = photos[index] ?? photos[0];
  if (!photo) return null;
  // Web-only DOM props; typed `object` so React Native 0.88's own onKeyDown type does not apply.
  const keyboard: object = Platform.OS === "web" ? { tabIndex: 0, "aria-valuemin": 1, "aria-valuemax": photos.length, "aria-valuenow": index + 1, "aria-valuetext": t("photoPosition", { n: index + 1, total: photos.length }), onKeyDown: (event: { key: string; preventDefault: () => void }) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); }
  } } : {};
  return <View style={s.gallery} testID="place-photo-gallery" onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <View style={[s.frame, { backgroundColor: theme.mediaSurface }]}>
      {width > 0 && <ScrollView ref={scroll} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onScroll={track} scrollEventThrottle={32} testID="place-photo-slides" keyboardShouldPersistTaps="handled">
        {photos.map((item, photoIndex) => <Pressable key={item.url} accessibilityRole="button"
          accessible={photoIndex === index} accessibilityElementsHidden={photoIndex !== index} aria-hidden={photoIndex !== index}
          importantForAccessibility={photoIndex === index ? "auto" : "no-hide-descendants"} tabIndex={photoIndex === index ? 0 : -1}
          accessibilityLabel={t("viewPhotoN", { n: photoIndex + 1, name })} onPress={() => { move(photoIndex - current.current); setViewing(true); }}
          style={{ width, aspectRatio: 1.8 }}>
          <GooglePhotoImage photo={item} name={name} expiresAt={expiresAt} enabled={visited.has(photoIndex)} style={s.photo} />
        </Pressable>)}
      </ScrollView>}
    </View>
    {photos.length > 1 && <View style={s.pagination} accessibilityRole="adjustable" accessible accessibilityLabel={t("photo")}
      accessibilityValue={{ min: 1, max: photos.length, now: index + 1, text: t("photoPosition", { n: index + 1, total: photos.length }) }}
      accessibilityActions={[{ name: "increment", label: t("nextPhoto") }, { name: "decrement", label: t("previousPhoto") }]}
      onAccessibilityAction={event => move(event.nativeEvent.actionName === "increment" ? 1 : -1)} {...keyboard}>
      <View style={s.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {photos.map((item, dot) => <View key={item.url} style={[s.dot, { backgroundColor: dot === index ? theme.accent : theme.border }]} />)}
      </View><T variant="caption" muted>{index + 1} / {photos.length}</T>
    </View>}
    {viewing && <GooglePhotoViewer photo={photo} name={name} expiresAt={expiresAt} visible onClose={() => setViewing(false)} />}
  </View>;
}
const s = StyleSheet.create({
  gallery: { gap: 4 }, frame: { borderRadius: 16, overflow: "hidden", aspectRatio: 1.8 },
  photo: { width: "100%", height: "100%" }, pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 24 },
  dots: { flexDirection: "row", gap: 5 }, dot: { width: 5, height: 5, borderRadius: 3 },
});
