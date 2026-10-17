import { Redirect, useLocalSearchParams } from "expo-router";
export default function PreviousSellerPage() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={{ pathname: "/market/shop/[id]", params: { id } }} />;
}
