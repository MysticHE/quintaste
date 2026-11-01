import enProfile from "./en/profile";
import zhProfile from "./zh/profile";
import enFeeds from "./en/feeds";
import zhFeeds from "./zh/feeds";
import enCommon from "./en/common";
import enCook from "./en/cook";
import enDiet from "./en/diet";
import enExplore from "./en/explore";
import enGame from "./en/game";
import enCollection from "./en/collection";
import enMarket from "./en/market";
import enMe from "./en/me";
import enSocial from "./en/social";
import zhCommon from "./zh/common";
import zhCook from "./zh/cook";
import zhDiet from "./zh/diet";
import zhExplore from "./zh/explore";
import zhGame from "./zh/game";
import zhCollection from "./zh/collection";
import zhMarket from "./zh/market";
import zhMe from "./zh/me";
import zhSocial from "./zh/social";

/** One table per area, so each area's strings live in their own pair of files. */
export const messages = {
  en: { profile: enProfile, feeds: enFeeds, common: enCommon, diet: enDiet, explore: enExplore, cook: enCook, social: enSocial, market: enMarket, me: enMe, game: enGame, collection: enCollection },
  zh: { profile: zhProfile, feeds: zhFeeds, common: zhCommon, diet: zhDiet, explore: zhExplore, cook: zhCook, social: zhSocial, market: zhMarket, me: zhMe, game: zhGame, collection: zhCollection },
};
export type Namespace = keyof (typeof messages)["en"];
