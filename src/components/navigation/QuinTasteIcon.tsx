import Svg, { Circle, Path } from "react-native-svg";
import { Platform } from "react-native";
export type QuinTasteTab = "explore" | "cook" | "social" | "market" | "game";
type QuinTasteSymbol = QuinTasteTab | "saved";
const feed = "M11 4h14a3 3 0 0 1 3 3v15a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z";
// Authored silhouettes: conversation bowl, seamless leaf bag, and leaf controller.

const marketBag = "M6 10h5V8a5 5 0 0 1 10 0v2h5l1.2 15.8a2 2 0 0 1-2 2.2H6.8a2 2 0 0 1-2-2.2z";
const marketLeaf = "M11 23C10 17 14 14 21 14c0 7-4 10-10 9z";
const controllerLower = "C27.3 11.8 28 14 28.4 16.4L30 24.5c.5 3.5-2.8 4.5-5 2.5l-4-3.5H11L7 27c-2.2 2-5.5 1-5-2.5l1.6-8.1C4.2 12.5 5.5 10 9 10z";
const leafController = "M9 10h11C20 6 24 4 29 4c0 4-1.8 6.2-5 7.2" + controllerLower;
// Fill only the controller body: the joined leaf stays hollow in both states.
const controllerBody = "M9 10h11c1.5 0 2.8.4 4 1.2" + controllerLower;
const controllerButtons = "M9.7 14.8c.4 0 .7.3.7.7v1.2h1.2a.7.7 0 0 1 0 1.4h-1.2v1.2a.7.7 0 0 1-1.4 0v-1.2H7.8a.7.7 0 0 1 0-1.4H9v-1.2c0-.4.3-.7.7-.7z M22 14.5a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2z M24.2 18a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2z";
export function QuinTasteIcon({ name, color, selected = false, size = 25 }: {
  name: QuinTasteSymbol; color: string; selected?: boolean; size?: number;
}) {
  // Own every primitive's paint in both states. Native SVG can retain an old
  // propList when explicit selected paint is replaced by inherited group paint.
  const outline = { fill: "none", stroke: color, strokeWidth: 2.2,
    strokeLinecap: "round", strokeLinejoin: "round", fillRule: "nonzero" } as const;
  return <Svg width={size} height={size} viewBox="0 0 32 32"
    {...(Platform.OS === "web" ? { "aria-hidden": true } : { accessible: false })}>
      {name === "explore" && (selected ? <Path {...outline} stroke="none" fill={color} fillRule="evenodd"
        d="M16 3a13 13 0 1 0 0 26 13 13 0 0 0 0-26z M21.8 10.2l-3.5 8.1-8.1 3.5 3.5-8.1z" /> : <>
        <Circle {...outline} cx={16} cy={16} r={12} /><Path {...outline} d="m21.8 10.2-3.5 8.1-8.1 3.5 3.5-8.1z" />
      </>)}
      {name === "cook" && <>
        <Path {...outline} d="M4 9v16a4 4 0 0 0 4 4h15" />
        <Path {...outline} d={feed} fill={selected ? color : "none"} />
        {!selected && <Path {...outline} d="M13 11h10M13 16h10M13 21h6" />}
      </>}
      {name === "market" && <>
        <Path {...outline} fill={selected ? color : "none"} stroke={selected ? "none" : color}
          fillRule="evenodd" d={selected ? marketBag + " " + marketLeaf : marketBag} />
        {!selected && <Path {...outline} d={marketLeaf} fill={color} stroke="none" />}
      </>}
      {name === "social" && <>
        <Circle {...outline} cx={16} cy={9} r={5} fill={selected ? color : "none"} />
        <Path {...outline} d="M5 28v-2a11 9 0 0 1 22 0v2z" fill={selected ? color : "none"} />
      </>}
      {name === "game" && <>
        <Path {...outline} d={leafController} />
        {selected ? <Path {...outline} stroke="none" fill={color} fillRule="evenodd"
          d={controllerBody + " " + controllerButtons} />
          : <Path {...outline} d={controllerButtons} fill={color} stroke="none" />}
      </>}
      {name === "saved" && <><Path {...outline} d="M10 5.5h12.5a2 2 0 0 1 2 2v21l-8.2-4.9-8.3 4.9v-21a2 2 0 0 1 2-2z" fill={selected ? color : "none"} fillOpacity={selected ? 0.13 : 0} />
        <Path {...outline} d="M11.5 3h8.5M20.8 10.3c.2 4.3-1.5 7-5.8 7.2-.2-4.4 1.5-7 5.8-7.2zM13.2 19l4.2-5" /></>}
  </Svg>;
}
