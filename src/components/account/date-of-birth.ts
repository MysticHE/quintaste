export type DateOfBirthProps = { value: string; onChange: (value: string) => void; disabled?: boolean };

export const birthDateValue = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
export function initialBirthDate(value: string) {
  if (value) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const today = new Date();
  return new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
}
