namespace Agro.Species;

public static class Geranium_x_Cantabrigiense
{
    public static SpeciesSettings Init() =>new() {
        Name = "Geranium × Cantabrigiense",
        Behavior = Behavior.Herbaceous,
        Height = 0.25f,

        LeafLength = 0.04f,
        LeafLengthVar = 0.01f,
        LeafRadius = 0.020f,
        LeafRadiusVar = 0.005f,

        LeafPitch = 85 * (MathF.PI / 180f),
        LeafPitchVar = 5f * (MathF.PI / 180f),

        PetioleLength = 0.09f,
        PetioleLengthVar = 0.03f,      
        PetioleRadius = 0.0017f,
        PetioleRadiusVar = 0.0004f,

        LeafGrowthTime = 24f * 7f,
        LeafGrowthTimeVar = 24f * 2f,

        NodeDistance = 0,
        NodeDistanceVar = 0,

        LateralsPerNode = 2,

        LateralPitch = 20f * (MathF.PI / 180f),
        LateralPitchVar = 10f * (MathF.PI / 180f),

        LateralRoll = 40f * (MathF.PI / 180f),
        LateralRollVar = 10f * (MathF.PI / 180f),

        MaxLeaveAge = 140f,
        pNewCrown = 0.45f,
        crownPitch = 0.36f,
        growthFactor = 0.20f,

        MaxRadius = 0.0030f,
        pExpandRizome = 0.0008f,      
        RizomeMaxDepth = 3,
        RizomeLength = 0.050f,
        RizomeRadius = 0.0030f,
    };
}