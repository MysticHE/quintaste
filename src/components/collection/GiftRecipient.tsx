import { useState } from "react";
import { Sheet } from "../Sheet";
import { Field, T } from "../ui";
import { ListItem } from "../GroupedList";
import { RemoteStatus } from "../CommunityGate";
import { GiftSheet } from "./Gifts";
import { useRemote } from "../../hooks/useRemote";
import { useDebounced } from "../../hooks/useDebounced";
import { findKey, findPeople, friends } from "../../services/social-api";
import type { GiftCatalog } from "../../services/gifts-api";
import { useT } from "../../i18n";

/** Choose a recipient before entering the existing gift purchase/send flow. */
export function GiftRecipient({ data, onClose }: { data: GiftCatalog; onClose: () => void }) {
  const t = useT("collection"), [query, setQuery] = useState(""), [to, setTo] = useState<{ id: string; name: string } | null>(null);
  const q = useDebounced(query.trim().replace(/^@/, "").toLowerCase());
  const remote = useRemote("/api/social/friends", friends);
  const found = useRemote(q.length >= 2 ? findKey(q) : null, signal => findPeople(q, signal));
  const rows = q.length >= 2 ? found.data?.items : remote.data?.friends;
  return <>
    <Sheet visible={!to} onClose={onClose} title={t("chooseGiftRecipient")}>
      <Field label={t("giftRecipientSearch")} placeholder={t("giftRecipientSearch")} showLabel={false} value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} maxLength={24} />
      <RemoteStatus remote={q.length >= 2 ? found : remote} icon="people-outline" returnTo="/social/collection" />
      {q.length === 1 && <T variant="small" muted>{t("giftSearchHint")}</T>}
      {rows?.map(p => <ListItem key={p.id} title={p.firstName} subtitle={p.handle ? "@" + p.handle : undefined} wrap onPress={() => setTo({ id: p.id, name: p.firstName })} />)}
      {rows?.length === 0 && <T variant="small" muted>{t(q.length >= 2 ? "giftNoMatches" : "giftNoFriends")}</T>}
    </Sheet>
    {to && <GiftSheet visible onClose={onClose} to={to.id} recipientName={to.name} data={data} />}
  </>;
}
