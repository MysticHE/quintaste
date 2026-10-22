/** Chapters 4–10 (GAME_CONTENT_PLAN §3), each in its own file, and the later seasons' dishes; the dish, item and level tables add these to the built content. */
import type { ItemForm } from "../items";
import * as ch4 from "./ch4-steamer";
import * as ch5 from "./ch5-oven";
import * as ch6 from "./ch6-griddle";
import * as ch7 from "./ch7-fryer";
import * as ch8 from "./ch8-dough";
import * as ch9 from "./ch9-fridge";
import * as ch10 from "./ch10-meals";
import * as seasonDishes from "./seasons-dishes";

const CHAPTERS = [ch4, ch5, ch6, ch7, ch8, ch9, ch10, seasonDishes];
export const CHAPTER_ITEMS = CHAPTERS.flatMap(c => c.ITEMS);
export const CHAPTER_FORMS: Record<string, ItemForm> = Object.assign({}, ...CHAPTERS.map(c => c.FORMS));
export const CHAPTER_DISHES = CHAPTERS.flatMap(c => c.DISHES);
export const CHAPTER_LEVELS = CHAPTERS.flatMap(c => c.LEVELS);
