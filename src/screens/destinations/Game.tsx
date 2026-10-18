import { DestinationScreen } from "../../components/navigation/DestinationScreen";

export function GameScreen() {
  return <DestinationScreen kind="game" title="Rush Hour is on its way" message="A quick cooking game: plate hawker favourites before the queue grows. Cook a real one while you wait."
    action="Cook Something" href="/cook" />;
}
