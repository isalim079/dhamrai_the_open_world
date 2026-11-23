/**
 * Curated bilingual landmark / shop sign copy for Milestone 11.
 * Original project content — not scraped posters or trademarked logos.
 */

export interface SignboardCopy {
  id: string;
  bn: string;
  en: string;
  /** Accent color for board face (hex without #). */
  faceColor: number;
  textColor: number;
}

export const LANDMARK_SIGNS: readonly SignboardCopy[] = [
  {
    id: 'sign_rathkhola_stand',
    bn: 'রাঠখোলা স্ট্যান্ড',
    en: 'Rathkhola Stand',
    faceColor: 0xf4d03f,
    textColor: 0x1a1a1a,
  },
  {
    id: 'sign_tea_stall',
    bn: 'চায়ের দোকান',
    en: 'Tea Stall',
    faceColor: 0xe74c3c,
    textColor: 0xffffff,
  },
  {
    id: 'sign_hardinge_school',
    bn: 'হরগোবিন্দ উচ্চ বিদ্যালয়',
    en: 'Hardinge High School',
    faceColor: 0x1a5276,
    textColor: 0xf7f9f9,
  },
  {
    id: 'sign_thana_checkpoint',
    bn: 'থানা জংশন চেকপোস্ট',
    en: 'Thana Junction Checkpoint',
    faceColor: 0x1e8449,
    textColor: 0xffffff,
  },
  {
    id: 'sign_kayetpara_workshop',
    bn: 'কায়েতপাড়া ধাতব কর্মশালা',
    en: 'Kayetpara Metal Workshop',
    faceColor: 0x7d3c98,
    textColor: 0xf9e79f,
  },
  {
    id: 'sign_police_station',
    bn: 'ধামরাই থানা',
    en: 'Dhamrai Police Station',
    faceColor: 0x1b4f72,
    textColor: 0xffffff,
  },
] as const;

export function getSignCopy(id: string): SignboardCopy | undefined {
  return LANDMARK_SIGNS.find((s) => s.id === id);
}
