import { LeafGeometry, VeinData } from "../types/leaf";
import { generateOutlineFromVeins } from "../utils/veinGenerator";

type VeinGeometry = Omit<LeafGeometry, "points" | "veins"> & { veins: VeinData };

const withOutline = (g: VeinGeometry): LeafGeometry => ({
  ...g,
  points: generateOutlineFromVeins(g.veins, { mirrorX: true }),
});

const quad: LeafGeometry = {
  id: "def:quad",
  name: "quad",
  points: [
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 2 },
    { x: -1, y: 2 },
  ],
  veins: null,
};

const ovate: VeinGeometry = {
  id: "def:ovate",
  name: "ovate",
  veins: {
    root: {
      id: "vein-root",
      x: 0,
      y: 0,
      children: [
        {
          id: "vein-k8w1fxm",
          x: 0,
          y: 0.4,
          children: [
            {
              id: "vein-qsqcb24",
              x: 0,
              y: 1,
              children: [
                { id: "vein-69hj8za", x: 0, y: 1.8, children: [] },
                { id: "vein-0w3qjlc", x: 0.3, y: 1.3, children: [] },
              ],
            },
            { id: "vein-lb6lgfp", x: 0.4, y: 0.7, children: [] },
          ],
        },
        { id: "vein-y7ogjf3", x: 0.2, y: 0.1, children: [] },
      ],
    },
    params: { lobeDepth: 0, lobeThreshold: 0, tipOffset: 0.27, lateralOffset: 0, curvature: 0.66, subdivisions: 3 },
  },
};

const obovate: VeinGeometry = {
  id: "def:obovate",
  name: "obovate",
  veins: {
    root: {
      id: "vein-root",
      x: 0,
      y: 0,
      children: [
        {
          id: "vein-mid-1",
          x: 0,
          y: 0.4,
          children: [
            { id: "vein-1", x: 0.5, y: 0.9, children: [] },
            {
              id: "vein-mid-2",
              x: 0,
              y: 1,
              children: [
                { id: "vein-2", x: 0.6, y: 1.5, children: [], tipOffset: 0.19, curvature: 0 },
                {
                  id: "vein-mid-3",
                  x: 0,
                  y: 1.5,
                  children: [
                    { id: "vein-3", x: 0.5, y: 2, children: [] },
                    { id: "vein-apex", x: 0, y: 2.2, children: [] },
                  ],
                },
              ],
            },
          ],
        },
        { id: "vein-190lu23", x: 0.2, y: 0.3, children: [] },
      ],
    },
    params: { lobeDepth: 0, lobeThreshold: 0, tipOffset: 0.15, lateralOffset: 0, curvature: 0.82, subdivisions: 3 },
  },
};

const elliptic: VeinGeometry = {
  id: "def:elliptic",
  name: "elliptic",
  veins: {
    root: {
      id: "vein-root",
      x: 0,
      y: 0,
      children: [
        {
          id: "vein-mid-1",
          x: 0,
          y: 0.4,
          children: [
            { id: "vein-1", x: 0.4, y: 0.6, children: [] },
            {
              id: "vein-mid-2",
              x: 0,
              y: 0.8,
              children: [
                { id: "vein-2", x: 0.5, y: 1.1, children: [] },
                {
                  id: "vein-mid-3",
                  x: 0,
                  y: 1.4,
                  children: [
                    { id: "vein-3", x: 0.3, y: 1.6, children: [], curvature: 0.5 },
                    { id: "vein-apex", x: 0, y: 2.1, children: [], curvature: 0.5, tipOffset: 0.15 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    params: {
      lobeDepth: 0,
      lobeThreshold: 1,
      tipOffset: 0.15,
      lateralOffset: 0,
      curvature: 0.5,
      subdivisions: 3,
      marginInfluence: 1,
    },
  },
};

const oblong: VeinGeometry = {
  id: "def:oblong",
  name: "oblong",
  veins: {
    root: {
      id: "vein-root",
      x: 0,
      y: 0,
      children: [
        {
          id: "vein-k8w1fxm",
          x: 0,
          y: 0.1,
          children: [
            {
              id: "vein-qsqcb24",
              x: 0,
              y: 1,
              children: [
                { id: "vein-69hj8za", x: 0, y: 1.8, children: [] },
                { id: "vein-0w3qjlc", x: 0.3, y: 1.5, children: [] },
              ],
            },
            { id: "vein-lb6lgfp", x: 0.2, y: 0.2, children: [] },
          ],
        },
      ],
    },
    params: { lobeDepth: 0, lobeThreshold: 0, tipOffset: 0.27, lateralOffset: 0, curvature: 0.66, subdivisions: 3 },
  },
};

const lanceolate: VeinGeometry = {
  id: "def:lanceolate",
  name: "lanceolate",
  veins: {
    root: {
      id: "vein-root",
      x: 0,
      y: 0,
      children: [
        {
          id: "vein-mid-1",
          x: 0,
          y: 0.3,
          children: [
            { id: "vein-1", x: 0.2, y: 0.5, children: [] },
            {
              id: "vein-mid-2",
              x: 0,
              y: 0.6,
              children: [
                { id: "vein-2", x: 0.3, y: 0.9, children: [] },
                {
                  id: "vein-mid-3",
                  x: 0,
                  y: 1.4,
                  children: [
                    { id: "vein-3", x: 0.2, y: 1.7, children: [] },
                    { id: "vein-apex", x: 0, y: 2.4, children: [] },
                  ],
                },
                { id: "vein-9h7gitf", x: 0, y: 1, children: [{ id: "vein-z9p0q3e", x: 0.3, y: 1.3, children: [] }] },
              ],
            },
          ],
        },
      ],
    },
    params: { lobeDepth: 0, lobeThreshold: 0, tipOffset: 0.09, lateralOffset: 0, curvature: 0.56, subdivisions: 3 },
  },
};

const linear: VeinGeometry = {
  id: "def:linear",
  name: "linear",
  veins: {
    root: {
      id: "vein-root",
      x: 0,
      y: 0,
      children: [
        { id: "vein-1", x: 0.3, y: 0.1, children: [] },
        {
          id: "vein-mid-2",
          x: 0,
          y: 0.6,
          children: [
            { id: "vein-2", x: 0.4, y: 0.8, children: [] },
            {
              id: "vein-mid-3",
              x: 0,
              y: 1.7,
              children: [
                { id: "vein-3", x: 0.3, y: 2.1, children: [] },
                { id: "vein-apex", x: 0, y: 3, children: [] },
              ],
            },
          ],
        },
      ],
    },
    params: {
      lobeDepth: 0,
      lobeThreshold: 0.15,
      tipOffset: 0.1,
      lateralOffset: 0,
      curvature: 0.5,
      subdivisions: 6,
      marginInfluence: 1,
    },
  },
};

const orbicular: VeinGeometry = {
  id: "def:orbicular",
  name: "orbicular",
  veins: {
    root: {
      id: "vein-root",
      x: 0,
      y: 0,
      children: [
        {
          id: "vein-mid-1",
          x: 0,
          y: 0.2,
          children: [
            { id: "vein-1", x: 0.5, y: 0.4, children: [] },
            {
              id: "vein-mid-2",
              x: 0,
              y: 0.7,
              children: [
                { id: "vein-2", x: 0.7, y: 0.9, children: [] },
                {
                  id: "vein-mid-3",
                  x: 0,
                  y: 1.2,
                  children: [
                    { id: "vein-3", x: 0.7, y: 1.4, children: [] },
                    { id: "vein-apex", x: 0, y: 2, children: [] },
                    {
                      id: "vein-g4s91lo",
                      x: 0,
                      y: 1.8,
                      children: [{ id: "vein-bpztc2c", x: 0.2, y: 2, children: [] }],
                    },
                    {
                      id: "vein-kxl3nj6",
                      x: 0,
                      y: 1.6,
                      children: [{ id: "vein-zdj7yrb", x: 0.5, y: 1.8, children: [] }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    params: { lobeDepth: 0, lobeThreshold: 0, tipOffset: 0.18, lateralOffset: 0, curvature: 0.5, subdivisions: 3 },
  },
};

const flabellate: VeinGeometry = {
  id: "def:flabellate",
  name: "flabellate",
  veins: {
    root: {
      id: "vein-root",
      x: 0,
      y: 0,
      children: [
        { id: "vein-1", x: 1.4, y: 0, children: [], curvature: 0 },
        { id: "vein-2", x: 1.3, y: 1.1, children: [], curvature: 0.78 },
        { id: "vein-3", x: 0.7, y: 1.8, children: [] },
        { id: "vein-apex", x: 0, y: 2, children: [], curvature: 1 },
      ],
    },
    params: {
      lobeDepth: 0,
      lobeThreshold: 0.15,
      tipOffset: 0.15,
      lateralOffset: 0,
      curvature: 0.5,
      subdivisions: 6,
      marginInfluence: 1,
    },
  },
};

const deltoid: VeinGeometry = {
  id: "def:deltoid",
  name: "deltoid",
  veins: {
    root: {
      id: "vein-root",
      x: 0,
      y: 0,
      children: [
        {
          id: "vein-k8w1fxm",
          x: 0,
          y: 0.3,
          children: [
            {
              id: "vein-qsqcb24",
              x: 0,
              y: 1.1,
              children: [
                { id: "vein-69hj8za", x: 0, y: 1.8, children: [] },
                { id: "vein-0w3qjlc", x: 0.1, y: 1.4, children: [] },
              ],
            },
            { id: "vein-lb6lgfp", x: 0.7, y: 0.5, children: [] },
          ],
        },
        { id: "vein-05yprpc", x: 0.6, y: 0.1, children: [] },
      ],
    },
    params: { lobeDepth: 0, lobeThreshold: 0, tipOffset: 0.27, lateralOffset: 0, curvature: 0.5, subdivisions: 4 },
  },
};

const cordate: VeinGeometry = {
  id: "def:cordate",
  name: "cordate",
  veins: {
    root: {
      id: "vein-root",
      x: 0,
      y: 0,
      children: [
        {
          id: "vein-k8w1fxm",
          x: 0,
          y: 0.4,
          children: [
            {
              id: "vein-qsqcb24",
              x: 0,
              y: 1,
              children: [
                { id: "vein-69hj8za", x: 0, y: 1.8, children: [] },
                { id: "vein-0w3qjlc", x: 0.3, y: 1.2, children: [] },
              ],
            },
            { id: "vein-lb6lgfp", x: 0.6, y: 0.6, children: [] },
          ],
        },
        { id: "vein-s3dfb4x", x: 0.1, y: -0.1, children: [] },
        { id: "vein-05yprpc", x: 0.6, y: 0.1, children: [] },
      ],
    },
    params: {
      lobeDepth: 0,
      lobeThreshold: 0,
      tipOffset: 0.27,
      lateralOffset: 0,
      curvature: 0.66,
      subdivisions: 3,
      marginInfluence: 1,
    },
  },
};

const obcordate: VeinGeometry = {
  id: "def:obcordate",
  name: "obcordate",
  veins: {
    root: {
      id: "vein-root",
      x: 0,
      y: 0,
      children: [
        {
          id: "vein-k8w1fxm",
          x: 0,
          y: 0.2,
          children: [
            {
              id: "vein-qsqcb24",
              x: 0,
              y: 0.5,
              children: [
                { id: "vein-69hj8za", x: 0, y: 0.6, children: [] },
                { id: "vein-0w3qjlc", x: 0.1, y: 0.8, children: [] },
              ],
            },
            { id: "vein-lb6lgfp", x: 0.3, y: 0.7, children: [], curvature: 1 },
          ],
          lobeDepth: 0,
          lobeThreshold: 0,
        },
      ],
    },
    params: {
      lobeDepth: 0,
      lobeThreshold: 0,
      tipOffset: 0.27,
      lateralOffset: 0,
      curvature: 0.54,
      subdivisions: 5,
      marginInfluence: 1,
    },
  },
};

const truncate: VeinGeometry = {
  id: "def:truncate",
  name: "truncate",
  veins: {
    root: {
      id: "vein-root",
      x: 0,
      y: 0,
      children: [
        {
          id: "vein-mid-1",
          x: 0,
          y: 0.4,
          children: [
            { id: "vein-1", x: 0.5, y: 0.9, children: [] },
            {
              id: "vein-mid-2",
              x: 0,
              y: 1,
              children: [
                { id: "vein-2", x: 0.6, y: 1.5, children: [], tipOffset: 0.19, curvature: 0 },
                {
                  id: "vein-mid-3",
                  x: 0,
                  y: 1.5,
                  children: [
                    { id: "vein-3", x: 0.6, y: 2.2, children: [], curvature: 1 },
                    { id: "vein-apex", x: 0, y: 2.2, children: [], curvature: 0, tipOffset: 0.2 },
                  ],
                },
              ],
            },
          ],
        },
        { id: "vein-190lu23", x: 0.2, y: 0.3, children: [] },
      ],
    },
    params: {
      lobeDepth: 0,
      lobeThreshold: 0,
      tipOffset: 0.15,
      lateralOffset: 0,
      curvature: 0.82,
      subdivisions: 3,
      marginInfluence: 1,
    },
  },
};

const lobbed: VeinGeometry = {
  id: "def:lobbed",
  name: "lobbed",
  veins: {
    root: {
      id: "vein-root",
      x: 0,
      y: 0,
      children: [
        {
          id: "vein-mid-1",
          x: 0,
          y: 0.2,
          children: [
            { id: "vein-1", x: 0.4, y: 0.4, children: [] },
            {
              id: "vein-mid-2",
              x: 0,
              y: 1.5,
              children: [
                { id: "vein-2", x: 0.6, y: 1.8, children: [] },
                {
                  id: "vein-mid-3",
                  x: 0,
                  y: 2,
                  children: [
                    { id: "vein-apex", x: 0, y: 2.3, children: [] },
                    { id: "vein-8wibb1e", x: 0.1, y: 2.1, children: [] },
                  ],
                },
              ],
            },
            {
              id: "vein-wsj0m98",
              x: 0,
              y: 0.6,
              children: [
                { id: "vein-nfv9zdu", x: 0.6, y: 0.9, children: [] },
                { id: "vein-8is5o48", x: 0.7, y: 1.2, children: [] },
              ],
            },
          ],
        },
      ],
    },
    params: { lobeDepth: 0.26, lobeThreshold: 0.4, tipOffset: 0.15, lateralOffset: 0, curvature: 1, subdivisions: 3 },
  },
};

const palmatifid: VeinGeometry = {
  id: "def:palmatifid",
  name: "palmatifid",
  veins: {
    root: {
      id: "vein-root",
      x: 0,
      y: 0,
      children: [
        {
          id: "vein-3vi1abb",
          x: 0.6,
          y: 0,
          children: [{ id: "vein-442kbyg", x: 1.2, y: 0.1, children: [] }],
          lateralOffset: 0.3,
        },
        {
          id: "vein-2",
          x: 0.5,
          y: 0.6,
          children: [{ id: "vein-jzj330f", x: 1.3, y: 1.3, children: [] }],
          lateralOffset: 0.46,
        },
        {
          id: "vein-mid-3",
          x: 0,
          y: 1.3,
          children: [{ id: "vein-apex", x: 0, y: 2, children: [], curvature: 0.48 }],
          lateralOffset: 0.38,
        },
      ],
    },
    params: {
      lobeDepth: 0.36,
      lobeThreshold: 0.44,
      tipOffset: 0.15,
      lateralOffset: 0,
      curvature: 0.5,
      subdivisions: 6,
    },
  },
};

const palmatilobate: VeinGeometry = {
  id: "def:palmatilobate",
  name: "palmatilobate",
  veins: {
    root: {
      id: "vein-root",
      x: 0,
      y: 0,
      children: [
        { id: "vein-05yprpc", x: 0.5, y: -0.2, children: [] },
        { id: "vein-eyur8ly", x: 1, y: 0.4, children: [] },
        {
          id: "vein-bk8278p",
          x: 0,
          y: 1.3,
          children: [
            { id: "vein-0bufsl0", x: 0, y: 2, children: [] },
            { id: "vein-gan0z7j", x: 0.3, y: 1.5, children: [] },
          ],
        },
        { id: "vein-uwkxaqf", x: 0.8, y: 1.1, children: [] },
      ],
    },
    params: { lobeDepth: 0.22, lobeThreshold: 0.52, tipOffset: 0.27, lateralOffset: 0, curvature: 1, subdivisions: 6 },
  },
};

export const PREDEFINED_GEOMETRIES: LeafGeometry[] = [
  quad,
  ...[
    ovate,
    obovate,
    elliptic,
    oblong,
    lanceolate,
    linear,
    orbicular,
    flabellate,
    deltoid,
    cordate,
    obcordate,
    truncate,
    lobbed,
    palmatifid,
    palmatilobate,
  ].map(withOutline),
];
