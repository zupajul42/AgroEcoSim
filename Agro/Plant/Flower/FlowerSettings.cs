using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Agro.Plant.Flower
{
    public class FlowerSettings
    {
        public InfloresenceType InfloresenceType = InfloresenceType.Solitary;

        // structure
        public bool continous;
        public bool internodeFlower;
        public int flowerDebth;

        public int LateralsPerNode;
        public int FlowersPerInternode;
        internal float stemLengthVar;
        internal bool deterministic;
        internal int clusterSize;
        internal byte floralDepthFactor;
        internal float pFlowerDebth;
        internal int flowerBaseDebth;

        public uint FlowerMaxAge { get; internal set; }
        public int LateralAngle { get; internal set; }
        public int LateralRoll { get; internal set; }
    }
}
