# leaf designer

every leaf has:

-   petiole
-   margin
-   venation (not required in mesh)

2 types of leaf: simple and compound.

Simple leaf has a shape (predefined silhouette, but could be modified).
Compound leaf consists of multiple (same) simple leaves

would store as:

```js
// shapePresets -> designed by current version of shape designer. I will do all normal shapes (see morphology), but i also want the possibly to extend on these defaults and create "new" more individual shapes

const simpleLeaf = {
    name: "simple leaf",
    shape: [
        {
            geom: chooseFromPresets, // elliptic
            margin: "serrate",
            venation: "arcuate",
            folding: "none",
            petiolule: { len, angle },
        },
    ],
    layout: {
        type: "palmate" | "pinnate" | "bipinnate",
        arrangement: "alternate" | "opposite" | "whorled",
        terminalLeaf: true,
    },
    instances: [{ shape: 0 }],
    petiole: { len, angle },
};

const chestnutLeaf = {
    name: "chestnut std",
    shape: [
        {
            geom: chooseFromPresets, // obovate
            margin: "serrate",
            venation: "palmate",
            folding: "none",
            petiolule: { len: 0, angle: 0 },
        },
    ],
    layout: {
        type: "palmate",
        arrangement: "opposite",
        terminalLeaf: true,
    },
    instances: [
        { shape: 0, scale: 1 }, // 5 leaflets
        { shape: 0, scale: 1, ... }, // individual optional props
        { shape: 0, scale: 1 },
        { shape: 0, scale: 1 },
        { shape: 0, scale: 1 },
    ],
    petiole: { len: 1, angle: 0 },
};
```

Leaflet:

## Questions:

-   Good layout for start? in theory it could be a complete design tool for all leaf types (ignoring the individual more complex leaf foldings)
-   should everything be animated over time? (or just fixed mesh scaled in size while growing)
