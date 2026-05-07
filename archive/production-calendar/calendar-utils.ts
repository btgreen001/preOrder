// Utility functions for calendar date calculations
export function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
  return new Date(d.setDate(diff));
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getDatesForWeek(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function getDatesForMonth(year: number, month: number): Date[] {
  const days = getDaysInMonth(year, month);
  return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1));
}
