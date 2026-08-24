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

export { default } from './HomeApproved.jsx';
