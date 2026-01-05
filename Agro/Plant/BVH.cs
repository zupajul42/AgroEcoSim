using System.Collections.Generic;
using System.Numerics;

namespace Agro;

/// <summary>
/// A lightweight bounding volume hierarchy suitable for quick overlap tests.
/// </summary>
public class Bvh
{
    public readonly struct BoundingBox
    {
        public BoundingBox(Vector3 min, Vector3 max)
        {
            Min = min;
            Max = max;
        }

        public Vector3 Min { get; }
        public Vector3 Max { get; }

        public Vector3 Center => (Min + Max) * 0.5f;

        public static BoundingBox Merge(BoundingBox a, BoundingBox b) => new(Vector3.Min(a.Min, b.Min), Vector3.Max(a.Max, b.Max));

        public bool Intersects(in BoundingBox other)
        {
            return !(Min.X > other.Max.X || Max.X < other.Min.X
                || Min.Y > other.Max.Y || Max.Y < other.Min.Y
                || Min.Z > other.Max.Z || Max.Z < other.Min.Z);
        }
    }

    readonly struct Node
    {
        public readonly BoundingBox Bounds;
        public readonly int Left;
        public readonly int Right;
        public readonly int Parent;
        public readonly int AgentIndex;

        public bool IsLeaf => Left < 0 && Right < 0;

        public Node(BoundingBox bounds, int left, int right, int parent, int agentIndex)
        {
            Bounds = bounds;
            Left = left;
            Right = right;
            Parent = parent;
            AgentIndex = agentIndex;
        }

        public Node WithBounds(BoundingBox bounds) => new(bounds, Left, Right, Parent, AgentIndex);
    }

    int root = -1;
    readonly List<Node> nodes = new();
    readonly Dictionary<int, int> leafLookup = new();

    public bool IsEmpty => root < 0;

    public void Clear()
    {
        nodes.Clear();
        leafLookup.Clear();
        root = -1;
    }

    public void Build(List<(int agentIndex, BoundingBox bounds)> leaves)
    {
        Clear();
        if (leaves.Count == 0)
            return;

        var items = new List<(int agentIndex, BoundingBox bounds)>(leaves);
        root = BuildRecursive(items, -1);
    }

    int BuildRecursive(List<(int agentIndex, BoundingBox bounds)> leaves, int parent)
    {
        if (leaves.Count == 1)
        {
            var index = nodes.Count;
            var (agentIndex, bounds) = leaves[0];
            nodes.Add(new Node(bounds, -1, -1, parent, agentIndex));
            leafLookup[agentIndex] = index;
            return index;
        }

        int axis = ChooseSplitAxis(leaves);
        leaves.Sort((a, b) => GetCenterComponent(a.bounds, axis).CompareTo(GetCenterComponent(b.bounds, axis)));

        int mid = leaves.Count / 2;
        var leftLeaves = leaves.GetRange(0, mid);
        var rightLeaves = leaves.GetRange(mid, leaves.Count - mid);

        var nodeIndex = nodes.Count;
        nodes.Add(default);

        int left = BuildRecursive(leftLeaves, nodeIndex);
        int right = BuildRecursive(rightLeaves, nodeIndex);

        var merged = BoundingBox.Merge(nodes[left].Bounds, nodes[right].Bounds);
        nodes[nodeIndex] = new Node(merged, left, right, parent, -1);
        return nodeIndex;
    }

    static int ChooseSplitAxis(List<(int agentIndex, BoundingBox bounds)> leaves)
    {
        var min = leaves[0].bounds.Min;
        var max = leaves[0].bounds.Max;

        for (int i = 1; i < leaves.Count; ++i)
        {
            min = Vector3.Min(min, leaves[i].bounds.Min);
            max = Vector3.Max(max, leaves[i].bounds.Max);
        }

        var extents = max - min;
        if (extents.X >= extents.Y && extents.X >= extents.Z)
            return 0;
        if (extents.Y >= extents.Z)
            return 1;
        return 2;
    }

    static float GetCenterComponent(in BoundingBox bounds, int axis) => axis switch
    {
        0 => bounds.Center.X,
        1 => bounds.Center.Y,
        _ => bounds.Center.Z,
    };

    public void RefitLeaf(int agentIndex, BoundingBox bounds)
    {
        if (!leafLookup.TryGetValue(agentIndex, out var leaf))
            return;

        nodes[leaf] = nodes[leaf].WithBounds(bounds);

        var parent = nodes[leaf].Parent;
        while (parent >= 0)
        {
            var node = nodes[parent];
            var merged = BoundingBox.Merge(nodes[node.Left].Bounds, nodes[node.Right].Bounds);
            nodes[parent] = node.WithBounds(merged);
            parent = node.Parent;
        }
    }

    public List<(int first, int second)> GetOverlappingPairs()
    {
        var result = new List<(int, int)>();
        if (IsEmpty)
            return result;

        var uniquePairs = new HashSet<(int, int)>();
        var internalStack = new Stack<int>();
        internalStack.Push(root);

        var pairStack = new Stack<(int a, int b)>();

        while (internalStack.Count > 0)
        {
            int idx = internalStack.Pop();
            var n = nodes[idx];

            if (n.IsLeaf)
                continue;

            pairStack.Push((n.Left, n.Right));
            internalStack.Push(n.Left);
            internalStack.Push(n.Right);
        }
        while (pairStack.Count > 0)
        {
            var (aIndex, bIndex) = pairStack.Pop();
            var a = nodes[aIndex];
            var b = nodes[bIndex];

            if (!a.Bounds.Intersects(in b.Bounds))
                continue;

            bool aLeaf = a.IsLeaf;
            bool bLeaf = b.IsLeaf;

            if (aLeaf && bLeaf)
            {
                var pair = a.AgentIndex < b.AgentIndex
                    ? (a.AgentIndex, b.AgentIndex)
                    : (b.AgentIndex, a.AgentIndex);

                if (uniquePairs.Add(pair))
                    result.Add((pair.Item1, pair.Item2));
            }
            else if (aLeaf)
            {
                pairStack.Push((aIndex, b.Left));
                pairStack.Push((aIndex, b.Right));
            }
            else if (bLeaf)
            {
                pairStack.Push((a.Left, bIndex));
                pairStack.Push((a.Right, bIndex));
            }
            else
            {
                pairStack.Push((a.Left, b.Left));
                pairStack.Push((a.Left, b.Right));
                pairStack.Push((a.Right, b.Left));
                pairStack.Push((a.Right, b.Right));
            }
        }


        return result;
    }

    public void AddLeaf(int agentIndex, BoundingBox bounds)
    {
        if (leafLookup.ContainsKey(agentIndex))
        {
            RefitLeaf(agentIndex, bounds);
            return;
        }

        if (IsEmpty)
        {
            root = 0;
            nodes.Add(new Node(bounds, -1, -1, -1, agentIndex));
            leafLookup[agentIndex] = 0;
            return;
        }

        int sibling = ChooseBestSibling(bounds);
        int oldParent = nodes[sibling].Parent;

        int leafIndex = nodes.Count;
        var leafNode = new Node(bounds, -1, -1, -1, agentIndex);
        nodes.Add(leafNode);
        leafLookup[agentIndex] = leafIndex;

        int newParentIndex = nodes.Count;
        var siblingNode = nodes[sibling];
        var newParentBounds = BoundingBox.Merge(bounds, siblingNode.Bounds);
        var newParent = new Node(newParentBounds, sibling, leafIndex, oldParent, -1);
        nodes.Add(newParent);

        // Fix sibling parent link
        nodes[sibling] = new Node(siblingNode.Bounds, siblingNode.Left, siblingNode.Right, newParentIndex, siblingNode.AgentIndex);

        if (oldParent >= 0)
        {
            var parentNode = nodes[oldParent];
            if (parentNode.Left == sibling)
                nodes[oldParent] = new Node(parentNode.Bounds, newParentIndex, parentNode.Right, parentNode.Parent, parentNode.AgentIndex);
            else
                nodes[oldParent] = new Node(parentNode.Bounds, parentNode.Left, newParentIndex, parentNode.Parent, parentNode.AgentIndex);
        }
        else
        {
            root = newParentIndex;
        }

        FixUpwardsBounds(oldParent >= 0 ? oldParent : newParentIndex);
    }

    void FixUpwardsBounds(int startNode)
    {
        int nodeIndex = startNode;
        while (nodeIndex >= 0)
        {
            var node = nodes[nodeIndex];
            if (node.IsLeaf)
            {
                nodeIndex = node.Parent;
                continue;
            }

            var merged = BoundingBox.Merge(nodes[node.Left].Bounds, nodes[node.Right].Bounds);
            nodes[nodeIndex] = node.WithBounds(merged);
            nodeIndex = node.Parent;
        }
    }

    int ChooseBestSibling(BoundingBox bounds)
    {
        int index = root;
        while (!nodes[index].IsLeaf)
        {
            var node =  nodes[index];
            var left =  nodes[node.Left];
            var right =  nodes[node.Right];

            float currentArea = BoundsVolume(node.Bounds);
            float mergeLeft = BoundsVolume(BoundingBox.Merge(left.Bounds, bounds)) - BoundsVolume(left.Bounds);
            float mergeRight = BoundsVolume(BoundingBox.Merge(right.Bounds, bounds)) - BoundsVolume(right.Bounds);

            if (mergeLeft < mergeRight)
                index = node.Left;
            else if (mergeRight < mergeLeft)
                index = node.Right;
            else
                index = BoundsVolume(left.Bounds) < BoundsVolume(right.Bounds) ? node.Left : node.Right;
        }
        return index;
    }

    static float BoundsVolume(BoundingBox bounds)
    {
        var extents = bounds.Max - bounds.Min;
        return extents.X * extents.Y * extents.Z;
    }

    public List<int> QueryOverlaps(int agentIndex)
    {
        var result = new List<int>();
        if (!leafLookup.TryGetValue(agentIndex, out var leafIndex))
            return result;

        var targetBounds = nodes[leafIndex].Bounds;
        var stack = new Stack<int>();
        stack.Push(root);

        while (stack.Count > 0)
        {
            var nodeIndex = stack.Pop();
            var node = nodes[nodeIndex];

            if (!targetBounds.Intersects(in node.Bounds))
                continue;

            if (node.IsLeaf)
            {
                if (node.AgentIndex != agentIndex)
                    result.Add(node.AgentIndex);
            }
            else
            {
                stack.Push(node.Left);
                stack.Push(node.Right);
            }
        }

        return result;
    }
    public List<int> QueryOverlaps(BoundingBox bounds)
    {
        var result = new List<int>();
        if (IsEmpty)
            return result;

        var stack = new Stack<int>();
        stack.Push(root);

        while (stack.Count > 0)
        {
            var nodeIndex = stack.Pop();
            var node = nodes[nodeIndex];

            if (!bounds.Intersects(in node.Bounds))
                continue;

            if (node.IsLeaf)
            {
                result.Add(node.AgentIndex);
            }
            else
            {
                stack.Push(node.Left);
                stack.Push(node.Right);
            }
        }

        return result;
    }
    public bool TryGetBounds(int agentIndex, out BoundingBox bounds)
    {
        if (leafLookup.TryGetValue(agentIndex, out var leaf))
        {
            bounds = nodes[leaf].Bounds;
            return true;
        }

        bounds = default;
        return false;
    }
}