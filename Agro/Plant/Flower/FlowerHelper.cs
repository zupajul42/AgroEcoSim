using AgentsSystem;
using Microsoft.VisualBasic;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Agro.Plant.Flower
{
    public enum InfloresenceType { Solitary, Raceme, Spike, Panicle, Umbel, Corymb, Capitulum, Cyme }
    public class FlowerHelper
    {
        private static PlantSubFormation<AboveGroundAgent> _formatiom;
        private static FlowerSettings _settings;
        public FlowerHelper(PlantSubFormation<AboveGroundAgent> formation)
        {
            _formatiom = formation;
        }
        public void Birth()
        {
            //birth flowerstemm
        }
        public void grow(ref AboveGroundAgent agent, int agentID)
        {
            switch (agent.Organ)
            {
                case OrganTypes.FlowerStem:
                    {




                    }
                    break;
                case OrganTypes.FlowerPetiol: { } break;
                case OrganTypes.FlowerPadel: { } break;
                case OrganTypes.FlowerBud: { } break;

            }
        }

        // shrinking when max age 
        public void receit(ref AboveGroundAgent agent, int agentID)
        {
            switch (agent.Organ)
            {
                case OrganTypes.FlowerStem:
                    {




                    }
                    break;
                case OrganTypes.FlowerPetiol: { } break;
                case OrganTypes.FlowerPadel: { } break;
                case OrganTypes.FlowerBud: { } break;

            }
        }

        public void handleAgent(ref AboveGroundAgent agent, int agentID, uint timestep)
        {

            if ((agent.FlowerAgent.BirthTime + _settings.FlowerMaxAge) > timestep)
            {
                grow(ref agent, agentID);
                chaning(ref agent, agentID);
            }
            else
                receit(ref agent, agentID);


        }
    

        private void chaning(ref AboveGroundAgent agent, int agentID)
        {
            if (agent.Organ.Equals(OrganTypes.FlowerMeristem) && agent.Length > _settings.stemLengthVar)
            {
                agent.Organ = OrganTypes.FlowerStem;
                if (agent.FlowerAgent.flowerBase)
                {
                    if (agent.FlowerAgent.debth < _settings.flowerBaseDebth) {

                        var or = agent.TurnUpwards(agent.Orientation);
                        var floweragent = agent.FlowerAgent;
                        floweragent.debth++;
                        var meristem = _formatiom.Birth(new(_formatiom.Plant, agentID, OrganTypes.FlowerMeristem, or, 0.1f * agent.Energy, initialResources: _formatiom.DailyResourceMax, initialProduction: _formatiom.DailyProductionMax) { Water_g = 0.1f * agent.Water_g, LateralAngle = lateralPitch, DominanceLevel = agent.DominanceLevel, FlowerAgent = floweragent });
                        agent.Energy *= 0.9f;
                        agent.Water_g *= 0.9f;
                    }
                    //laterals mit tiefen wahrscheinlichkeit

                }
                    if (agent.FlowerAgent.debth < _settings.flowerDebth)
                    {
                        if (_settings.deterministic)
                        {
                            createFlower(); // straight
                        }
                        else
                        {

                            var lateralPitch = _settings.LateralAngle + _settings.LateralRoll;

                            var or = agent.TurnUpwards(agent.Orientation);
                            var floweragent = agent.FlowerAgent;
                            floweragent.debth++;
                            var meristem = _formatiom.Birth(new(_formatiom.Plant, agentID, OrganTypes.FlowerMeristem, or, 0.1f * agent.Energy, initialResources: _formatiom.DailyResourceMax, initialProduction: _formatiom.DailyProductionMax) { Water_g = 0.1f * agent.Water_g, LateralAngle = lateralPitch, DominanceLevel = agent.DominanceLevel, FlowerAgent = floweragent });
                            agent.Energy *= 0.9f;
                            agent.Water_g *= 0.9f;
                        }
                        if (_settings.LateralsPerNode > 0)
                        {
                            for (var lat = 1; lat <= _settings.LateralsPerNode; lat++)
                            {
                                float t = (_settings.flowerDebth <= 0f) ? 1f : Math.Clamp(agent.FlowerAgent.debth / _settings.flowerDebth, 0, 1);
                                float depthMultiplier = (1f - _settings.floralDepthFactor) + (_settings.floralDepthFactor * t); ;

                                float p = _settings.pFlowerDebth * depthMultiplier;
                                if (_formatiom.Plant.RNG.NextFloat(0, 1) < p)
                                {
                                    createFlower(); //lat roll lat deg
                                }
                                var test = agent.RandomOrientation(_formatiom.Plant, _formatiom.Plant.Parameters, agent.Orientation);
                                var lateralPitch = _settings.LateralAngle + _settings.LateralRoll;
                                var floweragent = agent.FlowerAgent;
                                floweragent.debth++;
                                var or = agent.TurnUpwards(agent.Orientation);
                                var meristem = _formatiom.Birth(new(_formatiom.Plant, agentID, OrganTypes.FlowerMeristem, or, 0.1f * agent.Energy, initialResources: _formatiom.DailyResourceMax, initialProduction: _formatiom.DailyProductionMax) { Water_g = 0.1f * agent.Water_g, LateralAngle = lateralPitch, DominanceLevel = agent.DominanceLevel, FlowerAgent = floweragent });
                                agent.Energy *= 0.9f;
                                agent.Water_g *= 0.9f;
                            }
                        }

                    }
                    else
                    {
                        for (var f = 0; f <= _settings.clusterSize; f++)
                        {
                            createFlower();
                        }
                    }
            }
        }

        private void createFlower()
        {
            throw new NotImplementedException();
        }
    }

    public struct Flower
    {
        internal bool flowerBase;

        public Flower()
        {
        }

        public int debth { get; set; } = 0;
        public uint BirthTime { get; private set; }

        public uint FlowerStartTime { get; set; }
    }
}
