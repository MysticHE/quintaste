import type { Language } from './preferences';
const words={
  en:{notice:'AI checks the text and photos you submit for public food posts. Uncertain cases go to staff. Content appears after its checks pass.',privacy:'Public food submissions, including recipe, Market, class and cooked-photo text and pictures, are processed by AI for food-policy checks. Staff review uncertain cases. Private recipes and private conversations are outside this public-content review.',pending:'Checking food content',held:'Food content needs a correction',saved:'Saved for food-content review'},
  zh:{notice:'AI 会检查你提交的公开食品内容和照片。不确定的情况交由工作人员处理，通过检查后才会公开。',privacy:'你提交的公开食谱、市场商品、课程及成品照片的文字和图片会由 AI 检查食品政策。不确定的情况交由工作人员审核。私人食谱和私人对话不在此公开内容审核范围内。',pending:'正在检查食品内容',held:'食品内容需要修改',saved:'已保存，等待食品内容审核'},
} as const;
export const foodReviewWords=(language:Language)=>words[language];
export const foodReviewLabels=(language:Language)=>language==='zh'?{pending:'食品审核',held:'需修改'}:{pending:'Food review',held:'Needs changes'};
export const foodReviewState=(reason:string|null|undefined)=>reason==='QT food review pending'?'pending':reason==='QT food review held'?'held':null;
