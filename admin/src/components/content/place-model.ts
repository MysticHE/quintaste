import type { Audit, Staff } from './Parts';
export type Photo = { path: string; width: number; height: number; author: string; sourceUrl: string; license: string; licenseUrl: string | null; capturedAt: string | null; checkedAt: string; changes: string; provider?: string };
export type Hours = { summary: string; schedule: string[]; notes: string; sourceUrl: string; checkedAt: string };
export type Place = { name: string; branch: string; address: string; postalCode: string; aliases: string[]; point: { latitude: number; longitude: number } | null;
  venueDiet: 'Vegetarian' | 'Vegan'; alliumFreeClaim: boolean; kitchen?: 'options' | null; menuTotal?: number | null; hours?: Hours | null; photo?: Photo | null; sourceUrl?: string;
  research?: { sourceUrls: string[]; checkedAt?: string }; dietProof?: { sourceUrl: string; quote: string; checkedAt: string } | null };
export type Dish = { id: string; name: string; category?: string; price: { amount: number | null; currency: 'SGD' | 'unknown'; type: 'displayed' | 'from'; maxAmount?: number };
  qualifier?: string; availability?: string; diet?: 'V' | 'VG'; photo?: Photo | null; hidden?: boolean };
export type Menu = { sections: { id: string; title?: string; sourceLabel: string; sourceUrl: string; checkedAt: string; items: Dish[] }[] };
export type Detail = { id: string; app: string | null; origin: 'packaged' | 'explorer' | 'staff'; base: Place | null; baseHash: string | null; staff: Staff | null; newer: boolean; history: Audit[];
  menu: { base: Menu | null; baseHash: string | null; staff: Staff | null; newer: boolean }; reports: { id: string; title: string; status: string; created_at: string }[] };
export type Row = Dish & { key: string; kind: 'base' | 'staff' | 'new'; source: string; keepLabel: boolean; initial: Dish | null; removed?: boolean };
export const today = () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0,10);
export const blank: Place = { name:'',branch:'',address:'',postalCode:'',aliases:[],point:null,venueDiet:'Vegetarian',alliumFreeClaim:false,kitchen:null,menuTotal:null,hours:null,photo:null,sourceUrl:'' };
export function initialPlace(detail: Detail | null): Place { const patch = { ...detail?.staff?.data }; delete patch.base; return { ...blank, ...detail?.base, ...patch }; }
export function initialDishes(detail: Detail | null): Row[] {
  const data = (detail?.menu.staff?.data ?? {}) as { items?: Record<string,Partial<Dish>>; added?: Dish[] };
  return [...(detail?.menu.base?.sections ?? []).flatMap(section => section.items.map(dish => {
    const key = section.id + '/' + dish.id, now = { ...dish, ...data.items?.[key] };
    return { ...now, key, kind:'base' as const, source:section.title || section.sourceLabel, keepLabel:!!dish.diet, initial:now };
  })), ...(data.added ?? []).map(dish => ({ ...dish,key:dish.id,kind:'staff' as const,source:'Staff',keepLabel:false,initial:dish }))];
}
export function dishData(row: Dish): Dish { return { id:row.id,name:row.name,category:row.category??'',price:row.price,diet:row.diet,qualifier:row.qualifier??'',availability:row.availability??'',photo:row.photo??null,hidden:!!row.hidden }; }
export function dishChanges(rows: Row[]) { return rows.filter(row => row.kind==='new' ? !row.removed : row.removed || JSON.stringify(dishData(row))!==JSON.stringify(dishData(row.initial!)))
  .map(row=>({key:row.key,kind:row.kind,...(row.removed?{remove:true}:{item:dishData(row)})})); }
export const newDish = (): Row => ({ id:'new-'+crypto.randomUUID(),key:crypto.randomUUID(),kind:'new',source:'Staff',keepLabel:false,initial:null,name:'',category:'',price:{amount:null,currency:'unknown',type:'displayed'},qualifier:'',availability:'',photo:null });
