using Agro;

namespace AgroServer.Services;

public readonly struct TerrainBufferItem
{
    public readonly DateTime Modified = DateTime.UtcNow;
    public readonly ImportedObjData Data;

    public TerrainBufferItem(ImportedObjData terrain)
    {
        Data = terrain;
    }
}

public interface ITerrainBuffer
{
    string Add(ImportedObjData terrain);
    bool TryGet(string key, out ImportedObjData data);
}

public class TerrainBuffer : ITerrainBuffer
{
    readonly Dictionary<string, TerrainBufferItem> TerrainPerConnection = [];
    static readonly TimeSpan CacheTimeout = TimeSpan.FromMinutes(5);

    public string Add(ImportedObjData terrain)
    {
        lock (TerrainPerConnection)
        {
            var key = Guid.NewGuid().ToString();
            TerrainPerConnection[key] = new(terrain);
            var toRemove = new List<string>();
            var now = DateTime.UtcNow;

            foreach (var item in TerrainPerConnection)
                if (now - item.Value.Modified > CacheTimeout)
                    toRemove.Add(item.Key);

            foreach (var item in toRemove)
                TerrainPerConnection.Remove(item);

            return key;
        }
    }

    public bool TryGet(string key, out ImportedObjData data)
    {
        lock (TerrainPerConnection)
        {
            if (TerrainPerConnection.TryGetValue(key, out var result))
            {
                TerrainPerConnection.Remove(key);
                data = result.Data;
                return true;
            }
            else
            {
                data = default;
                return false;
            }
        }
    }
}