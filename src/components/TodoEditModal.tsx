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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { formatDateLabel, fromISODate, toISODate, todayISO } from "../dateUtils";
import { useTheme } from "../ThemeContext";
import type { ThemeColors } from "../theme";
import type { Todo } from "../types";

export interface TodoDraft {
  text: string;
  date: string;
}

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

  // Reset fields whenever the modal opens for a (possibly different) todo.
  useEffect(() => {
    if (visible) {
      setText(todo?.text ?? "");
      setDate(todo?.date ?? todayISO());
      setShowPicker(false);
    }
  }, [visible, todo]);

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
    onSave({ text: trimmed, date });
  };

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
            showsVerticalScrollIndicator={false}
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
