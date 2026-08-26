// Homepage-critical styles must travel with the Home lazy chunk itself.
// Do not rely on externalAppsBootstrap: that bootstrap is intentionally Apps-route-only.
import '../styles/HomeHeroExperience2026.css';
import '../styles/HomeHeroCmsOverlayFix.css';
import '../styles/HomeFeaturedTools2026.css';
import '../styles/HomeFeaturedToolsTypography2026.css';

// Editor styles are also Home-owned so TTCM/admin users can open Hero editing
// directly after a cold start without first visiting the Applications route.
import '../styles/HomeHeroCmsEditor.css';
import '../styles/HomeHeroCmsPreviewDock.css';
import '../styles/HomeHeroCmsEditorGoogle.css';
import '../styles/HomeHeroCmsEditorApproved.css';
import '../styles/HomeHeroCmsEditorInteractionFix.css';

// The detailed weekly-practice browser is a Home runtime, not an Apps runtime.
// Load it with the lazy Home chunk so public/anonymous cold visits get the
// complete Grade 10/11/12 week lists without having to sign in or visit Apps.
import '../homePracticeScheduleScroller.js';

// Import HomeApproved before the final Editorial layers so all legacy Home
// styles resolve first. V3 is the final Home presentation authority.
import HomeApproved from './HomeApproved.jsx';
import '../styles/HomeEditorialWarmV1.css';
import '../styles/HomeEditorialWarmV2.css';
import '../styles/HomeEditorialWarmV3.css';

export default HomeApproved;
