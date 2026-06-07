// Shared domain types.

// A checklist item nested inside a todo (e.g. "milk" under "Shopping").
export interface SubTask {
  id: string;
  text: string;
  done: boolean;
}

// A todo item as stored and rendered. `date` is an ISO "YYYY-MM-DD" string.
// `subtasks` is optional for backward compatibility with older saved data.
export interface Todo {
  id: string;
  text: string;
  date: string;
  done: boolean;
  subtasks?: SubTask[];
}

// A parsed-but-not-yet-persisted todo (no id / done state yet).
export interface ParsedTodo {
  text: string;
  date: string;
}
