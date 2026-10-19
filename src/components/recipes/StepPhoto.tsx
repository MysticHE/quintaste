import { Image } from "expo-image";
import { View } from "react-native";
import { useSessionHeaders } from "../../hooks/useRemote";
import { photoSource } from "../../services/community-api";
import { T } from "../ui";

/** A step's photo: a frame from the recipe video, or a drawn illustration (labelled) when the video could not be used. */
export function StepPhoto({ path, kind, label, height }: { path: string; kind?: "frame" | "illustration"; label: string; height?: number }) {
  const headers = useSessionHeaders();
  return <View style={{ gap: 4 }}>
    <Image source={photoSource(path, headers)} contentFit="cover" accessibilityLabel={label}
      style={[{ width: "100%", borderRadius: 12 }, height ? { height } : { aspectRatio: 16 / 9 }]} />
    {kind === "illustration" && <T variant="caption" muted>AI illustration of this step</T>}
  </View>;
}
