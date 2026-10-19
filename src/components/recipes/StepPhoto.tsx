import { Image } from "expo-image";
import { useState } from "react";
import { View } from "react-native";
import { useSessionHeaders } from "../../hooks/useRemote";
import { photoSource } from "../../services/community-api";
import { T } from "../ui";

/** Portrait reel frames show at 4:5 and wide ones at up to 16:9, so a frame is never cut to a thin strip. */
const shape = (width: number, height: number) => Math.min(16 / 9, Math.max(4 / 5, width / height));

/** A step's photo: a frame from the recipe video, or a drawn illustration (labelled) for a step the video does not show. */
export function StepPhoto({ path, kind, label, height }: { path: string; kind?: "frame" | "illustration"; label: string; height?: number }) {
  const headers = useSessionHeaders();
  const [ratio, setRatio] = useState(16 / 9);
  return <View style={{ gap: 4 }}>
    <Image source={photoSource(path, headers)} contentFit="cover" accessibilityLabel={label}
      onLoad={event => { if (event.source.width && event.source.height) setRatio(shape(event.source.width, event.source.height)); }}
      style={[{ width: "100%", borderRadius: 12 }, height ? { height } : { aspectRatio: ratio }]} />
    {kind === "illustration" && <T variant="caption" muted>AI illustration of this step</T>}
  </View>;
}
