using System;
using System.Drawing;
using Grasshopper;
using Grasshopper.Kernel;

namespace AgroEcoSim
{
  public class GreenFDTInfo : GH_AssemblyInfo
  {
    public override string Name => "GreenFDT";

    //Return a 24x24 pixel bitmap to represent this GHA library.
    public override Bitmap Icon => null;

    //Return a short string describing the purpose of this GHA library.
    public override string Description => "Plant growth simulation";

    public override Guid Id => new Guid("51633aa9-96c5-4258-8318-1ccf3188e077");

    //Return a string identifying you or your company.
    public override string AuthorName => "GreeFDT Authors";

    //Return a string representing your preferred contact details.
    public override string AuthorContact => "";

    //Return a string representing the version.  This returns the same version as the assembly.
    public override string AssemblyVersion => GetType().Assembly.GetName().Version.ToString();
  }
}