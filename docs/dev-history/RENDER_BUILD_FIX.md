# Render build fix

Fixed the production React build error:
`Module not found: Error: Can't resolve "@/components/archive/ArchiveLessons"`.

The project now explicitly installs the `@` webpack alias in the final CRACO webpack config, and `Archive.jsx` uses a relative import as an additional CI-safe fallback.

Render uses the root Dockerfile; no Render service settings need to change for this specific error.
