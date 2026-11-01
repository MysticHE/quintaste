export type DateOfBirthProps = { value: string; onChange: (value: string) => void; disabled?: boolean };

/** The earliest birth date the server accepts (server/community/birth-date.mjs EARLIEST_BIRTH). */
export const EARLIEST_BIRTH = '1920-01-01';
export const birthDateValue = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
export function initialBirthDate(value: string) {
  if (value) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const today = new Date();
  return new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
}
