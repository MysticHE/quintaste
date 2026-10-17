import { ListingPhotos } from "../market/ListingPhotos";
export function RecipePhoto({ value, label, onChange, disabled, onBusy }: { value?: string; label: string; onChange: (value?: string) => void; disabled: boolean; onBusy: (busy: boolean) => void }) {
  return <ListingPhotos slots={["item"]} labels={{ item: label }} value={{ item: value }} onChange={photos => onChange(photos.item)} disabled={disabled} onBusy={onBusy} />;
}
