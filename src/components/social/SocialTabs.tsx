import { SegmentedTabs } from "../SegmentedTabs";
export const socialTabs = [{ id: "people", label: "People" }, { id: "events", label: "Events" }, { id: "plans", label: "My plans" }, { id: "areas", label: "Areas" }] as const;
export type SocialSection = typeof socialTabs[number]["id"];
export function SocialTabs({ value, onChange }: { value: SocialSection; onChange: (value: SocialSection) => void }) {
  return <SegmentedTabs options={socialTabs} value={value} onChange={onChange} label="Social view" />;
}
