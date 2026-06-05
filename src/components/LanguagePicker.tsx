// A compact language dropdown. The trigger chip shows the active language's
// flag + code; tapping it opens a menu (anchored just below the chip) listing
// all languages with the current one checked.

import { useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { SpeechLanguage } from "../config";
import { useTheme } from "../ThemeContext";
import type { ThemeColors } from "../theme";

interface LanguagePickerProps {
  languages: SpeechLanguage[];
  value: string;
  onSelect: (code: string) => void;
}

export default function LanguagePicker({
  languages,
  value,
  onSelect,
}: LanguagePickerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const triggerRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number }>({
    top: 0,
    right: 16,
  });

  const active = languages.find((l) => l.code === value) ?? languages[0];

  const openMenu = () => {
    const node = triggerRef.current;
    if (!node) {
      setOpen(true);
      return;
    }
    // Anchor the menu just below the trigger, right-aligned with it.
    node.measureInWindow((x, y, width, height) => {
      const screenW = Dimensions.get("window").width;
      setPos({
        top: y + height + 6,
        right: Math.max(8, screenW - (x + width)),
      });
      setOpen(true);
    });
  };

  const choose = (code: string) => {
    onSelect(code);
    setOpen(false);
  };

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <TouchableOpacity
          style={styles.trigger}
          onPress={openMenu}
          accessibilityRole="button"
          accessibilityLabel={`Speech language: ${active.label}. Tap to change.`}
        >
          <Text style={styles.flag}>{active.flag}</Text>
          <Text style={styles.code}>
            {active.code.split("-")[0].toUpperCase()}
          </Text>
          <Text style={styles.caret}>▾</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View
            style={[styles.menu, { top: pos.top, right: pos.right }]}
            // Prevent taps inside the menu from closing via the backdrop.
            onStartShouldSetResponder={() => true}
          >
            {languages.map((l) => {
              const selected = l.code === value;
              return (
                <TouchableOpacity
                  key={l.code}
                  style={styles.item}
                  onPress={() => choose(l.code)}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected }}
                >
                  <Text style={styles.itemFlag}>{l.flag}</Text>
                  <Text
                    style={[
                      styles.itemLabel,
                      selected && styles.itemLabelSelected,
                    ]}
                  >
                    {l.label}
                  </Text>
                  {selected && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    trigger: {
      flexDirection: "row",
      alignItems: "center",
      height: 46,
      paddingHorizontal: 12,
      borderRadius: 23,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    flag: {
      fontSize: 18,
      marginRight: 5,
    },
    code: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    caret: {
      fontSize: 11,
      color: colors.textSecondary,
      marginLeft: 4,
    },
    backdrop: {
      flex: 1,
    },
    menu: {
      position: "absolute",
      minWidth: 184,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingVertical: 6,
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 11,
      paddingHorizontal: 14,
    },
    itemFlag: {
      fontSize: 18,
      marginRight: 10,
    },
    itemLabel: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
    },
    itemLabelSelected: {
      fontWeight: "700",
      color: colors.accent,
    },
    check: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.accent,
      marginLeft: 10,
    },
  });
