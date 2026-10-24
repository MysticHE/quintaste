import { DestinationScreen } from "../../components/navigation/DestinationScreen";
import { useT } from "../../i18n";

export function GameScreen() {
  const t = useT("game");
  return <DestinationScreen kind="game" title={t("comingTitle")} message={t("comingMessageWait")}
    action={t("cookSomething")} href="/cook" />;
}
