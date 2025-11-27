namespace Agro.Species;

public static class Bergonia_Cordifolia
{
    public static SpeciesSettings Init() =>new() {
        Name = "Bergonia Cordifolia",
        Behavior = Behavior.Bergenia_Cordifolia,
        LeafLength = 0.24f,
        LeafRadius = 0.09f,
        PetioleLength = 0.05f, //?
        PetioleRadius = 0.004f,
        LeafGrowthTime = 24 * 7 * 12,
        Height = 0.04f
    };
}