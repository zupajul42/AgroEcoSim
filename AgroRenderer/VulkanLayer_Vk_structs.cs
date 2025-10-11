using System.Diagnostics.CodeAnalysis;
using System.Runtime.InteropServices;
using System.Text;

namespace AgroRenderer;

[SuppressMessage("ReSharper", "InconsistentNaming")]
[SuppressMessage("ReSharper", "UnusedMember.Global")]
[SuppressMessage("ReSharper", "UnusedType.Global")]
public static unsafe partial class Vk
{
    private const int VkMemoryTypesSize = (int)VK_MAX_MEMORY_TYPES * 8; // sizeof(VkMemoryType) == 8 bytes

    private const int VkMemoryHeapsSize = (int)VK_MAX_MEMORY_HEAPS * 12; // sizeof(VkMemoryHeap) == 12 bytes

    // ----------------------------------------------------------------
    // Vulkan Structures
    [StructLayout(LayoutKind.Sequential)]
    public struct VkInstanceCreateInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkInstanceCreateFlagBits flags;
        public VkApplicationInfo* pApplicationInfo;
        public UInt32 enabledLayerCount;
        public IntPtr* ppEnabledLayerNames; // const char* const*
        public UInt32 enabledExtensionCount;
        public IntPtr* ppEnabledExtensionNames; // const char* const*

        public VkInstanceCreateInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkApplicationInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_APPLICATION_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public IntPtr pApplicationName; // const char*
        public UInt32 applicationVersion;
        public IntPtr pEngineName; // const char*
        public UInt32 engineVersion;
        public UInt32 apiVersion;

        public VkApplicationInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkAllocationCallbacks
    {
        public IntPtr pUserData; // void*

        public delegate* unmanaged<IntPtr, ulong, ulong, VkSystemAllocationScope, void> pfnAllocation;

        // void (*PFN_vkAllocationFunction)(IntPtr userData, UInt64 size, UInt64 alignment, VkSystemAllocationScope allocationScope);
        public delegate* unmanaged<IntPtr, IntPtr, ulong, ulong, VkSystemAllocationScope, void> pfnReallocation;

        // void (*PFN_vkReallocationFunction) (void* userData, void* original, size_t size, size_t alignment, VkSystemAllocationScope allocationScope);
        public delegate* unmanaged<IntPtr, IntPtr, void> pfnFree;

        // void (*PFN_vkFreeFunction)(void* userData, void* memory);
        public delegate* unmanaged<IntPtr, ulong, VkInternalAllocationType, VkSystemAllocationScope, void>
            pfnInternalAllocation;

        // void (*PFN_vkInternalAllocationNotification)(void* userData, size_t size, VkInternalAllocationType allocationType, VkSystemAllocationScope allocationScope);
        public delegate* unmanaged<IntPtr, ulong, VkInternalAllocationType, VkSystemAllocationScope, void>
            pfnInternalFree;
        // void (*PFN_vkInternalFreeNotification)(void* userData, size_t size, VkInternalAllocationType allocationType, VkSystemAllocationScope allocationScope);
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkDebugUtilsMessengerCreateInfoEXT
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_DEBUG_UTILS_MESSENGER_CREATE_INFO_EXT;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkDebugUtilsMessengerCreateFlagsEXT flags;
        public VkDebugUtilsMessageSeverityFlagBitsEXT messageSeverity;
        public VkDebugUtilsMessageTypeFlagBitsEXT messageType;

        public delegate* managed<
            VkDebugUtilsMessageSeverityFlagBitsEXT,
            VkDebugUtilsMessageTypeFlagBitsEXT,
            IntPtr, // const VkDebugUtilsMessengerCallbackDataEXT*
            IntPtr, // void*
            VkBool32> pfnUserCallback;

        // VkBool32 (*PFN_vkDebugUtilsMessengerCallbackEXT)(
        //     VkDebugUtilsMessageSeverityFlagBitsEXT messageSeverity,
        //     VkDebugUtilsMessageTypeFlagBitsEXT messageType,
        //     const VkDebugUtilsMessengerCallbackDataEXT*,
        //     pCallbackData,  void* pUserData );
        public IntPtr pUserData = IntPtr.Zero; // void*

        public VkDebugUtilsMessengerCreateInfoEXT()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkDebugUtilsMessengerCallbackDataEXT
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_DEBUG_UTILS_MESSENGER_CALLBACK_DATA_EXT;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkDebugUtilsMessengerCallbackDataFlagsEXT flags;
        public IntPtr pMessageIdName; // const char*
        public Int32 messageIdNumber;
        public IntPtr pMessage; // const char*
        public UInt32 queueLabelCount;
        public IntPtr pQueueLabels; // const VkDebugUtilsLabelEXT*
        public UInt32 cmdBufLabelCount;
        public IntPtr pCmdBufLabels; // const VkDebugUtilsLabelEXT*
        public UInt32 objectCount;
        public IntPtr pObjects; // const VkDebugUtilsObjectNameInfoEXT*

        public VkDebugUtilsMessengerCallbackDataEXT()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkDebugUtilsMessengerEXT
    {
        public VkDebugUtilsMessengerEXT()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkXcbSurfaceCreateInfoKHR
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_XCB_SURFACE_CREATE_INFO_KHR;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkXcbSurfaceCreateFlagsKHR flags;
        public IntPtr connection; // xcb_connection_t*
        public UInt32 window; // xcb_window_t

        public VkXcbSurfaceCreateInfoKHR()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkSurfaceKHR
    {
        public UInt64 handle;

        public VkSurfaceKHR()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public struct VkPhysicalDeviceProperties
    {
        public UInt32 apiVersion;
        public UInt32 driverVersion;
        public UInt32 vendorID;
        public UInt32 deviceID;
        public VkPhysicalDeviceType deviceType;

        [MarshalAs(UnmanagedType.ByValArray, SizeConst = (int)VK_MAX_PHYSICAL_DEVICE_NAME_SIZE)]
        public fixed byte
            deviceName[(int)VK_MAX_PHYSICAL_DEVICE_NAME_SIZE]; // char[VK_MAX_PHYSICAL_DEVICE_NAME_SIZE]

        [MarshalAs(UnmanagedType.ByValArray, SizeConst = (int)VK_UUID_SIZE)]
        public fixed byte pipelineCacheUUID[(int)VK_UUID_SIZE]; // uint8_t[VK_UUID_SIZE]

        public VkPhysicalDeviceLimits limits;
        public VkPhysicalDeviceSparseProperties sparseProperties;

        public VkPhysicalDeviceProperties()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPhysicalDeviceLimits
    {
        public UInt32 maxImageDimension1D;
        public UInt32 maxImageDimension2D;
        public UInt32 maxImageDimension3D;
        public UInt32 maxImageDimensionCube;
        public UInt32 maxImageArrayLayers;
        public UInt32 maxTexelBufferElements;
        public UInt32 maxUniformBufferRange;
        public UInt32 maxStorageBufferRange;
        public UInt32 maxPushConstantsSize;
        public UInt32 maxMemoryAllocationCount;
        public UInt32 maxSamplerAllocationCount;
        public UInt64 bufferImageGranularity;
        public UInt64 sparseAddressSpaceSize;
        public UInt32 maxBoundDescriptorSets;
        public UInt32 maxPerStageDescriptorSamplers;
        public UInt32 maxPerStageDescriptorUniformBuffers;
        public UInt32 maxPerStageDescriptorStorageBuffers;
        public UInt32 maxPerStageDescriptorSampledImages;
        public UInt32 maxPerStageDescriptorStorageImages;
        public UInt32 maxPerStageDescriptorInputAttachments;
        public UInt32 maxPerStageResources;
        public UInt32 maxDescriptorSetSamplers;
        public UInt32 maxDescriptorSetUniformBuffers;
        public UInt32 maxDescriptorSetUniformBuffersDynamic;
        public UInt32 maxDescriptorSetStorageBuffers;
        public UInt32 maxDescriptorSetStorageBuffersDynamic;
        public UInt32 maxDescriptorSetSampledImages;
        public UInt32 maxDescriptorSetStorageImages;
        public UInt32 maxDescriptorSetInputAttachments;
        public UInt32 maxVertexInputAttributes;
        public UInt32 maxVertexInputBindings;
        public UInt32 maxVertexInputAttributeOffset;
        public UInt32 maxVertexInputBindingStride;
        public UInt32 maxVertexOutputComponents;
        public UInt32 maxTessellationGenerationLevel;
        public UInt32 maxTessellationPatchSize;
        public UInt32 maxTessellationControlPerVertexInputComponents;
        public UInt32 maxTessellationControlPerVertexOutputComponents;
        public UInt32 maxTessellationControlPerPatchOutputComponents;
        public UInt32 maxTessellationControlTotalOutputComponents;
        public UInt32 maxTessellationEvaluationInputComponents;
        public UInt32 maxTessellationEvaluationOutputComponents;
        public UInt32 maxGeometryShaderInvocations;
        public UInt32 maxGeometryInputComponents;
        public UInt32 maxGeometryOutputComponents;
        public UInt32 maxGeometryOutputVertices;
        public UInt32 maxGeometryTotalOutputComponents;
        public UInt32 maxFragmentInputComponents;
        public UInt32 maxFragmentOutputAttachments;
        public UInt32 maxFragmentDualSrcAttachments;
        public UInt32 maxFragmentCombinedOutputResources;
        public UInt32 maxComputeSharedMemorySize;

        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 3)]
        public fixed UInt32 maxComputeWorkGroupCount[3];

        public UInt32 maxComputeWorkGroupInvocations;

        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 3)]
        public fixed UInt32 maxComputeWorkGroupSize[3];

        public UInt32 subPixelPrecisionBits;
        public UInt32 subTexelPrecisionBits;
        public UInt32 mipmapPrecisionBits;
        public UInt32 maxDrawIndexedIndexValue;
        public UInt32 maxDrawIndirectCount;
        public float maxSamplerLodBias;
        public float maxSamplerAnisotropy;
        public UInt32 maxViewports;

        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 2)]
        public fixed UInt32 maxViewportDimensions[2];

        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 2)]
        public fixed float viewportBoundsRange[2];

        public UInt32 viewportSubPixelBits;
        public UInt64 minMemoryMapAlignment; // size_t 
        public UInt64 minTexelBufferOffsetAlignment;
        public UInt64 minUniformBufferOffsetAlignment;
        public UInt64 minStorageBufferOffsetAlignment;
        public int minTexelOffset;
        public UInt32 maxTexelOffset;
        public int minTexelGatherOffset;
        public UInt32 maxTexelGatherOffset;
        public float minInterpolationOffset;
        public float maxInterpolationOffset;
        public UInt32 subPixelInterpolationOffsetBits;
        public UInt32 maxFramebufferWidth;
        public UInt32 maxFramebufferHeight;
        public UInt32 maxFramebufferLayers;
        public VkSampleCountFlags framebufferColorSampleCounts;
        public VkSampleCountFlags framebufferDepthSampleCounts;
        public VkSampleCountFlags framebufferStencilSampleCounts;
        public VkSampleCountFlags framebufferNoAttachmentsSampleCounts;
        public UInt32 maxColorAttachments;
        public VkSampleCountFlags sampledImageColorSampleCounts;
        public VkSampleCountFlags sampledImageIntegerSampleCounts;
        public VkSampleCountFlags sampledImageDepthSampleCounts;
        public VkSampleCountFlags sampledImageStencilSampleCounts;
        public VkSampleCountFlags storageImageSampleCounts;
        public UInt32 maxSampleMaskWords;
        public VkBool32 timestampComputeAndGraphics;
        public float timestampPeriod;
        public UInt32 maxClipDistances;
        public UInt32 maxCullDistances;
        public UInt32 maxCombinedClipAndCullDistances;
        public UInt32 discreteQueuePriorities;

        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 2)]
        public fixed float pointSizeRange[2];

        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 2)]
        public fixed float lineWidthRange[2];

        public float pointSizeGranularity;
        public float lineWidthGranularity;
        public VkBool32 strictLines;
        public VkBool32 standardSampleLocations;
        public UInt64 optimalBufferCopyOffsetAlignment;
        public UInt64 optimalBufferCopyRowPitchAlignment;
        public UInt64 nonCoherentAtomSize;

        public VkPhysicalDeviceLimits()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPhysicalDeviceSparseProperties
    {
        public VkBool32 residencyStandard2DBlockShape;
        public VkBool32 residencyStandard2DMultisampleBlockShape;
        public VkBool32 residencyStandard3DBlockShape;
        public VkBool32 residencyAlignedMipSize;
        public VkBool32 residencyNonResidentStrict;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPhysicalDeviceProperties2
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_PROPERTIES_2;
        public IntPtr pNext = IntPtr.Zero; // void*
        public VkPhysicalDeviceProperties properties;

        public VkPhysicalDeviceProperties2()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkQueueFamilyProperties
    {
        public VkQueueFlagBits queueFlags;
        public UInt32 queueCount;
        public UInt32 timestampValidBits;
        public VkExtent3D minImageTransferGranularity;

        public VkQueueFamilyProperties()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkExtent3D
    {
        public UInt32 width;
        public UInt32 height;
        public UInt32 depth;

        public VkExtent3D()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkDeviceCreateInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkDeviceCreateFlags flags;
        public UInt32 queueCreateInfoCount;
        public VkDeviceQueueCreateInfo* pQueueCreateInfos;
        public UInt32 enabledLayerCount;
        public IntPtr* ppEnabledLayerNames; // const char* const*
        public UInt32 enabledExtensionCount;
        public IntPtr* ppEnabledExtensionNames; // const char* const*
        public VkPhysicalDeviceFeatures* pEnabledFeatures;

        public VkDeviceCreateInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkDeviceQueueCreateInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkDeviceQueueCreateFlagBits flags;
        public UInt32 queueFamilyIndex;
        public UInt32 queueCount;
        public float* pQueuePriorities; // const float*

        public VkDeviceQueueCreateInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPhysicalDeviceFeatures
    {
        public VkBool32 robustBufferAccess;
        public VkBool32 fullDrawIndexUint32;
        public VkBool32 imageCubeArray;
        public VkBool32 independentBlend;
        public VkBool32 geometryShader;
        public VkBool32 tessellationShader;
        public VkBool32 sampleRateShading;
        public VkBool32 dualSrcBlend;
        public VkBool32 logicOp;
        public VkBool32 multiDrawIndirect;
        public VkBool32 drawIndirectFirstInstance;
        public VkBool32 depthClamp;
        public VkBool32 depthBiasClamp;
        public VkBool32 fillModeNonSolid;
        public VkBool32 depthBounds;
        public VkBool32 wideLines;
        public VkBool32 largePoints;
        public VkBool32 alphaToOne;
        public VkBool32 multiViewport;
        public VkBool32 samplerAnisotropy;
        public VkBool32 textureCompressionETC2;
        public VkBool32 textureCompressionASTC_LDR;
        public VkBool32 textureCompressionBC;
        public VkBool32 occlusionQueryPrecise;
        public VkBool32 pipelineStatisticsQuery;
        public VkBool32 vertexPipelineStoresAndAtomics;
        public VkBool32 fragmentStoresAndAtomics;
        public VkBool32 shaderTessellationAndGeometryPointSize;
        public VkBool32 shaderImageGatherExtended;
        public VkBool32 shaderStorageImageExtendedFormats;
        public VkBool32 shaderStorageImageMultisample;
        public VkBool32 shaderStorageImageReadWithoutFormat;
        public VkBool32 shaderStorageImageWriteWithoutFormat;
        public VkBool32 shaderUniformBufferArrayDynamicIndexing;
        public VkBool32 shaderSampledImageArrayDynamicIndexing;
        public VkBool32 shaderStorageBufferArrayDynamicIndexing;
        public VkBool32 shaderStorageImageArrayDynamicIndexing;
        public VkBool32 shaderClipDistance;
        public VkBool32 shaderCullDistance;
        public VkBool32 shaderFloat64;
        public VkBool32 shaderInt64;
        public VkBool32 shaderInt16;
        public VkBool32 shaderResourceResidency;
        public VkBool32 shaderResourceMinLod;
        public VkBool32 sparseBinding;
        public VkBool32 sparseResidencyBuffer;
        public VkBool32 sparseResidencyImage2D;
        public VkBool32 sparseResidencyImage3D;
        public VkBool32 sparseResidency2Samples;
        public VkBool32 sparseResidency4Samples;
        public VkBool32 sparseResidency8Samples;
        public VkBool32 sparseResidency16Samples;
        public VkBool32 sparseResidencyAliased;
        public VkBool32 variableMultisampleRate;
        public VkBool32 inheritedQueries;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkSwapchainCreateInfoKHR
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_SWAPCHAIN_CREATE_INFO_KHR;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public UInt32 flags;
        public VkSurfaceKHR surface;
        public UInt32 minImageCount;
        public VkFormat imageFormat;
        public VkColorSpaceKHR imageColorSpace;
        public VkExtent2D imageExtent;
        public UInt32 imageArrayLayers;
        public VkImageUsageFlagBits imageUsage;
        public VkSharingMode imageSharingMode;
        public UInt32 queueFamilyIndexCount;
        public UInt32* pQueueFamilyIndices; // const UInt32*
        public VkSurfaceTransformFlagBitsKHR preTransform;
        public VkCompositeAlphaFlagBitsKHR compositeAlpha;
        public VkPresentModeKHR presentMode;
        public VkBool32 clipped;
        public VkSwapchainKHR oldSwapchain;

        public VkSwapchainCreateInfoKHR()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkExtent2D
    {
        public UInt32 width;
        public UInt32 height;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkSurfaceCapabilitiesKHR
    {
        public UInt32 minImageCount;
        public UInt32 maxImageCount;
        public VkExtent2D currentExtent;
        public VkExtent2D minImageExtent;
        public VkExtent2D maxImageExtent;
        public UInt32 maxImageArrayLayers;
        public VkSurfaceTransformFlagBitsKHR supportedTransforms;
        public VkSurfaceTransformFlagBitsKHR currentTransform;
        public VkCompositeAlphaFlagBitsKHR supportedCompositeAlpha;
        public VkImageUsageFlagBits supportedUsageFlags;

        public VkSurfaceCapabilitiesKHR()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkSurfaceFormatKHR
    {
        public VkFormat format;
        public VkColorSpaceKHR colorSpace;

        public VkSurfaceFormatKHR()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkImageViewCreateInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkImageViewCreateFlagBits flags;
        public VkImage image;
        public VkImageViewType viewType;
        public VkFormat format;
        public VkComponentMapping components;
        public VkImageSubresourceRange subresourceRange;

        public VkImageViewCreateInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkComponentMapping
    {
        public VkComponentSwizzle r;
        public VkComponentSwizzle g;
        public VkComponentSwizzle b;
        public VkComponentSwizzle a;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkImageSubresourceRange
    {
        public VkImageAspectFlagBits aspectMask;
        public UInt32 baseMipLevel;
        public UInt32 levelCount;
        public UInt32 baseArrayLayer;
        public UInt32 layerCount;

        public VkImageSubresourceRange()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkDeviceSize
    {
        public UInt64 size;

        public VkDeviceSize()
        {
        }

        public VkDeviceSize(ulong size)
        {
            this.size = size;
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkBuffer
    {
        public UInt64 handle;

        public VkBuffer()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkDeviceMemory
    {
        public UInt64 handle;

        public VkDeviceMemory()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkMemoryAllocateInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkDeviceSize allocationSize;
        public UInt32 memoryTypeIndex;

        public VkMemoryAllocateInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkMemoryRequirements
    {
        public VkDeviceSize size;
        public VkDeviceSize alignment;
        public UInt32 memoryTypeBits;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkBufferCreateInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkBufferCreateFlagBits flags;
        public VkDeviceSize size;
        public VkBufferUsageFlagBits usage;
        public VkSharingMode sharingMode;
        public UInt32 queueFamilyIndexCount;
        public UInt32* pQueueFamilyIndices; // const UInt32*

        public VkBufferCreateInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkMemoryType
    {
        public VkMemoryPropertyFlagBits propertyFlags;
        public UInt32 heapIndex;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkMemoryHeap
    {
        public VkDeviceSize size;
        public VkMemoryHeapFlagBits flags;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPhysicalDeviceMemoryProperties
    {
        public UInt32 memoryTypeCount;

        [MarshalAs(UnmanagedType.ByValArray, ArraySubType = UnmanagedType.Struct, SizeConst = VkMemoryTypesSize)]
        public fixed byte
            memoryTypes[VkMemoryTypesSize]; // VkMemoryType[VK_MAX_MEMORY_TYPES] as csharp does not allow fixed size arrays of structs

        public UInt32 memoryHeapCount;

        [MarshalAs(UnmanagedType.ByValArray, ArraySubType = UnmanagedType.Struct, SizeConst = VkMemoryHeapsSize)]
        public fixed byte
            memoryHeaps[VkMemoryHeapsSize]; // VkMemoryHeap[VK_MAX_MEMORY_HEAPS] as csharp does not allow fixed size arrays of structs

        public VkPhysicalDeviceMemoryProperties()
        {
        }

        public VkMemoryType GetMemoryType(int index)
        {
            if (index < 0 || index >= VK_MAX_MEMORY_TYPES) throw new ArgumentOutOfRangeException(nameof(index));
            fixed (byte* ptr = memoryTypes)
            {
                return ((VkMemoryType*)ptr)[index];
            }
        }

        public VkMemoryHeap GetMemoryHeap(int index)
        {
            if (index < 0 || index >= VK_MAX_MEMORY_HEAPS) throw new ArgumentOutOfRangeException(nameof(index));
            fixed (byte* ptr = memoryHeaps)
            {
                return ((VkMemoryHeap*)ptr)[index];
            }
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkMemoryMapInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_MEMORY_MAP_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkMemoryMapFlagBits flags;
        public VkDeviceMemory memory;
        public VkDeviceSize offset;
        public VkDeviceSize size;

        public VkMemoryMapInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkMemoryUnmapInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_MEMORY_UNMAP_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkMemoryUnmapFlagBits flags;
        public VkDeviceMemory memory;

        public VkMemoryUnmapInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkSemaphore
    {
        public UInt64 handle;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkFence
    {
        public UInt64 handle;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkSemaphoreCreateInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkSemaphoreCreateFlagBits flags;

        public VkSemaphoreCreateInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkFenceCreateInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_FENCE_CREATE_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkFenceCreateFlagBits flags;

        public VkFenceCreateInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkCommandPool
    {
        public UInt64 handle;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkCommandPoolCreateInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkCommandPoolCreateFlagBits flags;
        public UInt32 queueFamilyIndex;

        public VkCommandPoolCreateInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkCommandBuffer
    {
        public UInt64 handle;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkCommandBufferAllocateInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkCommandPool commandPool;
        public VkCommandBufferLevel level;
        public UInt32 commandBufferCount;

        public VkCommandBufferAllocateInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkShaderModule
    {
        public UInt64 handle;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkShaderModuleCreateInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkShaderModuleCreateFlagBits flags;
        public UIntPtr codeSize; // size_t
        public UInt32* pCode; // const UInt32*

        public VkShaderModuleCreateInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPipeline
    {
        public UInt64 handle;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPipelineLayout
    {
        public UInt64 handle;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPipelineLayoutCreateInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkPipelineLayoutCreateFlagBits flags;
        public UInt32 setLayoutCount;
        public IntPtr* pSetLayouts; // const VkDescriptorSetLayout*
        public UInt32 pushConstantRangeCount;
        public IntPtr* pPushConstantRanges; // const VkPushConstantRange*

        public VkPipelineLayoutCreateInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkSpecializationMapEntry
    {
        public UInt32 constantID;
        public UInt32 offset;
        public UIntPtr size; // size_t
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkSpecializationInfo
    {
        public UInt32 mapEntryCount;
        public VkSpecializationMapEntry* pMapEntries; // const VkSpecializationMapEntry*
        public UIntPtr dataSize; // size_t
        public void* pData; // const void*
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPipelineShaderStageCreateInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkPipelineShaderStageCreateFlagBits flags;
        public VkShaderStageFlagBits stage;
        public VkShaderModule module;
        public IntPtr pName; // const char*
        public VkSpecializationInfo* pSpecializationInfo; // const VkSpecializationInfo*

        public VkPipelineShaderStageCreateInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkVertexInputBindingDescription
    {
        public UInt32 binding;
        public UInt32 stride;
        public VkVertexInputRate inputRate;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkVertexInputAttributeDescription
    {
        public UInt32 location;
        public UInt32 binding;
        public VkFormat format;
        public UInt32 offset;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPipelineVertexInputStateCreateInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_VERTEX_INPUT_STATE_CREATE_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkPipelineVertexInputStateCreateFlagBits flags;
        public UInt32 vertexBindingDescriptionCount;
        public VkVertexInputBindingDescription* pVertexBindingDescriptions;
        public UInt32 vertexAttributeDescriptionCount;
        public VkVertexInputAttributeDescription* pVertexAttributeDescriptions;

        public VkPipelineVertexInputStateCreateInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPipelineInputAssemblyStateCreateInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_INPUT_ASSEMBLY_STATE_CREATE_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkPipelineInputAssemblyStateCreateFlagBits flags;
        public VkPrimitiveTopology topology;
        public VkBool32 primitiveRestartEnable;

        public VkPipelineInputAssemblyStateCreateInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPipelineViewportStateCreateInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_VIEWPORT_STATE_CREATE_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkPipelineViewportStateCreateFlagBits flags;
        public UInt32 viewportCount;
        public VkViewport* pViewports; // const VkViewport*
        public UInt32 scissorCount;
        public VkRect2D* pScissors; // const VkRect2D*

        public VkPipelineViewportStateCreateInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkViewport
    {
        public float x;
        public float y;
        public float width;
        public float height;
        public float minDepth;
        public float maxDepth;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkOffset2D
    {
        public Int32 x;
        public Int32 y;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkOffset3D
    {
        public Int32 x;
        public Int32 y;
        public Int32 z;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkRect2D
    {
        public VkOffset2D offset;
        public VkExtent2D extent;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkRect3D
    {
        public VkOffset3D offset;
        public VkExtent3D extent;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPipelineDynamicStateCreateInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_DYNAMIC_STATE_CREATE_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkPipelineDynamicStateCreateFlagBits flags;
        public UInt32 dynamicStateCount;
        public VkDynamicState* pDynamicStates; // const VkDynamicState*

        public VkPipelineDynamicStateCreateInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPipelineRasterizationStateCreateInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_RASTERIZATION_STATE_CREATE_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkPipelineRasterizationStateCreateFlagBits flags;
        public VkBool32 depthClampEnable;
        public VkBool32 rasterizerDiscardEnable;
        public VkPolygonMode polygonMode;
        public VkCullModeFlagBits cullMode;
        public VkFrontFace frontFace;
        public VkBool32 depthBiasEnable;
        public float depthBiasConstantFactor;
        public float depthBiasClamp;
        public float depthBiasSlopeFactor;
        public float lineWidth;

        public VkPipelineRasterizationStateCreateInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPipelineMultisampleStateCreateInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_MULTISAMPLE_STATE_CREATE_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkPipelineMultisampleStateCreateFlagBits flags;
        public VkSampleCountFlagBits rasterizationSamples;
        public VkBool32 sampleShadingEnable;
        public float minSampleShading;
        public UInt32* pSampleMask; // const VkSampleMask*
        public VkBool32 alphaToCoverageEnable;
        public VkBool32 alphaToOneEnable;

        public VkPipelineMultisampleStateCreateInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPipelineColorBlendStateCreateInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_COLOR_BLEND_STATE_CREATE_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkPipelineColorBlendStateCreateFlagBits flags;
        public VkBool32 logicOpEnable;
        public VkLogicOp logicOp;
        public UInt32 attachmentCount;
        public VkPipelineColorBlendAttachmentState* pAttachments; // const VkPipelineColorBlendAttachmentState*
        public float blendConstants0;
        public float blendConstants1;
        public float blendConstants2;
        public float blendConstants3;

        public VkPipelineColorBlendStateCreateInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPipelineColorBlendAttachmentState
    {
        public VkBool32 blendEnable;
        public VkBlendFactor srcColorBlendFactor;
        public VkBlendFactor dstColorBlendFactor;
        public VkBlendOp colorBlendOp;
        public VkBlendFactor srcAlphaBlendFactor;
        public VkBlendFactor dstAlphaBlendFactor;
        public VkBlendOp alphaBlendOp;
        public VkColorComponentFlagBits colorWriteMask;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPipelineRenderingCreateInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_RENDERING_CREATE_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public UInt32 viewMask;
        public UInt32 colorAttachmentCount;
        public VkFormat* pColorAttachmentFormats; // const VkFormat*
        public VkFormat depthAttachmentFormat;
        public VkFormat stencilAttachmentFormat;

        public VkPipelineRenderingCreateInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPipelineTessellationStateCreateInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_TESSELLATION_STATE_CREATE_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkPipelineTessellationStateCreateFlagBits flags;
        public UInt32 patchControlPoints;

        public VkPipelineTessellationStateCreateInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkStencilOpState
    {
        public VkStencilOp failOp;
        public VkStencilOp passOp;
        public VkStencilOp depthFailOp;
        public VkCompareOp compareOp;
        public UInt32 compareMask;
        public UInt32 writeMask;
        public UInt32 reference;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPipelineDepthStencilStateCreateInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_DEPTH_STENCIL_STATE_CREATE_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkPipelineDepthStencilStateCreateFlagBits flags;
        public VkBool32 depthTestEnable;
        public VkBool32 depthWriteEnable;
        public VkCompareOp depthCompareOp;
        public VkBool32 depthBoundsTestEnable;
        public VkBool32 stencilTestEnable;
        public VkStencilOpState front;
        public VkStencilOpState back;
        public float minDepthBounds;
        public float maxDepthBounds;

        public VkPipelineDepthStencilStateCreateInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkRenderPass
    {
        public UInt64 handle;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkGraphicsPipelineCreateInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_GRAPHICS_PIPELINE_CREATE_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkPipelineCreateFlagBits flags;
        public UInt32 stageCount;
        public VkPipelineShaderStageCreateInfo* pStages; // const VkPipelineShaderStageCreateInfo*
        public VkPipelineVertexInputStateCreateInfo* pVertexInputState; // const VkPipelineVertexInputStateCreateInfo*

        public VkPipelineInputAssemblyStateCreateInfo*
            pInputAssemblyState; // const VkPipelineInputAssemblyStateCreateInfo*

        public VkPipelineTessellationStateCreateInfo*
            pTessellationState; // const VkPipelineTessellationStateCreateInfo*

        public VkPipelineViewportStateCreateInfo* pViewportState; // const VkPipelineViewportStateCreateInfo*

        public VkPipelineRasterizationStateCreateInfo*
            pRasterizationState; // const VkPipelineRasterizationStateCreateInfo*

        public VkPipelineMultisampleStateCreateInfo* pMultisampleState; // const VkPipelineMultisampleStateCreateInfo*

        public VkPipelineDepthStencilStateCreateInfo*
            pDepthStencilState; // const VkPipelineDepthStencilStateCreateInfo*

        public VkPipelineColorBlendStateCreateInfo* pColorBlendState; // const VkPipelineColorBlendStateCreateInfo*
        public VkPipelineDynamicStateCreateInfo* pDynamicState; // const VkPipelineDynamicStateCreateInfo*
        public VkPipelineLayout layout;
        public VkRenderPass renderPass;
        public UInt32 subpass;
        public VkPipeline basePipelineHandle;
        public Int32 basePipelineIndex;

        public VkGraphicsPipelineCreateInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPipelineCache
    {
        public UInt64 handle;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPipelineCacheCreateInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_CACHE_CREATE_INFO;
        public IntPtr pNext = IntPtr.Zero; // const void*
        public VkPipelineCacheCreateFlagBits flags;
        public UIntPtr initialDataSize; // size_t
        public IntPtr pInitialData; // const void*

        public VkPipelineCacheCreateInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPhysicalDeviceFeatures2
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_FEATURES_2;
        public IntPtr pNext = IntPtr.Zero; // void*
        public VkPhysicalDeviceFeatures features;

        public VkPhysicalDeviceFeatures2()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPhysicalDeviceVulkan13Features
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_3_FEATURES;
        public IntPtr pNext = IntPtr.Zero; // void*
        public VkBool32 robustImageAccess;
        public VkBool32 inlineUniformBlock;
        public VkBool32 descriptorBindingInlineUniformBlockUpdateAfterBind;
        public VkBool32 pipelineCreationCacheControl;
        public VkBool32 privateData;
        public VkBool32 shaderDemoteToHelperInvocation;
        public VkBool32 shaderTerminateInvocation;
        public VkBool32 subgroupSizeControl;
        public VkBool32 computeFullSubgroups;
        public VkBool32 synchronization2;
        public VkBool32 textureCompressionASTC_HDR;
        public VkBool32 shaderZeroInitializeWorkgroupMemory;
        public VkBool32 dynamicRendering;
        public VkBool32 shaderIntegerDotProduct;
        public VkBool32 maintenance4;

        public VkPhysicalDeviceVulkan13Features()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct VkPhysicalDeviceExtendedDynamicStateFeaturesEXT
    {
        public VkStructureType sType =
            VkStructureType.VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_EXTENDED_DYNAMIC_STATE_FEATURES_EXT;

        public IntPtr pNext = IntPtr.Zero; // void*
        public VkBool32 extendedDynamicState;
        public VkBool32 extendedDynamicState2;
        public VkBool32 extendedDynamicState3ColorBlendState;
        public VkBool32 extendedDynamicState3DepthStencilState;
        public VkBool32 extendedDynamicState3RasterizationState;
        public VkBool32 extendedDynamicState3ViewportWScaling;
        public VkBool32 extendedDynamicState3LineStipple;

        public VkPhysicalDeviceExtendedDynamicStateFeaturesEXT()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public struct VkLayerProperties
    {
        public fixed byte layerName[(int)VK_MAX_DESCRIPTION_SIZE];
        public UInt32 specVersion;
        public UInt32 implementationVersion;
        public fixed byte description[(int)VK_MAX_DESCRIPTION_SIZE];

        public string GetLayerName()
        {
            fixed (byte* ptr = layerName)
            {
                return Marshal.PtrToStringAnsi((IntPtr)ptr);
            }
        }

        public string GetDescription()
        {
            fixed (byte* ptr = description)
            {
                return Marshal.PtrToStringAnsi((IntPtr)ptr);
            }
        }

        public void SetLayerName(string name)
        {
            var bytes = Encoding.ASCII.GetBytes(name);
            var len = Math.Min(bytes.Length, (int)VK_MAX_DESCRIPTION_SIZE - 1);
            for (var i = 0; i < len; i++) layerName[i] = bytes[i];
            layerName[len] = 0; // Null-terminate
        }

        public void SetDescription(string desc)
        {
            var bytes = Encoding.ASCII.GetBytes(desc);
            var len = Math.Min(bytes.Length, (int)VK_MAX_DESCRIPTION_SIZE - 1);
            for (var i = 0; i < len; i++) description[i] = bytes[i];
            description[len] = 0; // Null-terminate
        }
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public struct VkExtensionProperties
    {
        public fixed byte extensionName[(int)VK_MAX_EXTENSION_NAME_SIZE];
        public UInt32 specVersion;

        public string GetExtensionName()
        {
            fixed (byte* ptr = extensionName)
            {
                return Marshal.PtrToStringAnsi((IntPtr)ptr);
            }
        }

        public void SetExtensionName(string name)
        {
            var bytes = Encoding.ASCII.GetBytes(name);
            var len = Math.Min(bytes.Length, (int)VK_MAX_EXTENSION_NAME_SIZE - 1);
            for (var i = 0; i < len; i++) extensionName[i] = bytes[i];
            extensionName[len] = 0; // Null-terminate
        }
    }

    [StructLayout(LayoutKind.Explicit, CharSet = CharSet.Ansi)]
    public struct VkClearColorValue
    {
        [FieldOffset(0)] public fixed float float32[4];
        [FieldOffset(0)] public fixed int int32[4];
        [FieldOffset(0)] public fixed uint uint32[4];
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public struct VkClearDepthStencilValue
    {
        public float depth;
        public UInt32 stencil;
    }

    [StructLayout(LayoutKind.Explicit, CharSet = CharSet.Ansi)]
    public struct VkClearValue
    {
        [FieldOffset(0)] public VkClearColorValue color;
        [FieldOffset(0)] public VkClearDepthStencilValue depthStencil;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public struct VkRenderingAttachmentInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_RENDERING_ATTACHMENT_INFO;
        public void* pNext = null;
        public VkImageView imageView;
        public VkImageLayout imageLayout;
        public VkResolveModeFlagBits resolveMode;
        public VkImageView resolveImageView;
        public VkImageLayout resolveImageLayout;
        public VkAttachmentLoadOp loadOp;
        public VkAttachmentStoreOp storeOp;
        public VkClearValue clearValue;

        public VkRenderingAttachmentInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public struct VkRenderingInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_RENDERING_INFO;
        public void* pNext = null;
        public VkRenderingFlagBits flags;
        public VkRect2D renderArea;
        public UInt32 layerCount;
        public UInt32 viewMask;
        public UInt32 colorAttachmentCount;
        public VkRenderingAttachmentInfo* pColorAttachments;
        public VkRenderingAttachmentInfo* pDepthAttachment;
        public VkRenderingAttachmentInfo* pStencilAttachment;

        public VkRenderingInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public struct VkCommandBufferInheritanceInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_COMMAND_BUFFER_INHERITANCE_INFO;
        public void* pNext = null;
        public VkRenderPass renderPass;
        public UInt32 subpass;
        public VkFramebuffer framebuffer;
        public VkBool32 occlusionQueryEnable;
        public VkQueryControlFlagBits queryFlags;
        public VkQueryPipelineStatisticFlagBits pipelineStatistics;

        public VkCommandBufferInheritanceInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public struct VkCommandBufferBeginInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO;
        public void* pNext = null;
        public VkCommandBufferUsageFlagBits flags;
        public VkCommandBufferInheritanceInfo* pInheritanceInfo; // const VkCommandBufferInheritanceInfo*

        public VkCommandBufferBeginInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public struct VkImageMemoryBarrier
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER;
        public void* pNext = null;
        public VkAccessFlagBits srcAccessMask;
        public VkAccessFlagBits dstAccessMask;
        public VkImageLayout oldLayout;
        public VkImageLayout newLayout;
        public UInt32 srcQueueFamilyIndex;
        public UInt32 dstQueueFamilyIndex;
        public VkImage image;
        public VkImageSubresourceRange subresourceRange;

        public VkImageMemoryBarrier()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public struct VkMemoryBarrier
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_MEMORY_BARRIER;
        public void* pNext = null;
        public VkAccessFlagBits srcAccessMask;
        public VkAccessFlagBits dstAccessMask;

        public VkMemoryBarrier()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public struct VkBufferMemoryBarrier
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_BUFFER_MEMORY_BARRIER;
        public void* pNext = null;
        public VkAccessFlagBits srcAccessMask;
        public VkAccessFlagBits dstAccessMask;
        public UInt32 srcQueueFamilyIndex;
        public UInt32 dstQueueFamilyIndex;
        public VkBuffer buffer;
        public VkDeviceSize offset;
        public VkDeviceSize size;

        public VkBufferMemoryBarrier()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public struct VkSubmitInfo
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_SUBMIT_INFO;
        public void* pNext = null;
        public UInt32 waitSemaphoreCount;
        public VkSemaphore* pWaitSemaphores; // const VkSemaphore*
        public VkPipelineStageFlagBits* pWaitDstStageMask; // const VkPipelineStageFlagBits*
        public UInt32 commandBufferCount;
        public VkCommandBuffer* pCommandBuffers; // const VkCommandBuffer*
        public UInt32 signalSemaphoreCount;
        public VkSemaphore* pSignalSemaphores; // const VkSemaphore*

        public VkSubmitInfo()
        {
        }
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public struct VkPresentInfoKHR
    {
        public VkStructureType sType = VkStructureType.VK_STRUCTURE_TYPE_PRESENT_INFO_KHR;
        public void* pNext = null;
        public UInt32 waitSemaphoreCount;
        public VkSemaphore* pWaitSemaphores; // const VkSemaphore*
        public UInt32 swapchainCount;
        public VkSwapchainKHR* pSwapchains; // const VkSwapchainKHR*
        public UInt32* pImageIndices; // const UInt32*
        public VkResult* pResults; // VkResult*

        public VkPresentInfoKHR()
        {
        }
    }
}