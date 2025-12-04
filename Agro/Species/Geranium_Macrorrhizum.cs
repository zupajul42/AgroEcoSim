namespace Agro.Species;

public static class Geranium_Macrorrhizum
{
    public static SpeciesSettings Init() =>new() {
        Name = "Geranium Macrorrhizum",
        Behavior = Behavior.Geranium_Macrorrhizum,
        LeafLength = 0.05f,
        LeafRadius = 0.04f,
        PetioleLength = 0.05f,
        PetioleRadius = 0.002f,
        LeafGrowthTime = 24 * 7,
        Height = 0.3f
    };
}