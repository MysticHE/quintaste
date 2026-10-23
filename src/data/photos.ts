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
  "oat-porridge": require("../../assets/food/oat-porridge.jpg"),
  "popiah": require("../../assets/food/popiah.jpg"),
  "gentle-laksa": require("../../assets/food/gentle-laksa.jpg"),
  "mapo-tofu": require("../../assets/food/mapo-tofu.jpg"),
  "bubur-cha-cha": require("../../assets/food/bubur-cha-cha.jpg"),
  "sago-gula-melaka": require("../../assets/food/sago-gula-melaka.jpg"),
  "mee-goreng": require("../../assets/food/mee-goreng.jpg"),
  "fried-bee-hoon": require("../../assets/food/fried-bee-hoon.jpg"),
  "nasi-lemak": require("../../assets/food/nasi-lemak.jpg"),
};
