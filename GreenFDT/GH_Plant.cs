using Rhino.Geometry;
using Grasshopper.Kernel;
using Grasshopper.Kernel.Types;
using System.Collections.Generic;

using Agro;
using AgentsSystem;

namespace GreenFDT;
public class GH_Plant
{
    public string Name { get; set; }
    public List<Box> Boxes { get; set; }

    public GH_Plant(string name, IEnumerable<Box> boxes)
    {
        Name = name;
        if (boxes is List<Box> bxs)
            Boxes = bxs;
        else
            Boxes = new (boxes);
    }

    public GH_Plant(PlantFormation2 plant)
    {
        Boxes = [];
        var shoots = plant.AG;
		var count = shoots.Count;
        for(int i = 0; i < count; ++i)
        {
            var organ = ag.GetOrgan(i);
            var center = ag.GetBaseCenterWorld(i);
            var scale = ag.GetScale(i);
            var orientation = ag.GetDirection(i);

            var x = Vector3.Transform(Vector3.UnitX, orientation);
            var y = Vector3.Transform(Vector3.UnitY, orientation);
            var z = Vector3.Transform(Vector3.UnitZ, orientation);

            switch (organ)
            {
                case OrganTypes.Leaf:
                {
                    var ax = x * scale.X * 0.5f;
                    var ay = -z * scale.Z * 0.5f;
                    var az = y * scale.Y * 0.5f;
                    var c = center + ax;
                    //now the matrix is (ax, ay, az, c) - it includes scaling already

                    //TDMI Boxes.Add(new(...));
                }
                break;
                case OrganTypes.Stem: case OrganTypes.Petiole: case OrganTypes.Meristem:
                {
                    writer.Write(scale.X); //length
                    writer.Write(scale.Z * 0.5f); //radius
                    writer.WriteM32(z, x, y, center);

                    //length = scale.X
                    //diameter = scale.Z
                    //and the matrix is (z, x, y, center) - excluding scaling

                    //TDMI Cylinders.Add(new(...));
                }
                break;
            }
        }
    }

    public override string ToString()
    {
        return $"{Name} ({Boxes.Count} objects)";
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