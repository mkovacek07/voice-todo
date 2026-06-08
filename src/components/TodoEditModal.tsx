// Modal used both for editing an existing todo and adding a new one manually.
// Lets the user change the task text and pick a date.

import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { formatDateLabel, fromISODate, toISODate, todayISO } from "../dateUtils";
import { newId } from "../id";
import { useTheme } from "../ThemeContext";
import type { ThemeColors } from "../theme";
import type { SubTask, Todo } from "../types";

export interface TodoDraft {
  text: string;
  date: string;
  subtasks: SubTask[];
  tags: string[];
  reminderTime: string | null; // "HH:MM" or null for no reminder
}

const DEFAULT_REMINDER_TIME = "09:00";

interface TodoEditModalProps {
  visible: boolean;
  todo: Todo | null;
  onSave: (draft: TodoDraft) => void;
  onCancel: () => void;
}

export default function TodoEditModal({
  visible,
  todo,
  onSave,
  onCancel,
}: TodoEditModalProps) {
  const { colors, mode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [text, setText] = useState("");
  const [date, setDate] = useState(todayISO());
  const [showPicker, setShowPicker] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [reminderOn, setReminderOn] = useState(false);
  const [reminderTime, setReminderTime] = useState(DEFAULT_REMINDER_TIME);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  // Reset fields whenever the modal opens for a (possibly different) todo.
  useEffect(() => {
    if (visible) {
      setText(todo?.text ?? "");
      setDate(todo?.date ?? todayISO());
      setShowPicker(false);
      setSubtasks(todo?.subtasks ? todo.subtasks.map((s) => ({ ...s })) : []);
      setReminderOn(Boolean(todo?.reminderTime));
      setReminderTime(todo?.reminderTime ?? DEFAULT_REMINDER_TIME);
      setShowTimePicker(false);
      setTags(todo?.tags ? [...todo.tags] : []);
      setNewTag("");
    }
  }, [visible, todo]);

  const addTag = () => {
    const t = newTag.trim();
    if (!t) return;
    // Case-insensitive de-dupe.
    if (!tags.some((x) => x.toLowerCase() === t.toLowerCase())) {
      setTags((prev) => [...prev, t]);
    }
    setNewTag("");
  };

  const removeTag = (tag: string) =>
    setTags((prev) => prev.filter((t) => t !== tag));

  // Track keyboard visibility so an outside tap can dismiss it first.
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true)
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const isEditing = Boolean(todo);

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    Keyboard.dismiss();
    const cleanedSubtasks = subtasks
      .map((s) => ({ ...s, text: s.text.trim() }))
      .filter((s) => s.text.length > 0);
    onSave({
      text: trimmed,
      date,
      subtasks: cleanedSubtasks,
      tags,
      reminderTime: reminderOn ? reminderTime : null,
    });
  };

  const onTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (event.type === "dismissed" || !selected) return;
    const hh = String(selected.getHours()).padStart(2, "0");
    const mm = String(selected.getMinutes()).padStart(2, "0");
    setReminderTime(`${hh}:${mm}`);
  };

  // A Date carrying the chosen reminder time (date part is irrelevant here).
  const reminderTimeAsDate = () => {
    const [hh, mm] = reminderTime.split(":").map(Number);
    const d = new Date();
    d.setHours(hh || 0, mm || 0, 0, 0);
    return d;
  };

  const addSubtask = () =>
    setSubtasks((prev) => [...prev, { id: newId(), text: "", done: false }]);

  const updateSubtask = (id: string, value: string) =>
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, text: value } : s))
    );

  const removeSubtask = (id: string) =>
    setSubtasks((prev) => prev.filter((s) => s.id !== id));

  // Opening the date picker should release focus from the text field so the
  // keyboard gets out of the way.
  const togglePicker = () => {
    Keyboard.dismiss();
    setShowPicker((s) => !s);
  };

  // Tap outside the card: dismiss the keyboard if it's up, otherwise cancel.
  const handleBackdropPress = () => {
    if (keyboardVisible) Keyboard.dismiss();
    else onCancel();
  };

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    // On Android the picker is a dialog and closes itself on selection.
    if (Platform.OS === "android") setShowPicker(false);
    if (event.type === "dismissed" || !selected) return;
    setDate(toISODate(selected));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Tap outside the card to dismiss the keyboard / close. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />

        <View style={styles.card}>
          <ScrollView
            style={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            persistentScrollbar
            indicatorStyle={mode === "dark" ? "white" : "black"}
          >
            <Text style={styles.title}>
              {isEditing ? "Edit todo" : "New todo"}
            </Text>

            <Text style={styles.label}>Task</Text>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="What needs doing?"
              placeholderTextColor={colors.textMuted}
              multiline
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />

            <Text style={styles.label}>Date</Text>
            <TouchableOpacity style={styles.dateButton} onPress={togglePicker}>
              <Text style={styles.dateButtonText}>{formatDateLabel(date)}</Text>
            </TouchableOpacity>

            {showPicker && (
              <DateTimePicker
                value={fromISODate(date)}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                themeVariant={mode}
                accentColor={colors.accent}
                onChange={onPickerChange}
              />
            )}

            <Text style={styles.label}>Tags</Text>
            {tags.length > 0 && (
              <View style={styles.tagsWrap}>
                {tags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.tagChip}
                    onPress={() => removeTag(tag)}
                    accessibilityLabel={`Remove tag ${tag}`}
                  >
                    <Text style={styles.tagChipText}>{tag}</Text>
                    <Text style={styles.tagChipRemove}>✕</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.tagInputRow}>
              <TextInput
                style={[styles.input, styles.tagInput]}
                value={newTag}
                onChangeText={setNewTag}
                placeholder="Add a tag (e.g. workout)"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={addTag}
                blurOnSubmit={false}
              />
              <TouchableOpacity style={styles.tagAddBtn} onPress={addTag}>
                <Text style={styles.tagAddText}>Add</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.reminderHeader}>
              <Text style={[styles.label, styles.reminderLabel]}>
                Remind me on this day
              </Text>
              <Switch
                style={styles.reminderSwitch}
                value={reminderOn}
                onValueChange={(v) => {
                  Keyboard.dismiss();
                  setReminderOn(v);
                }}
                trackColor={{ true: colors.accent, false: colors.border }}
                thumbColor={colors.white}
              />
            </View>
            {reminderOn && (
              <>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowTimePicker((s) => !s);
                  }}
                >
                  <Text style={styles.dateButtonText}>At {reminderTime}</Text>
                </TouchableOpacity>
                {showTimePicker && (
                  <DateTimePicker
                    value={reminderTimeAsDate()}
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    themeVariant={mode}
                    accentColor={colors.accent}
                    onChange={onTimeChange}
                  />
                )}
              </>
            )}

            <Text style={styles.label}>Checklist items</Text>
            {subtasks.map((s, i) => (
              <View key={s.id} style={styles.subRow}>
                <TextInput
                  style={[styles.input, styles.subInput]}
                  value={s.text}
                  onChangeText={(v) => updateSubtask(s.id, v)}
                  placeholder={`Item ${i + 1}`}
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={styles.subRemove}
                  onPress={() => removeSubtask(s.id)}
                  hitSlop={8}
                  accessibilityLabel="Remove item"
                >
                  <Text style={styles.subRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addItemBtn} onPress={addSubtask}>
              <Text style={styles.addItemText}>＋ Add item</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.saveBtn]}
              onPress={handleSave}
            >
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "88%",
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 22,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accentSoft,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceAlt,
    minHeight: 48,
    textAlignVertical: "top",
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accentSurface,
    borderRadius: 14,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  tagChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accentSoft,
  },
  tagChipRemove: {
    fontSize: 12,
    color: colors.accentSoft,
    fontWeight: "700",
    marginLeft: 6,
  },
  tagInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tagInput: {
    flex: 1,
    minHeight: 44,
  },
  tagAddBtn: {
    marginLeft: 8,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
  },
  tagAddText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.accent,
  },
  reminderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 4,
  },
  reminderLabel: {
    marginTop: 0,
    marginBottom: 0,
  },
  reminderSwitch: {
    transform: [{ scale: 0.85 }],
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  subInput: {
    flex: 1,
    minHeight: 44,
  },
  subRemove: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginLeft: 6,
  },
  subRemoveText: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: "700",
  },
  addItemBtn: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  addItemText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.accent,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.surfaceAlt,
  },
  dateButtonText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 22,
  },
  btn: {
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginLeft: 10,
  },
  cancelBtn: {
    backgroundColor: colors.surfaceAlt,
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: colors.accent,
  },
  saveText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
});
