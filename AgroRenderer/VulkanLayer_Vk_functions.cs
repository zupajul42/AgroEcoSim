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
    public static extern VkResult vkEnumeratePhysicalDevices(VkInstance instance, uint* pPhysicalDeviceCount,
        VkPhysicalDevice* pPhysicalDevices);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkGetPhysicalDeviceProperties(VkPhysicalDevice physicalDevice,
        VkPhysicalDeviceProperties* pProperties);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkGetPhysicalDeviceProperties2(VkPhysicalDevice physicalDevice,
        VkPhysicalDeviceProperties2* pProperties);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkGetPhysicalDeviceQueueFamilyProperties(VkPhysicalDevice physicalDevice,
        uint* pQueueFamilyPropertyCount, VkQueueFamilyProperties* pQueueFamilyProperties);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkGetPhysicalDeviceSurfaceSupportKHR(VkPhysicalDevice physicalDevice,
        uint queueFamilyIndex, VkSurfaceKHR surface, VkBool32* pSupported);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkCreateDevice(VkPhysicalDevice physicalDevice,
        VkDeviceCreateInfo* pCreateInfo, VkAllocationCallbacks* pAllocator, VkDevice* pDevice);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkGetDeviceQueue(VkDevice device, uint queueFamilyIndex, uint queueIndex,
        VkQueue* pQueue);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkDestroyDevice(VkDevice device, VkAllocationCallbacks* pAllocator);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkCreateSwapchainKHR(VkDevice device,
        VkSwapchainCreateInfoKHR* pCreateInfo, VkAllocationCallbacks* pAllocator,
        VkSwapchainKHR* pSwapchain);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkGetSwapchainImagesKHR(VkDevice device, VkSwapchainKHR swapchain,
        uint* pSwapchainImageCount, VkImage* pSwapchainImages);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkGetPhysicalDeviceSurfaceCapabilitiesKHR(VkPhysicalDevice physicalDevice,
        VkSurfaceKHR surface, VkSurfaceCapabilitiesKHR* pSurfaceCapabilities);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkGetPhysicalDeviceSurfaceFormatsKHR(VkPhysicalDevice physicalDevice,
        VkSurfaceKHR surface, uint* pSurfaceFormatCount, VkSurfaceFormatKHR* pSurfaceFormats);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkGetPhysicalDeviceSurfacePresentModesKHR(VkPhysicalDevice physicalDevice,
        VkSurfaceKHR surface, uint* pPresentModeCount, VkPresentModeKHR* pPresentModes);

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
    public static extern VkResult vkBindBufferMemory(VkDevice device, VkBuffer buffer, VkDeviceMemory memory,
        VkDeviceSize memoryOffset);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkGetPhysicalDeviceMemoryProperties(VkPhysicalDevice physicalDevice,
        VkPhysicalDeviceMemoryProperties* pMemoryProperties);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkMapMemory(VkDevice device, VkDeviceMemory memory, VkDeviceSize offset,
        VkDeviceSize size, VkMemoryMapFlagBits flags, void* ppData /* void** */);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult VkMapMemory2(VkDevice device, VkMemoryMapInfo* pMemoryMapInfo,
        void* ppData /* void** */);

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
    public static extern VkResult vkWaitForFences(VkDevice device, uint fenceCount, VkFence* pFences,
        VkBool32 waitAll, ulong timeout);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkResetFences(VkDevice device, uint fenceCount, VkFence* pFences);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkDestroySemaphore(VkDevice device, VkSemaphore semaphore,
        VkAllocationCallbacks* pAllocator);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkDestroyFence(VkDevice device, VkFence fence, VkAllocationCallbacks* pAllocator);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkCreateCommandPool(VkDevice device, VkCommandPoolCreateInfo* pCreateInfo,
        VkAllocationCallbacks* pAllocator, VkCommandPool* pCommandPool);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkDestroyCommandPool(VkDevice device, VkCommandPool commandPool,
        VkAllocationCallbacks* pAllocator);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkAllocateCommandBuffers(VkDevice device, VkCommandBufferAllocateInfo* pAllocateInfo,
        VkCommandBuffer* pCommandBuffers);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkFreeCommandBuffers(VkDevice device, VkCommandPool commandPool,
        uint commandBufferCount,
        VkCommandBuffer* pCommandBuffers);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkCreateShaderModule(VkDevice device, VkShaderModuleCreateInfo* pCreateInfo,
        VkAllocationCallbacks* pAllocator, VkShaderModule* pShaderModule);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkDestroyShaderModule(VkDevice device, VkShaderModule shaderModule,
        VkAllocationCallbacks* pAllocator);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkCreateGraphicsPipelines(VkDevice device, VkPipelineCache pipelineCache,
        uint createInfoCount, VkGraphicsPipelineCreateInfo* pCreateInfos, VkAllocationCallbacks* pAllocator,
        VkPipeline* pPipelines);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkCreatePipelineCache(VkDevice device, VkPipelineCacheCreateInfo* pCreateInfo,
        VkAllocationCallbacks* pAllocator, VkPipelineCache* pPipelineCache);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkCreatePipelineLayout(VkDevice device, VkPipelineLayoutCreateInfo* pCreateInfo,
        VkAllocationCallbacks* pAllocator, VkPipelineLayout* pPipelineLayout);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkGetPhysicalDeviceFeatures2(VkPhysicalDevice physicalDevice,
        VkPhysicalDeviceFeatures2* pFeatures);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkEnumerateDeviceLayerProperties(VkPhysicalDevice physicalDevice,
        uint* pPropertyCount, VkLayerProperties* pProperties);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkEnumerateDeviceExtensionProperties(VkPhysicalDevice physicalDevice,
        IntPtr pLayerName /* const char* */, uint* pPropertyCount, VkExtensionProperties* pProperties);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkAcquireNextImageKHR(VkDevice device, VkSwapchainKHR swapchain, ulong timeout,
        VkSemaphore semaphore, VkFence fence, uint* pImageIndex);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkResetCommandBuffer(VkCommandBuffer commandBuffer,
        VkCommandBufferResetFlagBits flags);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkBeginCommandBuffer(VkCommandBuffer commandBuffer,
        VkCommandBufferBeginInfo* pBeginInfo);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkCmdBeginRendering(VkCommandBuffer commandBuffer, VkRenderingInfo* pRenderingInfo);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkCmdPipelineBarrier(VkCommandBuffer commandBuffer,
        VkPipelineStageFlagBits srcStageMask, VkPipelineStageFlagBits dstStageMask,
        VkDependencyFlagBits dependencyFlags,
        uint memoryBarrierCount, VkMemoryBarrier* pMemoryBarriers,
        uint bufferMemoryBarrierCount, VkBufferMemoryBarrier* pBufferMemoryBarriers,
        uint imageMemoryBarrierCount, VkImageMemoryBarrier* pImageMemoryBarriers);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkCmdSetScissor(VkCommandBuffer commandBuffer, uint firstScissor, uint scissorCount,
        VkRect2D* pScissors);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkCmdSetCullMode(VkCommandBuffer commandBuffer, VkCullModeFlagBits cullMode);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkCmdSetFrontFace(VkCommandBuffer commandBuffer, VkFrontFace frontFace);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkCmdSetPrimitiveTopology(VkCommandBuffer commandBuffer,
        VkPrimitiveTopology primitiveTopology);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkCmdBindPipeline(VkCommandBuffer commandBuffer, VkPipelineBindPoint pipelineBindPoint,
        VkPipeline pipeline);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkCmdBindVertexBuffers(VkCommandBuffer commandBuffer, uint firstBinding,
        uint bindingCount,
        VkBuffer* pBuffers, VkDeviceSize* pOffsets);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkCmdBindIndexBuffer(VkCommandBuffer commandBuffer, VkBuffer buffer, VkDeviceSize offset,
        VkIndexType indexType);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkCmdDrawIndexed(VkCommandBuffer commandBuffer, uint indexCount, uint instanceCount,
        uint firstIndex, int vertexOffset, uint firstInstance);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern void vkCmdEndRendering(VkCommandBuffer commandBuffer);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkEndCommandBuffer(VkCommandBuffer commandBuffer);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkQueueSubmit(VkQueue queue, uint submitCount, VkSubmitInfo* pSubmits, VkFence fence);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkQueuePresentKHR(VkQueue queue, VkPresentInfoKHR* pPresentInfo);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkQueueWaitIdle(VkQueue queue);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkDestroyCommandPool2(VkDevice device, VkCommandPool commandPool,
        VkAllocationCallbacks* pAllocator);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkDestroyPipelineLayout(VkDevice device, VkPipelineLayout pipelineLayout,
        VkAllocationCallbacks* pAllocator);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkDestroyPipeline(VkDevice device, VkPipeline pipeline,
        VkAllocationCallbacks* pAllocator);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkDestroyImageView(VkDevice device, VkImageView imageView,
        VkAllocationCallbacks* pAllocator);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkDestroySwapchainKHR(VkDevice device, VkSwapchainKHR swapchain,
        VkAllocationCallbacks* pAllocator);

    [DllImport("libvulkan.so", CallingConvention = CallingConvention.Cdecl)]
    public static extern VkResult vkCmdSetViewport(VkCommandBuffer commandBuffer, uint firstViewport,
        uint viewportCount, VkViewport* pViewports);
}