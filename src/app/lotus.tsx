import { LotusScreen } from "../screens/Lotus";
import { useAuth } from "../state/Auth";

export default function LotusRoute() {
  const { user } = useAuth();
  return <LotusScreen key={user?.id || "guest"} />;
}
