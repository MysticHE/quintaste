import { T } from '../ui';
import { useLanguage } from '../../i18n';
import { foodReviewWords } from '../../config/food-review';
export function FoodReviewNote(){return <T variant="small" muted>{foodReviewWords(useLanguage()).notice}</T>;}
