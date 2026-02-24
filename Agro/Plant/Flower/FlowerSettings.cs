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
        
        public readonly List<OrganTypes> FlowerOrgans = new List<OrganTypes> { OrganTypes.FlowerPetiol, OrganTypes.FlowerPadel, OrganTypes.FlowerMeristem, OrganTypes.FlowerStem };

        public FlowerSettings()
        {
        }

        // structure
        public bool continous { get; set; }=false;
        public bool internodeFlower { get; set; } = false;
        public int flowerDebth { get; set; } =1;

        public int LateralsPerNode { get; set; } = 2;
        public int FlowersPerInternode { get; set; } = 0;
        public float stemLengthVar { get; set; } = 0.09f;
        public bool deterministic { get; set; } = false;
        public int clusterSize { get; set; } = 1;
        public byte floralDepthFactor { get; set; } = 0;
        public float pFlowerDebth { get; set; } = 0;
        public int flowerBaseDebth { get; set; } = 1;

        public uint FlowerMaxAge { get;  set; }
        public int LateralAngle { get; set; } = 90;
        public int LateralRoll { get;  set; }

        public bool internodeFlowerWithStem { get; set; } = true;
        public float LeafLength { get; set; } = 0.03f;
        public float LeafRadius { get; set; } = 0.015f;
        public float LeafLengthVar { get; internal set; }
        public float LeafRadiusVar { get; internal set; }
        public float LeavePetioleLength { get; set; } = 0.005f;
        public float LeavePetioleRadius { get; set; } = 0.001f;
        public float fStemRadius { get; set; } = 0.00025f;
    }

    
}
