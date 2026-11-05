import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Screen } from "../components/Screen";
import { Button,Field,T,common } from "../components/ui";
import { ListGroup,ListItem,RowIcon,StatusPill } from "../components/GroupedList";
import { useMember } from "../components/CommunityGate";
import { MemberGate } from "../components/social/SocialState";
import { ReviewPhotos } from "../components/discovery/ReviewPhotos";
import { useRemote,invalidate } from "../hooks/useRemote";
import { communityRequest } from "../services/community-api";
import { useLanguage } from "../i18n";
import { contributionWords,contributionState,type Contribution } from "../config/explore-work";

/** A suggestion carries the name the member gave; other contributions are about a listed place, named by its id. */
const placeName=(item:Contribution)=>item.kind==="suggestion"||item.kind==="claim"?item.name??item.target.replaceAll("-"," "):item.target.replaceAll("-"," ");
function useContributions(id?:string) {
  const member=useMember();
  const path="/api/explore-work"+(id?"/"+id:"");
  const remote=useRemote(member.userId?"explore-contributions:"+member.userId+":"+(id??"list"):null,async signal=>{
    const result=await communityRequest<{items:Contribution[]}&Contribution>(path,{signal});
    if(id&&!signal.aborted) invalidate("/api/inbox","explore-contributions:"+member.userId+":list");
    return result;
  },5000);
  return remote;
}
export function ContributionsScreen(){
  const language=useLanguage(),w=contributionWords(language),remote=useContributions();
  return <Screen title={w.title}><MemberGate returnTo="/explore-contributions">
    {!!remote.error&&<><T>{w.load}</T><Button label={w.retry} onPress={remote.refresh}/></>}
    {remote.data?.items.length===0&&<T muted>{w.empty}</T>}
    {remote.data&&<Button label={w.explore} icon="compass-outline" variant="secondary" onPress={()=>router.push("/")}/>}
    {remote.data&&<Button label={w.suggest} icon="add-circle-outline" variant="link" onPress={()=>router.push("/suggest-place")}/>}
    <ListGroup>{remote.data?.items.map(item=><ListItem key={item.id} title={item.kind==="review"?w.review:item.kind==="suggestion"?w.suggestion:item.kind==="claim"?w.claim:w.report}
      badge={item.unread?<StatusPill label={w.newUpdate} tone="accent"/>:undefined}
      label={[item.kind==="review"?w.review:item.kind==="suggestion"?w.suggestion:item.kind==="claim"?w.claim:w.report,placeName(item),contributionState(item,language),item.unread?w.newUpdate:""].filter(Boolean).join(", ")}
      subtitle={placeName(item)+" · "+contributionState(item,language)} wrap leading={<RowIcon name={item.kind==="review"?"star-outline":item.kind==="suggestion"?"add-circle-outline":item.kind==="claim"?"storefront-outline":"flag-outline"}/>}
      onPress={()=>router.push(("/explore-contributions/"+item.id) as never)}/>)}</ListGroup>
  </MemberGate></Screen>;
}
export function ContributionDetail({id}:{id:string}){
  const language=useLanguage(),w=contributionWords(language),remote=useContributions(id),item=remote.data;
  const [details,setDetails]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const submit=async()=>{setBusy(true);setError("");try{await communityRequest("/api/explore-work/"+id+"/reply",{method:"POST",body:{details}});setDetails("");invalidate("explore-contributions:");remote.refresh();}catch{setError(w.load);}finally{setBusy(false);}};
  return <Screen title={w.title}><MemberGate returnTo={"/explore-contributions/"+id}>
    {!!remote.error&&<><T>{w.load}</T><Button label={w.retry} onPress={remote.refresh}/></>}
    {item&&<View style={{gap:14}}>
      <T variant="subtitle" accessibilityRole="header">{placeName(item)}</T>
      <T accessibilityLiveRegion="polite">{contributionState(item,language)}</T>
      <T variant="caption" muted>{w.reference+": "+item.reference}</T>
      {!!item.details&&<T selectable>{item.details}</T>}
      {!!item.message&&<T>{item.message}</T>}
      {!!item.photos?.length&&<ReviewPhotos photos={item.photos}/>}
      {item.reward?.state==="pending"&&<T>{item.kind==="suggestion"?w.placePendingReward:w.pendingReward}</T>}
      {item.reward?.state==="paid"&&<T>{item.kind==="suggestion"?w.placePaidReward:w.paidReward}</T>}
      {item.reward?.state==="held"&&<T>{w.heldReward}</T>}
      {item.reward?.state==="ineligible"&&<T>{w.ineligibleReward}</T>}
      {(item.kind!=="suggestion"||(!!item.placeId&&(item.outcome==="duplicate"||item.state==="published")))&&<Button label={w.view} icon="open-outline" variant="link"
        onPress={()=>router.push(("/place/catalogue-"+(item.kind==="suggestion"?item.placeId:item.target)+(item.reviewId?"?reviewId="+item.reviewId:"")) as never)}/>}
      <T variant="small" accessibilityRole="header" style={common.bold}>{w.timeline}</T>
      {item.timeline?.map((entry,i)=><View key={i} style={{gap:2}}><T variant="small">{entry.what==="received"?w.received:entry.what==="verified-live"?w.live:entry.what==="additional-information"?w.reply:w.working}</T>
        <T variant="caption" muted>{new Date(entry.at).toLocaleString(language==="zh"?"zh-SG":"en-SG",{timeZone:"Asia/Singapore"})}</T></View>)}
      {["staff","needs-input","needs-changes","resolved","published"].includes(item.state)&&<>
        <Field label={w.details} value={details} onChangeText={setDetails} maxLength={1000} multiline editable={!busy}/>
        {!!error&&<T accessibilityLiveRegion="polite">{error}</T>}
        <Button label={item.kind==="review"?w.appeal:w.send} loading={busy} disabled={details.trim().length<3} onPress={()=>void submit()}/>
      </>}
    </View>}
  </MemberGate></Screen>;
}
