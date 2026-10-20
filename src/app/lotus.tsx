import { LotusScreen } from "../screens/Lotus";
import { GamePreferences } from "../screens/game/GamePreferences";
import { useAuth } from "../state/Auth";

export default function LotusRoute() {
  const { user } = useAuth();
  // The lotus is game art, so the game's Reduce motion choice applies here; text size stays the app's.
  return <GamePreferences motionOnly><LotusScreen key={user?.id || "guest"} /></GamePreferences>;
}
