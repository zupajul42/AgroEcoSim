using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Agro.AboveGroundAgent;

namespace Agro
{
    public class FlowerSettings
    {
        public float stemLength { get; set; } = 0.005f;
        public readonly List<OrganTypes> flowerOrgans = new List<OrganTypes>() { OrganTypes.FlowerStem, OrganTypes.FlowerPadel, OrganTypes.FlowerPetiol, OrganTypes.FlowerMeristem, OrganTypes.FlowerBud
    };

    public FlowerSettings()
        {
        }

        // structure
        public bool continous { get; set; }=false;
        public bool internodeFlower { get; set; } = false;
        public int flowerDebth { get; set; } =6;

        public int LateralsPerNode { get; set; } = 1;
        public int FlowersPerInternode { get; set; } = 0;
        public float stemLengthVar { get; set; } = 0f;
        public bool deterministic { get; set; } = false;
        public int clusterSize { get; set; } = 1;
        public byte floralDepthFactor { get; set; } = 1;
        public float pFlowerDebth { get; set; } = 1f;
        public int flowerBaseDebth { get; set; } = 25;

        public uint FlowerMaxAge { get;  set; }
        public uint BudBloomAge { get; set; }


        public int LateralAngle { get; set; } = 90;
        public int LateralRoll { get;  set; }

        public bool internodeFlowerWithStem { get; set; } = true;
        public float LeafLength { get; set; } = 0.03f;
        public float LeafRadius { get; set; } = 0.015f;
        public float PedalLength { get; set; } 
        public float PedalRadius { get; set; }
        public float BudLength { get; set; }
        public float BudRadius { get; set; }
        public float PetiolLength { get; set; }
        public float PetiolRadius { get; set; }
        public float LeafLengthVar { get; internal set; }
        public float LeafRadiusVar { get; internal set; }
        public float LeavePetioleLength { get; set; } = 0.005f;
        public float LeavePetioleRadius { get; set; } = 0.001f;
        public float fStemRadius { get; set; } = 0.002f;
        public int BaseLaterals { get; set; } = 1;
        public int BaseLateralAngle { get; set; } = 90;
        public int BaseLateralRoll { get; set; }
    }

    
}
