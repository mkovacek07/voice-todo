// A small bottom snackbar offering to undo the most recent deletion.
// Visibility and the auto-dismiss timer are owned by the parent.

import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../ThemeContext";
import type { ThemeColors } from "../theme";

interface UndoSnackbarProps {
  visible: boolean;
  message: string;
  onUndo: () => void;
  bottom?: number; // distance from the bottom (accounts for safe area)
  edge?: number; // horizontal gutter (keeps it aligned with content)
}

export default function UndoSnackbar({
  visible,
  message,
  onUndo,
  bottom = 150,
  edge = 16,
}: UndoSnackbarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!visible) return null;

  return (
    <View
      style={[styles.container, { bottom, left: edge, right: edge }]}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        <Text style={styles.message} numberOfLines={1}>
          {message}
        </Text>
        <TouchableOpacity onPress={onUndo} hitSlop={8}>
          <Text style={styles.undo}>UNDO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      alignItems: "center",
    },
    bar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      backgroundColor: colors.snackbar,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 18,
      shadowColor: "#000",
      shadowOpacity: 0.4,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 5,
    },
    message: {
      flex: 1,
      color: colors.snackbarText,
      fontSize: 15,
      marginRight: 12,
    },
    undo: {
      color: colors.snackbarAction,
      fontSize: 15,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
  });
