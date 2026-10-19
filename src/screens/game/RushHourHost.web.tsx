import { lazy, Suspense, type ComponentProps } from "react";
import { View } from "react-native";
import type RushHourComponent from "../../game/dom/RushHour";

/** Web: the game (with Phaser) loads only when a service starts, keeping it out of the main app bundle. */
const RushHour = lazy(() => import("../../game/dom/RushHour"));

export default function RushHourHost(props: ComponentProps<typeof RushHourComponent>) {
  return <Suspense fallback={<View style={{ flex: 1 }} />}><RushHour {...props} /></Suspense>;
}
