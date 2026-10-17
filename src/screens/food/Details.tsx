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

export function VenueDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  if (id?.startsWith("catalogue-")) return <CataloguePlaceDetailScreen key={id} id={id.slice(10)} />;
  const googleId = savedGoogleId(id);
  if (googleId) return <LivePlaceDetailScreen key={googleId} id={googleId} />;
  const venue = venueById(id);
  if (!venue) return <Screen title="Place Unavailable"><EmptyState title="This Place Is Unavailable" text="Its details are no longer in the current collection. Your private notes remain in Saved." /></Screen>;
  const area = areaById(venue.areaId);
  return <Screen title={venue.name} backTo={from === "saved" ? "/saved" : undefined}>
    <HeroPhoto photo={venue.photo} />
    <T muted>{area?.name} · {venue.cuisine}</T><T>{venue.description}</T>
    <DetailActions kind="place" id={id} venue={venue} shareText={venue.name + " · " + area?.name + "\nFictional QuinTaste preview venue. Opening hours and address are not confirmed."} />
    <EvidencePanel dietary={venue.dietary} />
    <Card style={common.stack}><T variant="subtitle" accessibilityRole="header">Before You Go</T>
      <T>Hours: {venue.hours ?? "Unknown — check with the venue"}</T>
      <T>Address: {venue.address ?? "Unavailable for this fictional venue"}</T>
      <T variant="small" muted>Dish suitability is shown separately below. A venue label does not confirm every dish or sauce.</T>
    </Card>
    <SectionTitle title="On The Sample Menu" />
    {dishes.filter(dish => dish.venueId === id).map(dish => <FoodCard key={dish.id} kind="dish" id={dish.id} onOpen={() => router.push("/dish/" + dish.id as never)} />)}
    <PrivateNote key={"place:" + id} noteKey={"place:" + id} />
    <Button label="Ask The Stall" variant="secondary" icon="chatbubble-outline" onPress={() => router.push({ pathname: "/ask/[id]", params: { id, kind: "place" } } as never)} />
    {__DEV__ && <Button label="Suggest A Correction" variant="link" onPress={() => router.push({ pathname: "/contribute", params: { target: venue.name, kind: "correction" } })} />}
  </Screen>;
}
export function DishDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const dish = dishById(id);
  if (!dish) return <Screen title="Dish Unavailable"><EmptyState title="This Dish Is Unavailable" text="You can keep its private note or remove the item from Saved." /></Screen>;
  const venue = venueById(dish.venueId)!;
  return <Screen title={dish.name} backTo={from === "saved" ? "/saved" : undefined}>
    <HeroPhoto photo={dish.photo} /><T>{dish.description}</T>
    <T muted>{venue.name} · {areaById(venue.areaId)?.name} · {money(dish.price)}</T>
    <DetailActions kind="dish" id={id} venue={venue} shareText={dish.name + " · " + venue.name + "\n" + money(dish.price) + " · Sample menu only. Ask the stall to confirm current ingredients."} />
    <EvidencePanel dietary={dish.dietary} />
    <Card style={common.stack}><T variant="subtitle" accessibilityRole="header">Listed Ingredients</T>
      {dish.ingredients.map(ingredient => <T key={ingredient}>• {ingredient}</T>)}
      <T variant="small" muted>{dish.dietary.ingredientsKnown ? "Sample list supplied with this preview." : "This list is incomplete. Stock, sauces or compound ingredients may be unknown."}</T>
    </Card>
    <Button label="Ask The Stall" icon="chatbubble-outline" variant="secondary" onPress={() => router.push({ pathname: "/ask/[id]", params: { id, kind: "dish" } } as never)} />
    {dish.recipeId && <InfoBox title="Make A Version At Home" text="The editorial recipe is a separate recipe with its own ingredient list. It does not confirm what a stall serves.">
      <Button label="View Recipe" variant="secondary" onPress={() => router.push("/cook/recipe/" + dish.recipeId as never)} />
    </InfoBox>}
    <PrivateNote key={"dish:" + id} noteKey={"dish:" + id} />
    <Button label="View Place" variant="link" onPress={() => router.push("/place/" + venue.id as never)} />
    {__DEV__ && <Button label="Suggest A Correction" variant="link" onPress={() => router.push({ pathname: "/contribute", params: { target: dish.name, kind: "correction" } })} />}
    {__DEV__ && <Button label="Report A Concern" variant="link" onPress={() => router.push({ pathname: "/contribute", params: { target: dish.name, kind: "report" } })} />}
  </Screen>;
}
