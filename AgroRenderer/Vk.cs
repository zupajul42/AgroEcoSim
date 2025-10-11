using System.Diagnostics.CodeAnalysis;

namespace AgroRenderer;

[SuppressMessage("ReSharper", "InconsistentNaming")]
public static partial class Vk
{
    public const string VK_EXT_DEBUG_UTILS_EXTENSION_NAME = "VK_EXT_debug_utils";

    // ----------------------------------------------------------------
    // Vulkan Macros
    public static uint VK_MAKE_API_VERSION(uint variant, uint major, uint minor, uint patch)
    {
        return (variant << 29) | (major << 22) | (minor << 12) | patch;
    }

    public static uint VK_MAKE_VERSION(uint major, uint minor, uint patch)
    {
        return (major << 22) | (minor << 12) | patch;
    }

    public static uint VK_VERSION_MAJOR(uint version)
    {
        return version >> 22;
    }

    public static uint VK_VERSION_MINOR(uint version)
    {
        return (version >> 12) & 0x3ffU;
    }

    public static uint VK_VERSION_PATCH(uint version)
    {
        return version & 0xfffU;
    }

    public static uint VK_API_VERSION_VARIANT(uint version)
    {
        return version >> 29;
    }

    public static uint VK_API_VERSION_MAJOR(uint version)
    {
        return (version >> 22) & 0x7f;
    }

    public static uint VK_API_VERSION_MINOR(uint version)
    {
        return VK_VERSION_MINOR(version);
    }

    public static uint VK_API_VERSION_PATCH(uint version)
    {
        return VK_VERSION_PATCH(version);
    }
}