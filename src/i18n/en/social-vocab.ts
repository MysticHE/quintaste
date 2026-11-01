import type { Vars } from "..";
import { genderOptions } from "../../config/social-profile";

const same = (v: Vars) => String(v.value);
const phrase = (map: Record<string, string>) => (v: Vars) => map[String(v.value)] ?? String(v.value);
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
  /** Drinking, smoking and pets as short phrases on a profile. */
  drinkPhrase: phrase({ No: "Doesn't drink", Sometimes: "Drinks sometimes", Yes: "Drinks" }),
  smokePhrase: phrase({ No: "Doesn't smoke", Sometimes: "Smokes sometimes", Yes: "Smokes" }),
  petPhrase: phrase({ Other: "Other pets", None: "No pets" }),
  optAge: same,
  optIngredient: same,
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
