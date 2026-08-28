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
import '../weeklyPractice20MinuteGuard.js';

// The weekly runner is portaled to document.body. Its structural stylesheet must
// travel with Home as well; otherwise the portal falls back into raw document flow.
import '../components/GlobalWeeklyPractice.css';

// HomeApproved owns behaviour/data. Warm V5 + Sage V6 keep the established
// editorial layout contract. Blue V9 is the final Home-only production skin.
import HomeApproved from './HomeApproved.jsx';
import '../styles/HomeEditorialWarmV5.css';
import '../styles/HomeEditorialSageV6.css';
import '../styles/WeeklyPracticeEditorial2026.css';
import '../styles/HomeEditorialBlueV9.css';

export default HomeApproved;