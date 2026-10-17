import type { ImageSourcePropType } from "react-native";
import type { PhotoKey } from "../types/food";

export const photos: Record<PhotoKey, ImageSourcePropType> = {
  bowl: require("../../assets/food/bowl.jpg"),
  laksa: require("../../assets/food/laksa.jpg"),
  greens: require("../../assets/food/greens.jpg"),
  "kaya-toast": require("../../assets/food/kaya-toast.jpg"),
  "claypot-rice": require("../../assets/food/claypot-rice.jpg"),
  "sweet-sour-tofu": require("../../assets/food/sweet-sour-tofu.jpg"),
  kangkung: require("../../assets/food/kangkung.jpg"),
  "abc-soup": require("../../assets/food/abc-soup.jpg"),
};
