// A single todo row: checkbox, task text, date chip, and edit / delete actions.

import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { formatDateLabel } from "../dateUtils";
import { useTheme } from "../ThemeContext";
import type { ThemeColors } from "../theme";
import type { Todo } from "../types";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
}

export default function TodoItem({
  todo,
  onToggle,
  onEdit,
  onDelete,
}: TodoItemProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.checkbox, todo.done && styles.checkboxChecked]}
        onPress={() => onToggle(todo.id)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: todo.done }}
        hitSlop={8}
      >
        {todo.done && <Text style={styles.checkmark}>✓</Text>}
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
        <View style={styles.dateChip}>
          <Text style={styles.dateText}>{formatDateLabel(todo.date)}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => onDelete(todo.id)}
        hitSlop={8}
        accessibilityLabel="Delete todo"
      >
        <Text style={styles.deleteText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
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
  dateChip: {
    alignSelf: "flex-start",
    backgroundColor: colors.accentSurface,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 6,
  },
  dateText: {
    fontSize: 12,
    color: colors.accentSoft,
    fontWeight: "600",
  },
  deleteBtn: {
    paddingLeft: 12,
  },
  deleteText: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: "700",
  },
});
