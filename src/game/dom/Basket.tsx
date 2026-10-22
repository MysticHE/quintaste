/**
 * The Gather round's basket (Recipe Kitchen From memory): it covers the stations until every ingredient the recipe needs is in.
 * Empty spaces never name what is missing, since the tier is played from memory; a dropped card lands here (RushHour `shelf.drop`).
 */
import { ITEMS, itemName } from "../content/items";
import * as sim from "../sim/engine";
import { box, type Art } from "./Hud";
import { stationsBox, type Layout } from "./layout";

export function Basket({ run, L, art, over }: { run: sim.Run; L: Layout; art: Art; over: boolean }) {
  const g = run.gather;
  if (!g || !run.started || !sim.gathering(run)) return null;
  // Ingredients fill the basket in the order they were dropped, so where one lands never hints at the recipe's order.
  const have = g.order.length, spaces = [...g.order, ...g.got.slice(have).map(() => null)];
  return <div className={"layer panel basket" + (over ? " over" : "")} style={box(stationsBox(L))} role="region" aria-label={"Basket, " + have + " of " + g.need.length + " ingredients"}>
    <div className="bhead"><b>Basket</b><small>{have} of {g.need.length}</small></div>
    <div className="bslots">{spaces.map((id, i) => <span key={i} className={"bslot" + (id ? " in" : "")}>
      {id ? <img src={art[ITEMS[id].art]} alt={itemName(id)} /> : <span aria-hidden="true">?</span>}</span>)}</div>
  </div>;
}
