import { useState } from "react";
import { T } from "../ui";
import { ListGroup, ListItem, RowIcon } from "../GroupedList";
import { RemoteStatus } from "../CommunityGate";
import { EmptyState } from "../food/Controls";
import { useRemote } from "../../hooks/useRemote";
import { kakis } from "../../services/social-api";
import { useT } from "../../i18n";
import type { Kaki } from "../../types/community";
import { Face } from "./Face";
import { Sheet } from "./Sheet";

/** Bring a kaki: someone you have already eaten with. They get an invitation and say yes themselves. */
export function KakiRow({ value, onChange, startOpen = false }: { value: Kaki | null; onChange: (kaki: Kaki | null) => void; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen), t = useT("social");
  return <>
    <ListItem title={t("bringKaki")} subtitle={value?.firstName ?? t("none")} leading={value ? <Face id={value.id} name={value.firstName} hasFace={value.hasFace} size={40} /> : <RowIcon name="person-add-outline" />}
      label={t("bringKakiA11y", { name: value?.firstName ?? t("noneLower") })} onPress={() => setOpen(true)} />
    <KakiPicker visible={open} onClose={() => setOpen(false)} selected={value} onPick={kaki => { onChange(kaki); setOpen(false); }} />
  </>;
}
export function KakiPicker({ visible, onClose, onPick, selected }: { visible: boolean; onClose: () => void; onPick: (kaki: Kaki | null) => void; selected: Kaki | null }) {
  const remote = useRemote(visible ? "/api/social/kakis" : null, kakis), items = remote.data?.items ?? [], t = useT("social");
  return <Sheet visible={visible} onClose={onClose} title={t("bringKaki")}>
    <RemoteStatus remote={remote} icon="people-outline" returnTo="/social" />
    {remote.data && (items.length ? <ListGroup>
      <ListItem title={t("justMe")} leading={<RowIcon name="person-outline" tone="muted" />} trailing={!selected ? <T muted>✓</T> : undefined} onPress={() => onPick(null)} />
      {items.map(kaki => <ListItem key={kaki.id} title={kaki.firstName} leading={<Face id={kaki.id} name={kaki.firstName} hasFace={kaki.hasFace} size={40} />}
        trailing={selected?.id === kaki.id ? <T muted>✓</T> : undefined} onPress={() => onPick(kaki)} />)}
    </ListGroup> : <EmptyState title={t("noKakis")} text="" icon="people-outline" />)}
  </Sheet>;
}
