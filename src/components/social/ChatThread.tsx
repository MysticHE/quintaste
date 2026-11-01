import { useRef, type ReactNode } from "react";
import { ScrollView, View, type ScrollViewInstance } from "react-native";
import { Icon, T, common } from "../ui";
import { ChatBubble, ChatComposer } from "../Chat";
import { usePreferences } from "../../state/Preferences";
import { useLanguage, useT } from "../../i18n";
import { chatTime } from "../../utils/chat-time";
import { formatSgDateTime } from "../../utils/sg-datetime";
import type { LineGift, LineKind } from "../../types/community";
import type socialMessages from "../../i18n/en/social";
import type collectionMessages from "../../i18n/en/collection";

type Line = { id: string; kind: LineKind; body: string; mine: boolean; createdAt: string; gift?: LineGift | null };
const dinnerKeys: Record<string, [keyof typeof socialMessages, keyof typeof socialMessages]> = {
  invited: ["dinnerInvitedMine", "dinnerInvitedTheirs"], suggested: ["dinnerSuggestedMine", "dinnerSuggestedTheirs"], accepted: ["dinnerAcceptedMine", "dinnerAcceptedTheirs"],
  declined: ["dinnerDeclinedMine", "dinnerDeclinedTheirs"], cancelled: ["dinnerCancelledMine", "dinnerCancelledTheirs"],
  suggestedPlace: ["dinnerPlaceMine", "dinnerPlaceTheirs"], suggestedBoth: ["dinnerBothMine", "dinnerBothTheirs"] };
/** Running late lines are stored as 'late10', 'late20' or 'late30'; gift reactions as 'giftliked:rose' or 'giftthanks:rose'. */
const giftReaction = /^gift(liked|thanks):([a-z][a-z0-9-]{1,39})$/;
const lateLine = /^late(10|20|30)$/;
/** Words a friend chat's event and dinner lines (stored as keys) in the reader's language; text lines pass through. */
export function useLineText() {
  const t = useT("social"), tc = useT("collection");
  return (line: Pick<Line, "kind" | "body" | "mine">, name: string) => {
    if (line.kind === "text") return line.body;
    if (line.kind === "gift") return tc(line.mine ? "giftLineMine" : "giftLineTheirs", { gift: tc(("gift_" + line.body) as keyof typeof collectionMessages) as string }) as string;
    if (line.kind === "event") {
      const reaction = giftReaction.exec(line.body);
      if (!reaction) return line.body === "friends" ? t("eventFriends") : line.body;
      const gift = tc(("gift_" + reaction[2]) as keyof typeof collectionMessages) as string;
      return tc(reaction[1] === "liked" ? (line.mine ? "likedLineMine" : "likedLineTheirs") : (line.mine ? "thanksLineMine" : "thanksLineTheirs"), { gift, name }) as string;
    }
    if (line.body === "again") return t("dinnerAgain");
    const late = lateLine.exec(line.body);
    if (late) return t(line.mine ? "lateLineMine" : "lateLineTheirs", { name, n: Number(late[1]) }) as string;
    const keys = dinnerKeys[line.body];
    return keys ? t(keys[line.mine ? 0 : 1], { name }) as string : line.body;
  };
}
function SystemLine({ text, at }: { text: string; at: string }) {
  const { theme } = usePreferences(), language = useLanguage();
  return <View style={[common.row, { gap: 6, justifyContent: "center", paddingVertical: 4 }]} accessible accessibilityLabel={text + ", " + formatSgDateTime(Date.parse(at), language)}>
    <Icon name="ellipse" size={6} color={theme.mutedForeground} /><T variant="small" muted style={{ flexShrink: 1, textAlign: "center" }}>{text}</T>
  </View>;
}
/**
 * A 1-to-1 conversation filling the screen: lines scroll and stay pinned to the newest, the composer stays at the bottom.
 * `top` sits above the first line (an invitation card, Load Earlier); `describe` words system lines; `renderLine` draws a line
 * itself (a gift card) when it returns something.
 */
export function ChatThread({ lines, describe, name, onSend, empty, top, disabled = false, placeholder, renderLine, composerLeading }: {
  lines: Line[]; describe: (line: Line) => string; name: string; onSend: (text: string) => Promise<boolean>; empty: string; top?: ReactNode; disabled?: boolean; placeholder?: string;
  renderLine?: (line: Line) => ReactNode; composerLeading?: ReactNode;
}) {
  const scroll = useRef<ScrollViewInstance>(null), t = useT("social"), language = useLanguage();
  return <View style={[common.flex, { gap: 8, minHeight: 0 }]}>
    {top && <ScrollView style={{ maxHeight: "45%", flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 6 }}>{top}</ScrollView>}
    <ScrollView ref={scroll} style={common.flex} contentContainerStyle={{ gap: 8, paddingVertical: 4 }} keyboardShouldPersistTaps="handled"
      onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })} showsVerticalScrollIndicator={false}>
      {!lines.length && <T muted style={{ textAlign: "center", paddingVertical: 24 }}>{empty}</T>}
      {lines.map(line => renderLine?.(line) ?? (line.kind === "text"
        ? <ChatBubble key={line.id} text={line.body} mine={line.mine} time={chatTime(line.createdAt, language)} label={(line.mine ? t("you") : name) + ": " + line.body + ", " + formatSgDateTime(Date.parse(line.createdAt), language)} />
        : <SystemLine key={line.id} text={describe(line)} at={line.createdAt} />))}
    </ScrollView>
    <ChatComposer onSend={onSend} disabled={disabled} placeholder={placeholder} leading={composerLeading} />
  </View>;
}
