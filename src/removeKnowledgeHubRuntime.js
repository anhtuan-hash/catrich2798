// Legacy compatibility shim.
//
// Knowledge Hub is an active production route again. This module used to remove
// `knowledge-hub` from the shared APPS registry and redirect direct bookmarks to
// `#/apps` before main.jsx mounted. applicationBootstrap.jsx still imports this
// file for backward compatibility, so it must remain intentionally side-effect
// free. Keeping the shim prevents stale deployments/import graphs from failing
// while ensuring the active Knowledge Hub route is never retired at bootstrap.

export const KNOWLEDGE_HUB_RUNTIME_STATUS = Object.freeze({
  active: true,
  redirects: false,
  mutatesRegistry: false,
});
