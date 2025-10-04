using System.Diagnostics.CodeAnalysis;
using System.Runtime.InteropServices;

namespace AgroRenderer;


[SuppressMessage("ReSharper", "InconsistentNaming")]
[SuppressMessage("ReSharper", "UnusedMember.Global")]
[SuppressMessage("ReSharper", "UnusedType.Global")]
[SuppressMessage("ReSharper", "MemberCanBePrivate.Global")]
public static unsafe partial class Vk
{
    // ----------------------------------------------------------------
    // Vulkan Functions

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkCreateInstance(VkInstanceCreateInfo* pCreateInfo,
        VkAllocationCallbacks* pAllocator,
        out VkInstance pInstance);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkDestroyInstance(VkInstance instance, VkAllocationCallbacks* pAllocator);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern IntPtr vkGetInstanceProcAddr(VkInstance instance, IntPtr pName /*const char*/);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkCreateXcbSurfaceKHR(VkInstance instance, VkXcbSurfaceCreateInfoKHR* pCreateInfo,
        VkAllocationCallbacks* pAllocator, VkSurfaceKHR* pSurface);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkDestroySurfaceKHR(VkInstance instance, VkSurfaceKHR surface,
        VkAllocationCallbacks* pAllocator);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkEnumeratePhysicalDevices(VkInstance instance, UInt32* pPhysicalDeviceCount,
        VkPhysicalDevice* pPhysicalDevices);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkGetPhysicalDeviceProperties(VkPhysicalDevice physicalDevice,
        VkPhysicalDeviceProperties* pProperties);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkGetPhysicalDeviceProperties2(VkPhysicalDevice physicalDevice,
        VkPhysicalDeviceProperties2* pProperties);
    
    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkGetPhysicalDeviceQueueFamilyProperties(VkPhysicalDevice physicalDevice,
        UInt32* pQueueFamilyPropertyCount, VkQueueFamilyProperties* pQueueFamilyProperties);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkGetPhysicalDeviceSurfaceSupportKHR(VkPhysicalDevice physicalDevice,
        UInt32 queueFamilyIndex, VkSurfaceKHR surface, VkBool32* pSupported);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkCreateDevice(VkPhysicalDevice physicalDevice,
        VkDeviceCreateInfo* pCreateInfo, VkAllocationCallbacks* pAllocator, VkDevice* pDevice);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkGetDeviceQueue(VkDevice device, UInt32 queueFamilyIndex, UInt32 queueIndex,
        VkQueue* pQueue);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkDestroyDevice(VkDevice device, VkAllocationCallbacks* pAllocator);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkCreateSwapchainKHR(VkDevice device,
        VkSwapchainCreateInfoKHR* pCreateInfo, VkAllocationCallbacks* pAllocator,
        VkSwapchainKHR* pSwapchain);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkGetSwapchainImagesKHR(VkDevice device, VkSwapchainKHR swapchain,
        UInt32* pSwapchainImageCount, VkImage* pSwapchainImages);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkGetPhysicalDeviceSurfaceCapabilitiesKHR(VkPhysicalDevice physicalDevice,
        VkSurfaceKHR surface, VkSurfaceCapabilitiesKHR* pSurfaceCapabilities);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkGetPhysicalDeviceSurfaceFormatsKHR(VkPhysicalDevice physicalDevice,
        VkSurfaceKHR surface, UInt32* pSurfaceFormatCount, VkSurfaceFormatKHR* pSurfaceFormats);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkGetPhysicalDeviceSurfacePresentModesKHR(VkPhysicalDevice physicalDevice,
        VkSurfaceKHR surface, UInt32* pPresentModeCount, VkPresentModeKHR* pPresentModes);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkCreateImageView(VkDevice device, VkImageViewCreateInfo* pCreateInfo,
        VkAllocationCallbacks* pAllocator, VkImageView* pView);
}