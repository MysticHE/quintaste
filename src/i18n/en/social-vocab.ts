import type { Vars } from "..";
import { genderOptions } from "../../config/social-profile";

const same = (v: Vars) => String(v.value);
/** Poses for the photo check (server/social/verify.mjs); the member copies one in a live selfie. */
const poses: Record<string, string> = { "thumbs-up": "Thumbs up", "peace-sign": "Peace sign", "hand-on-chin": "Hand on your chin", "point-up": "Point up",
  wave: "Wave", "touch-ear": "Touch your ear", "three-fingers": "Three fingers up", "hand-on-head": "Hand on your head" };
/** Fixed Social vocabulary stored as English values (English shows the value itself), plus words several Social screens share. */
const en = {
  optGender: (v: Vars) => genderOptions.find(option => option.id === v.value)?.label ?? String(v.value),
  optReligion: same,
  optEthnicity: same,
  optWhy: same,
  optHobby: same,
  optLanguage: same,
  optEducation: same,
  optHabit: same,
  optPet: same,
  optAge: same,
  optIngredient: same,
  optPose: (v: Vars) => poses[String(v.value)] ?? String(v.value),
  you: "You",
  listSep: ", ",
  today: "Today",
  tomorrow: "Tomorrow",
  paySplit: "Split the bill",
  payHost: "I'll pay the bill",
  payOwn: "Each pays their own",
  payHostYou: "You pay the bill",
  payHostThem: "{name} pays the bill",
  verified: "Verified",
  nameAge: "{name}, {age}",
  sameArea: "Same area",
  kmAway: "{km} km away",
  accept: "Accept",
  decline: "Decline",
  send: "Send",
  save: "Save",
  saved: "Saved",
  continue: "Continue",
  done: "Done",
  cancel: "Cancel",
  yes: "Yes",
  no: "No",
  change: "Change",
  other: "Other",
  past: "Past",
  myProfile: "My Profile",
};
export default en;
