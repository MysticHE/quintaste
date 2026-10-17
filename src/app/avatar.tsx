import { useFood } from "../state/Food";
import { AvatarScreen } from "../screens/Avatar";
import { Screen } from "../components/Screen";
import { T } from "../components/ui";
import { useAuth } from "../state/Auth";
export default function AvatarRoute() {
  const { owner, ready, readable } = useFood();
  const { user, pending } = useAuth();
  if (pending || !ready || !readable) return <Screen title="Your Avatar" backTo="/account"><T>Loading your saved avatar...</T></Screen>;
  return <AvatarScreen key={(user?.id || "guest") + ":" + owner} />;
}
