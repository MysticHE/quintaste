/**
 * Reasons staff give when they decline a photo check or remove the ✓. The key is stored; the member's app words it in their
 * language and server/social/access.mjs (checkReasons) has an English sentence for older app builds, so keep the keys in step.
 */
export const photoCheckReasons = {
  notSelfie: 'The main photo is not a real selfie of them.',
  faceUnclear: 'The face is not clear.',
  notSamePerson: 'The photos do not all show the same person.',
  ageRange: 'They do not look 21 to 45.',
  poseNotCopied: 'The pose was not copied (checks with a live selfie).',
} as const;
export type PhotoCheckReason = keyof typeof photoCheckReasons;
/** Offered for checks sent since 1 Nov 2026 (the main photo only), and for older checks with a live selfie and a pose. */
export const declineReasons: PhotoCheckReason[] = ['notSelfie', 'faceUnclear', 'notSamePerson', 'ageRange'];
export const selfieReasons: PhotoCheckReason[] = ['notSamePerson', 'poseNotCopied', 'faceUnclear', 'ageRange'];
/** Staff wording for a stored reason; reasons stored before 2 Nov 2026 were the sentence itself. */
export const reasonLabel = (stored: string) => photoCheckReasons[stored as PhotoCheckReason] ?? stored;
