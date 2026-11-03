import { useEffect,useRef,useState } from "react";
import { ScrollView,View } from "react-native";
import { Chip } from "./food/Controls";
import { Button, Field, T } from "./ui";
import { FieldLabel, SwitchRow } from "./GroupedList";
import { MarketModal } from "./market/MarketChrome";
import { usePreferences } from "../state/Preferences";
import { report } from "../services/social-api";
import { ApiError } from "../services/community-api";
import { useT,useLanguage } from "../i18n";
import { contributionKey,contributionWords } from "../config/explore-work";
import { ListingPhotos,photoBudgets } from "./market/ListingPhotos";
import type { MarketPhotos } from "../types/market";
import { useContributionDraft } from "../hooks/useContributionDraft";
import { useAuth } from "../state/Auth";
import type commonMessages from "../i18n/en/common";

const reasons = {
  person: ["Not their photo", "Harassment", "Spam or scam", "Inappropriate", "Safety concern", "Other"],
  listing: ["Prohibited item", "Misleading details", "Spam or scam", "Other"],
  place: ["Hours", "Address or location", "Menu or prices", "Closed or moved", "Not meat-free", "Other"],
  recipe: ["Not meat-free", "Unsafe instructions", "Not their recipe", "Spam or scam", "Other"],
  level: ["Not meat-free", "Wrong ingredients", "Inappropriate", "Spam or scam", "Other"],
  cafe: ["Inappropriate name", "Spam or scam", "Harassment", "Other"],
} as const;
type Reason = (typeof reasons)[keyof typeof reasons][number];
/** The reason is sent as written above; this is only what the member reads. */
const reasonKeys: Record<Reason, keyof typeof commonMessages> = {
  "Not their photo": "reasonNotTheirPhoto", Harassment: "reasonHarassment", "Spam or scam": "reasonSpam", Inappropriate: "reasonInappropriate", "Safety concern": "reasonSafety",
  Other: "reasonOther", "Prohibited item": "reasonProhibited", "Misleading details": "reasonMisleading", Hours: "reasonHours",
  "Address or location": "reasonAddress", "Menu or prices": "reasonMenu", "Closed or moved": "reasonClosed", "Not meat-free": "reasonNotMeatFree",
  "Unsafe instructions": "reasonUnsafe", "Not their recipe": "reasonNotTheirs", "Wrong ingredients": "reasonWrongIngredients", "Inappropriate name": "reasonInappropriateName",
};
/**
 * Sends a report to the staff review queue; a person report can also block them, a place report suggests an update.
 * "Not their photo" is left out when the caller knows the person has no photo (`hasPhoto={false}`, Social profiles and chats).
 */
export function ReportSheet({ kind, targetId, name, visible, onClose, onBlocked, initialReason = "", hasPhoto = true }: {
  kind: keyof typeof reasons; targetId: string; name: string; visible: boolean; onClose: () => void; onBlocked?: () => void; initialReason?: string; hasPhoto?: boolean;
}) {
  const { theme, setNotice } = usePreferences(), t = useT("common");
  const [reason, setReason] = useState(initialReason), [details, setDetails] = useState(""), [block, setBlock] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const words=contributionWords(useLanguage()),[proposed,setProposed]=useState(""),[sourceUrl,setSourceUrl]=useState("");
  const [photos,setPhotos]=useState<MarketPhotos>({}),[photoBusy,setPhotoBusy]=useState(false),submission=useRef({key:contributionKey(),input:""});
  const {user}=useAuth();
  const draft=useContributionDraft(kind==="place"&&user?.id?"qt.explore-draft:"+user.id+":report:"+targetId:null,
    {reason,details,proposed,sourceUrl,photos},saved=>{setReason(saved.reason);setDetails(saved.details);setProposed(saved.proposed);setSourceUrl(saved.sourceUrl);setPhotos(saved.photos);},submission);
  const resumeDraft=draft.resume;
  useEffect(()=>{if(visible)resumeDraft();},[visible,resumeDraft]);
  const send = async () => {
    setBusy(true); setError("");
    try {
      const input=JSON.stringify({reason,details,proposed,sourceUrl,photo:photos.item});
      if(submission.current.input && submission.current.input!==input) submission.current.key=contributionKey();
      submission.current.input=input;
      await report({ kind, targetId, reason, details, block: kind === "person" && block,...(kind==="place"?{proposed,sourceUrl,photos:photos.item?[photos.item]:[],submissionKey:submission.current.key}:{}) });
      await draft.clear();setNotice({ text: kind === "place" ? words.notice : t("reportSent") }); setReason(""); setDetails(""); setBlock(false);setProposed("");setSourceUrl("");setPhotos({});submission.current={key:contributionKey(),input:""};onClose();
      if (block) onBlocked?.();
    } catch (problem) { setError(problem instanceof ApiError ? problem.message : t("reportFailed")); }
    finally { setBusy(false); }
  };
  return <MarketModal visible={visible} onClose={() => { if (!busy&&!photoBusy) onClose(); }} label={t(kind === "place" ? "updateNamed" : "reportNamed", { name })}>
    <ScrollView keyboardShouldPersistTaps="handled" style={{maxHeight:480}} contentContainerStyle={{gap:10}}>
    <View style={{ gap: 6 }}><FieldLabel>{t("reportReason")}</FieldLabel>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{reasons[kind].filter(item => hasPhoto || item !== "Not their photo").map(item =>
        <Chip key={item} label={t(reasonKeys[item])} compact role="radio" selected={reason === item} disabled={busy} onPress={() => setReason(item)} />)}</View></View>
    <Field label={t("reportDetails")} value={details} onChangeText={setDetails} maxLength={1000} multiline editable={!busy} />
    {kind==="place"&&<>
      <Field label={words.proposed} value={proposed} onChangeText={setProposed} maxLength={1000} multiline editable={!busy}/>
      <Field label={words.source} value={sourceUrl} onChangeText={setSourceUrl} maxLength={1000} editable={!busy}/>
      <ListingPhotos value={photos} onChange={setPhotos} slots={["item"]} labels={{item:words.photo,detail:words.photo,label:words.photo}} onBusy={setPhotoBusy} disabled={busy||photoBusy} budget={photoBudgets.upload}/>
      <T variant="caption" muted>{words.privacy}</T>
    </>}
    {kind === "person" && <SwitchRow label={t("alsoBlock", { name })} value={block} onChange={setBlock} disabled={busy} />}
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    <Button label={kind === "place" ? t("sendUpdate") : t("sendReport")} icon={kind === "place" ? "send-outline" : "flag-outline"} loading={busy} disabled={!draft.ready||!reason||photoBusy} onPress={() => void send()} />
    </ScrollView>
  </MarketModal>;
}
