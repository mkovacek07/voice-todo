// Date-based filtering and grouping of todos for the list view.
//
// ISO "YYYY-MM-DD" strings sort and compare correctly as plain strings, which
// keeps this logic simple (no Date math needed for ordering).

import { formatDateLabel } from "./dateUtils";
import type { Todo } from "./types";

export type DateFilter = "all" | "overdue" | "today" | "upcoming";

export interface TodoSection {
  key: string;
  title: string;
  overdue: boolean;
  data: Todo[];
}

export const FILTERS: { key: DateFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
];

export function matchesFilter(
  dateIso: string,
  filter: DateFilter,
  todayIso: string
): boolean {
  switch (filter) {
    case "overdue":
      return dateIso < todayIso;
    case "today":
      return dateIso === todayIso;
    case "upcoming":
      return dateIso > todayIso;
    default:
      return true;
  }
}

// Count how many todos fall in each filter bucket (for the chip labels).
export function filterCounts(
  todos: Todo[],
  todayIso: string
): Record<DateFilter, number> {
  const counts: Record<DateFilter, number> = {
    all: todos.length,
    overdue: 0,
    today: 0,
    upcoming: 0,
  };
  for (const t of todos) {
    if (t.date < todayIso) counts.overdue += 1;
    else if (t.date === todayIso) counts.today += 1;
    else counts.upcoming += 1;
  }
  return counts;
}

// Build SectionList sections from todos, honoring the active filter.
// Past-due todos are merged into a single "Overdue" section; today and each
// future date get their own section, ordered chronologically.
export function groupTodos(
  todos: Todo[],
  filter: DateFilter,
  todayIso: string
): TodoSection[] {
  const overdue: Todo[] = [];
  const byDate = new Map<string, Todo[]>();

  for (const t of todos) {
    if (!matchesFilter(t.date, filter, todayIso)) continue;
    if (t.date < todayIso) {
      overdue.push(t);
    } else {
      const arr = byDate.get(t.date);
      if (arr) arr.push(t);
      else byDate.set(t.date, [t]);
    }
  }

  const sections: TodoSection[] = [];

  if (overdue.length > 0) {
    overdue.sort((a, b) => a.date.localeCompare(b.date));
    sections.push({
      key: "overdue",
      title: "Overdue",
      overdue: true,
      data: overdue,
    });
  }

  for (const date of [...byDate.keys()].sort((a, b) => a.localeCompare(b))) {
    sections.push({
      key: date,
      title: formatDateLabel(date),
      overdue: false,
      data: byDate.get(date)!,
    });
  }

  return sections;
}
