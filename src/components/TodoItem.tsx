// A single todo row: checkbox, task text, date chip, and edit / delete actions.
// Todos can contain a checklist of sub-tasks shown in an expandable section.

import { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { formatDateLabel } from "../dateUtils";
import { useTheme } from "../ThemeContext";
import type { ThemeColors } from "../theme";
import type { Todo } from "../types";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onToggleSubtask: (todoId: string, subId: string) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
}

export default function TodoItem({
  todo,
  onToggle,
  onToggleSubtask,
  onEdit,
  onDelete,
}: TodoItemProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);

  const subtasks = todo.subtasks ?? [];
  const hasSub = subtasks.length > 0;
  const doneCount = subtasks.filter((s) => s.done).length;
  // Parent is "partially" done when some — but not all — children are checked.
  const partial = hasSub && !todo.done && doneCount > 0;

  return (
    <View style={styles.card}>
      <View style={styles.mainRow}>
        <TouchableOpacity
          style={[
            styles.checkbox,
            todo.done && styles.checkboxChecked,
            partial && styles.checkboxPartial,
          ]}
          onPress={() => onToggle(todo.id)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: todo.done }}
          hitSlop={8}
        >
          {todo.done ? (
            <Text style={styles.checkmark}>✓</Text>
          ) : partial ? (
            <View style={styles.dash} />
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.body}
          onPress={() => onEdit(todo)}
          activeOpacity={0.6}
        >
          <Text
            style={[styles.text, todo.done && styles.textDone]}
            numberOfLines={3}
          >
            {todo.text}
          </Text>
          <View style={styles.chipRow}>
            <View style={styles.dateChip}>
              <Text style={styles.dateText}>{formatDateLabel(todo.date)}</Text>
            </View>
            {hasSub && (
              <View style={styles.progressChip}>
                <Text style={styles.progressText}>
                  ✓ {doneCount}/{subtasks.length}
                </Text>
              </View>
            )}
            {todo.reminderTime && (
              <View style={styles.reminderChip}>
                <Text style={styles.reminderText}>🔔 {todo.reminderTime}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {hasSub && (
          <TouchableOpacity
            style={styles.expandBtn}
            onPress={() => setExpanded((e) => !e)}
            hitSlop={8}
            accessibilityLabel={expanded ? "Collapse items" : "Expand items"}
          >
            <Text style={styles.expandIcon}>{expanded ? "▾" : "▸"}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDelete(todo.id)}
          hitSlop={8}
          accessibilityLabel="Delete todo"
        >
          <Text style={styles.deleteText}>✕</Text>
        </TouchableOpacity>
      </View>

      {hasSub && expanded && (
        <View style={styles.subList}>
          {subtasks.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.subRow}
              onPress={() => onToggleSubtask(todo.id, s.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: s.done }}
            >
              <View
                style={[styles.subCheckbox, s.done && styles.checkboxChecked]}
              >
                {s.done && <Text style={styles.subCheckmark}>✓</Text>}
              </View>
              <Text style={[styles.subText, s.done && styles.textDone]}>
                {s.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 14,
      marginBottom: 10,
    },
    mainRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    checkbox: {
      width: 26,
      height: 26,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    checkboxChecked: {
      backgroundColor: colors.accent,
    },
    checkboxPartial: {
      backgroundColor: colors.accentSurface,
    },
    dash: {
      width: 12,
      height: 2.5,
      borderRadius: 2,
      backgroundColor: colors.accent,
    },
    checkmark: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "700",
      lineHeight: 18,
    },
    body: {
      flex: 1,
    },
    text: {
      fontSize: 16,
      color: colors.textPrimary,
    },
    textDone: {
      textDecorationLine: "line-through",
      color: colors.textMuted,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      marginTop: 6,
      gap: 6,
    },
    dateChip: {
      backgroundColor: colors.accentSurface,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    dateText: {
      fontSize: 12,
      color: colors.accentSoft,
      fontWeight: "600",
    },
    progressChip: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    progressText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: "600",
    },
    reminderChip: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    reminderText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: "600",
    },
    expandBtn: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    expandIcon: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "700",
    },
    deleteBtn: {
      paddingLeft: 8,
    },
    deleteText: {
      fontSize: 16,
      color: colors.textMuted,
      fontWeight: "700",
    },
    subList: {
      marginTop: 10,
      marginLeft: 38,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
    },
    subRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 6,
    },
    subCheckbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    subCheckmark: {
      color: colors.white,
      fontSize: 12,
      fontWeight: "700",
      lineHeight: 14,
    },
    subText: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
    },
  });
