using System.Numerics;
using AgentsSystem;
using Utils;
using System.Diagnostics;
using System.Runtime.CompilerServices;
using M = System.Runtime.CompilerServices.MethodImplAttribute;
using System.Buffers;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Text;

namespace Agro;

public class SoilFormationTetrahedral : ISoilFormation
{
	const MethodImplOptions AI = MethodImplOptions.AggressiveInlining;
	AgroWorld World;
	public string ID { get; private set; }

	///<sumary>
	/// Water amount per cell (in gramms)
	///</sumary>
	readonly float[] Water_g;
	///<sumary>
	/// Temperature per cell (in degree Celsius)
	///</sumary>
	readonly float[] Temperature;
	///<sumary>
	/// Steam amount per cell
	///</sumary>
	readonly float[] Steam;

	/// <summary>
	/// Cells count in all directions (x, depth, z)
	/// </summary>
	RainCatcher[] RainCatchers;
	readonly float[] CellVolumes;

    readonly Vector3 Position;

	/// <summary>
	/// Contains all cells for which a requestexists
	/// </summary>
    readonly HashSet<int> RequestsPresent;
	/// <summary>
    /// Water request in gramms. For seed requests, Part < 0
    /// </summary>
	readonly List<(PlantFormation2 Plant, int Part, float Amount_g)>[] WaterRequests;

    Vector3[] Points;
    readonly List<Hyperface> Faces;
    readonly List<Simplex> Tetrahedralization = [];
    static readonly FacesSharing[] PossibleFaces = Enum.GetValues<FacesSharing>();
    List<NeighborData>[] Neighs;
    float[,] DiffusionMatrix;

    readonly bool DoVirtual = true;
    float TotalRaincatch;
    float TotalWaterCapacity;
    float TotalCellVolume;
    float TotalWater_g;
    float TotalRequested;
    List<(PlantFormation2 Plant, int Part, float Amount_g)> TotalWaterRequests;

	public SoilFormationTetrahedral(AgroWorld world, string name, Vector3[] vertices, IList<int> faces, List<List<int>> soilFaces)
	{
		World = world;
        ID = name;

        var vertexSet = new HashSet<int>(faces.Count * 3);
        foreach(var f in faces)
            vertexSet.UnionWith(soilFaces[f]);

        var vertexArray = vertexSet.ToArray();
        Array.Sort(vertexArray);
        var vertexMap = new Dictionary<int, int>();

        var regularCount = vertexArray.Length;
        Points = new Vector3[regularCount + 4];
        Faces = new List<Hyperface>(faces.Count);

        for(int i = 0; i < vertexArray.Length; ++i)
        {
            var v = vertexArray[i];
            vertexMap[v] = i;
            Points[i] = vertices[v];
        }

        //ClearVertices();

        Position = Points[0];
        for(int i = 1; i < regularCount; ++i)
            Position = Vector3.Min(Position, Points[i]);
        //find the closest point
        var minDist = Vector3.DistanceSquared(Position, Points[0]);
        var closestToMin = 0;
        for(int i = 1; i < regularCount; ++i)
        {
            var d = Vector3.DistanceSquared(Position, Points[i]);
            if (d < minDist)
            {
                minDist = d;
                closestToMin = i;
            }
        }
        Position = Points[closestToMin];

        for(int i = 0; i < regularCount; ++i)
            Points[i] -= Position;

        SuperTetrahedron();

        var sizeHint = Points.Length / 3;
        if (Tetrahedralization.Capacity < sizeHint)
            Tetrahedralization.Capacity = sizeHint;

        Tetrahedralization.Add(Simplex.CreateInitial(Points));
        var newTetras = new Simplex[128];
        //var ignored = new List<int>();

        var badTetrahedrons = new List<int>();
        var polyhedron = new List<Hyperface>();

        var localBadTetrahedrons = new List<int>[Environment.ProcessorCount];
        var localPolyhedrons = new List<Hyperface>[Environment.ProcessorCount];
        for(int i = 0; i < Environment.ProcessorCount; ++i)
        {
            localBadTetrahedrons[i] = [];
            localPolyhedrons[i] = [];
        }

        for (int p = 0; p < regularCount; ++p) //find all the tetrahedrons that are no longer valid due to the insertion
        {
            //1. Indentify indices of bad tetrahedrons (breaking the Delaunay criterion)
            badTetrahedrons.Clear();
            if (Tetrahedralization.Count > Environment.ProcessorCount << 16)
            {
                var badBatch = Tetrahedralization.Count / Environment.ProcessorCount;
                Parallel.For(0, Environment.ProcessorCount, bb => {
                    var limit = bb == Environment.ProcessorCount - 1 ? Tetrahedralization.Count : (bb + 1) * badBatch;
                    var target = localBadTetrahedrons[bb];
                    target.Clear();
                    for (int t = bb * badBatch; t < limit; ++t)
                        if (Tetrahedralization[t].InCircumsphere(Points[p]))
                            target.Add(t);
                });

                for(int i = 0; i < Environment.ProcessorCount; ++i)
                    badTetrahedrons.AddRange(localBadTetrahedrons[i]);
            }
            else
            {
                for (int t = 0; t < Tetrahedralization.Count; ++t)
                    if (Tetrahedralization[t].InCircumsphere(Points[p]))
                        badTetrahedrons.Add(t);
            }

            //2. Get the polyhedron spanning through all bad tetrahedrons
            polyhedron.Clear();
            if (badTetrahedrons.Count > Environment.ProcessorCount << 5)
            {
                var polyBatch = badTetrahedrons.Count / Environment.ProcessorCount;
                Parallel.For(0, Environment.ProcessorCount, btt => {
                    var target = localPolyhedrons[btt];
                    target.Clear();

                    var limit = btt == Environment.ProcessorCount - 1 ? badTetrahedrons.Count : (btt + 1) * polyBatch;
                    for (int bt = btt * polyBatch; bt < limit; ++bt) //find boundary of the polyhedral hole
                    {
                        var shared = FacesSharing.None;
                        var btValue = badTetrahedrons[bt];

                        for (int bs = 0; bs < badTetrahedrons.Count; ++bs)
                            if (bs != bt)
                                shared = Tetrahedralization[btValue].Shares(shared, Tetrahedralization[badTetrahedrons[bs]].GetIndices());

                        if (!shared.HasFlag(FacesSharing.ABC))
                            target.Add(Tetrahedralization[btValue].ABC());
                        if (!shared.HasFlag(FacesSharing.ABD))
                            target.Add(Tetrahedralization[btValue].ABD());
                        if (!shared.HasFlag(FacesSharing.ACD))
                            target.Add(Tetrahedralization[btValue].ACD());
                        if (!shared.HasFlag(FacesSharing.BCD))
                            target.Add(Tetrahedralization[btValue].BCD());
                    }
                });

                for(int i = 0; i < Environment.ProcessorCount; ++i)
                    polyhedron.AddRange(localPolyhedrons[i]);
            }
            else
            {
                for (int bt = 0; bt < badTetrahedrons.Count; ++bt) //find boundary of the polyhedral hole
                {
                    var shared = FacesSharing.None;
                    var btValue = badTetrahedrons[bt];

                    for (int bs = 0; bs < badTetrahedrons.Count; ++bs)
                        if (bs != bt)
                            shared = Tetrahedralization[btValue].Shares(shared, Tetrahedralization[badTetrahedrons[bs]].GetIndices());

                    if (!shared.HasFlag(FacesSharing.ABC))
                        polyhedron.Add(Tetrahedralization[btValue].ABC());
                    if (!shared.HasFlag(FacesSharing.ABD))
                        polyhedron.Add(Tetrahedralization[btValue].ABD());
                    if (!shared.HasFlag(FacesSharing.ACD))
                        polyhedron.Add(Tetrahedralization[btValue].ACD());
                    if (!shared.HasFlag(FacesSharing.BCD))
                        polyhedron.Add(Tetrahedralization[btValue].BCD());
                }
            }

            //Re-tetrahedralize the star-shaped polyhedral hole:

            //3. Preparation of new tetrahedra
            if (polyhedron.Count > newTetras.Length) //increase the array size to occupy more elements
                Array.Resize(ref newTetras, newTetras.Length << (int)Math.Ceiling(MathF.Log2((float)polyhedron.Count / newTetras.Length)));

            var validCount = 0;
            var invalid = 0;
            if (polyhedron.Count > Environment.ProcessorCount << 6)
            {
                var tetraBatch = polyhedron.Count / Environment.ProcessorCount;
                Parallel.For(0, Environment.ProcessorCount, tt => {
                    var limit = tt == Environment.ProcessorCount - 1 ? polyhedron.Count : (tt + 1) * tetraBatch;
                    var valid = true;
                    for(int f = tt * tetraBatch; f < limit && valid && invalid == 0; ++f)
                    {
                        valid = Simplex.TryCreate(polyhedron, f, Points, p, out var s);
                        if (valid)
                            newTetras[f] = s; //by creatng new tetrahedra by combining each face of the polyhedron with the inserted vertex
                        else
                            Interlocked.Increment(ref invalid);
                    }
                });
            }
            else
            {
                for(int f = 0; f < polyhedron.Count; ++f)
                    if (Simplex.TryCreate(polyhedron, f, Points, p, out var s))
                        newTetras[validCount++] = s; //by creatng new tetrahedra by combining each face of the polyhedron with the inserted vertex
            }

            //4. Insertion of new tetrahedra
            if (validCount > 0)
            {
                // https://www.cs.purdue.edu/homes/tamaldey/course/531/Delaunay%283D%29.pdf
                if (validCount < badTetrahedrons.Count)
                {
                    for (int f = 0; f < validCount; ++f) // re-tetrahedralize the star-shaped polyhedral hole
                        Tetrahedralization[badTetrahedrons[f]] = newTetras[f]; //by creatng new tetrahedra by combining each face of the polyhedron with the inserted vertex

                    for(int bt = badTetrahedrons.Count - 1; bt >= validCount; --bt)  //remove those not overwritten from the data structure
                        Tetrahedralization.RemoveAt(badTetrahedrons[bt]); //remove triangle from triangulation
                }
                else
                {
                    for (int f = 0; f < badTetrahedrons.Count; ++f) // re-tetrahedralize the star-shaped polyhedral hole
                        Tetrahedralization[badTetrahedrons[f]] = newTetras[f]; //by creatng new tetrahedra by combining each face of the polyhedron with the inserted vertex

                    for(int f = badTetrahedrons.Count; f < validCount; ++f)
                        Tetrahedralization.Add(newTetras[f]); //by creatng new tetrahedra by combining each face of the polyhedron with the inserted vertex
                }
            }

            // if (name == "Morph-034.031" || name == "Morph-034.177")
            //     DebugExport(p, onlyInner: false);
        }

        for (int t = Tetrahedralization.Count - 1; t >= 0; --t) //done inserting points, now clean up
            if (Tetrahedralization[t].HasSupervertex(regularCount)) //vertex from the original super-tetrahedron
                Tetrahedralization.RemoveAt(t);

        Array.Resize(ref Points, regularCount);

        CellVolumes = new float[Tetrahedralization.Count];
        for(int t = 0; t < Tetrahedralization.Count; ++t)
            CellVolumes[t] = Tetrahedralization[t].Volume(Points);

        var raincatchers = new List<RainCatcher>(Tetrahedralization.Count);
        Neighs = new List<NeighborData>[Tetrahedralization.Count];
        for(int t = 0; t < Tetrahedralization.Count; ++t)
        {
            var neighFaces = FacesSharing.None;
            Neighs[t] = [];
            for(int s = t + 1; s < Tetrahedralization.Count; ++s)
            {
                var conn = Tetrahedralization[t].Shares(FacesSharing.None, Tetrahedralization[s].GetIndices());
                if (conn != FacesSharing.None)
                {
                    neighFaces |= conn;
                    var (antigravityRatio, area) = Tetrahedralization[t].NeighInterface(Points, conn);
                    if (antigravityRatio < 0f)
                        Neighs[t].Add(new (s, -antigravityRatio * area));
                }
            }

            var raincatch = 0f;
            //for faces without neighbors check whether it is able to catch rain
            foreach(var face in PossibleFaces)
                if (!neighFaces.HasFlag(face))
                {
                    Faces.Add(Tetrahedralization[t].GetFace(face));
                    var (upwardsRatio, area) = Tetrahedralization[t].NeighInterface(Points, face);
                    if (upwardsRatio > 0f)
                        raincatch += area * upwardsRatio;
                }

            if (raincatch > 0f)
                raincatchers.Add(new(t, raincatch));
        }

        RainCatchers = [..raincatchers];

		if (World != null)
			ComputeDiffusionCoefs();

        //replace the faces by the originals (workaround as long as numeric issues have not been fixes)
        Faces.Clear();
        foreach(var f in faces)
        {
            var face = soilFaces[f];
            Span<int> abc = [vertexMap[face[0]], vertexMap[face[1]], vertexMap[face[2]]];
            MemoryExtensions.Sort(abc);
            Faces.Add(new(abc[0], abc[1], abc[2]));
        }

		Water_g = new float[Tetrahedralization.Count];
		Temperature = new float[Water_g.Length];
		Steam = new float[Water_g.Length];
        WaterCapacityPerCell = new float[Water_g.Length];
        MinimumWaterToDiffuse = new float[Water_g.Length];

		RequestsPresent = new HashSet<int>(Water_g.Length);
		WaterRequests = new List<(PlantFormation2, int, float)>[Water_g.Length];
		for (int i = 0; i < Water_g.Length; ++i)
			WaterRequests[i] = [];

        for(int i = 0; i < Tetrahedralization.Count; ++i)
        {
            Water_g[i] = CellVolumes[i] * 100f * 1000; //some basic water (100 litres per m³ which is kind of normal soil saturation of loamy soils which retain the an average amount of water)
		    WaterCapacityPerCell[i] = CellVolumes[i] * 200f * 1000;
            Debug.Assert(WaterCapacityPerCell[i] >= 0f);
            MinimumWaterToDiffuse[i] = WaterCapacityPerCell[i] * 0.001f;
        }
	}

    void SuperTetrahedron()
    {
        //Rough approximation by a bounding box
        //https://computergraphics.stackexchange.com/questions/10533/how-to-compute-a-bounding-tetrahedron
        float minX = float.MaxValue, minY = float.MaxValue, minZ = float.MaxValue;
        float maxX = float.MinValue, maxY = float.MinValue, maxZ = float.MinValue;
        var regularCount = Points.Length - 4;
        for (int i = 0; i < regularCount; ++i)
        {
            if (Points[i].X < minX) minX = Points[i].X;
            if (Points[i].Y < minY) minY = Points[i].Y;
            if (Points[i].Z < minZ) minZ = Points[i].Z;

            if (Points[i].X > maxX) maxX = Points[i].X;
            if (Points[i].Y > maxY) maxY = Points[i].Y;
            if (Points[i].Z > maxZ) maxZ = Points[i].Z;
        }

        var center = new Vector3(minX + maxX, minY + maxY, minZ + maxZ) * 0.5f;
        var diameter = maxX - minX;
        var tmp = maxY - minY;
        if (tmp > diameter)
            diameter = tmp;
        tmp = maxZ - minZ;
        if (tmp > diameter)
            diameter = tmp;

        //diameter *= 1.75f; //should be 1.5f but just to be sure we add a bit more
        var radius = diameter * (0.5f * 1.5f * 4f); //good for basement, *8f for a reserve

        //add a super tetrahedron
        Points[^4] = center + new Vector3(-2f * radius,     -radius,          radius);
        Points[^3] = center + new Vector3( 2f * radius,     -radius,          radius);
        Points[^2] = center + new Vector3(          0f,     -radius,    -2f * radius);
        Points[^1] = center + new Vector3(          0f, 2f * radius,              0f);
    }

    void ClearVertices()
    {
        const long mask = (1L << 21) - 1;
        const long bitcheck = 1L << 20;
        const float precision = 1e4f;
        const float rcpPrecision = 1f / precision;
        var pointsSet = new HashSet<long>();
        for(int i = 0; i < Points.Length; ++i)
        {

            var x = (long)Math.Round(Points[i].X * precision);
            var y = (long)Math.Round(Points[i].Y * precision);
            var z = (long)Math.Round(Points[i].Z * precision);

            pointsSet.Add((x & mask) | ((y & mask) << 21) | ((z & mask) << 42));
        }

        if (pointsSet.Count < Points.Length - 4)
        {
            Points = new Vector3[pointsSet.Count + 4];
            var c = 0;
            foreach(var item in pointsSet)
            {
                var x = item & mask;
                if ((x & bitcheck) != 0)
                    x |= ~mask;

                var y = (item >> 21) & mask;
                if ((y & bitcheck) != 0)
                    y |= ~mask;

                var z = (item >> 42) & mask;
                if ((z & bitcheck) != 0)
                    z |= ~mask;

                Points[c++] = new(x * rcpPrecision, y * rcpPrecision, z * rcpPrecision);
            }
        }
    }

    void DebugExport(int step, bool onlyInner)
    {
        var ts = DateTime.Now.Ticks;
        var writer = new StringBuilder();

        for(int i = 0; i < Points.Length; ++i)
            writer.AppendLine($"v {Points[i].X:F8} {Points[i].Y:F8} {Points[i].Z:F8}");

        var regularCount = Points.Length - 4;
        for(int i = 0; i < Tetrahedralization.Count; ++i)
        {
            var ind = Tetrahedralization[i].GetIndices();
            if (!onlyInner || (ind.IA < regularCount && ind.IB < regularCount && ind.IC < regularCount && ind.ID < regularCount))
            {
                writer.AppendLine($"g Tetra_{step}__{i:D2}");

                writer.AppendLine($"\t f {ind.IA + 1} {ind.IB + 1} {ind.IC + 1}");
                writer.AppendLine($"\t f {ind.IA + 1} {ind.IB + 1} {ind.ID + 1}");
                writer.AppendLine($"\t f {ind.IA + 1} {ind.IC + 1} {ind.ID + 1}");
                writer.AppendLine($"\t f {ind.IB + 1} {ind.IC + 1} {ind.ID + 1}");
            }
        }
        File.WriteAllText($"debug_{ts}_{step}.obj", writer.ToString());
    }

	public int FieldsCount => 1;

	/// <summary>
	/// Water amount currently stored in this cell (in gramms)
	/// </summary>
	/// <param name="index"></param>
	/// <returns></returns>
	[M(AI)] public float GetWater_g(int index, int soilIndex = 0) => DoVirtual ? TotalWater_g : (index >= 0 && index < Water_g.Length ? Water_g[index] : 0f);

	/// <summary>
	/// Maximum water amount that can be stored in this cell (in gramms)
	/// </summary>
	/// <param name="index"></param>
	/// <returns></returns>
	[M(AI)] public float GetWaterCapacity_g(int index) => DoVirtual ? TotalWaterCapacity : WaterCapacityPerCell[index];

	[M(AI)] public float GetTemperature(int index, int soilIndex) => 20f;

	[M(AI)] public Vector3 GetFieldOrigin(int soilIndex) => Position;

	public int IntersectPoint(Vector3 center, int soilIndex = 0)
	{
        if (DoVirtual)
            return 0;
        else
        {
            for(int i = 0; i < Tetrahedralization.Count; ++i)
                if (Tetrahedralization[i].PointInside(Points, center))
                    return i;

            return -1;
        }
	}

	/// <summary>
	/// 1g of water travel distance per simulation tick
	/// </summary>
	/// <returns></returns>
	[M(AI)] float WaterTravelDistPerTick() => WaterTravelDistPerTick(World.HoursPerTick); //1g of water can travel so far per tick

	/// <summary>
	/// 1g of water travel distance per hours
	/// </summary>
	/// <param name="hours"></param>
	/// <returns></returns>
	[M(AI)] static float WaterTravelDistPerTick(ushort hours) => hours * 0.012f; //1g of water can travel so far per tick
	/// <summary>
	/// Water amount that can be stored in the cell (in gramms)
	/// </summary>
	readonly float[] WaterCapacityPerCell;

	/// <summary>
	/// Minimum water amount to be retained in the cell (in gramms) before the water diffuses further down
	/// </summary>
	readonly float[] MinimumWaterToDiffuse;

	/// <summary>
	/// Number of cells water can pass in one time step. Since initial cell saturation is added at computation time, this is stored as a float.
	/// </summary>
	float WaterCellsPerStep;

	public void Tick(uint timestep)
	{
		//float[] waterSrc, waterTarget, steamSrc, steamTarget, temperatureSrc, temperatureTarget;

		var surfaceTemp = Math.Max(0f, World.GetTemperature(timestep));
		var evaporizationFactorPerHour = 0 * 1e-4f;
		var evaporizationSoilFactorPerStep = MathF.Pow(1f - evaporizationFactorPerHour, World.HoursPerTick);
		var evaporizationSurfaceFactorPerStep = MathF.Pow(1f - Math.Min(1f, evaporizationFactorPerHour * (surfaceTemp * surfaceTemp) / 10), World.HoursPerTick);

        var rain = World.GetWater(timestep);
		if (DoVirtual)
        {
            if (rain > 0)
            {
                TotalWater_g += rain * TotalRaincatch;
                if (TotalWaterCapacity < TotalWater_g)
                    TotalWater_g = TotalWaterCapacity;
            }
        }
        else
        {
            //1. Receive RAIN
            if (rain > 0)
                for(int i = 0; i < RainCatchers.Length; ++i)
                {
                    var index = RainCatchers[i].Index;
                    Water_g[index] += rain * RainCatchers[i].ProjectedArea; //in gramms, shadowing not taken into account
                    if (Water_g[index] > WaterCapacityPerCell[index])
                        Water_g[index] = WaterCapacityPerCell[index];
                }

            //diffusion
            var count = Tetrahedralization.Count;

            var availables = new float[count];
            var received = new float[count];
            var removed = new float[count];
            for(int i = 0; i < count; ++i)
                availables[i] = Water_g[i] - MinimumWaterToDiffuse[i];

            for(int j = 0; j < count; ++j)
                if (availables[j] > 0)
                    for(int i = 0; i < count; ++i)
                    {
                        var w = DiffusionMatrix[i, j] * availables[j];
                        received[i] += w;
                        removed[j] += w;
                    }

            for(int i = 0; i < count; ++i)
            {
                var w = Water_g[i] + received[i] - removed[i];
                if (w <= 0f)
                    Water_g[i] = 0f;
                if (WaterCapacityPerCell[i] >= w)
                    Water_g[i] = w;
                else
                    Water_g[i] = WaterCapacityPerCell[i];
                //TODO redistribute the remaining water
                Water_g[i] = WaterCapacityPerCell[i];
            }
        }
        //Debug.WriteLine($"T: {timestep}\tID:{ID}\tR:{rain}\tA:{removed.Sum()}\tR:{received.Sum()}");

		HasUndeliveredPost = true; //enforcing ProcessRequests() this way, since it must wait until all other agents have made requests, it needs to be part of the post delivery
	}

	[M(AI)] void IFormation.Census() { }

	[M(AI)] public void DeliverPost(uint timestep)
    {
		ProcessRequests();
		HasUndeliveredPost = false;
    }

	public bool HasUndeliveredPost { get; private set; } = false;
	///<summary>
	///Number of agents in this formation
	///</summary>
	public int Count => Water_g.Length;

	[M(AI)]
	public void RequestWater(int index, float amount_g, PlantSubFormation<UnderGroundAgent> plant, int part, int soilIndex = 0)
	{
		lock(RequestsPresent)
        {
            if (DoVirtual)
            {
                if (TotalWater_g > 0)
                {
                    TotalRequested += amount_g;
                    TotalWaterRequests.Add((plant.Plant, part, amount_g));
                }
            }
            else
            {
                if (Water_g[index] > 0)
                {
                    RequestsPresent.Add(index);
                    WaterRequests[index].Add((plant.Plant, part, amount_g));
                }
            }
        }
	}

	[M(AI)]
	public void RequestWater(int index, float amount_g, PlantFormation2 plant, int soilIndex = 0)
	{
		lock(RequestsPresent)
        {
            if (DoVirtual)
            {
                TotalRequested += amount_g;
                TotalWaterRequests.Add((plant, -1, amount_g));
            }
            else
            {
                if (Water_g[index] > 0)
                {
                    RequestsPresent.Add(index);
                    WaterRequests[index].Add((plant, -1, amount_g));
                }
            }
        }
	}

	public void ProcessRequests()
	{
        if (DoVirtual)
        {
            if (TotalWater_g > 0)
            {
                var limit = TotalWaterRequests.Count;
                if (TotalRequested < TotalWater_g)
                {
                    for (int j = 0; j < limit; ++j)
                    {
                        if (TotalWaterRequests[j].Part < 0)
                            TotalWaterRequests[j].Plant.Send(0, new SeedAgent.WaterInc(TotalWaterRequests[j].Amount_g));
                        else
                            TotalWaterRequests[j].Plant?.UG?.SendProtected(TotalWaterRequests[j].Part, new UnderGroundAgent.WaterInc(TotalWaterRequests[j].Amount_g));
                    }
                }
                else
                {
                    var factor = TotalWater_g / TotalRequested; //reduce all constributions so that the sum is exactly Water_g and not more
                    for (int j = 0; j < limit; ++j)
                        if (TotalWaterRequests[j].Part < 0)
                            TotalWaterRequests[j].Plant.Send(0, new SeedAgent.WaterInc(TotalWaterRequests[j].Amount_g * factor));
                        else
                            TotalWaterRequests[j].Plant?.UG?.SendProtected(TotalWaterRequests[j].Part, new UnderGroundAgent.WaterInc(TotalWaterRequests[j].Amount_g * factor));
                }
            }

            TotalRequested = 0f;
            TotalWaterRequests.Clear();
        }
        else
        {
            foreach(var i in RequestsPresent)
            {
                var reqs = WaterRequests[i];
                var limit = reqs.Count;
                var sum = 0f;
                for (int j = 0; j < limit; ++j)
                    sum += reqs[j].Amount_g;

                if (sum > 0)
                {
                    if (sum <= Water_g[i])
                    {
                        for (int j = 0; j < limit; ++j)
                            if (reqs[j].Part < 0)
                                reqs[j].Plant.Send(0, new SeedAgent.WaterInc(reqs[j].Amount_g));
                            else
                                reqs[j].Plant?.UG?.SendProtected(reqs[j].Part, new UnderGroundAgent.WaterInc(reqs[j].Amount_g));
                    }
                    else
                    {
                        var factor = Water_g[i] / sum; //reduce all constributions so that the sum is exactly Water_g and not more
                        for (int j = 0; j < limit; ++j)
                            if (reqs[j].Part < 0)
                                reqs[j].Plant.Send(0, new SeedAgent.WaterInc(reqs[j].Amount_g * factor));
                            else
                                reqs[j].Plant?.UG?.SendProtected(reqs[j].Part, new UnderGroundAgent.WaterInc(reqs[j].Amount_g * factor));
                    }
                    reqs.Clear();
                }
            }
            RequestsPresent.Clear();
        }


	}

	public Vector3 GetRandomSeedPosition(Pcg rnd, int soilIndex = 0)
	{
        var index = rnd.NextUInt((uint)RainCatchers.Length);
        return Tetrahedralization[RainCatchers[index].Index].GetRandomPoint(Points, rnd, 0f, 0.04f);
	}

	public void SetWorld(AgroWorld world)
	{
		World = world;
		if (World != null)
            ComputeDiffusionCoefs();
    }

    private void ComputeDiffusionCoefs()
    {
        if (DoVirtual)
        {
            TotalWaterRequests = [];
            TotalRaincatch = 0f;
            TotalWaterCapacity = 0f;
            TotalCellVolume = 0f;
            TotalWater_g = 0f;

            for(int i = 0; i < RainCatchers.Length; ++i)
                TotalRaincatch += RainCatchers[i].ProjectedArea;

            for(int i = 0; i < Tetrahedralization.Count; ++i)
            {
                TotalWaterCapacity += WaterCapacityPerCell[i];
                TotalCellVolume += CellVolumes[i];
                TotalWater_g += Water_g[i];
            }
        }
        else
        {
            var heights = new float[Tetrahedralization.Count];
            for(int i = 0; i < Tetrahedralization.Count; ++i)
                heights[i] = Simplex.Height(Points);

            DiffusionMatrix = new float[Tetrahedralization.Count, Tetrahedralization.Count];
            var travelPerTick = WaterTravelDistPerTick();
            for(int t = 0; t < Tetrahedralization.Count; ++t)
            {
                var buffer = new Queue<NeighborQueueItem>();
                for(int i = 0; i < Neighs[t].Count; ++i)
                {
                    DiffusionMatrix[Neighs[t][i].Index, t] += Neighs[t][i].Ratio * 0.5f;
                    var remainingDistance = travelPerTick - heights[t] - heights[i];
                    if (remainingDistance > 0)
                        buffer.Enqueue(new(Neighs[t][i].Index, 1, remainingDistance));
                }

                while (buffer.Count > 0)
                {
                    var item = buffer.Dequeue();
                    for(int i = 0; i < Neighs[item.Index].Count; ++i)
                    {
                        DiffusionMatrix[Neighs[item.Index][i].Index, t] += Neighs[item.Index][i].Ratio / (2 << item.Level);
                        var remainingDistance = item.RemainingDistance - heights[item.Index];
                        if (remainingDistance > 0)
                            buffer.Enqueue(new(Neighs[item.Index][i].Index, (ushort)(item.Level + 1), remainingDistance));
                    }
                }
            }

            //Normalize; [x,y] means flow from y to x so we need to sum and normalize over the y dimension
            for(int i = 0; i < Tetrahedralization.Count; ++i)
            {
                double sum = 0.0;
                for(int j = 0; j < Tetrahedralization.Count; ++j)
                    sum += DiffusionMatrix[i, j];
                if (sum > 0)
                    for(int j = 0; j < Tetrahedralization.Count; ++j)
                        DiffusionMatrix[i, j] = (float)(DiffusionMatrix[i, j] / sum);
            }
        }
    }

    public byte[] Serialize()
	{
		using var stream = new MemoryStream();
		using var writer = new BinaryWriter(stream);

		writer.Write((byte)0); //version
		var count = FieldsCount;
		writer.Write(count);
		for (int i = 0; i < count; ++i)
			Write(writer, i);

		return stream.ToArray();
    }

	public void Write(BinaryWriter writer, int fieldIndex)
	{
        writer.Write((byte)1); //type
		writer.Write(ID);
        writer.WriteV32(Position);
        writer.Write(Points.Length);
        for(int i = 0; i < Points.Length; ++i)
            writer.WriteV32(Points[i]);

        writer.Write(Faces.Count);
        for(int i = 0; i < Faces.Count; ++i)
        {
            writer.Write(Faces[i].IA);
            writer.Write(Faces[i].IB);
            writer.Write(Faces[i].IC);
        }
	}


	[M(AI)]
	public float GetMetricGroundDepth(float x, float z, int soilIndex = 0)
	{
		return 0f;
	}

    [StructLayout(LayoutKind.Auto)]
    public readonly struct Hyperedge
    {
        public readonly int IA;
        public readonly int IB;

        public Hyperedge(int ia, int ib)
        {
            Debug.Assert(ia < ib);
            IA = ia;
            IB = ib;
        }
    }

    [StructLayout(LayoutKind.Auto)]
    public readonly struct Hyperface
    {
        public readonly int IA;
        public readonly int IB;
        public readonly int IC;

        public Hyperface(int ia, int ib, int ic)
        {
            Debug.Assert(ia < ib && ib < ic);
            IA = ia;
            IB = ib;
            IC = ic;
        }
    }

    [StructLayout(LayoutKind.Auto)]
    public readonly struct SimplexIndexes
    {
        public readonly int IA;
        public readonly int IB;
        public readonly int IC;
        public readonly int ID;

        public SimplexIndexes(int ia, int ib, int ic, int id)
        {
            IA = ia;
            IB = ib;
            IC = ic;
            ID = id;
        }
    }

    [StructLayout(LayoutKind.Auto)]
    ///Indexes are always sorted
    public readonly struct Simplex
    {
        public readonly int IA;
        public readonly int IB;
        public readonly int IC;
        public readonly int ID;

        public readonly Vector3 Circumcenter;
        public readonly float CircumradiusSqr;

        public Simplex(int ia, int ib, int ic, int id, Vector3 circumcenter, float circumradiusSqr)
        {
            IA = ia;
            IB = ib;
            IC = ic;
            ID = id;
            Circumcenter = circumcenter;
            CircumradiusSqr = circumradiusSqr;
        }

        internal bool HasSupervertex(int minIndex) => IA >= minIndex || IB >= minIndex || IC >= minIndex || ID >= minIndex;

        internal bool InCircumsphere(Vector3 point)
        {
            //Debug.Assert(Math.Abs((Circumcenter - point).LengthSquared() - CircumradiusSqr) > 1e-6f);

            return (Circumcenter - point).LengthSquared() <= CircumradiusSqr;
        }

        internal Hyperface ABC() => new(IA, IB, IC);
        internal Hyperface ABD() => new(IA, IB, ID);
        internal Hyperface ACD() => new(IA, IC, ID);
        internal Hyperface BCD() => new(IB, IC, ID);

        internal FacesSharing Shares(FacesSharing input, SimplexIndexes other)
        {
            //tetrahedrons share at most one face, hence else branches can be used extensivelly
            // if (other.IA == IA)
            // {
            //     if ((other.IB == IB && (other.IC == IC || other.ID == IC)) || (other.IC == IB && other.ID == IC)) //abc
            //         input |= FacesSharing.ABC;
            //     else if ((other.IB == IB && (other.IC == ID || other.ID == ID)) || (other.IC == IB && other.ID == ID)) //abd
            //         input |= FacesSharing.ABD;
            //     else if ((other.IB == IC && (other.IC == ID || other.ID == ID)) || (other.IC == IC && other.ID == ID)) //acd
            //         input |= FacesSharing.ACD;
            // }
            // else if (other.IA == IB)
            // {
            //     if ((other.IB == IC && (other.IC == ID || other.ID == ID)) || (other.IC == IC && other.ID == ID)) //bcd
            //         input |= FacesSharing.BCD;
            // }
            // else if (other.IB == IA)
            // {
            //     if (other.IC == IB && other.ID == IC) //abc
            //         input |= FacesSharing.ABC;
            //     else if (other.IC == IB && other.ID == ID) //abd
            //         input |= FacesSharing.ABD;
            //     else if (other.IC == IC && other.ID == ID) //abd
            //         input |= FacesSharing.ACD;
            // }
            // else if (other.IB == IB && other.IC == IC && other.ID == ID) //bcd
            //     input |= FacesSharing.BCD;

            //ABC:
            // (A == X && B == Y & C == Z) || [0]
            // (A == X && B == Y & C == W) || [1]
            // (A == X && B == Z & C == W) || [2]
            // (A == Y && B == Z & C == W) || [3]
            //ABD:
            // (A == X && B == Y & D == Z) || [4]
            // (A == X && B == Y & D == W) || [5]
            // (A == X && B == Z & D == W) || [6]
            // (A == Y && B == Z & D == W) || [7]
            //ACD:
            // (A == X && C == Y & D == Z) || [8]
            // (A == X && C == Y & D == W) || [9]
            // (A == X && C == Z & D == W) || [10]
            // (A == Y && C == Z & D == W) || [11]
            //BCD:
            // (B == X && C == Y & D == Z) || [12]
            // (B == X && C == Y & D == W) || [13]
            // (B == X && C == Z & D == W) || [14]
            // (B == Y && C == Z & D == W)    [15]

            if (IA == other.IA) //[0,1,2, 4,5,6, 8,9,10]
            {
                if (IB == other.IB) //[0,1, 4,5]
                {
                    if (IC == other.IC || IC == other.ID) return input | FacesSharing.ABC; //[0,1]
                    else if (ID == other.IC || ID == other.ID) return input | FacesSharing.ABD; //[4,5]
                }
                else if (IB == other.IC) //[2, 6]
                {
                    if (IC == other.ID) return input | FacesSharing.ABC; //[2]
                    else if (ID == other.ID) return input | FacesSharing.ABD; //[6]
                }
                else if ((IC == other.IB && (ID == other.IC || ID == other.ID)) || (IC == other.IC && ID == other.ID)) return input | FacesSharing.ACD; //[8,9,10]
            }
            else if (IA == other.IB) //[3, 7, 11]
            {
                if (IB == other.IC) //[3, 7]
                {
                    if (IC == other.ID) return input | FacesSharing.ABC; //[3]
                    else if (ID == other.ID) return input | FacesSharing.ABD; //[7]
                }
                else if (IC == other.IC && ID == other.ID) return input | FacesSharing.ACD; //[11]
            }
            else if (IB == other.IA) //[12,13,14]
            {
                if ((IC == other.IB && (ID == other.IC || ID == other.ID)) || (IC == other.IC && ID == other.ID)) return input | FacesSharing.BCD; //[12,13,14]
            }
            else if (IB == other.IB && IC == other.IC && ID == other.ID) return input | FacesSharing.BCD; //[15]

            return input;
        }

        internal void PushEdges(List<HashSet<int>> voronoi)
        {
            voronoi[IA].Add(IB);
            voronoi[IA].Add(IC);
            voronoi[IA].Add(ID);

            voronoi[IB].Add(IA);
            voronoi[IB].Add(IC);
            voronoi[IB].Add(ID);

            voronoi[IC].Add(IA);
            voronoi[IC].Add(IB);
            voronoi[IC].Add(ID);

            voronoi[ID].Add(IA);
            voronoi[ID].Add(IB);
            voronoi[ID].Add(IC);
        }

        internal static bool TryCreate(IList<Hyperface> polyhedron, int f, Vector3[] points, int p, out Simplex result)
        {
            Span<int> tmp = [polyhedron[f].IA, polyhedron[f].IB, polyhedron[f].IC, p];
            MemoryExtensions.Sort(tmp);

            //https://en.wikipedia.org/wiki/Tetrahedron#Circumcenter
            var s = points[tmp[1]] - points[tmp[0]];
            var t = points[tmp[2]] - points[tmp[0]];
            var u = points[tmp[3]] - points[tmp[0]];

            Span<float> detElems = [s.X * t.Y * u.Z, s.Y * t.Z * u.X, s.Z * t.X * u.Y, - s.Z * t.Y * u.X, - s.Y * t.X * u.Z, - s.X * t.Z * u.Y];
            MemoryExtensions.Sort(detElems, (x, y) => Math.Abs(x).CompareTo(Math.Abs(y)));
            var det = detElems[0] + detElems[1] + detElems[2] + detElems[3] + detElems[4] + detElems[5];
            //var det = s.X * t.Y * u.Z + s.Y * t.Z * u.X + s.Z * t.X * u.Y - s.Z * t.Y * u.X - s.Y * t.X * u.Z - s.X * t.Z * u.Y;
            var rcpDet = 0.5f / det;
            if (float.IsNormal(rcpDet))
            {
                var circumcenterVec = (u.LengthSquared() * Vector3.Cross(s, t) + t.LengthSquared() * Vector3.Cross(u, s) + s.LengthSquared() * Vector3.Cross(t, u)) * rcpDet;

                result = new(tmp[0], tmp[1], tmp[2], tmp[3],
                    points[tmp[0]] + circumcenterVec, circumcenterVec.LengthSquared());
                return true;
            }
            else
            {
                result = default;
                return false;
            }
        }

        public static Simplex CreateInitial(Vector3[] points)
        {
            var count = points.Length - 4;

            //https://en.wikipedia.org/wiki/Tetrahedron#Circumcenter
            var s = points[count + 1] - points[count];
            var t = points[count + 2] - points[count];
            var u = points[count + 3] - points[count];

            Span<float> detElems = [s.X * t.Y * u.Z, s.Y * t.Z * u.X, s.Z * t.X * u.Y, - s.Z * t.Y * u.X, - s.Y * t.X * u.Z, - s.X * t.Z * u.Y];
            MemoryExtensions.Sort(detElems, (x, y) => Math.Abs(x).CompareTo(Math.Abs(y)));
            var det = detElems[0] + detElems[1] + detElems[2] + detElems[3] + detElems[4] + detElems[5];
            //var det = s.X * t.Y * u.Z + s.Y * t.Z * u.X + s.Z * t.X * u.Y - s.Z * t.Y * u.X - s.Y * t.X * u.Z - s.X * t.Z * u.Y;
            var rcpDet = 0.5f / det;
            if (float.IsNormal(rcpDet))
            //if (Math.Abs(det) > 1e-12f)
            {
                var circumcenter = points[count] + (u.LengthSquared() * Vector3.Cross(s, t) + t.LengthSquared() * Vector3.Cross(u, s) + s.LengthSquared() * Vector3.Cross(t, u)) * rcpDet;//* (0.5f / det);
                return new(count, count + 1, count + 2, count + 3, circumcenter, (circumcenter - points[count]).LengthSquared());
            }
            else
                throw new Exception("Degenerate initial tetrahedron detected! There is something wrong with the input data, possibly there are less than 4 points or they are all coplanar");
        }

        public SimplexIndexes GetIndices() => new(IA, IB, IC, ID);

        internal float Volume(Vector3[] points)
        {
            var a = points[IA] - points[ID];
            var b = points[IB] - points[ID];
            var c = points[IC] - points[ID];

            //see https://en.wikipedia.org/wiki/Tetrahedron
            //using the scalar tripple product

            return Math.Abs(Vector3.Dot(a, Vector3.Cross(b, c))) / 6f;
        }

        internal (float AntigravityPull, float Area) NeighInterface(Vector3[] points, FacesSharing conn)
        {
            Vector3 a, b;
            switch(conn)
            {
                case FacesSharing.ABC: a = points[IB] - points[IA]; b = points[IC] - points[IA]; break;
                case FacesSharing.ABD: a = points[IB] - points[IA]; b = points[ID] - points[IA]; break;
                case FacesSharing.ACD: a = points[IC] - points[IA]; b = points[ID] - points[IA]; break;
                case FacesSharing.BCD: a = points[IC] - points[IB]; b = points[ID] - points[IB]; break;
                default: return (0f, 0f);
            }

            var ortho = Vector3.Cross(a, b);
            var orthoLength = ortho.Length();
            var area = orthoLength * 0.5f;
            //DOT with DOWN vector
            var antigravityPull = ortho.Y / orthoLength;
            return (antigravityPull, area);
        }

        internal bool PointInside(Vector3[] points, Vector3 center)
        {
            //see https://math.stackexchange.com/a/4431870

            //should be precompueted
            var na = Vector3.Cross(points[IB] - points[IA], points[IC] - points[IA]);
            var nb = Vector3.Cross(points[IB] - points[IA], points[ID] - points[IA]);
            var nc = Vector3.Cross(points[IC] - points[IA], points[ID] - points[IA]);
            var nd = Vector3.Cross(points[IC] - points[IB], points[ID] - points[IB]);

            var g = 0.25f * (points[IA] + points[IB] + points[IC] + points[ID]);
            var ga = g - points[IA];
            var gb = g - points[IB];
            if (Vector3.Dot(ga, na) > 0) na = -na;
            if (Vector3.Dot(ga, nb) > 0) nb = -nb;
            if (Vector3.Dot(ga, nc) > 0) nc = -nc;
            if (Vector3.Dot(gb, nd) > 0) nd = -nd;

            //now the actual computation
            var qa = center - points[IA];
            return !(Vector3.Dot(qa, na) > 0 || Vector3.Dot(qa, nb) > 0 || Vector3.Dot(qa, nc) > 0 || Vector3.Dot(center - points[IB], nd) > 0);
        }

        internal Vector3 GetRandomPoint(Vector3[] points, Pcg rnd, float minDepth, float maxDepth)
        {
            var maxY = Math.Max( Math.Max(points[IA].Y, points[IB].Y), Math.Max(points[IC].Y, points[ID].Y) );
            var minY = Math.Min( Math.Min(points[IA].Y, points[IB].Y), Math.Min(points[IC].Y, points[ID].Y) );
            var depth = Math.Clamp(maxY - rnd.NextFloat(minDepth, maxDepth), minY, maxY);

            //cut all edges at the given height (three of them will have an actual intersection in the interval)
            var triangle = new List<Vector3>();
            if (TryGetHorizontalCut(points[IA], points[IB], depth, out var p)) triangle.Add(p);
            if (TryGetHorizontalCut(points[IA], points[IC], depth, out p)) triangle.Add(p);
            if (TryGetHorizontalCut(points[IA], points[ID], depth, out p)) triangle.Add(p);
            if (TryGetHorizontalCut(points[IB], points[IC], depth, out p)) triangle.Add(p);
            if (TryGetHorizontalCut(points[IB], points[ID], depth, out p)) triangle.Add(p);
            if (TryGetHorizontalCut(points[IC], points[ID], depth, out p)) triangle.Add(p);

            if (triangle.Count == 0)
            {
                if (points[IA].Y == maxY) return points[IA];
                else if (points[IB].Y == maxY) return points[IB];
                else if (points[IC].Y == maxY) return points[IC];
                else return points[ID];
            }
            else if (triangle.Count == 1)
                return triangle[0];
            else if (triangle.Count == 2)
            {
                var t = rnd.NextFloat();
                return triangle[0] * t + triangle[1] * (1f - t);
            }
            else
            {
                var s = rnd.NextFloat();
                var t = rnd.NextFloat();
                return (triangle[0] * s + triangle[1] * (1f - s)) * t + triangle[2] * (1f - t);
            }
        }

        static bool TryGetHorizontalCut(Vector3 a, Vector3 b, float h, out Vector3 intersection)
        {
            var dy = b.Y - a.Y;
            if (Math.Abs(dy) < 0)
            {
                //deliberately ignoring the case when the whole edge lies in the plane since that will be handled by the remaining edges, it would only produce unnecessary duplicates
                intersection = default;
                return false;
            }

            var t = (h - a.Y) / dy;
            if (t >= 0f && t <= 1f)
            {
                intersection = a + t * (b - a);
                return true;
            }
            else
            {
                intersection = default;
                return false;
            }
        }

        internal Hyperface GetFace(FacesSharing face) => face switch
        {
            FacesSharing.ABD => new (IA, IB, ID),
            FacesSharing.ACD => new (IA, IC, ID),
            FacesSharing.BCD => new (IB, IC, ID),
            _ => new (IA, IB, IC)
        };

        bool DebugIntersection(Vector3[] points, Simplex other)
        {
            if (
                other.PointInside(points, points[IA]) ||
                other.PointInside(points, points[IB]) ||
                other.PointInside(points, points[IC]) ||
                other.PointInside(points, points[ID]) ||
                PointInside(points, points[other.IA]) ||
                PointInside(points, points[other.IB]) ||
                PointInside(points, points[other.IC]) ||
                PointInside(points, points[other.ID]))
                return true;

            return false;
        }

        internal static float Height(Vector3[] points)
        {
            var min = float.MaxValue;
            var max = float.MinValue;
            for(int i = 0; i < points.Length; ++i)
            {
                if (points[i].Y < min) min = points[i].Y;
                if (points[i].Y > max) max = points[i].Y;
            }
            return max - min;
        }
    }

    [Flags]
    internal enum FacesSharing : byte { None = 0, ABC = 1, ABD = 2, ACD = 4, BCD = 8 };

    [StructLayout(LayoutKind.Auto)]
    ///Indexes are always sorted
    public readonly struct Tetrahedron
    {
        public readonly int IA;
        public readonly int IB;
        public readonly int IC;
        public readonly int ID;

        public readonly int NA;
        public readonly int NB;
        public readonly int NC;
        public readonly int ND;

        public Tetrahedron(int ia, int ib, int ic, int id)
        {
            IA = ia;
            IB = ib;
            IC = ic;
            ID = id;
            NA = -1;
            NB = -1;
            NC = -1;
            ND = -1;
        }
    }

    public readonly struct RainCatcher
    {
        public readonly int Index;
        public readonly float ProjectedArea; //check if this is computed by a valid formula (triangle area multiplied by the cosine of its roll angle)

        public RainCatcher(int index, float projectedArea)
        {
            Index = index;
            ProjectedArea = projectedArea;
        }
    }

    public readonly struct NeighborData
    {
        public readonly int Index;
        public readonly float Ratio;
        public NeighborData(int index, float ratio)
        {
            Index = index;
            Ratio = ratio;
        }
    }

    public readonly struct NeighborQueueItem
    {
        public readonly int Index;
        public readonly float RemainingDistance;
        public readonly ushort Level;
        public NeighborQueueItem(int index, ushort level, float remainingDist)
        {
            Index = index;
            Level = level;
            RemainingDistance = remainingDist;
        }
    }
}

