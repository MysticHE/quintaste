import { StyleSheet } from "react-native";
export const s = StyleSheet.create({
  tagline: { marginTop: 6 },
  iconButton: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  show: { minWidth: 48, minHeight: 48, justifyContent: "center" },
  ack: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  or: { flexDirection: "row", alignItems: "center", gap: 12 },
  rule: { height: 1, flex: 1 },
});
