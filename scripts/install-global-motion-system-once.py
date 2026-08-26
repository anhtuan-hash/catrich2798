from pathlib import Path


def patch_once(path, old, new, label):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if new in text:
        return False
    if old not in text:
        raise SystemExit(f'Marker not found for {label}: {path}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')
    return True


# main.jsx: load the new motion CSS after the old hard-off contract and bootstrap runtime.
patch_once(
    'src/main.jsx',
    "import './styles/v1159.css';",
    "import './styles/v1159.css';\nimport './styles/GlobalMotionSystem.css';",
    'motion stylesheet import',
)

patch_once(
    'src/main.jsx',
    "import { installRetiredFeatureCleanup } from './utils/retiredFeatureCleanup.js';",
    "import { installRetiredFeatureCleanup } from './utils/retiredFeatureCleanup.js';\nimport { installGlobalMotionSystem } from './utils/globalMotionSystem.js';",
    'motion runtime import',
)

patch_once(
    'src/main.jsx',
    "runConfigurationMigrations();\ninstallRetiredFeatureCleanup();",
    "runConfigurationMigrations();\ninstallGlobalMotionSystem();\ninstallRetiredFeatureCleanup();",
    'motion runtime bootstrap',
)

# AdminPage: mount one central Admin control and make sidebar Config jump to it.
patch_once(
    'src/pages/AdminPage.jsx',
    "} from '../utils/permissions.js';",
    "} from '../utils/permissions.js';\nimport GlobalMotionAdminPanel from '../components/admin/GlobalMotionAdminPanel.jsx';",
    'admin motion import',
)

patch_once(
    'src/pages/AdminPage.jsx',
    "    config: '.admin-sync-panel',",
    "    config: '#admin-global-motion',",
    'admin config navigation target',
)

patch_once(
    'src/pages/AdminPage.jsx',
    "          </section>\n\n          <section className=\"metro-admin-header metro-panel admin-sync-panel\">",
    "          </section>\n\n          <GlobalMotionAdminPanel currentUser={currentUser} language={language} />\n\n          <section className=\"metro-admin-header metro-panel admin-sync-panel\">",
    'admin motion panel mount',
)

print('Global motion system patched into main.jsx and AdminPage.jsx')
