/**
 * The Mochi Chef (assets/mochi/mochi-happy.webp, its original closed-eye happy face) with a blush glow over its
 * cheeks. Cheek positions are in the art's own 1254-unit coordinates, measured from assets/chef.png.
 */
import { Image, StyleSheet, View } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { usePreferences } from "../../state/Preferences";

const MOCHI = require("../../../assets/mochi/mochi-happy.webp");
const ART = 1254;
const CHEEKS: [number, number, number][] = [[330, 795, 78], [810, 870, 88]];

export function MochiFace({ size, blush }: { size: number; blush: SharedValue<number> }) {
  const { theme } = usePreferences(), box = { left: 0, top: 0, width: size, height: size };
  const glow = useAnimatedStyle(() => ({ opacity: blush.value }));
  return <View pointerEvents="none" style={{ width: size, height: size }}>
    <Image source={MOCHI} style={[s.abs, box]} resizeMode="contain" />
    <Animated.View style={[s.abs, box, glow]}>
      <Svg width={size} height={size} viewBox={`0 0 ${ART} ${ART}`}>
        <Defs>
          <RadialGradient id="mochiBlush" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={theme.mascot.blush} stopOpacity={0.75} />
            <Stop offset="1" stopColor={theme.mascot.blush} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {CHEEKS.map(([x, y, r]) => <Ellipse key={x} cx={x} cy={y} rx={r * 1.25} ry={r} fill="url(#mochiBlush)" />)}
      </Svg>
    </Animated.View>
  </View>;
}

const s = StyleSheet.create({ abs: { position: "absolute" } });
