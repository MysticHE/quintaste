import { Platform } from "react-native";
import Svg, { G, Path } from "react-native-svg";

export function DietIcon({ diet, color }: { diet: "Vegetarian" | "Vegan"; color: string }) {
  return <Svg width={24} height={24} viewBox="0 0 32 32" testID={"diet-icon-" + diet.toLowerCase()}
    {...(Platform.OS === "web" ? { "aria-hidden": true } : { accessible: false })}>
    <G fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {diet === "Vegetarian" ? <>
        <Path d="M19 10c-3-2-5-1-7 2L5 26c-.5 1 .4 2 1.5 1.4l13-8.1c3.4-2.1 3.4-5.3-.5-9.3Z" />
        <Path d="m15 12 3 3m-8 3 2 2m9-10c-1-4 1-6 4-7 0 4-1 6-4 7Zm0 0c4-1 6 0 7 3-4 1-6 0-7-3Z" />
      </> : <>
        <Path d="M16 28V15M16 19C7 20 3 15 4 7c8 0 12 4 12 12Z" />
        <Path d="M16 14C15 7 20 3 28 4c0 8-4 12-12 10Zm0 5L9 12m7 2 7-6M11 28h10" />
      </>}
    </G>
  </Svg>;
}
