# leaf designer

data model: `src/types/leaf.ts`.

Every leaf has:

-   a petiole (main stem)
-   one shape (a leaflet blueprint - geom), which is instanced one or more times
-   a color ramp over its lifetime

2 types of leaf: simple and compound.

A simple leaf has a single instance of its shape. A compound leaf has several instances of the
same shape, laid out palmately (fanning from the petiole tip) or pinnately (in pairs or
alternating along the petiole, optionally with a terminal leaflet).

A shape points at one geometry per level of detail. A geometry is an outline polygon plus,
optionally, the vein tree it was generated from; margin type and tooth size/depth also belong
to the geometry, since they change the outline itself. Blade stretch, instance size and the
layout angle may be a fixed number or a `{ min, max }` range rolled from the leaf's seed.

```js
const chestnutLeaf = {
    name: "Chestnut",
    shape: [
        {
            geom: ["def:obovate"], // one geometry id per LOD, 0 = most detailed
            scaleX: [1], // per LOD; number or { min, max }
            petiolule: { len: 0.2, width: 0.1, angle: 0 },
        },
    ],
    layout: { type: "palmate", arrangement: "opposite", terminalLeaf: true, angle: 210 },
    instances: [{ shape: 0, scale: 1 }, { shape: 0, scale: 1 }, ...], // 5 leaflets
    petiole: { len: 1.5, width: 0.15, angle: 0 },
    colorRamp: [{ t: 0, color: "#4e8f2f" }, { t: 1, color: "#8a6d3b" }],
};
```

A vein node has a position, children, and optional `bend` / `fold` angles that deform the blade
around that vein in 3D. Tips push the outline out by their `margin`; joints control the lobe
between their children.

## Questions:

-   in theory this could be a complete design tool for all leaf types (ignoring the individual more complex leaf foldings)
-   should everything be animated over time? (or just fixed mesh scaled in size while growing)
