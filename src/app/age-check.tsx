import { accountsEnabled } from '../services/auth-client';
import { AccountEligibilityScreen } from '../screens/AccountEligibility';
import { AgeCheckScreen } from '../screens/food/ProfileAccess';
export default accountsEnabled ? AccountEligibilityScreen : AgeCheckScreen;
