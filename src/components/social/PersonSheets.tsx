import { useState } from "react";
import { Button, Field } from "../ui";
import { ListGroup, ListItem, RowIcon } from "../GroupedList";
import { ReportSheet } from "../ReportSheet";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import { invalidate } from "../../hooks/useRemote";
import { block, requestFriend } from "../../services/social-api";
import { useSocialError } from "./SocialState";
import { Confirm } from "./Shared";
import { Sheet } from "./Sheet";

/** Add Friend with an optional hello (200 characters). If they already asked you, this makes you friends straight away. */
export function RequestSheet({ person, visible, onClose, onSent }: { person: { id: string; firstName: string }; visible: boolean; onClose: () => void; onSent?: () => void }) {
  const t = useT("social"), { setNotice } = usePreferences(), problem = useSocialError();
  const [note, setNote] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const send = async () => {
    setBusy(true); setError("");
    try {
      const result = await requestFriend(person.id, note);
      setNotice({ text: t(result.friends ? "friendsNowNotice" : "requestSentNotice", { name: person.firstName }) });
      invalidate("/api/social/friends", "/api/social/badges", "/api/social/people");
      setNote(""); onSent?.(); onClose();
    } catch (failure) { setError(problem(failure, person.firstName)); }
    finally { setBusy(false); }
  };
  return <Sheet visible={visible} onClose={() => { if (!busy) onClose(); }} title={t("addFriendTitle", { name: person.firstName })}
    footer={<Button label={t("sendRequest")} icon="person-add-outline" loading={busy} onPress={() => void send()} />}>
    <Field label={t("sayHello")} value={note} onChangeText={setNote} placeholder={t("helloHint")} maxLength={200} multiline editable={!busy} error={error || undefined} />
  </Sheet>;
}
/** The flag on profiles, chats and invites: Report (with "Not their photo" when they have one) or Block. */
export function FlagSheet({ person, hasPhoto, visible, onClose, onBlocked }: {
  person: { id: string; firstName: string }; hasPhoto: boolean; visible: boolean; onClose: () => void; onBlocked: () => void;
}) {
  const t = useT("social"), { setNotice } = usePreferences(), [reporting, setReporting] = useState(false);
  const blocked = () => {
    setNotice({ text: t("blockedNotice", { name: person.firstName }) });
    invalidate("/api/social"); onBlocked();
  };
  return <>
    <Sheet visible={visible && !reporting} onClose={onClose} title={t("flagTitle", { name: person.firstName })}>
      <ListGroup>
        <ListItem title={t("reportName", { name: person.firstName })} leading={<RowIcon name="flag-outline" tone="warning" />} onPress={() => setReporting(true)} />
      </ListGroup>
      <Confirm label={t("blockName", { name: person.firstName })} text={t("blockConfirmText")} action={t("blockAction")}
        run={async () => { await block(person.id); onClose(); blocked(); return true; }} />
    </Sheet>
    <ReportSheet kind="person" targetId={person.id} name={person.firstName} hasPhoto={hasPhoto} visible={reporting} onClose={() => { setReporting(false); onClose(); }} onBlocked={blocked} />
  </>;
}
