import type { Href } from 'expo-router';

// A successful sign-in remounts the account-scoped navigation tree. Keep the
// destination in memory until that tree is ready; never persist credentials.
let destination: Href | undefined;
export const setSignInDestination = (value: Href | undefined) => { destination = value; };
export const getSignInDestination = () => destination;
export function takeSignInDestination() {
  const value = destination;
  destination = undefined;
  return value;
}
