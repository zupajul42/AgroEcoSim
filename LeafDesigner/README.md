# LeafDesigner

A browser tool for designing parametric leaf meshes for AgroEcoSim. Leaves are described by a
small data model (see `src/types/leaf.ts`) and rendered with Three.js; everything is stored in
the browser's local storage and can be exported as `.obj` meshes or `.json` configs.

Built with Preact, TypeScript and Vite.

## Getting started

-   `npm install`
-   `npm run dev` — dev server at http://localhost:5173/
-   `npm run build` — production build into `dist/`
-   `npm run preview` — serves the production build

## Pages

-   **Library** (`/`) — all leaf models and geometries; import/export configs.
-   **Leaf Designer** (`/leaf`) — leaf parameters (layout, instances, stems, scale, color) next to a live 3D preview.
-   **Geometry Editor** (`/leaf/geometry/:id`) — 2D editor for a geometry: outline points or a vein tree
    that generates the outline, with margin teeth and per-vein bend/fold.

## Layout

-   `src/pages/` — the three pages, `AppState.ts` (local-storage library) and the built-in geometries
-   `src/components/designer/` — the geometry editor and the Three.js preview / mesh assembly
-   `src/components/common/` — sliders and the color ramp
-   `src/utils/` — vein outline & blade mesh generation (`veinGenerator.ts`), margin teeth, LOD and random helpers
