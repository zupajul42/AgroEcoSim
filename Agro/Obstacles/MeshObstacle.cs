using AgentsSystem;
using System;
using System.Collections.Generic;
using System.IO;
using System.Numerics;
using System.Text;

namespace Agro;

public partial class MeshObstacle : IObstacle
{
    public readonly Vector3 Position;

    readonly IList<Vector3> PointData;
    readonly List<int> IndexData;
    readonly ArraySegment<byte> PrimitiveDataClustered;
    readonly ArraySegment<byte> PrimitiveDataInterleaved;

    public MeshObstacle(Vector3[] vertices, List<List<int>> faces)
    {
        PointData = vertices;
        IndexData = new(faces.Count);
        foreach (var face in faces)
            if (face.Count == 3)
                IndexData.AddRange(face);

        using var clusteredStream = new MemoryStream();
        using var clustered = new BinaryWriter(clusteredStream);
        using var interleavedStream = new MemoryStream();
        using var interleaved = new BinaryWriter(interleavedStream);

        clustered.WriteU32(1);
        interleaved.WriteU32(1);

        clustered.WriteU8(0);
        clustered.Write(PointData.Count);
        for (int i = 0; i < PointData.Count; ++i)
            clustered.WriteV32(PointData[i]);
        clustered.Write(IndexData.Count);
        for (int i = 0; i < IndexData.Count; ++i)
            clustered.Write(IndexData[i]);

        interleaved.WriteU8(0);
        interleaved.Write(PointData.Count);
        for (int i = 0; i < PointData.Count; ++i)
            interleaved.WriteV32(PointData[i]);
        interleaved.Write(IndexData.Count);
        for (int i = 0; i < IndexData.Count; ++i)
            interleaved.Write(IndexData[i]);
        interleaved.Write(false);

        clusteredStream.TryGetBuffer(out PrimitiveDataClustered);
        interleavedStream.TryGetBuffer(out PrimitiveDataInterleaved);
    }

    public void ExportTriangles(List<Vector3> points, BinaryWriter writer)
    {
        writer.WriteU32(1);
        writer.WriteU8(IndexData.Count / 3); //WRITE NUMBER OF TRIANGLES in this surface

        points.AddRange(PointData);

        foreach(var item in IndexData)
            writer.Write(item);
    }

    public void ExportObj(List<Vector3> points, StringBuilder obji)
    {
        points.AddRange(PointData);
        for(int i = 0; i < IndexData.Count; i += 3)
            obji.AppendLine($"f {IndexData[i] + 1} {IndexData[i+1] + 1} {IndexData[i+2] + 1}");
    }

    public void ExportAsPrimitivesClustered(BinaryWriter writer) => writer.Write(PrimitiveDataClustered);
    public void ExportAsPrimitivesInterleaved(BinaryWriter writer) => writer.Write(PrimitiveDataInterleaved);

    public void ExportMesh(BinaryWriter writer) //for the frontend
    {
        writer.Write(PointData.Count);
        for (int i = 0; i < PointData.Count; ++i)
            writer.WriteV32(PointData[i]);
        writer.Write(IndexData.Count);
        for (int i = 0; i < IndexData.Count; ++i)
            writer.Write(IndexData[i]);
    }
}