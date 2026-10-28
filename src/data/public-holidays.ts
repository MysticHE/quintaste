/**
 * Singapore public holidays, including the Monday after a holiday that falls on a Sunday, as gazetted by the Ministry of
 * Manpower (https://www.mom.gov.sg/employment-practices/public-holidays, checked 28 Oct 2026). Extend each year once MOM
 * publishes the next list: after the last covered day, opening hours that depend on holidays read as unknown.
 */
const holidays = new Set([
  "2026-01-01", "2026-02-17", "2026-02-18", "2026-03-21", "2026-04-03", "2026-05-01", "2026-05-27", "2026-05-31", "2026-06-01",
  "2026-08-09", "2026-08-10", "2026-11-08", "2026-11-09", "2026-12-25",
  "2027-01-01", "2027-02-06", "2027-02-07", "2027-02-08", "2027-03-10", "2027-03-26", "2027-05-01", "2027-05-17", "2027-05-20",
  "2027-08-09", "2027-10-28", "2027-12-25",
]);
const coveredFrom = "2026-01-01", coveredTo = "2027-12-31";

/** Whether a Singapore date ("2026-12-25") is a public holiday, or null outside the dates the list covers. */
export function isPublicHoliday(day: string): boolean | null {
  return day < coveredFrom || day > coveredTo ? null : holidays.has(day);
}
