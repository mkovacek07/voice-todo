// Header dropdown for filtering the todo list by date. The trigger is a small
// funnel icon (with an accent dot when a filter other than "All" is active);
// the menu lists the filters with their counts and checks the active one.

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
import { type DateFilter, FILTERS } from "../grouping";
import { useTheme } from "../ThemeContext";
import type { ThemeColors } from "../theme";

interface FilterPickerProps {
  value: DateFilter;
  counts: Record<DateFilter, number>;
  onSelect: (filter: DateFilter) => void;
}

export default function FilterPicker({
  value,
  counts,
  onSelect,
}: FilterPickerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const triggerRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number }>({
    top: 0,
    right: 16,
  });

  const isFiltering = value !== "all";

  const openMenu = () => {
    const node = triggerRef.current;
    if (!node) {
      setOpen(true);
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      const screenW = Dimensions.get("window").width;
      setPos({
        top: y + height + 6,
        right: Math.max(8, screenW - (x + width)),
      });
      setOpen(true);
    });
  };

  const choose = (filter: DateFilter) => {
    onSelect(filter);
    setOpen(false);
  };

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <TouchableOpacity
          style={styles.trigger}
          onPress={openMenu}
          accessibilityRole="button"
          accessibilityLabel="Filter todos by date"
        >
          <View style={styles.icon}>
            <View style={[styles.bar, { width: 16 }]} />
            <View style={[styles.bar, { width: 10 }]} />
            <View style={[styles.bar, { width: 5 }]} />
          </View>
          {isFiltering && <View style={styles.badge} />}
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
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.menuHeader}>Filter by date</Text>
            {FILTERS.map((f) => {
              const selected = value === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={styles.item}
                  onPress={() => choose(f.key)}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[
                      styles.itemLabel,
                      selected && styles.itemLabelSelected,
                    ]}
                  >
                    {f.label}
                  </Text>
                  <Text style={styles.count}>{counts[f.key]}</Text>
                  {selected ? (
                    <Text style={styles.check}>✓</Text>
                  ) : (
                    <View style={styles.checkSpacer} />
                  )}
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
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    icon: {
      alignItems: "center",
      justifyContent: "center",
    },
    bar: {
      height: 2.5,
      borderRadius: 2,
      marginVertical: 1.5,
      backgroundColor: colors.textPrimary,
    },
    badge: {
      position: "absolute",
      top: 9,
      right: 10,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: colors.accent,
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
    backdrop: {
      flex: 1,
    },
    menu: {
      position: "absolute",
      minWidth: 200,
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
    menuHeader: {
      fontSize: 11,
      fontWeight: "800",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      paddingHorizontal: 14,
      paddingTop: 6,
      paddingBottom: 4,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 11,
      paddingHorizontal: 14,
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
    count: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    check: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.accent,
      marginLeft: 10,
      width: 15,
      textAlign: "center",
    },
    checkSpacer: {
      width: 15,
      marginLeft: 10,
    },
  });
