using System;
using System.Collections.Generic;

using Grasshopper;
using Grasshopper.Kernel;
using Rhino.Geometry;

using Agro;

namespace GreenFDT
{
  public class GreenFDTComponent : GH_Component
  {
    /// <summary>
    /// Each implementation of GH_Component must provide a public
    /// constructor without any arguments.
    /// Category represents the Tab in which the component will appear,
    /// Subcategory the panel. If you use non-existing tab or panel names,
    /// new tabs/panels will automatically be created.
    /// </summary>
    public GreenFDTComponent()
      : base("GreenFDT Component", "GreenFDT",
        "ComponentDescription",
        "ComponentCategory", "ComponentSubcategory")
    {
    }

    /// <summary>
    /// Registers all the input parameters for this component.
    /// </summary>
    protected override void RegisterInputParams(GH_Component.GH_InputParamManager pManager)
    {
      // Use the pManager object to register your input parameters.
      // You can often supply default values when creating parameters.
      // All parameters must have the correct access type. If you want
      // to import lists or trees of values, modify the ParamAccess flag.
      // pManager.AddPlaneParameter("Plane", "P", "Base plane for spiral", GH_ParamAccess.item, Plane.WorldXY);
      // pManager.AddNumberParameter("Inner Radius", "R0", "Inner radius for spiral", GH_ParamAccess.item, 1.0);
      // pManager.AddNumberParameter("Outer Radius", "R1", "Outer radius for spiral", GH_ParamAccess.item, 10.0);
      // pManager.AddIntegerParameter("Turns", "T", "Number of turns between radii", GH_ParamAccess.item, 10);

      pManager.AddIntegerParameter("Step Duration", "Step", "Hours per step", GH_ParamAccess.item, 4);
      pManager[pManager.ParamCount - 1].Optional = true;

      pManager.AddTimeParameter("Start Date", "Start", "Date to start the simulation", GH_ParamAccess.item, DateTime.Now);
      pManager[pManager.ParamCount - 1].Optional = true;

      pManager.AddIntegerParameter("Duration", "Simulation Duration", "Total hours to simulate", GH_ParamAccess.item, 744);
      pManager[pManager.ParamCount - 1].Optional = true;

      pManager.AddIntegerParameter("Random Seed", "Seed", "Seed for the random numbers generator", GH_ParamAccess.item, 42);
      pManager[pManager.ParamCount - 1].Optional = true;
      // If you want to change properties of certain parameters,
      // you can use the pManager instance to access them by index:
      //pManager[0].Optional = true;


      //Species

      //Plants

      //Obstacles

      //Terrain or field
    }

    /// <summary>
    /// Registers all the output parameters for this component.
    /// </summary>
    protected override void RegisterOutputParams(GH_Component.GH_OutputParamManager pManager)
    {
      // Use the pManager object to register your output parameters.
      // Output parameters do not have default values, but they too must have the correct access type.
      //pManager.AddCurveParameter("Spiral", "S", "Spiral curve", GH_ParamAccess.item);

      pManager.AddParameter(new Param_PlantsGroup(), "Groups", "G", "Plants", GH_ParamAccess.list);
      pManager.AddTextParameter("Debug", "D", "Debug Informationlants", GH_ParamAccess.list);

      // Sometimes you want to hide a specific parameter from the Rhino preview.
      // You can use the HideParameter() method as a quick way:
      //pManager.HideParameter(0);
    }

    /// <summary>
    /// This is the method that actually does the work.
    /// </summary>
    /// <param name="DA">The DA object can be used to retrieve data from input parameters and
    /// to store data in output parameters.</param>
    protected override void SolveInstance(IGH_DataAccess DA)
    {
      // First, we need to retrieve all data from the input parameters.
      // We'll start by declaring variables and assigning them starting values.
      // Plane plane = Plane.WorldXY;
      // double radius0 = 0.0;
      // double radius1 = 0.0;
      // int turns = 0;

      var hoursPerStep = 4;
      var startDate = DateTime.Now;
      var totalHours = 744;
      var seed = 42;

      // Then we need to access the input parameters individually.
      // When data cannot be extracted from a parameter, we should abort this method.
      if (!DA.GetData(0, ref hoursPerStep)) hoursPerStep = 4;
      if (!DA.GetData(1, ref startDate)) startDate = DateTime.Now;
      if (!DA.GetData(2, ref totalHours)) totalHours = 744;
      if (!DA.GetData(3, ref seed)) seed = 42;

      // We should now validate the data and warn the user if invalid data is supplied.
      if (hoursPerStep < 1)
      {
        AddRuntimeMessage(GH_RuntimeMessageLevel.Error, "Step duration must be at least 1 hour.");
        return;
      }

      if (hoursPerStep > 24)
      {
        AddRuntimeMessage(GH_RuntimeMessageLevel.Error, "Step duration must be at most 24 hours.");
        return;
      }

      if (totalHours < hoursPerStep)
      {
        AddRuntimeMessage(GH_RuntimeMessageLevel.Error, "The simulation duration must be at least 1 step.");
        return;
      }

      var request = new SimulationRequest() {
        HoursPerTick = hoursPerStep,
        TotalHours = totalHours,
        Seed = (ulong)seed,
      };

      try
      {
        //var world = Initialize.World(request); //, terrain
        var world = Initialize.World();
        world.Irradiance.SetAddress("localhost", "8001", "localhost", "8002", 0); //keep it simple for now

        //var start = DateTime.UtcNow.Ticks;
        var timesteps = (uint)world.TimestepsTotal();
        world.Run(timesteps);
        //var stop = DateTime.UtcNow.Ticks;
        //Debug.WriteLine($"Simulation time: {(stop - start) / TimeSpan.TicksPerMillisecond} ms");

        List<string> debugMessages = [];

        var result = new List<GH_PlantsGroup>();
        int c = 0;
        debugMessages.Add($"TIMESTEPS: {timesteps} -> {world.Timestep}");
        debugMessages.Add($"FORMATIONS: {world.Count}");
        debugMessages.Add($"FIELD SIZE: {world.FieldSize}");
        world.ForEach(formation =>
        {
          if (formation is PlantFormation2 plant)
          {
            result.Add(new(new(plant)));
            debugMessages.Add($"PLANT: {c++}");
            debugMessages.Add($"    Position: {plant.Position}");
            debugMessages.Add($"    Volume: {plant.AG.GetVolume()}");
            debugMessages.Add($"    Leaves: {plant.AG.GetLeaves().Count}");
          }
        });
        // We're set to create the spiral now. To keep the size of the SolveInstance() method small,
        // The actual functionality will be in a different method:
        //Curve spiral = CreateSpiral(plane, radius0, radius1, turns);

        // Finally assign the spiral to the output parameter.
        DA.SetDataList(0, result);
        DA.SetDataList(1, debugMessages);

        //TODO MI SetDataList
      }
      catch (Exception ex)
      {
        AddRuntimeMessage(GH_RuntimeMessageLevel.Error, ex.ToString());
      }
    }

    Curve CreateSpiral(Plane plane, double r0, double r1, Int32 turns)
    {
      Line l0 = new Line(plane.Origin + r0 * plane.XAxis, plane.Origin + r1 * plane.XAxis);
      Line l1 = new Line(plane.Origin - r0 * plane.XAxis, plane.Origin - r1 * plane.XAxis);

      Point3d[] p0;
      Point3d[] p1;

      l0.ToNurbsCurve().DivideByCount(turns, true, out p0);
      l1.ToNurbsCurve().DivideByCount(turns, true, out p1);

      PolyCurve spiral = new PolyCurve();

      for (int i = 0; i < p0.Length - 1; i++)
      {
        Arc arc0 = new Arc(p0[i], plane.YAxis, p1[i + 1]);
        Arc arc1 = new Arc(p1[i + 1], -plane.YAxis, p0[i + 1]);

        spiral.Append(arc0);
        spiral.Append(arc1);
      }

      return spiral;
    }

    /// <summary>
    /// The Exposure property controls where in the panel a component icon
    /// will appear. There are seven possible locations (primary to septenary),
    /// each of which can be combined with the GH_Exposure.obscure flag, which
    /// ensures the component will only be visible on panel dropdowns.
    /// </summary>
    public override GH_Exposure Exposure => GH_Exposure.primary;

    /// <summary>
    /// Provides an Icon for every component that will be visible in the User Interface.
    /// Icons need to be 24x24 pixels.
    /// You can add image files to your project resources and access them like this:
    /// return Resources.IconForThisComponent;
    /// </summary>
    protected override System.Drawing.Bitmap Icon => null;

    /// <summary>
    /// Each component must have a unique Guid to identify it.
    /// It is vital this Guid doesn't change otherwise old ghx files
    /// that use the old ID will partially fail during loading.
    /// </summary>
    public override Guid ComponentGuid => new Guid("0fe4ea60-7fc8-4bec-a1e5-cba72d1bb692");
  }
}