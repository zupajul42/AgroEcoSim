using System.Diagnostics.CodeAnalysis;
using System.Runtime.InteropServices;

namespace AgroRenderer;

[SuppressMessage("ReSharper", "InconsistentNaming")]
[SuppressMessage("ReSharper", "UnusedMember.Global")]
[SuppressMessage("ReSharper", "UnusedType.Global")]
[SuppressMessage("ReSharper", "InconsistentNaming")]
public static partial class Vk
{
    // ----------------------------------------------------------------
    // Vulkan Handles
    [StructLayout(LayoutKind.Sequential)]
    public struct VkInstance
    {
        public IntPtr handle;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPhysicalDevice
    {
        public IntPtr handle;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkDevice
    {
        public IntPtr handle;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkQueue
    {
        public IntPtr handle;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkSwapchainKHR
    {
        public IntPtr handle;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkImage
    {
        public IntPtr handle;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkImageView
    {
        public IntPtr handle;
    }
}