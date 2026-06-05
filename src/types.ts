// Shared domain types.

// A todo item as stored and rendered. `date` is an ISO "YYYY-MM-DD" string.
export interface Todo {
  id: string;
  text: string;
  date: string;
  done: boolean;
}

// A parsed-but-not-yet-persisted todo (no id / done state yet).
export interface ParsedTodo {
  text: string;
  date: string;
}
