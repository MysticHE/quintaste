/** Minimal RFC 5545 calendar file for one plan; times are written in UTC so any calendar shows the right local time. */
export type CalendarEvent = { uid: string; title: string; start: number; minutes: number; location: string; description: string };
const escape = (text: string) => text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (at: number) => new Date(at).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
/** Lines longer than 75 octets are folded with a CRLF followed by a space. */
function fold(line: string) {
  const out: string[] = []; let current = "", bytes = 0;
  for (const char of line) {
    const size = new TextEncoder().encode(char).length;
    if (bytes + size > (out.length ? 74 : 75)) { out.push(current); current = ""; bytes = 0; }
    current += char; bytes += size;
  }
  return [...out, current].join("\r\n ");
}
export function calendarFile(event: CalendarEvent, now = Date.now()) {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//QuinTaste//Social plan//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    "UID:" + event.uid + "@quintaste", "DTSTAMP:" + stamp(now), "DTSTART:" + stamp(event.start), "DTEND:" + stamp(event.start + event.minutes * 60000),
    "SUMMARY:" + escape(event.title), "LOCATION:" + escape(event.location), "DESCRIPTION:" + escape(event.description), "END:VEVENT", "END:VCALENDAR",
  ].map(fold).join("\r\n") + "\r\n";
}
export const calendarFileName = (title: string) => (title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "food-plan") + ".ics";
