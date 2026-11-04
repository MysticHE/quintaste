import { Children, cloneElement, isValidElement, useState, type PropsWithChildren, type ReactElement } from "react";
import { StyleSheet, View } from "react-native";

const GAP = 8;

/**
 * How many buttons go on each line so every button on a line is the same width and no label is squeezed: all on one line when
 * the widest fits that many times over; otherwise the largest count that fits, preferring one that fills every line evenly
 * (four as 2 × 2). An odd one out goes first, on its own line (the primary action), then the rest in equal lines.
 */
export function buttonLines(count: number, row: number, widest: number, gap = GAP): number[] {
  const fits = (n: number) => n * widest + gap * (n - 1) <= row;
  if (count <= 1 || !row || !widest || fits(count)) return count ? [count] : [];
  const fitting = Array.from({ length: count - 2 }, (_, i) => count - 1 - i).filter(fits);
  const per = fitting.find(n => count % n === 0) ?? fitting[0] ?? 1;
  if (per === 1) return Array<number>(count).fill(1);
  const lines = count % per === 1 ? [1] : [];
  for (let left = count - lines.length; left > 0; left -= per) lines.push(Math.min(per, left));
  return lines;
}

/**
 * Buttons side by side, all the same width on a line, never squeezed onto two text lines. An invisible copy of the buttons at
 * their natural width (disabled, so it takes no focus, without test ids, and hidden from screen readers) tells the row how
 * wide the widest is. The copy is a second instance of each button, so a button keeps no state the row depends on.
 */
export function ButtonRow({ children }: PropsWithChildren) {
  const items = Children.toArray(children).filter(isValidElement) as ReactElement<{ disabled?: boolean; testID?: string }>[];
  const [row, setRow] = useState(0), [widths, setWidths] = useState<number[]>([]);
  // Rounding can leave a cell a fraction of a pixel under its natural width, which cuts the label off: allow 2 points.
  const measured = Math.max(0, ...widths.slice(0, items.length)), widest = measured ? Math.ceil(measured) + 2 : 0;
  const lines = buttonLines(items.length, row, widest);
  const measure = (i: number, width: number) => setWidths(previous => {
    if (Math.abs((previous[i] ?? 0) - width) < 0.5) return previous;
    const next = [...previous]; next[i] = width; return next;
  });
  const starts = lines.map((_, line) => lines.slice(0, line).reduce((sum, n) => sum + n, 0));
  // Until both widths are known the buttons stay invisible (one frame), so the row never jumps from one layout to another.
  return <View onLayout={event => setRow(event.nativeEvent.layout.width)} style={[s.rows, { opacity: row && widest ? 1 : 0 }]}>
    <View pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.measure}>
      {items.map((child, i) => <View key={"measure-" + (child.key ?? i)} onLayout={event => measure(i, event.nativeEvent.layout.width)}>
        {cloneElement(child, { disabled: true, testID: undefined })}</View>)}
    </View>
    {lines.map((count, line) => {
      const part = items.slice(starts[line], starts[line] + count);
      return <View key={line} style={s.line}>{part.map((child, i) => <View key={child.key ?? i} style={s.cell}>{child}</View>)}</View>;
    })}
  </View>;
}
const s = StyleSheet.create({
  rows: { gap: GAP, overflow: "hidden" },
  line: { flexDirection: "row", gap: GAP },
  cell: { flex: 1, minWidth: 0 },
  measure: { position: "absolute", top: 0, left: 0, flexDirection: "row", opacity: 0 },
});
