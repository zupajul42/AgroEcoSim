using System.Diagnostics.CodeAnalysis;

namespace AgroRenderer;

[SuppressMessage("ReSharper", "InconsistentNaming")]
[SuppressMessage("ReSharper", "UnusedMember.Global")]
[SuppressMessage("ReSharper", "UnusedType.Global")]
public static partial class Vk
{
    // ----------------------------------------------------------------
    // Vulkan Function Pointer Definitions
    public delegate void PFN_vkAllocationFunction(IntPtr userData, UInt64 size, UInt64 alignment,
        VkSystemAllocationScope allocationScope);

    public delegate void PFN_vkReallocationFunction(IntPtr userData, IntPtr original, UInt64 size, UInt64 alignment,
        VkSystemAllocationScope allocationScope);

    public delegate void PFN_vkFreeFunction(IntPtr userData, IntPtr memory);

    public delegate void PFN_vkInternalAllocationNotification(IntPtr userData, UInt64 size,
        VkInternalAllocationType allocationType, VkSystemAllocationScope allocationScope);

    public delegate void PFN_vkInternalFreeNotification(IntPtr userData, UInt64 size,
        VkInternalAllocationType allocationType, VkSystemAllocationScope allocationScope);

    public delegate VkBool32 PFN_vkDebugUtilsMessengerCallbackEXT(
        VkDebugUtilsMessageSeverityFlagBitsEXT messageSeverity,
        VkDebugUtilsMessageTypeFlagBitsEXT messageType,
        IntPtr pCallbackData, // const VkDebugUtilsMessengerCallbackDataEXT*
        IntPtr pUserData // void*
    );

    public delegate void PFN_vkVoidFunction();

    public delegate VkResult PFN_vkCreateDebugUtilsMessengerEXT(
        VkInstance instance,
        IntPtr pCreateInfo /* VkDebugUtilsMessengerCreateInfoEXT* */,
        IntPtr pAllocator /* VkAllocationCallbacks* */,
        IntPtr pMessenger /* out VkDebugUtilsMessengerEXT* */
    );
}