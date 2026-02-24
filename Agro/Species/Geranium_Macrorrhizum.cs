namespace Agro.Species;

public static class Geranium_Macrorrhizum
{
    public static SpeciesSettings Init() =>new() {
        Name = "Geranium Macrorrhizum",
        Behavior = Behavior.Geranium_Macrorrhizum,
        LeafLength = 0.06f,
        LeafLengthVar = 0.01f,
        LeafRadius = 0.03f,
        LeafPitchVar = 5f * (MathF.PI / 180f),
        LeafPitch = 85 * (MathF.PI / 180f),
        PetioleLength = 0.150f,
        PetioleLengthVar = 0.05f,
        PetioleRadius = 0.0018f,

        LeafGrowthTime = 24 * 7,
        Height = 0.3f,

        NodeDistance = 0f,
        NodeDistanceVar = 0f,

        LateralsPerNode = 2,
        LateralPitch = 15 * (MathF.PI / 180f),
        LateralPitchVar = 10 * (MathF.PI / 180f),
        LateralRoll = 40f * (MathF.PI / 180f),
        LateralRollVar = 5f * (MathF.PI / 180f),

        MaxLeaveAge = 160f,
        pNewCrown = 0.70f,
        crownPitch = 0.38f,
        growthFactor = 0.25f,

        MaxRadius = 0.0035f,           
        pExpandRizome = 0.0012f,       
        RizomeMaxDepth = 3,
        RizomeLength = 0.045f,
        RizomeRadius = 0.0035f
    };
}