using Rhino.Geometry;
using Grasshopper.Kernel;
using Grasshopper.Kernel.Types;

using Agro;
namespace GreenFDT;
public class GH_Plant
{
    public string Name { get; set; }
    public List<Box> Boxes { get; set; }

    public BoxGroup(string name, IEnumerable<Box> boxes)
    {
        Name = name;
        Boxes = new List<Box>(boxes);
    }

    public override string ToString()
    {
        return $"{Name} ({Boxes.Count} boxes)";
    }
}

public class GH_PlantsGroup : GH_Goo<GH_Plant>
{
    public GH_PlantsGroup() : base() { }
    public GH_PlantsGroup(GH_Plant group) : base(group) { }

    public override IGH_Goo Duplicate()
    {
        return new GH_PlantsGroup(Value);
    }

    public override bool IsValid => Value != null;

    public override string TypeName => "BoxGroup";
    public override string TypeDescription => "A group of boxes with metadata";

    public override string ToString()
    {
        return Value?.ToString() ?? "Null BoxGroup";
    }
}

public class Param_PlantsGroup : GH_Param<GH_PlantsGroup>
{
    public Param_PlantsGroup()
      : base("PlantsGroup", "Plants",
             "A group of plants with geometry and metadata",
             "Geometry", "Primitive",
             GH_ParamAccess.item) { }

    public override Guid ComponentGuid => new Guid("YOUR-GUID-HERE");
}