// Cosmic Settings scene — decorative only (aria-hidden). Pure CSS/SVG layers,
// scoped to the settings route via SettingsCosmic.css. No images, no data.
import React from 'react';

export default function SettingsCosmicScene() {
  return (
    <div className="cosmic-settings-scene" aria-hidden="true">
      <span className="cosmic-nebula cosmic-nebula--violet" />
      <span className="cosmic-nebula cosmic-nebula--blue" />
      <span className="cosmic-nebula cosmic-nebula--pink" />

      <span className="cosmic-stars cosmic-stars--far" />
      <span className="cosmic-stars cosmic-stars--mid" />
      <span className="cosmic-stars cosmic-stars--near" />

      <span className="cosmic-comet cosmic-comet--one" />
      <span className="cosmic-comet cosmic-comet--two" />

      <span className="cosmic-planet cosmic-planet--ringed">
        <span className="cosmic-planet-ring" />
      </span>
      <span className="cosmic-planet cosmic-planet--small" />
      <span className="cosmic-moon" />

      <div className="cosmic-horizon">
        <span className="cosmic-horizon-glow" />
        <span className="cosmic-platform" />
        <span className="cosmic-platform-beam" />
      </div>
    </div>
  );
}
