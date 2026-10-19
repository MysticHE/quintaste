/**
 * The Mochi Chef (assets/mochi/mochi-happy.webp, its original closed-eye happy face) with a blush glow over its
 * cheeks (a CSS animation, like the bounce). Cheek positions are in the art's own 1254-unit coordinates, measured from assets/chef.png.
 */
import { Image, StyleSheet, View } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import Animated from "react-native-reanimated";
import { SETTLED } from "./motion";

const MOCHI = require("../../../assets/mochi/mochi-happy.webp");
const ART = 1254;
const CHEEKS: [number, number, number][] = [[330, 795, 78], [810, 870, 88]];
/** The cheeks glow pink once the mochi has settled, then ease back a little. */
const GLOW = { "0%": { opacity: 0 }, "37.5%": { opacity: 1 }, "100%": { opacity: 0.55 } };

export function MochiFace({ size, still, blush }: { size: number; still: boolean; blush: string }) {
  const box = { left: 0, top: 0, width: size, height: size };
  const glow = still ? s.hidden : { animationName: GLOW, animationDuration: 800, animationDelay: SETTLED, animationTimingFunction: "ease-out", animationFillMode: "both" } as const;
  return <View pointerEvents="none" style={{ width: size, height: size }}>
    <Image source={MOCHI} style={[s.abs, box]} resizeMode="contain" />
    <Animated.View style={[s.abs, box, glow]}>
      <Svg width={size} height={size} viewBox={`0 0 ${ART} ${ART}`}>
        <Defs>
          <RadialGradient id="mochiBlush" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={blush} stopOpacity={0.75} />
            <Stop offset="1" stopColor={blush} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {CHEEKS.map(([x, y, r]) => <Ellipse key={x} cx={x} cy={y} rx={r * 1.25} ry={r} fill="url(#mochiBlush)" />)}
      </Svg>
    </Animated.View>
  </View>;
}

const s = StyleSheet.create({ abs: { position: "absolute" }, hidden: { opacity: 0 } });
