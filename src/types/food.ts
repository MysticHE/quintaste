import type { Avatar } from "./avatar";
import type { RecipeWorkspace } from "./recipe-workspace";
import type { PlaceLabel, PriceLevel } from "./discovery";
import type { ExploreLocalDocument } from "./explore-local";
import type { SocialDocument } from "./social";
import type { MarketDocument } from "./market";
import type { Exclusion } from "../config/preferences";
import type { SearchPoint } from "./location-search";
import type { GameProgress } from "../game/progress";

export type PhotoKey = "bowl" | "laksa" | "greens" | "kaya-toast" | "claypot-rice" | "sweet-sour-tofu" | "kangkung" | "abc-soup";
/** Singapore meal structure: rice meals and noodles are one-dish meals; "With rice" dishes share a rice table. */
export const recipeCategories = ["Breakfast", "Noodles", "Rice meals", "With rice", "Soups", "Snacks & kueh", "Desserts & drinks"] as const;
export type RecipeCategory = (typeof recipeCategories)[number];
export type Fit = "Vegan" | "Vegetarian" | "Unknown" | "Conflicts";
export type Evidence = {
  source: string;
  kind: "editorial" | "menu" | "community" | "unknown";
  checkedAt?: string;
  withdrawn?: boolean;
};
export type Dietary = {
  diet: "Vegan" | "Vegetarian" | "Unknown";
  contains: Exclusion[];
  ingredientsKnown: boolean;
  evidence: Evidence;
};
export type Area = { id: string; name: string; mrt: string; lat?: number; lng?: number };
export type Venue = {
  id: string; googlePlaceId: string | null; name: string; areaId: string;
  description: string; photo: PhotoKey; cuisine: string; dietary: Dietary;
  address: string | null; phone: string | null; hours: string | null;
  schedule?: { source: "sample"; checkedAt: string; periods: { days: number[]; opens: number; closes: number }[] };
};
export type Dish = {
  id: string; venueId: string; name: string; description: string;
  photo: PhotoKey; price: number | null; ingredients: string[]; dietary: Dietary;
  recipeId?: string;
};
/** amount null means "to taste": shown as text and never scaled. labelChecked clears compound-ingredient uncertainty. */
/** `shop` appears on a member recipe line linked to the author's Market item, only while the viewer can open and buy it. */
/** `suggested` marks an amount the AI proposed because the source video or page gave none. */
export type Ingredient = { id: string; name: string; amount: number | null; unit: string; labelChecked?: boolean; suggested?: boolean; shop?: { listingId: string; name: string; priceCents: number } };
export type RecipeStep = {
  title: string; instruction: string; ingredientIds: string[];
  timer?: { label: string; seconds: number };
  /** Second in the source video where this step starts (AI-imported recipes). */
  at?: number;
  /** Server path of the step's photo: a frame from the recipe video, or a drawn illustration. */
  photo?: string; image?: "frame" | "illustration";
};
/** Where an AI-written recipe came from: a member's video link or a dish request answered from recipe pages. */
export type RecipeSource = {
  kind: "video" | "request"; platform?: string; url?: string; creator?: string; request?: string; urls?: string[]; notes?: string; confidence?: number;
};
export type Recipe = {
  image?: { path: string; width: number; height: number; credit: string };
  provenance?: { sources: string[]; checkedAt: string; kitchenTested: false; reviewedBy: "QT Manager" | "QuinTaste team" };
  id: string; name: string; description: string; photo?: PhotoKey;
  minutes: number; servings: number; cuisine: string; dietary: Dietary;
  categories: RecipeCategory[]; onePot?: boolean;
  ingredients: Ingredient[]; steps: RecipeStep[]; dishId?: string; adaptationId?: string;
  adaptationNote?: string;
  /** The original recipe page's rating when the QT bot selected it (not a QuinTaste rating). */
  sourceRating?: { value: number; count: number; site: string; url: string; checkedAt: string };
  /** Per-serving figures from the source page ("source") or estimated from the ingredients ("estimate"); absent when unreliable. */
  nutrition?: { basis: "source" | "estimate"; site?: string; coverage?: number; checkedAt: string;
    perServing: { kcal: number; protein?: number; fat?: number; carbs?: number; fibre?: number; sugar?: number; sodium?: number } };
  author: string; language: string; revision: number; updatedAt: string; withdrawal?: string;
  /** Present on recipes members shared and staff published; `shop` is the author's Market shop when buyers can see it. */
  member?: { sponsorship: string; own: boolean; shop: { id: string; name: string } | null };
  /** Present on AI-written recipes; shown in Recipe info with the credit and links. */
  source?: RecipeSource;
};
export type SavedKind = "place" | "dish" | "recipe";
export type SavedItem = { kind: SavedKind; id: string; savedAt: number; list: string };
export type PrivatePlaceKind = "home" | "work" | "custom";
export type PrivatePlace = {
  id: string; label: string; kind?: PrivatePlaceKind; areaId?: string; address?: string; details?: string;
  point?: SearchPoint; postalCode?: string; isDefault: boolean;
};
export type LocalCase = {
  id: string; kind: "correction" | "report"; target: string; text: string;
  photoUri?: string; createdAt: number; status: "not-sent";
};
export type CookingSession = {
  recipeId: string; step: number; servings: number; startedAt: number; recipeVersion?: number;
  /** Mise en place screen before step 1; gathered holds ingredient ids, used holds "stepIndex:ingredientId". */
  gathering?: boolean; gathered?: string[]; used?: string[];
};
export type CookingTimer = {
  id: string; recipeId: string; label: string; duration: number;
  endsAt: number | null; remaining: number; createdAt: number;
};
export type DiscoverySettings = { filters: ExploreFilters; radius: number; locationModeChosen?: boolean };
export type FoodDocument = {
  avatar: Avatar | null;
  recipes: RecipeWorkspace;
  exploreLocal: ExploreLocalDocument;
  market: MarketDocument;
  social: SocialDocument;
  version: 1; areaId: string; searchArea: string; onboardingDone: boolean; adultConfirmed: boolean;
  saves: SavedItem[]; notes: Record<string, string>; lists: string[];
  privatePlaces: PrivatePlace[]; cases: LocalCase[]; discoverySettings: DiscoverySettings;
  /** Rush Hour and My little café progress (local per owner until the Phase B account store). */
  game: GameProgress;
  cooking: CookingSession | null; timers: CookingTimer[];
  notifications: { cooking: boolean; cases: boolean; saved: boolean; marketing: boolean; quietStart: string; quietEnd: string };
};
/** `labels`: diet labels every place must prove; null follows the person's own diet choice. */
export type ExploreFilters = {
  confirmed: boolean; savedOnly: boolean; openNow: boolean;
  near: boolean; home: boolean; work: boolean; labels: PlaceLabel[] | null; cuisine: string; maxPrice: number | null; priceLevel: PriceLevel | null;
  cuisines?: string[] | null; priceLevels?: PriceLevel[] | null;
};

export type SavedSelection = { category: "All" | "Places" | "Dishes" | "Recipes" | "Notes"; list: string };
