import { zhDate } from "./food-format";

/** A review's date in Singapore time: "2 Nov 2026", or 2026年11月2日 in Chinese. */
export const reviewDate = (iso: string, language: string) => language === "zh" ? zhDate(new Date(iso))
  : new Date(iso).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Singapore" });
