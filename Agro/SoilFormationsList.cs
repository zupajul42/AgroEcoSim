using System;
using System.Numerics;
using System.Collections.Generic;
using AgentsSystem;
using Utils;
using System.Timers;
using System.Diagnostics;
using System.Linq;
using System.Runtime.CompilerServices;
using M = System.Runtime.CompilerServices.MethodImplAttribute;
using System.Collections;
using System.Text.RegularExpressions;

namespace Agro;

public static class BitArrayExtensions
{
	public static int PopCount(this BitArray bitArray)
	{
		// Copy to int[] (each int holds 32 bits)
		int[] ints = new int[(bitArray.Count + 31) / 32];
		bitArray.CopyTo(ints, 0);

		int count = 0;
		foreach (int value in ints)
			count += BitOperations.PopCount((uint)value);
		return count;
	}

	public static bool Any(this BitArray bitArray)
	{
		// Copy to int[] (each int holds 32 bits)
		int[] ints = new int[(bitArray.Count + 31) / 32];
		bitArray.CopyTo(ints, 0);

		foreach (int value in ints)
			if (value != 0)
				return true;

		return false;
	}

	public static bool IndexOfFirst(this BitArray bitArray, out int result, int skip = 0)
	{
		// Copy to int[] (each int holds 32 bits)
		var ints = new uint[(bitArray.Count + 31) / 32];
		bitArray.CopyTo(ints, 0);

		int blocks = 0;
		for (int i = skip * 8; i < ints.Length; ++i)
		{
			if (ints[i] != 0)
			{
				for (int b = 0; b < 8; ++b)
					if (bitArray.Get(blocks + b))
					{
						result = blocks + b;
						return true;
					}
			}
			blocks += 8;
		}
		result = -1;
		return false;
	}
}

internal readonly record struct Edge
{
	public readonly int A;
	public readonly int B;
	public Edge(int a, int b)
	{
		if (a < b)
		{
			A = a;
			B = b;
		}
		else
		{
			B = a;
			A = b;
		}
	}
}

internal class Component
{
	internal readonly List<int> Faces = [];
	readonly HashSet<Edge> OuterEdges = [];

	public Component(int face, IList<int> vertices)
	{
		Faces.Add(face);
		for (int i = 1; i < vertices.Count; ++i)
			OuterEdges.Add(new(vertices[i - 1], vertices[i]));
		OuterEdges.Add(new(vertices[^1], vertices[0]));
	}

	public static List<Edge> CreateEdges(List<int> vertices)
	{
		var edges = new List<Edge>(vertices.Count);
		for (int i = 1; i < vertices.Count; ++i)
			edges.Add(new(vertices[i - 1], vertices[i]));
		edges.Add(new(vertices[^1], vertices[0]));
		return edges;
	}

	public bool TryConnect(int face, List<Edge> edges, Component? other = null)
	{
		var innerEdges = new HashSet<Edge>(edges); //connection of the two components will become the inner edge(s)
		innerEdges.IntersectWith((other ?? this).OuterEdges);

		if (innerEdges.Count > 0) //merging
		{
			if (other != null) //this face has been added in the other == null step, now only add other.Faces
			{
				Faces.AddRange(other.Faces);
				OuterEdges.UnionWith(other.OuterEdges);
			}
			else
			{
				Faces.Add(face); //there is no other component to connect with, add only this face
				OuterEdges.UnionWith(edges); //only add the new edges iff other == null, otherwise some inner edges would be falesly readded again
			}
			OuterEdges.ExceptWith(innerEdges);
			return true;
		}
		else
			return false;
	}
}


public class SoilFormationsList : ISoilFormation
{
	const MethodImplOptions AI = MethodImplOptions.AggressiveInlining;
	readonly AgroWorld World;
	readonly List<SoilFormationRegularVoxels> Items;
	readonly List<MeshObstacle> Obstacles;

	public SoilFormationsList(AgroWorld world, ushort hoursPerTick, ImportedObjData objData, float scale, string? soilItemRegex, bool regexForMaterials, float fieldResolution)
	{
		World = world;

		var vertices = new Vector3[objData.Vertices.Length];
		for (int i = 0; i < objData.Vertices.Length; ++i)
		{
			var line = Regex.Replace(objData.Vertices[i], @"\s+", " ");
			var vertex = line.Split(' ').Where(x => x?.Length > 0).ToList();
			if (vertex.Count != 3)
				throw new Exception($"Invalid count of vertex coordinates. Expected: 3. Provided: {vertex.Count}.");
			vertices[i] = new Vector3(float.Parse(vertex[0]), float.Parse(vertex[1]), float.Parse(vertex[2])) * scale;
		}
		var regex = soilItemRegex != null ? new Regex(soilItemRegex, RegexOptions.IgnoreCase) : null;
		var soilFaces = new List<List<int>>();
		var obstacleFaces = new List<List<int>>();

		Items = [];
		var components = new List<Component>();
		var verts = new List<int>();
		var edges = new List<Edge>();
		var remove = new List<int>();
		foreach (var (group, faceLines) in objData.Faces)
		{
			var nameToMatch = regexForMaterials && (objData.Materials?.TryGetValue(group, out var mat) ?? false) ? mat : group;
			if (regex?.IsMatch(nameToMatch) ?? true) //for FAV use *Natur_Erde*
			{
				soilFaces.Clear();
				components.Clear();
				for (int i = 0; i < faceLines.Length; ++i)
				{
					var face = faceLines[i].Split(' ');
					verts.Clear();
					verts.AddRange(face.Select(ParseFaceIndex));
					Debug.Assert(verts.All(x => x < vertices.Length));
					soilFaces.Add([.. verts]);

					edges.Clear();
					for (int v = 1; v < verts.Count; ++v)
						edges.Add(new(verts[v - 1], verts[v]));
					edges.Add(new(verts[^1], verts[0]));

					remove.Clear();
					var target = -1;
					for (int c = 0; c < components.Count; ++c)
						if (target < 0)
						{
							if (components[c].TryConnect(i, edges))
								target = c;
						}
						else
						{
							if (components[target].TryConnect(i, edges, components[c]))
								remove.Add(c);
						}

					if (target < 0)
						components.Add(new(i, verts));
					else if (remove.Count > 0)
						for (int c = remove.Count - 1; c >= 0; --c)
							components.RemoveAt(remove[c]);
				}

				foreach (var item in components)
				{
					var min = new Vector3(float.MaxValue, float.MaxValue, float.MaxValue);
					var max = new Vector3(float.MinValue, float.MinValue, float.MinValue);
					foreach (var fi in item.Faces)
					{
						var face = soilFaces[fi];
						for (int fv = 0; fv < face.Count; ++fv)
						{
							Debug.Assert(face[fv] < vertices.Length);
							min = Vector3.Min(min, vertices[face[fv]]);
							max = Vector3.Max(max, vertices[face[fv]]);
						}
					}

					var metricSize = max - min;
					if (metricSize.X > 0.01f && metricSize.Y > 0.01f && metricSize.Z > 0.01f)
					{
						var celularSize = Vector3i.Max(new Vector3i(metricSize / fieldResolution), new Vector3i(1, 1, 1));
						Items.Add(new(world, hoursPerTick, celularSize, metricSize, min));
					}
				}
			}
			else //otherwise consider it an obstacle
			{
				for (int i = 0; i < faceLines.Length; ++i)
				{
					var face = faceLines[i].Split(' ');
					verts.Clear();
					verts.AddRange(face.Select(ParseFaceIndex));
					Debug.Assert(verts.All(x => x < vertices.Length));
					obstacleFaces.Add([.. verts]);
				}
			}
		}

		if (obstacleFaces.Count > 0)
		{
			if (World == null)
			{
				Obstacles ??= [];
				Obstacles.Add(new(vertices, obstacleFaces));
			}
			else
				World.Add(new MeshObstacle(vertices, obstacleFaces));
		}
	}

	public bool HasUndeliveredPost => false;

	public int Count => Items.Sum(x => x.Count);
	public int FieldsCount => Items.Count;

	public void Census() { }

	public void DeliverPost(uint timestep) { }

	public float GetMetricGroundDepth(float x, float z, int soilIndex) => Items.Count < soilIndex && soilIndex >= 0 ? Items[soilIndex].GetMetricGroundDepth(x, z) : 0f;

	public float GetTemperature(int index, int soilIndex) => 20f;

	public float GetWater(int index, int soilIndex) => Items[soilIndex].GetWater(index);

	public int IntersectPoint(Vector3 center, int soilIndex) => Items[soilIndex].IntersectPoint(center);

	[M(AI)]
	public static int ParseFaceIndex(string input)
	{
		input = input.TrimStart();
		var digits = 0;
		for (int i = 0; i < input.Length; ++i)
			if (!char.IsDigit(input[i]))
				break;
			else
				++digits;
		if (digits == 0)
			throw new Exception("Invalid face indexing format.");
		return int.Parse(input[..digits]);
	}

	public void ProcessRequests()
	{
		for (int i = 0; i < Items.Count; ++i)
			Items[i].ProcessRequests();
	}

	public void RequestWater(int index, float amount, PlantFormation2 plant, int soilIndex) => Items[soilIndex].RequestWater(index, amount, plant);

	public void RequestWater(int index, float amount, PlantSubFormation<UnderGroundAgent> plant, int part, int soilIndex) => Items[soilIndex].RequestWater(index, amount, plant, part);

	public void Tick(uint timestep)
	{
		for (int i = 0; i < Items.Count; ++i)
			Items[i].Tick(timestep);
	}

	public Vector3 GetRandomSeedPosition(Pcg rnd, int soilIndex) => Items[soilIndex].GetRandomSeedPosition(rnd);
	public void SetWorld(AgroWorld world)
	{
		for (int i = 0; i < Items.Count; ++i)
			Items[i].SetWorld(world);
		if (Obstacles?.Count > 0)
			foreach (var obstacle in Obstacles)
				world.Add(obstacle);
	}

	[M(AI)] public Vector3 GetFieldOrigin(int soilIndex) => Items[soilIndex].GetFieldOrigin(0);

	public byte[] Serialize()
	{
		using var stream = new MemoryStream();
		using var writer = new BinaryWriter(stream);

		writer.Write((byte)0); //version
		var count = FieldsCount;
		writer.Write(count);
		for (int i = 0; i < count; ++i)
			Write(writer, i);

		count = Obstacles?.Count ?? 0;
		writer.Write(count);
		for (int i = 0; i < count; ++i)
			Obstacles[i].ExportMesh(writer);

		return stream.ToArray();
	}

	public void Write(BinaryWriter writer, int i) => Items[i].Write(writer, 0);
}

