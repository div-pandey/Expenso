import type { Expense, PeriodFilter } from '../types';

/**
 * Returns current timestamp in local ISO format suitable for datetime-local input
 */
export function getCurrentDateTimeLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
  return localISOTime;
}

/**
 * Formats an ISO string to a human-friendly relative or calendar time label.
 * Example: "Today, 9:42 AM", "Yesterday, 6:15 PM", "24 Oct, 8:30 AM"
 */
export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Invalid date';

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    const timeString = date.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (isToday) {
      return `Today, ${timeString}`;
    }
    if (isYesterday) {
      return `Yesterday, ${timeString}`;
    }

    const dateString = date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });

    // If different year, show year too
    if (date.getFullYear() !== now.getFullYear()) {
      return `${dateString} ${date.getFullYear()}, ${timeString}`;
    }

    return `${dateString}, ${timeString}`;
  } catch {
    return isoString;
  }
}

/**
 * Returns a section heading for grouped expenses:
 * "Today", "Yesterday", or "26 October 2026"
 */
export function getDateGroupHeader(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Other';

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) return 'Today';

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) return 'Yesterday';

    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return 'Other';
  }
}

/**
 * Groups expenses chronologically into date sections (Today, Yesterday, etc.)
 */
export function groupExpensesByDate(expenses: Expense[]): { heading: string; expenses: Expense[] }[] {
  // First ensure sorted newest first
  const sorted = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const groupsMap = new Map<string, Expense[]>();

  for (const exp of sorted) {
    const header = getDateGroupHeader(exp.date);
    if (!groupsMap.has(header)) {
      groupsMap.set(header, []);
    }
    groupsMap.get(header)!.push(exp);
  }

  const result: { heading: string; expenses: Expense[] }[] = [];
  groupsMap.forEach((expList, heading) => {
    result.push({ heading, expenses: expList });
  });

  return result;
}

/**
 * Filters expenses by period: today, week, month, or all
 */
export function filterExpensesByPeriod(expenses: Expense[], period: PeriodFilter): Expense[] {
  if (period === 'all') return expenses;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  if (period === 'today') {
    return expenses.filter(e => new Date(e.date).getTime() >= startOfDay);
  }

  if (period === 'week') {
    // Current week starting Monday
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
    const mondayTime = monday.getTime();
    return expenses.filter(e => new Date(e.date).getTime() >= mondayTime);
  }

  if (period === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return expenses.filter(e => new Date(e.date).getTime() >= startOfMonth);
  }

  return expenses;
}

/**
 * Returns dynamic greeting based on Indian local time
 */
export function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
