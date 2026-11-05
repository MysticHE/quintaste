import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Platform, Pressable, View } from "react-native";
import { Icon, T, common } from "../ui";
import { IconButton } from "../food/Controls";
import { ItemArt } from "./Glint";
import { badgeArt } from "../../config/collection";
import { useT } from "../../i18n";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import type messages from "../../i18n/en/collection";

/** One editable preview row. Drag, or select a badge and use the accessible move controls. */
export function BadgeOrder({ ids, onChange, disabled }: { ids: string[]; onChange: (ids: string[]) => void; disabled: boolean }) {
  const t = useT("collection"), [selected, setSelected] = useState(ids[0]), [width, setWidth] = useState(0);
  const active = ids.includes(selected) ? selected : ids[0], index = ids.indexOf(active), step = width / Math.max(1, ids.length);
  const move = (id: string, delta: number) => {
    if (disabled) return;
    const from = ids.indexOf(id), to = Math.max(0, Math.min(ids.length - 1, from + delta));
    if (from < 0 || from === to) return;
    const next = [...ids]; next.splice(from, 1); next.splice(to, 0, id); onChange(next);
  };
  const name = active ? t(("badge_" + active) as keyof typeof messages) as string : "";
  return <View style={{ gap: 4 }}>
    <View testID="badge-order-strip" onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ flexDirection: "row" }}>
      {ids.map((id, i) => <OrderItem key={id} id={id} index={i} total={ids.length} selected={active === id} disabled={disabled}
        step={step} select={() => setSelected(id)} move={delta => move(id, delta)} />)}
    </View>
    <View style={[common.row, { gap: 4 }]}>
      <T variant="caption" muted style={{ flex: 1 }}>{t("arrangeInlineHint")}</T>
      <IconButton label={t("moveEarlier", { name })} icon="chevron-back" disabled={disabled || index <= 0} onPress={() => move(active, -1)} />
      <IconButton label={t("moveLater", { name })} icon="chevron-forward" disabled={disabled || index < 0 || index === ids.length - 1} onPress={() => move(active, 1)} />
    </View>
    {active && <T variant="caption" muted accessibilityLiveRegion="polite">{t("badgePosition", { name, n: index + 1, total: ids.length })}</T>}
  </View>;
}

function OrderItem({ id, index, total, selected, disabled, step, select, move }: {
  id: string; index: number; total: number; selected: boolean; disabled: boolean; step: number; select: () => void; move: (delta: number) => void;
}) {
  const t = useT("collection"), { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  const [dx, setDx] = useState(0), current = useRef({ disabled, step, select, move });
  useLayoutEffect(() => { current.current = { disabled, step, select, move }; }, [disabled, step, select, move]);
  // PanResponder stores these event callbacks; it never invokes them during render.
  // eslint-disable-next-line react-hooks/refs
  const drag = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, g) => !current.current.disabled && Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderGrant: () => current.current.select(),
    onPanResponderMove: (_, g) => setDx(g.dx),
    onPanResponderRelease: (_, g) => { setDx(0); if (current.current.step) current.current.move(Math.round(g.dx / current.current.step)); },
    onPanResponderTerminate: () => setDx(0),
  }), []);
  const name = t(("badge_" + id) as keyof typeof messages) as string;
  return <View {...drag.panHandlers} style={{ flex: 1, zIndex: dx ? 1 : 0 }}>
    <Pressable {...focusProps} disabled={disabled} accessibilityRole="button" accessibilityLabel={t("badgePosition", { name, n: index + 1, total })}
      accessibilityState={{ selected, disabled }} accessibilityHint={t("arrangeInlineHint")} onPress={select}
      accessibilityActions={[{ name: "increment", label: t("moveLater", { name }) }, { name: "decrement", label: t("moveEarlier", { name }) }]}
      onAccessibilityAction={e => move(e.nativeEvent.actionName === "increment" ? 1 : -1)}
      style={({ pressed }) => [{ minHeight: 68, minWidth: 48, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 2,
        borderColor: selected || focused ? theme.accent : theme.transparent, backgroundColor: pressed || selected ? theme.accentSoft : theme.transparent,
        transform: [{ translateX: dx }] }, Platform.OS === "web" && { touchAction: "pan-y" }]}>
      <View pointerEvents="none" style={{ alignItems: "center" }}><ItemArt art={badgeArt(id)} size={40} fx /><Icon name="reorder-two-outline" size={14} color={theme.mutedForeground} /></View>
    </Pressable>
  </View>;
}
