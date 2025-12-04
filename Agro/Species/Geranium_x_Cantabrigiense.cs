namespace Agro.Species;

public static class Geranium_x_Cantabrigiense
{
    public static SpeciesSettings Init() =>new() {
        Name = "Geranium × Cantabrigiense",
        Behavior = Behavior.Geranium_x_Cantabrigiense,
        LeafLength = 0.04f,
        LeafRadius = 0.035f,
        PetioleLength = 0.05f,
        PetioleRadius = 0.0015f,
        LeafGrowthTime = 24 * 7,
        Height = 0.25f
    };
}