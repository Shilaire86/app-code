import { Redirect } from 'expo-router';

// The macro calculator now lives in the Nutrition flow, which persists targets
// to the user's profile. This route forwards there so there's a single source
// of truth for macro calculation.
export default function MacroToolRedirect() {
    return <Redirect href="/nutrition/calculator" />;
}
