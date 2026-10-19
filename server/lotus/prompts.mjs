import { basePrompt, expressionPrompt } from '../avatar/prompts.mjs';

/**
 * Lotus breed prompts (AVATAR_LOTUS_PLAN §5). The Adult base uses the portrait art direction and its fixed
 * head-and-shoulders framing (crown at 7%, eye line 39%, chin 68%, centred, transparent). The Mini base is edited from the
 * Adult base, not from the selfie, so both forms stay the same person. Mini style is an appearance of an adult (PRD 1.3).
 * Blink and talk frames are aligned edits of each base.
 */
export const adultPrompt = basePrompt;
export const miniPrompt = "Use case: style-transfer.\nImage 1 is the canonical adult avatar. Redraw the SAME adult person as their Mini style form, in exactly the same 3D cartoon rendering, lighting, colours and outfit.\nMINI STYLE: a compact stylised bust with a larger head relative to the shoulders (head plus hair about 64% of canvas width), softer rounded cheek planes, slightly larger eyes and a simplified smaller torso. It is a stylised appearance of an adult: keep adult facial structure and adult age cues, never a child, toddler or baby, no school clothing, toys or childlike props.\nIDENTITY: keep every identity cue from Image 1: face outline, hairstyle and hairline, eyebrow and nose shapes, eye spacing, skin tone, glasses and facial hair when present, and clothing colours.\nFRAMING: the same as Image 1: square canvas, front-facing, centred and upright, crown at about 7% height, shoulders reaching the lower edge, upper torso cropped at mid-chest. Neutral relaxed expression, lips closed in a small friendly smile, eyes open looking straight ahead.\nBACKGROUND: true transparent alpha outside the silhouette, clean cutout edges, no background or ground shadow.\nOUTPUT: a single finished character, no text, watermark, border, label, UI, props, extra accessories or scene.";
export const talkPrompt = expressionPrompt('open');
export const blinkPrompt = expressionPrompt('blink');

/**
 * The six calls of one breed attempt, in order: both bases first (so the Mini form comes from a finished Adult form),
 * then blink and talk for each. `from` names Image 1: the selfie or a finished base.
 * @type {{ form: 'adult' | 'mini', state: 'base' | 'blink' | 'open', from: 'photo' | 'adult' | 'mini',
 *   request: { prompt: string, quality: 'high' | 'medium', type?: 'image/jpeg' | 'image/webp', references?: string[] } }[]}
 */
export const BREED_PLAN = [
  { form: 'adult', state: 'base', from: 'photo', request: { prompt: adultPrompt, quality: 'high', type: 'image/jpeg', references: ['hormozi-base.webp', 'graham-base.webp'] } },
  { form: 'mini', state: 'base', from: 'adult', request: { prompt: miniPrompt, quality: 'high' } },
  { form: 'adult', state: 'blink', from: 'adult', request: { prompt: blinkPrompt, quality: 'medium' } },
  { form: 'adult', state: 'open', from: 'adult', request: { prompt: talkPrompt, quality: 'medium' } },
  { form: 'mini', state: 'blink', from: 'mini', request: { prompt: blinkPrompt, quality: 'medium' } },
  { form: 'mini', state: 'open', from: 'mini', request: { prompt: talkPrompt, quality: 'medium' } },
];
