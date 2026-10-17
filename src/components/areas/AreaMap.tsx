import { Image } from "expo-image";
import { useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Icon, T, common } from "../ui";
import { IconButton } from "../food/Controls";
import { usePreferences } from "../../state/Preferences";
import { planningAreaBounds as B, planningAreaProjection as P, planningAreas } from "../../data/planning-areas";
import { planningAreaAtPixel, planningAreaByCode, ringPath } from "../../utils/planning-area";
import type { AreaBand, AreaLayer } from "../../types/areas";

/** Attribution required for the OneMap basemap and URA boundaries; shown with the map. */
export const areaMapCredit = "Map: OneMap © Singapore Land Authority · Areas: URA Master Plan 2025";

type Zoom = 1 | 2 | 3;
const [minX, minY, maxX, maxY] = B, width = maxX - minX, height = maxY - minY;
const bubbleSize: Record<AreaBand, number> = { "10+": 32, "20+": 36, "50+": 42, "100+": 48 };
const paths = planningAreas.map(area => ({ code: area.code, d: area.rings.map(ringPath).join("") }));

type Props = { layer: AreaLayer; bands: Map<string, AreaBand>; mine: string | null; selected: string | null; onSelect: (code: string) => void };
/**
 * Singapore planning areas over OneMap tiles. Bubbles show weekly bands (10+, 20+, 50+, 100+) at each area's centre,
 * never people. The member's own area carries a Home or Work marker. Drag to pan once zoomed in.
 */
export function AreaMap({ layer, bands, mine, selected, onSelect }: Props) {
  const { theme } = usePreferences();
  const [view, setView] = useState(0), [zoom, setZoom] = useState<Zoom>(1);
  const [origin, setOrigin] = useState<[number, number]>([minX, minY]);
  const k = view ? view / width * zoom : 0, viewW = k ? view / k : width, viewH = k ? view * height / width / k : height;
  const clamp = ([x, y]: [number, number]): [number, number] =>
    [Math.min(Math.max(x, minX), maxX - viewW), Math.min(Math.max(y, minY), maxY - viewH)];
  const gesture = useRef({ x: 0, y: 0, origin: [minX, minY] as [number, number], moved: false });
  const responder = {
    onStartShouldSetResponder: () => true,
    onResponderTerminationRequest: () => zoom === 1,
    onResponderGrant: (e: GestureResponderEvent) => { gesture.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, origin, moved: false }; },
    onResponderMove: (e: GestureResponderEvent) => {
      const g = gesture.current, dx = e.nativeEvent.pageX - g.x, dy = e.nativeEvent.pageY - g.y;
      if (Math.hypot(dx, dy) > 6) g.moved = true;
      if (g.moved && zoom > 1 && k) setOrigin(clamp([g.origin[0] - dx / k, g.origin[1] - dy / k]));
    },
    onResponderRelease: (e: GestureResponderEvent) => {
      if (gesture.current.moved || !k) return;
      const hit = planningAreaAtPixel(origin[0] + e.nativeEvent.locationX / k, origin[1] + e.nativeEvent.locationY / k);
      if (hit) onSelect(hit.code);
    },
  };
  const zoomTo = (next: Zoom, centre?: [number, number]) => {
    const scale = view / width * next, w = view / scale, h = view * height / width / scale;
    const [cx, cy] = centre ?? [origin[0] + viewW / 2, origin[1] + viewH / 2];
    setZoom(next);
    setOrigin(next === 1 ? [minX, minY] : [Math.min(Math.max(cx - w / 2, minX), maxX - w), Math.min(Math.max(cy - h / 2, minY), maxY - h)]);
  };
  const tiles = useMemo(() => {
    if (!k) return [];
    const z = zoom > 1 ? P.zoom + 1 : P.zoom, size = P.tile / 2 ** (z - P.zoom), offsetX = P.originX * 2 ** (z - P.zoom), offsetY = P.originY * 2 ** (z - P.zoom);
    const list: { key: string; uri: string; left: number; top: number; size: number }[] = [];
    for (let tx = Math.floor(origin[0] / size); tx * size < origin[0] + viewW; tx++) for (let ty = Math.floor(origin[1] / size); ty * size < origin[1] + viewH; ty++)
      list.push({ key: z + "/" + tx + "/" + ty, left: (tx * size - origin[0]) * k, top: (ty * size - origin[1]) * k, size: size * k,
        uri: `https://www.onemap.gov.sg/maps/tiles/${theme.dark ? "Night" : "Default"}/${z}/${tx + offsetX}/${ty + offsetY}.png` });
    return list;
  }, [k, zoom, origin, viewW, viewH, theme.dark]);
  const own = mine ? planningAreaByCode.get(mine) : undefined;
  const at = (x: number, y: number) => ({ left: (x - origin[0]) * k, top: (y - origin[1]) * k });
  const layout = (event: LayoutChangeEvent) => { const w = Math.round(event.nativeEvent.layout.width); if (w && w !== view) { setView(w); setZoom(1); setOrigin([minX, minY]); } };
  return <View onLayout={layout} style={[s.frame, { height: view ? view * height / width : 220, backgroundColor: theme.muted, borderColor: theme.border }]}>
    {!!k && <View style={StyleSheet.absoluteFill} {...responder} accessibilityLabel="Map of Singapore planning areas">
      {tiles.map(tile => <Image key={tile.key} source={{ uri: tile.uri }} cachePolicy="memory-disk" pointerEvents="none" accessible={false}
        style={{ position: "absolute", left: tile.left, top: tile.top, width: tile.size + 0.5, height: tile.size + 0.5 }} />)}
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox={`${origin[0]} ${origin[1]} ${viewW} ${viewH}`}>
        {paths.map(area => <Path key={area.code} d={area.d} fill={area.code === selected ? theme.accent : theme.transparent} fillOpacity={0.22}
          stroke={area.code === selected ? theme.accent : theme.foreground} strokeOpacity={area.code === selected ? 1 : 0.28}
          strokeWidth={(area.code === selected ? 2 : 0.8) / k} />)}
      </Svg>
      {planningAreas.map(area => {
        const band = bands.get(area.code); if (!band) return null;
        const size = Math.round(bubbleSize[band] * (zoom === 1 ? 0.8 : 1)), { left, top } = at(area.label[0], area.label[1]);
        if (left < -size || top < -size || left > view + size || top > view * height / width + size) return null;
        return <Pressable key={area.code} accessibilityRole="button" accessibilityLabel={`${area.name}, ${band} members`} hitSlop={6}
          onPress={() => onSelect(area.code)} style={[s.bubble, { left: left - size / 2, top: top - size / 2, width: size, height: size, borderRadius: size / 2,
            backgroundColor: theme.mediaControl, borderColor: area.code === selected ? theme.accent : theme.mediaDivider }]}>
          <T variant="small" color={theme.mediaForeground} style={common.bold}>{band}</T></Pressable>;
      })}
      {own && <Pressable accessibilityRole="button" accessibilityLabel={(layer === "home" ? "Your Home area, " : "Your Work area, ") + own.name}
        onPress={() => onSelect(own.code)} style={[s.mine, { ...offset(at(own.label[0], own.label[1]), bands.has(own.code)), backgroundColor: theme.accent, borderColor: theme.card }]}>
        <Icon name={layer === "home" ? "home" : "briefcase"} size={15} color={theme.actionForeground} /></Pressable>}
    </View>}
    <View style={s.controls}>
      {zoom < 3 && <IconButton label="Zoom In" icon="add" appearance="media" onPress={() => zoomTo(zoom === 1 ? 2 : 3)} />}
      {zoom > 1 && <IconButton label="Zoom Out" icon="remove" appearance="media" onPress={() => zoomTo(zoom === 3 ? 2 : 1)} />}
      {own && <IconButton label={"Show My " + (layer === "home" ? "Home" : "Work") + " Area"} icon="navigate" appearance="media"
        onPress={() => { onSelect(own.code); zoomTo(2, own.label); }} />}
    </View>
  </View>;
}
/** Sits the Home/Work marker beside a bubble rather than on top of it. */
const offset = ({ left, top }: { left: number; top: number }, shifted: boolean) => ({ left: left - 15 + (shifted ? 22 : 0), top: top - 15 - (shifted ? 22 : 0) });
const s = StyleSheet.create({
  frame: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  bubble: { position: "absolute", alignItems: "center", justifyContent: "center", borderWidth: 2 },
  mine: { position: "absolute", width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  controls: { position: "absolute", top: 8, right: 8, gap: 6 },
});
