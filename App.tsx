import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  SectionList,
  type SectionListRenderItem,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import FilterPicker from "./src/components/FilterPicker";
import LanguagePicker from "./src/components/LanguagePicker";
import TodoEditModal, {
  type TodoDraft,
} from "./src/components/TodoEditModal";
import TodoItem from "./src/components/TodoItem";
import UndoSnackbar from "./src/components/UndoSnackbar";
import {
  DEFAULT_SPEECH_LANG,
  SPEECH_LANGUAGES,
} from "./src/config";
import { todayISO } from "./src/dateUtils";
import {
  type DateFilter,
  FILTERS,
  filterCounts,
  groupTodos,
  type TodoSection,
} from "./src/grouping";
import { parseTranscript } from "./src/parser";
import { loadLang, loadTodos, saveLang, saveTodos } from "./src/storage";
import { ThemeProvider, useTheme } from "./src/ThemeContext";
import type { ThemeColors } from "./src/theme";
import type { ParsedTodo, Todo } from "./src/types";
import { useVoice } from "./src/useVoice";

const newId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// How long the "Undo" snackbar stays before the deletion becomes permanent.
const UNDO_TIMEOUT_MS = 4500;

// Deleted todos held temporarily so they can be restored to their original
// spots. Holds one entry for a single delete, or many for "delete all".
interface DeletedEntry {
  todo: Todo;
  index: number;
}
interface PendingDelete {
  entries: DeletedEntry[];
}

// Content is capped to this width and centered on large screens (tablets,
// landscape) so rows don't stretch uncomfortably wide.
const CONTENT_MAX_WIDTH = 640;

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { colors, mode, toggle } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Horizontal gutter that keeps overlays aligned with the centered content.
  const edgePad = Math.max(16, (width - CONTENT_MAX_WIDTH) / 2);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [lang, setLang] = useState<string>(DEFAULT_SPEECH_LANG);
  const [filter, setFilter] = useState<DateFilter>("all");

  // Always-current view of todos, so deleteTodo can read positions without
  // becoming dependent on (and re-created by) every todos change.
  const todosRef = useRef<Todo[]>(todos);
  todosRef.current = todos;

  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted todos on mount.
  useEffect(() => {
    loadTodos().then((stored) => {
      setTodos(stored);
      setLoaded(true);
    });
  }, []);

  // Load saved speech-recognition language on mount.
  useEffect(() => {
    loadLang().then((code) => {
      if (code) setLang(code);
    });
  }, []);

  // Pick a speech language and remember it.
  const selectLang = useCallback((code: string) => {
    setLang(code);
    saveLang(code);
  }, []);

  // Persist whenever todos change (after the initial load).
  useEffect(() => {
    if (loaded) saveTodos(todos);
  }, [todos, loaded]);

  const addParsedTodos = useCallback((parsed: ParsedTodo[]) => {
    if (!parsed.length) return;
    const items: Todo[] = parsed.map((p) => ({
      id: newId(),
      text: p.text,
      date: p.date,
      done: false,
    }));
    setTodos((prev) => [...items, ...prev]);
  }, []);

  const handleVoiceResult = useCallback(
    async (transcript: string) => {
      setProcessing(true);
      try {
        const parsed = await parseTranscript(transcript, lang.split("-")[0]);
        addParsedTodos(parsed);
      } finally {
        setProcessing(false);
      }
    },
    [addParsedTodos, lang]
  );

  const { isListening, transcript, error, start, stop } = useVoice({
    onResult: handleVoiceResult,
    lang,
  });

  const toggleTodo = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }, []);

  // Mark every todo done, or clear them all if they're already all done.
  const toggleAll = useCallback(() => {
    setTodos((prev) => {
      const everyDone = prev.length > 0 && prev.every((t) => t.done);
      return prev.map((t) => ({ ...t, done: !everyDone }));
    });
  }, []);

  const clearUndoTimer = useCallback(() => {
    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
  }, []);

  // Stash deleted entries and (re)start the undo window.
  const scheduleUndo = useCallback(
    (entries: DeletedEntry[]) => {
      if (entries.length === 0) return;
      setPendingDelete({ entries });
      clearUndoTimer();
      undoTimer.current = setTimeout(() => {
        setPendingDelete(null);
        undoTimer.current = null;
      }, UNDO_TIMEOUT_MS);
    },
    [clearUndoTimer]
  );

  const deleteTodo = useCallback(
    (id: string) => {
      const index = todosRef.current.findIndex((t) => t.id === id);
      if (index === -1) return;
      const todo = todosRef.current[index];
      setTodos((prev) => prev.filter((t) => t.id !== id));
      scheduleUndo([{ todo, index }]);
    },
    [scheduleUndo]
  );

  const deleteAll = useCallback(() => {
    const entries = todosRef.current.map((todo, index) => ({ todo, index }));
    if (entries.length === 0) return;
    setTodos([]);
    scheduleUndo(entries);
  }, [scheduleUndo]);

  const undoDelete = useCallback(() => {
    if (!pendingDelete) return;
    clearUndoTimer();
    setTodos((prev) => {
      const next = [...prev];
      // Restore in ascending index order so positions line up.
      [...pendingDelete.entries]
        .sort((a, b) => a.index - b.index)
        .forEach(({ todo, index }) => {
          next.splice(Math.min(index, next.length), 0, todo);
        });
      return next;
    });
    setPendingDelete(null);
  }, [pendingDelete, clearUndoTimer]);

  // Clean up the pending timer if the screen unmounts.
  useEffect(() => clearUndoTimer, [clearUndoTimer]);

  const openEdit = useCallback((todo: Todo) => {
    setEditingTodo(todo);
    setModalVisible(true);
  }, []);

  const openAdd = useCallback(() => {
    setEditingTodo(null);
    setModalVisible(true);
  }, []);

  const handleSaveModal = useCallback(
    ({ text, date }: TodoDraft) => {
      if (editingTodo) {
        setTodos((prev) =>
          prev.map((t) =>
            t.id === editingTodo.id ? { ...t, text, date } : t
          )
        );
      } else {
        setTodos((prev) => [
          { id: newId(), text, date, done: false },
          ...prev,
        ]);
      }
      setModalVisible(false);
      setEditingTodo(null);
    },
    [editingTodo]
  );

  const remaining = useMemo(
    () => todos.filter((t) => !t.done).length,
    [todos]
  );

  const allDone = todos.length > 0 && remaining === 0;

  const today = todayISO();
  const sections = useMemo(
    () => groupTodos(todos, filter, today),
    [todos, filter, today]
  );
  const counts = useMemo(() => filterCounts(todos, today), [todos, today]);

  const renderItem: SectionListRenderItem<Todo, TodoSection> = useCallback(
    ({ item }) => (
      <TodoItem
        todo={item}
        onToggle={toggleTodo}
        onEdit={openEdit}
        onDelete={deleteTodo}
      />
    ),
    [toggleTodo, openEdit, deleteTodo]
  );

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} />

      <View style={styles.content}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Voice Todo</Text>
          <Text style={styles.subtitle}>
            {remaining} {remaining === 1 ? "task" : "tasks"} left
          </Text>
        </View>
        <LanguagePicker
          languages={SPEECH_LANGUAGES}
          value={lang}
          onSelect={selectLang}
        />
        <View style={{ width: 10 }} />
        <TouchableOpacity
          style={styles.iconButton}
          onPress={toggle}
          accessibilityLabel="Toggle light/dark theme"
        >
          <Text style={styles.iconButtonText}>
            {mode === "dark" ? "☀️" : "🌙"}
          </Text>
        </TouchableOpacity>
        <FilterPicker value={filter} counts={counts} onSelect={setFilter} />
        <TouchableOpacity style={styles.addButton} onPress={openAdd}>
          <Text style={styles.addButtonText}>＋</Text>
        </TouchableOpacity>
      </View>

      {todos.length > 0 && (
        <View style={styles.actionsBar}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={toggleAll}
            hitSlop={6}
          >
            <Text style={styles.actionText}>
              {allDone ? "Uncheck all" : "Check all"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={deleteAll}
            hitSlop={6}
          >
            <Text style={[styles.actionText, styles.actionDanger]}>
              Delete all
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <Text
            style={[
              styles.sectionHeader,
              section.overdue && styles.sectionHeaderOverdue,
            ]}
          >
            {section.title}  ·  {section.data.length}
          </Text>
        )}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 150 }]}
        ListEmptyComponent={
          !loaded ? null : todos.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🎤</Text>
              <Text style={styles.emptyTitle}>No todos yet</Text>
              <Text style={styles.emptyText}>
                Tap the mic and say something like{"\n"}
                “Buy milk tomorrow and call mom on Friday”.
              </Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🗂️</Text>
              <Text style={styles.emptyTitle}>Nothing here</Text>
              <Text style={styles.emptyText}>
                No todos match the “{FILTERS.find((f) => f.key === filter)?.label}”
                filter.
              </Text>
            </View>
          )
        }
      />
      </View>

      {(isListening || processing || error) && (
        <View
          style={[
            styles.statusBar,
            { bottom: insets.bottom + 132, left: edgePad, right: edgePad },
          ]}
        >
          {processing ? (
            <View style={styles.statusRow}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.statusText}>Creating todos…</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <Text style={styles.statusText} numberOfLines={2}>
              {transcript ? `“${transcript}”` : "Listening…"}
            </Text>
          )}
        </View>
      )}

      <UndoSnackbar
        visible={pendingDelete !== null}
        message={
          pendingDelete && pendingDelete.entries.length > 1
            ? `${pendingDelete.entries.length} todos deleted`
            : "Todo deleted"
        }
        onUndo={undoDelete}
        bottom={insets.bottom + 132}
        edge={edgePad}
      />

      <View style={[styles.micWrap, { bottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={[styles.mic, isListening && styles.micActive]}
          onPress={isListening ? stop : start}
          disabled={processing}
          activeOpacity={0.8}
        >
          <Text style={styles.micIcon}>{isListening ? "■" : "🎤"}</Text>
        </TouchableOpacity>
        <Text style={styles.micHint}>
          {isListening ? "Tap to stop" : "Tap to speak"}
        </Text>
      </View>

      <TodoEditModal
        visible={modalVisible}
        todo={editingTodo}
        onSave={handleSaveModal}
        onCancel={() => {
          setModalVisible(false);
          setEditingTodo(null);
        }}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  iconButton: {
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
  iconButtonText: {
    fontSize: 20,
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    fontSize: 26,
    color: colors.accent,
    fontWeight: "700",
    lineHeight: 30,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    backgroundColor: colors.background,
    paddingTop: 14,
    paddingBottom: 6,
    paddingHorizontal: 4,
  },
  sectionHeaderOverdue: {
    color: colors.danger,
  },
  actionsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 6,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.accent,
  },
  actionDanger: {
    color: colors.danger,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 160,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 30,
  },
  emptyEmoji: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  statusBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 150,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontSize: 15,
    color: colors.textPrimary,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
  },
  micWrap: {
    position: "absolute",
    bottom: 36,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  mic: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  micActive: {
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
  },
  micIcon: {
    fontSize: 28,
    color: colors.white,
  },
  micHint: {
    marginTop: 8,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "600",
  },
});
