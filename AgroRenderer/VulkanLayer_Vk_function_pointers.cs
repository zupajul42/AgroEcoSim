using System.Diagnostics.CodeAnalysis;
using System.Runtime.InteropServices;

namespace AgroRenderer;

[SuppressMessage("ReSharper", "InconsistentNaming")]
[SuppressMessage("ReSharper", "UnusedMember.Global")]
[SuppressMessage("ReSharper", "UnusedType.Global")]
public static partial class Vk
{
    // ----------------------------------------------------------------
    // Vulkan Function Pointer Definitions
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    public delegate void PFN_vkAllocationFunction(IntPtr userData, ulong size, ulong alignment,
        VkSystemAllocationScope allocationScope);

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    public delegate VkResult PFN_vkCreateDebugUtilsMessengerEXT(
        VkInstance instance,
        IntPtr pCreateInfo /* VkDebugUtilsMessengerCreateInfoEXT* */,
        IntPtr pAllocator /* VkAllocationCallbacks* */,
        IntPtr pMessenger /* out VkDebugUtilsMessengerEXT* */
    );

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    public delegate VkBool32 PFN_vkDebugUtilsMessengerCallbackEXT(
        VkDebugUtilsMessageSeverityFlagBitsEXT messageSeverity,
        VkDebugUtilsMessageTypeFlagBitsEXT messageType,
        IntPtr pCallbackData, // const VkDebugUtilsMessengerCallbackDataEXT*
        IntPtr pUserData // void*
    );

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    public delegate void PFN_vkFreeFunction(IntPtr userData, IntPtr memory);

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    public delegate void PFN_vkInternalAllocationNotification(IntPtr userData, ulong size,
        VkInternalAllocationType allocationType, VkSystemAllocationScope allocationScope);

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    public delegate void PFN_vkInternalFreeNotification(IntPtr userData, ulong size,
        VkInternalAllocationType allocationType, VkSystemAllocationScope allocationScope);

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    public delegate void PFN_vkReallocationFunction(IntPtr userData, IntPtr original, ulong size, ulong alignment,
        VkSystemAllocationScope allocationScope);

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    public delegate void PFN_vkVoidFunction();
}