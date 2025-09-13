using System.Diagnostics.CodeAnalysis;

namespace AgroRenderer;

[SuppressMessage("ReSharper", "InconsistentNaming")]
[SuppressMessage("ReSharper", "UnusedMember.Global")]
[SuppressMessage("ReSharper", "UnusedType.Global")]
public static partial class Vk
{
    // ----------------------------------------------------------------
    // Vulkan Constants
    
    public const uint VK_ATTACHMENT_UNUSED = ~0U;
    public const uint VK_FALSE = 0U;
    public const float VK_LOD_CLAMP_NONE = 1000.0F;
    public const uint VK_QUEUE_FAMILY_IGNORED = ~0U;
    public const uint VK_REMAINING_ARRAY_LAYERS = ~0U;
    public const uint VK_REMAINING_MIP_LEVELS = ~0U;
    public const uint VK_SUBPASS_EXTERNAL = ~0U;
    public const uint VK_TRUE = 1U;
    public const ulong VK_WHOLE_SIZE = ~0UL;
    public const uint VK_MAX_MEMORY_TYPES = 32U;
    public const uint VK_MAX_PHYSICAL_DEVICE_NAME_SIZE = 256U;
    public const uint VK_UUID_SIZE = 16U;
    public const uint VK_MAX_EXTENSION_NAME_SIZE = 256U;
    public const uint VK_MAX_DESCRIPTION_SIZE = 256U;
    public const uint VK_MAX_MEMORY_HEAPS = 16U;
    public const IntPtr VK_NULL_HANDLE = 0;
}