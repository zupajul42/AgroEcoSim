using Rhino.Geometry;
using Grasshopper.Kernel;
using Grasshopper.Kernel.Types;

namespace GreenFDT;
public class GH_TerrainItem
{
    public string Name { get; set; }
    public Point3d Position { get; set; }
    public Vector3d Size { get; set; }

    public GH_TerrainItem(string name, Point3d position, Vector3d size)
    {
        Name = name;
        Position = position;
        Size = size;
    }

    public override string ToString() => $"{Name} as {Position} sized {Size}";
}

public class GH_Terrain : GH_Goo<GH_TerrainItem>
{
    public GH_Terrain() : base() { }
    public GH_Terrain(GH_TerrainItem group) : base(group) { }

    public override IGH_Goo Duplicate() => new GH_Terrain(Value);

    public override bool IsValid => Value != null;

    public override string TypeName => "Terrain";
    public override string TypeDescription => "A group of terain items";

    public override string ToString()
    {
        return Value?.ToString() ?? "Null Terrain";
    }
}

public class Param_Terrain : GH_Param<GH_Terrain>
{
    public Param_Terrain()
      : base("Terrain", "Terrain",
             "One or more terrain items",
             "Geometry", "Primitive",
             GH_ParamAccess.item) { }

    public override Guid ComponentGuid => new Guid("YOUR-GUID-HERE");
}