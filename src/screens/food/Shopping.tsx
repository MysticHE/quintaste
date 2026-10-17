import { useState } from "react";
import { Share, View } from "react-native";
import { CookLayout as Screen } from "../../components/recipes/CookLayout";
import { Button, Field, T, common } from "../../components/ui";
import { Chip, Chips, EmptyState, IconButton, InfoBox } from "../../components/food/Controls";
import { ShoppingSection } from "../../components/recipes/ShoppingParts";
import { useRecipeWorkspace } from "../../hooks/useRecipeWorkspace";
import { cookingRecipeById } from "../../utils/private-recipes";
import { combinedRows, recipeRows, shoppingShareText, type ShoppingRow } from "../../utils/shopping";

/** A private list for the cook's own trip: no stock, price or store claims. Ticked means "got it" or "already have it". */
export function ShoppingScreen() {
  const state = useRecipeWorkspace(), [text, setText] = useState(""), [fallback, setFallback] = useState("");
  const notes = state.workspace.shopping, view = state.workspace.shoppingView, locked = !state.readable;
  const recipeName = (id: string) => cookingRecipeById(id, state.workspace)?.name || "Removed recipe";
  const sections = view === "recipe" ? recipeRows(notes, recipeName) : combinedRows(notes);
  const got = notes.filter(note => note.checked), toGet = notes.length - got.length;
  const add = async () => { const value = text.trim(); if (value && await state.shop("", value)) setText(""); };
  const toggle = (row: ShoppingRow) => void state.change(w => ({ ...w, shopping: w.shopping.map(note => row.ids.includes(note.id) ? { ...note, checked: !row.checked } : note) }));
  const remove = (ids: string[]) => void state.change(w => ({ ...w, shopping: w.shopping.filter(note => !ids.includes(note.id)) }));
  const share = async () => { const message = shoppingShareText(notes); try { await Share.share({ message }); } catch { setFallback(message); } };
  return <Screen title="Shopping" backTo="/cook">
    <Field label="Add Item" value={text} onChangeText={setText} maxLength={300} editable={!locked} onSubmitEditing={() => void add()} trailing={<IconButton label="Add Item" icon="add" disabled={locked || !text.trim() || state.saving} onPress={() => void add()} />} />
    {!notes.length ? <EmptyState title="Nothing On Your List" text="Add an item or use a recipe’s ingredients." icon="basket-outline" /> : <>
      <View style={common.spread}>
        <Chips label="Shopping view">{(["combined", "recipe"] as const).map(value => <Chip key={value} compact role="radio" label={value === "combined" ? "Combined" : "By Recipe"}
          selected={view === value} disabled={locked} onPress={() => void state.change(w => ({ ...w, shoppingView: value }))} />)}</Chips>
        <IconButton label="Share Shopping List" icon="share-outline" disabled={!toGet} onPress={() => void share()} />
      </View>
      <T variant="small" muted accessibilityLiveRegion="polite">{toGet} to get{got.length ? " · " + got.length + " ticked" : ""}</T>
      {sections.map((section, index) => <ShoppingSection key={index + section.title} title={section.title} rows={section.rows} recipeName={recipeName} disabled={locked} onToggle={toggle}
        onRemoveSection={view === "recipe" ? () => remove(section.rows.flatMap(row => row.ids)) : undefined} />)}
      {!!got.length && <Button label={"Clear Ticked Items (" + got.length + ")"} variant="link" disabled={locked} onPress={() => remove(got.map(note => note.id))} />}
      {!!fallback && <InfoBox title="Sharing Unavailable" text="Select and copy your list."><T selectable>{fallback}</T><Button label="Close" variant="link" onPress={() => setFallback("")} /></InfoBox>}
    </>}
  </Screen>;
}
