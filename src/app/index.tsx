import { Redirect } from 'expo-router';

// The app's front door. For now it goes straight to the passport; if road
// trips (or other features) arrive, a real landing page replaces this redirect.
export default function Index() {
  return <Redirect href="/passport" />;
}
