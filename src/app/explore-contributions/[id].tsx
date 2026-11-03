import { useLocalSearchParams } from "expo-router";
import { ContributionDetail } from "../../screens/ExploreContributions";
export default function Contribution(){const {id}=useLocalSearchParams<{id:string}>();return <ContributionDetail key={id} id={id}/>;}
