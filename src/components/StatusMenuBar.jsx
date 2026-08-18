// The global NEWS / briefing strip has been retired from Brian English.
// Keep this component as a null renderer so the shared shell remains stable
// while no news, clock, weather UI, timers, geolocation, or briefing API calls
// are mounted anywhere in the application.
export default function StatusMenuBar() {
  return null;
}
