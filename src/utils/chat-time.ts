import { sgDateTile, sgDateTimeText } from "./sg-datetime";
/** Compact Singapore-local time today; day and month for older conversations. */
export function chatTime(at: string, language: "en" | "zh", now = Date.now()) {
  const time = Date.parse(at);
  if (!Number.isFinite(time)) return "";
  const local = sgDateTimeText(time), tile = sgDateTile(local, language);
  if (!tile) return "";
  return local.slice(0, 10) === sgDateTimeText(now).slice(0, 10) ? tile.time : language === "zh" ? tile.month + tile.day + "日" : tile.day + " " + tile.month;
}
