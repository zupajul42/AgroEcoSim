using System.Diagnostics.CodeAnalysis;
using System.Runtime.InteropServices;

namespace AgroRenderer;

[SuppressMessage("ReSharper", "InconsistentNaming")]
[SuppressMessage("ReSharper", "UnusedMember.Global")]
[SuppressMessage("ReSharper", "UnusedType.Global")]
public static unsafe partial class Vk
{
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

    [StructLayout((LayoutKind.Sequential))]
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

        public delegate* unmanaged<IntPtr, UInt64, UInt64, VkSystemAllocationScope, void> pfnAllocation;

        // void (*PFN_vkAllocationFunction)(IntPtr userData, UInt64 size, UInt64 alignment, VkSystemAllocationScope allocationScope);
        public delegate* unmanaged<IntPtr, IntPtr, UInt64, UInt64, VkSystemAllocationScope, void> pfnReallocation;

        // void (*PFN_vkReallocationFunction) (void* userData, void* original, size_t size, size_t alignment, VkSystemAllocationScope allocationScope);
        public delegate* unmanaged<IntPtr, IntPtr, void> pfnFree;

        // void (*PFN_vkFreeFunction)(void* userData, void* memory);
        public delegate* unmanaged<IntPtr, UInt64, VkInternalAllocationType, VkSystemAllocationScope, void>
            pfnInternalAllocation;

        // void (*PFN_vkInternalAllocationNotification)(void* userData, size_t size, VkInternalAllocationType allocationType, VkSystemAllocationScope allocationScope);
        public delegate* unmanaged<IntPtr, UInt64, VkInternalAllocationType, VkSystemAllocationScope, void>
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
        public VkDeviceSize(UInt64 size)
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
    public struct VkMemoryHeap {
        public VkDeviceSize size;
        public VkMemoryHeapFlagBits flags;
    }
    
    private const int VkMemoryTypesSize = (int)VK_MAX_MEMORY_TYPES * 8; // sizeof(VkMemoryType) == 8 bytes
    private const int VkMemoryHeapsSize = (int)VK_MAX_MEMORY_HEAPS * 12; // sizeof(VkMemoryHeap) == 12 bytes
    [StructLayout(LayoutKind.Sequential)]
    public struct VkPhysicalDeviceMemoryProperties
    {
        public UInt32 memoryTypeCount;
        [MarshalAs(UnmanagedType.ByValArray, ArraySubType = UnmanagedType.Struct, SizeConst = VkMemoryTypesSize)]
        public fixed byte memoryTypes[VkMemoryTypesSize]; // VkMemoryType[VK_MAX_MEMORY_TYPES] as csharp does not allow fixed size arrays of structs
        public UInt32 memoryHeapCount;
        [MarshalAs(UnmanagedType.ByValArray, ArraySubType = UnmanagedType.Struct, SizeConst = VkMemoryHeapsSize)]
        public fixed byte memoryHeaps[VkMemoryHeapsSize]; // VkMemoryHeap[VK_MAX_MEMORY_HEAPS] as csharp does not allow fixed size arrays of structs

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

    [StructLayout((LayoutKind.Sequential))]
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
}