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
    
    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkAllocateMemory(VkDevice device, VkMemoryAllocateInfo* pAllocateInfo,
        VkAllocationCallbacks* pAllocator, VkDeviceMemory* pMemory);
    
    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkCreateBuffer(VkDevice device, VkBufferCreateInfo* pCreateInfo,
        VkAllocationCallbacks* pAllocator, VkBuffer* pBuffer);
    
    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkGetBufferMemoryRequirements(VkDevice device, VkBuffer buffer,
        VkMemoryRequirements* pMemoryRequirements);
    
    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkBindBufferMemory(VkDevice device, VkBuffer buffer, VkDeviceMemory memory, VkDeviceSize memoryOffset);
    
    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkGetPhysicalDeviceMemoryProperties(VkPhysicalDevice physicalDevice,
        VkPhysicalDeviceMemoryProperties* pMemoryProperties);
    
    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkMapMemory(VkDevice device, VkDeviceMemory memory, VkDeviceSize offset,
        VkDeviceSize size, VkMemoryMapFlagBits flags, void* ppData /* void** */);
    
    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult VkMapMemory2(VkDevice device, VkMemoryMapInfo* pMemoryMapInfo, void* ppData /* void** */);
    
    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkUnmapMemory(VkDevice device, VkDeviceMemory memory);
    
    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkUnmapMemory2(VkDevice device, VkMemoryUnmapInfo* pMemoryUnmapInfo);
    
    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkDestroyBuffer(VkDevice device, VkBuffer buffer, VkAllocationCallbacks* pAllocator);
    
    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkFreeMemory(VkDevice device, VkDeviceMemory memory, VkAllocationCallbacks* pAllocator);
    
    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkCreateSemaphore(VkDevice device, VkSemaphoreCreateInfo* pCreateInfo,
        VkAllocationCallbacks* pAllocator, VkSemaphore* pSemaphore);
    
    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkCreateFence(VkDevice device, VkFenceCreateInfo* pCreateInfo,
        VkAllocationCallbacks* pAllocator, VkFence* pFence);
    
    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkWaitForFences(VkDevice device, UInt32 fenceCount, VkFence* pFences,
        VkBool32 waitAll, UInt64 timeout);
    
    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkResetFences(VkDevice device, UInt32 fenceCount, VkFence* pFences);
    
    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkDestroySemaphore(VkDevice device, VkSemaphore semaphore, VkAllocationCallbacks* pAllocator);
    
    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkDestroyFence(VkDevice device, VkFence fence, VkAllocationCallbacks* pAllocator);
    
    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkCreateCommandPool(VkDevice device, VkCommandPoolCreateInfo* pCreateInfo,
        VkAllocationCallbacks* pAllocator, VkCommandPool* pCommandPool);
    
    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkDestroyCommandPool(VkDevice device, VkCommandPool commandPool, VkAllocationCallbacks* pAllocator);
    
    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkAllocateCommandBuffers(VkDevice device, VkCommandBufferAllocateInfo* pAllocateInfo,
        VkCommandBuffer* pCommandBuffers);
    
    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkFreeCommandBuffers(VkDevice device, VkCommandPool commandPool, UInt32 commandBufferCount,
        VkCommandBuffer* pCommandBuffers);
}