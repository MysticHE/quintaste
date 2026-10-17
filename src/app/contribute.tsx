import { Redirect } from "expo-router";
import { ContributionScreen } from "../screens/food/Contributions";

/** The local case service runs only in development; production uses Report A Problem, which files to the staff queue. */
export default function Contribute() { return __DEV__ ? <ContributionScreen /> : <Redirect href="/" />; }
