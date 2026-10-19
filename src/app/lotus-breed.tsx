import { LotusBreedScreen } from "../screens/LotusBreed";
import { useAuth } from "../state/Auth";

export default function LotusBreedRoute() {
  const { user } = useAuth();
  return <LotusBreedScreen key={user?.id || "guest"} />;
}
