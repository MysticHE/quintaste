import { View } from "react-native";
import { T, common } from "../ui";
import { pilotPrice } from "../../utils/pilot-evidence";
import type { PilotCatalogue, PilotVenue } from "../../types/pilot-catalogue";

export function PilotMenuFacts({ venue, catalogue }: { venue: PilotVenue; catalogue: PilotCatalogue }) {
  const menus = catalogue.menus.filter(item => item.venueId === venue.id);
  const scopes = { "branch-dine-in": "Published dine-in menu", "branch-ordering": "Online ordering prices", "branch-delivery": "Delivery-platform prices", "brand-menu": "Brand menu · branch unconfirmed" };
  return <View style={common.stack}>
    <T variant="subtitle" accessibilityRole="header">Menu Facts</T>
    {!menus.length && <T muted>No verified merchant menu</T>}
    {menus.map(menu => <View key={menu.id} style={common.stack}>
      <T style={common.bold}>{scopes[menu.scope]}</T>
      {catalogue.dishes.filter(item => item.menuId === menu.id).map(dish => <View key={dish.id} style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
          <T variant="small" style={{ flex: 1 }}>{dish.name}</T>
          <T variant="small" style={{ maxWidth: "44%", textAlign: "right" }}>{pilotPrice(dish)}</T>
        </View>
        {!!dish.note && <T variant="caption" muted>{dish.note}</T>}
      </View>)}
      <T variant="small" muted>{menu.charges.gst === "included" ? "GST included" : menu.charges.gst === "excluded" ? menu.charges.gstPercent === null ? "GST extra · rate unknown" : "GST " + menu.charges.gstPercent + "% extra" : "GST treatment unknown"}
        {menu.charges.servicePercent !== null ? " · " + menu.charges.servicePercent + "% service charge" : " · Service charge unknown"}</T>
      <T variant="caption" muted>{menu.effectiveDate ? "Menu effective " + menu.effectiveDate : "Menu effective date unknown"}</T>
      {!!menu.notes && <T variant="small" muted>{menu.notes}</T>}
    </View>)}
    <T variant="small" muted>Dish suitability and full ingredients are unconfirmed.</T>
  </View>;
}
