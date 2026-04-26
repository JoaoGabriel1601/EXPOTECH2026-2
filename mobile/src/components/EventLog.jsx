import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useEventLog, EVENT_LABELS } from "../hooks/useEventLog";
import { useTheme } from "../contexts/ThemeContext";
import { spacing, typography } from "../utils/theme";

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EventLogComponent() {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { events, loading } = useEventLog(20);

  if (loading) {
    return <Text style={styles.empty}>Carregando eventos...</Text>;
  }
  if (!events.length) {
    return <Text style={styles.empty}>Nenhum evento registrado.</Text>;
  }

  return (
    <View>
      {events.map((event) => (
        <View key={event.id} style={styles.row}>
          <Text style={styles.time}>{formatTime(event.timestamp)}</Text>
          <Text style={styles.type} numberOfLines={2}>
            {EVENT_LABELS[event.type] ?? event.type}
            {event.payload?.temp ? ` — ${event.payload.temp}°C` : ""}
            {event.payload?.pessoas
              ? ` — ${event.payload.pessoas} pessoas`
              : ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: spacing.md,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    time: {
      ...typography.caption,
      color: theme.textMuted,
      width: 50,
      fontVariant: ["tabular-nums"],
    },
    type: { ...typography.body, color: theme.text, flex: 1 },
    empty: {
      ...typography.body,
      color: theme.textMuted,
      textAlign: "center",
      paddingVertical: spacing.lg,
    },
  });

export const EventLog = memo(EventLogComponent);
