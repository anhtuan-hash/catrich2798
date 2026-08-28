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

// Home stays a light entry surface. Grade buttons open the dedicated practice hub;
// the legacy lesson runner must never mount inline below the Home footer.
import '../homePracticeGradeEntryLauncher.js';

// HomeApproved owns behaviour/data. Warm V5 keeps the established editorial
// layout contract; Sage V6 owns the approved palette; V8 owns the refined,
// minimal grade-entry cards.
import HomeApproved from './HomeApproved.jsx';
import '../styles/HomeEditorialWarmV5.css';
import '../styles/HomeEditorialSageV6.css';
import '../styles/HomeEditorialGradeRefinedV8.css';

export default HomeApproved;
