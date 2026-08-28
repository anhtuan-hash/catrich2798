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

// Home is intentionally a light entry surface. Detailed per-week browsing remains
// inside the practice experience instead of being injected into each Home grade card.

// HomeApproved owns behaviour/data. Warm V5 keeps the established editorial
// layout contract; Sage V6 owns the approved palette; V7 keeps grade cards minimal.
import HomeApproved from './HomeApproved.jsx';
import '../styles/HomeEditorialWarmV5.css';
import '../styles/HomeEditorialSageV6.css';
import '../styles/HomeEditorialGradeMinimalV7.css';

export default HomeApproved;
