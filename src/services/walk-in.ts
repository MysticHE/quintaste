import AsyncStorage from '@react-native-async-storage/async-storage';
import { createWalkInState } from './walk-in-state';

export const walkIn = createWalkInState(AsyncStorage);
