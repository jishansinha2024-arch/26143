# Render UI Fix

The deployed application previously rendered as raw HTML because `frontend/src/index.css` had lost the Tailwind directives (`@tailwind base`, `@tailwind components`, `@tailwind utilities`) and the global CSS variables/base styles. React was running, but Tailwind and global styles were not generated.

This version restores the complete global stylesheet, keeps the existing Tailwind configuration, and retains the template typography/entry-screen animations.

Render must rebuild the Docker image after this change. Do not reuse an old cached frontend build.
