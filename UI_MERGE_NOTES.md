# UI merge notes

The supplied UI package has been integrated into the existing Varuna Netra application.
- Replaced the landing/login visual layer with the supplied cinematic maritime UI.
- Integrated the supplied Three.js globe scene and telemetry data.
- Preserved the existing authentication, guest access, signup/reset flows, dashboard routes, backend and API layer.
- Removed the private Emergent visual-edits dependency and wrapper.
- Render Docker build now uses npm install + npm run build so the Three.js dependency is installed from the public npm registry.
