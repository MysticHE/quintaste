import { useFood } from "../state/Food";
import { AvatarScreen } from "../screens/Avatar";
import { Screen } from "../components/Screen";
import { T } from "../components/ui";
import { useAuth } from "../state/Auth";
import { useT } from "../i18n";
export default function AvatarRoute() {
  const { owner, ready, readable } = useFood();
  const { user, pending } = useAuth(), t = useT("me");
  if (pending || !ready || !readable) return <Screen title={t("yourAvatar")} backTo="/account"><T>{t("loadingAvatar")}</T></Screen>;
  return <AvatarScreen key={(user?.id || "guest") + ":" + owner} />;
}
