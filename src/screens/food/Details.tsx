import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "../../components/Screen";
import { Button, Card, T, common } from "../../components/ui";
import { EmptyState, InfoBox, SectionTitle } from "../../components/food/Controls";
import { EvidencePanel } from "../../components/food/Evidence";
import { DetailActions, HeroPhoto, PrivateNote } from "../../components/food/DetailParts";
import { FoodCard } from "../../components/food/FoodCard";
import { dishById, dishes } from "../../data/dishes";
import { venueById } from "../../data/venues";
import { areaById } from "../../data/areas";
import { money } from "../../utils/food-format";
import { LivePlaceDetailScreen } from "./LivePlaceDetail";
import { savedGoogleId } from "../../utils/live-place-cache";
import { CataloguePlaceDetailScreen } from "./CataloguePlaceDetail";
import { useLanguage, useT } from "../../i18n";

export function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (id?.startsWith("catalogue-")) return <CataloguePlaceDetailScreen key={id} id={id.slice(10)} />;
  const googleId = savedGoogleId(id);
  if (googleId) return <LivePlaceDetailScreen key={googleId} id={googleId} />;
  return <SampleVenueDetail id={id} />;
}
function SampleVenueDetail({ id }: { id: string }) {
  const { from } = useLocalSearchParams<{ from?: string }>(), t = useT("explore");
  const venue = venueById(id);
  if (!venue) return <Screen title={t("placeUnavailable")}><EmptyState title={t("thisPlaceUnavailable")} text={t("placeUnavailableText")} /></Screen>;
  const area = areaById(venue.areaId);
  return <Screen title={venue.name} backTo={from === "saved" ? "/saved" : undefined}>
    <HeroPhoto photo={venue.photo} />
    <T muted>{area?.name} · {venue.cuisine}</T><T>{venue.description}</T>
    <DetailActions kind="place" id={id} venue={venue} shareText={venue.name + " · " + area?.name + "\n" + t("fictionalVenueShare")} />
    <EvidencePanel dietary={venue.dietary} />
    <Card style={common.stack}><T variant="subtitle" accessibilityRole="header">{t("beforeYouGo")}</T>
      <T>{t("hoursLine", { hours: venue.hours ?? t("hoursUnknownVenue") })}</T>
      <T>{t("addressLine", { address: venue.address ?? t("addressUnavailableFictional") })}</T>
      <T variant="small" muted>{t("dishSuitabilityNote")}</T>
    </Card>
    <SectionTitle title={t("onSampleMenu")} />
    {dishes.filter(dish => dish.venueId === id).map(dish => <FoodCard key={dish.id} kind="dish" id={dish.id} onOpen={() => router.push("/dish/" + dish.id as never)} />)}
    <PrivateNote key={"place:" + id} noteKey={"place:" + id} />
    <Button label={t("askTheStall")} variant="secondary" icon="chatbubble-outline" onPress={() => router.push({ pathname: "/ask/[id]", params: { id, kind: "place" } } as never)} />
    {__DEV__ && <Button label={t("suggestCorrection")} variant="link" onPress={() => router.push({ pathname: "/contribute", params: { target: venue.name, kind: "correction" } })} />}
  </Screen>;
}
export function DishDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const t = useT("explore"), language = useLanguage();
  const dish = dishById(id);
  if (!dish) return <Screen title={t("dishUnavailable")}><EmptyState title={t("thisDishUnavailable")} text={t("dishUnavailableText")} /></Screen>;
  const venue = venueById(dish.venueId)!;
  return <Screen title={dish.name} backTo={from === "saved" ? "/saved" : undefined}>
    <HeroPhoto photo={dish.photo} /><T>{dish.description}</T>
    <T muted>{venue.name} · {areaById(venue.areaId)?.name} · {money(dish.price, language)}</T>
    <DetailActions kind="dish" id={id} venue={venue} shareText={dish.name + " · " + venue.name + "\n" + money(dish.price, language) + " · " + t("sampleMenuShare")} />
    <EvidencePanel dietary={dish.dietary} />
    <Card style={common.stack}><T variant="subtitle" accessibilityRole="header">{t("listedIngredients")}</T>
      {dish.ingredients.map(ingredient => <T key={ingredient}>• {ingredient}</T>)}
      <T variant="small" muted>{t(dish.dietary.ingredientsKnown ? "sampleListSupplied" : "listIncomplete")}</T>
    </Card>
    <Button label={t("askTheStall")} icon="chatbubble-outline" variant="secondary" onPress={() => router.push({ pathname: "/ask/[id]", params: { id, kind: "dish" } } as never)} />
    {dish.recipeId && <InfoBox title={t("makeAtHome")} text={t("makeAtHomeText")}>
      <Button label={t("viewRecipe")} variant="secondary" onPress={() => router.push("/cook/recipe/" + dish.recipeId as never)} />
    </InfoBox>}
    <PrivateNote key={"dish:" + id} noteKey={"dish:" + id} />
    <Button label={t("viewPlace")} variant="link" onPress={() => router.push("/place/" + venue.id as never)} />
    {__DEV__ && <Button label={t("suggestCorrection")} variant="link" onPress={() => router.push({ pathname: "/contribute", params: { target: dish.name, kind: "correction" } })} />}
    {__DEV__ && <Button label={t("reportConcernTitle")} variant="link" onPress={() => router.push({ pathname: "/contribute", params: { target: dish.name, kind: "report" } })} />}
  </Screen>;
}
