import Svg, { Path } from "react-native-svg";
import { Platform } from "react-native";

export function MenuIcon({ color, size = 22 }: { color: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    {...(Platform.OS === "web" ? { "aria-hidden": true } : { accessible: false })}>
    <Path d="M12 5.8C9.4 4.1 6.3 3.6 3.5 4.3v14.3c2.8-.7 5.9-.2 8.5 1.5 2.6-1.7 5.7-2.2 8.5-1.5V4.3c-2.8-.7-5.9-.2-8.5 1.5Zm0 0v14.3M6.5 8.5l2.5.7m-2.5 3.1 2.5.7m6-3.8 2.5-.7m-2.5 4.5 2.5-.7"
      stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}
