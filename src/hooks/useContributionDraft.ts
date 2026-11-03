import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback,useEffect,useRef,useState,type RefObject } from "react";

/** Per-account, per-place drafts stay on this device; server retries reuse the saved submission identity. */
export function useContributionDraft<T>(key:string|null,value:T,restore:(value:T)=>void,identity:RefObject<{key:string;input:string}>){
  const [loaded,setLoaded]=useState<string|null>(null),live=useRef({value,restore}),cleared=useRef(false),writing=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{live.current={value,restore};},[value,restore]);
  const ready=!key||loaded===key;
  useEffect(()=>{
    let mounted=true;cleared.current=false;
    if(!key)return;
    void AsyncStorage.getItem(key).then(raw=>{
      if(!mounted||!raw)return;
      try{const saved=JSON.parse(raw) as {at:number;value:T;identity?:{key:string;input:string}};if(Date.now()-saved.at<7*86400000){live.current.restore(saved.value);if(saved.identity)identity.current=saved.identity;}}catch{/* An unreadable draft does not block composing. */}
    }).catch(()=>{}).finally(()=>{if(mounted)setLoaded(key);});
    return()=>{mounted=false;};
  },[key,identity]);
  useEffect(()=>{
    if(!key||!ready||cleared.current)return;
    const timer=setTimeout(()=>{void AsyncStorage.setItem(key,JSON.stringify({at:Date.now(),value,identity:identity.current})).catch(()=>{});},350);writing.current=timer;
    return()=>clearTimeout(timer);
  },[key,ready,value,identity]);
  const resume=useCallback(()=>{cleared.current=false;},[]);
  return {ready,resume,clear:async()=>{cleared.current=true;if(writing.current)clearTimeout(writing.current);if(key)await AsyncStorage.removeItem(key).catch(()=>{});}};
}
