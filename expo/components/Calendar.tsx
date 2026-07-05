import { ChevronLeft, ChevronRight } from "lucide-react-native";
import React, { memo, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { C } from "@/constants/colors";

interface Props {
  value: number;
  onChange: (ts: number) => void;
  minDate?: number;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export const Calendar = memo(function Calendar({ value, onChange, minDate }: Props) {
  const selected = useMemo(() => new Date(value), [value]);
  const [view, setView] = useState<Date>(() => startOfMonth(new Date(value)));

  const days = useMemo(() => {
    const first = startOfMonth(view);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(view.getFullYear(), view.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [view]);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const today = new Date();
  const min = minDate ?? 0;

  const monthLabel = view.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <Pressable
          onPress={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
          style={s.navBtn}
          hitSlop={8}
        >
          <ChevronLeft color={C.text} size={18} />
        </Pressable>
        <Text style={s.monthText}>{monthLabel}</Text>
        <Pressable
          onPress={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
          style={s.navBtn}
          hitSlop={8}
        >
          <ChevronRight color={C.text} size={18} />
        </Pressable>
      </View>

      <View style={s.weekRow}>
        {DAY_LABELS.map((d, i) => (
          <Text key={i} style={s.weekLabel}>
            {d}
          </Text>
        ))}
      </View>

      <View style={s.grid}>
        {days.map((d, i) => {
          if (!d) return <View key={i} style={s.cell} />;
          const isSel = isSameDay(d, selected);
          const isToday = isSameDay(d, today);
          const disabled = d.getTime() < new Date(min).setHours(0, 0, 0, 0);
          return (
            <Pressable
              key={i}
              disabled={disabled}
              onPress={() => {
                const merged = new Date(d);
                merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
                onChange(merged.getTime());
              }}
              style={s.cell}
            >
              <View style={[s.dayPill, isSel ? s.dayPillActive : null]}>
                <Text
                  style={[
                    s.dayText,
                    disabled ? s.dayDisabled : null,
                    isToday && !isSel ? s.dayToday : null,
                    isSel ? s.daySelected : null,
                  ]}
                >
                  {d.getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  wrap: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.hair,
    padding: 14,
    gap: 10,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.cardHi,
  },
  monthText: { color: C.text, fontSize: 15, fontWeight: "700" as const, letterSpacing: 0.2 },
  weekRow: { flexDirection: "row" },
  weekLabel: {
    flex: 1,
    textAlign: "center",
    color: C.mute,
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 1,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  dayPill: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  dayPillActive: { backgroundColor: C.pink },
  dayText: { color: C.text, fontSize: 14, fontWeight: "600" as const },
  dayToday: { color: C.pinkHi, fontWeight: "800" as const },
  daySelected: { color: C.text, fontWeight: "800" as const },
  dayDisabled: { color: C.mute, opacity: 0.4 },
});
