using System.Diagnostics;
using System.Runtime.InteropServices;

namespace AgroRenderer;

public static unsafe class VkSharp
{
    // ----------------------------------------------------------------
    // Helper Functions
    public static string ApiVersionToStr(uint version)
    {
        return
            $"{Vk.VK_API_VERSION_VARIANT(version)}.{Vk.VK_API_VERSION_MAJOR(version)}.{Vk.VK_API_VERSION_MINOR(version)}.{Vk.VK_API_VERSION_PATCH(version)}";
    }

    public static string VersionToStr(uint version)
    {
        return $"{Vk.VK_VERSION_MAJOR(version)}.{Vk.VK_VERSION_MINOR(version)}.{Vk.VK_VERSION_PATCH(version)}";
    }

    // ----------------------------------------------------------------
    // Equivalents to Vulkan Structures

    public struct InstanceCreateInfo
    {
        public const Vk.VkStructureType Type = Vk.VkStructureType.VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO;
        public Vk.VkInstanceCreateFlagBits Flags = 0;
        public ApplicationInfo ApplicationInfo;
        public string[] EnabledLayerNames = [];
        public string[] EnabledExtensionNames = [];

        public InstanceCreateInfo()
        {
        }
    }

    public struct ApplicationInfo
    {
        public const Vk.VkStructureType Type = Vk.VkStructureType.VK_STRUCTURE_TYPE_APPLICATION_INFO;
        public required string ApplicationName;
        public Version ApplicationVersion;
        public required string EngineName;
        public Version EngineVersion;
        public Version ApiVersion;

        public ApplicationInfo()
        {
        }
    }

    public struct DebugMessengerCreateInfo
    {
        public const Vk.VkStructureType Type =
            Vk.VkStructureType.VK_STRUCTURE_TYPE_DEBUG_UTILS_MESSENGER_CREATE_INFO_EXT;

        public Vk.VkDebugUtilsMessengerCreateFlagsEXT Flags = 0;

        public Vk.VkDebugUtilsMessageSeverityFlagBitsEXT MessageSeverity =
            Vk.VkDebugUtilsMessageSeverityFlagBitsEXT
                .VK_DEBUG_UTILS_MESSAGE_SEVERITY_VERBOSE_BIT_EXT |
            Vk.VkDebugUtilsMessageSeverityFlagBitsEXT
                .VK_DEBUG_UTILS_MESSAGE_SEVERITY_WARNING_BIT_EXT |
            Vk.VkDebugUtilsMessageSeverityFlagBitsEXT
                .VK_DEBUG_UTILS_MESSAGE_SEVERITY_ERROR_BIT_EXT;

        public Vk.VkDebugUtilsMessageTypeFlagBitsEXT MessageType =
            Vk.VkDebugUtilsMessageTypeFlagBitsEXT.VK_DEBUG_UTILS_MESSAGE_TYPE_GENERAL_BIT_EXT |
            Vk.VkDebugUtilsMessageTypeFlagBitsEXT.VK_DEBUG_UTILS_MESSAGE_TYPE_VALIDATION_BIT_EXT |
            Vk.VkDebugUtilsMessageTypeFlagBitsEXT.VK_DEBUG_UTILS_MESSAGE_TYPE_PERFORMANCE_BIT_EXT;

        public required Vk.PFN_vkDebugUtilsMessengerCallbackEXT PfnUserCallback;
        public IntPtr PUserData = IntPtr.Zero;

        public DebugMessengerCreateInfo()
        {
        }
    }

    // ----------------------------------------------------------------
    // Custom Structures

    public struct PhysicalDevices
    {
        public Vk.VkPhysicalDevice[] Devices;
        public Vk.VkPhysicalDeviceProperties2[] Properties;
    }

    public struct QueuesToRequest
    {
        public int? Graphics = null;
        public int? Present = null;

        public QueuesToRequest()
        {
        }
    }

    public struct PhysicalDeviceWithQueues
    {
        public Vk.VkPhysicalDevice Device;
        public QueuesToRequest Queues;

        public void Deconstruct(out Vk.VkPhysicalDevice device, out QueuesToRequest queues)
        {
            device = Device;
            queues = Queues;
        }
    }

    public struct QueueDetails
    {
        public int GraphicsQueueFamilyIndex;
        public Vk.VkQueue GraphicsQueue;
        public int PresentQueueFamilyIndex;
        public Vk.VkQueue PresentQueue;
    }

    public struct LogicalDeviceWithQueues
    {
        public Vk.VkDevice Device;
        public int GraphicsQueueFamilyIndex;
        public Vk.VkQueue GraphicsQueue;
        public int PresentQueueFamilyIndex;
        public Vk.VkQueue PresentQueue;

        public void Deconstruct(out Vk.VkDevice device, out QueueDetails queueDetails)
        {
            device = Device;
            queueDetails = new QueueDetails
            {
                GraphicsQueueFamilyIndex = GraphicsQueueFamilyIndex,
                GraphicsQueue = GraphicsQueue,
                PresentQueueFamilyIndex = PresentQueueFamilyIndex,
                PresentQueue = PresentQueue
            };
        }
    }

    public struct SwapchainWithImages
    {
        public Vk.VkSwapchainKHR Swapchain;
        public Vk.VkImage[] Images;
        public Vk.VkFormat ImageFormat;
        public Vk.VkExtent2D ImageExtent;

        public void Deconstruct(out Vk.VkSwapchainKHR swapchain, out Vk.VkImage[] images,
            out Vk.VkFormat imageFormat, out Vk.VkExtent2D imageExtent)
        {
            swapchain = Swapchain;
            images = Images;
            imageFormat = ImageFormat;
            imageExtent = ImageExtent;
        }
    }

    public struct SwapchainSupportInfos
    {
        public Vk.VkSurfaceCapabilitiesKHR Capabilities;
        public Vk.VkSurfaceFormatKHR[] Formats;
        public Vk.VkPresentModeKHR[] PresentModes;
    }

    public readonly struct Version(uint variant, uint major, uint minor, uint patch)
    {
        public readonly uint Variant = variant;
        public readonly uint Major = major;
        public readonly uint Minor = minor;
        public readonly uint Patch = patch;

        public uint ToUInt32()
        {
            return Vk.VK_MAKE_API_VERSION(Variant, Major, Minor, Patch);
        }
    }

    public struct CompiledSpirv
    {
        public uint[] Vertex;
        public uint[] Fragment;
    }

    public struct BufferInfo
    {
        public Vk.VkBuffer Buffer;
        public Vk.VkDeviceMemory Memory;
        public ulong Size;
    }

    // ----------------------------------------------------------------
    // Public Functions

    public static Vk.VkResult CreateInstance(ref InstanceCreateInfo createInfo, out Vk.VkInstance instance,
        MemUtils.Arena scratch, DebugMessengerCreateInfo? debugCreateInfo = null)
    {
        var vkCreateInfo = scratch.Alloc<Vk.VkInstanceCreateInfo>();
        vkCreateInfo->sType = InstanceCreateInfo.Type;
        vkCreateInfo->pNext = IntPtr.Zero;
        vkCreateInfo->flags = createInfo.Flags;
        if (debugCreateInfo is not null)
        {
            var vkDebugCreateInfo = scratch.Alloc<Vk.VkDebugUtilsMessengerCreateInfoEXT>();
            vkCreateInfo->pNext = (IntPtr)vkDebugCreateInfo;

            vkDebugCreateInfo->sType = DebugMessengerCreateInfo.Type;
            vkDebugCreateInfo->pNext = IntPtr.Zero;
            vkDebugCreateInfo->flags = debugCreateInfo.Value.Flags;
            vkDebugCreateInfo->messageSeverity = debugCreateInfo.Value.MessageSeverity;
            vkDebugCreateInfo->messageType = debugCreateInfo.Value.MessageType;
            vkDebugCreateInfo->pfnUserCallback = (delegate* managed<
                Vk.VkDebugUtilsMessageSeverityFlagBitsEXT,
                Vk.VkDebugUtilsMessageTypeFlagBitsEXT,
                IntPtr, // const VkDebugUtilsMessengerCallbackDataEXT*
                IntPtr, // void*
                Vk.VkBool32>)Marshal.GetFunctionPointerForDelegate(debugCreateInfo.Value.PfnUserCallback);
            vkDebugCreateInfo->pUserData = debugCreateInfo.Value.PUserData;
        }


        var vkAppInfo = scratch.Alloc<Vk.VkApplicationInfo>();
        vkAppInfo->sType = ApplicationInfo.Type;
        vkAppInfo->pNext = IntPtr.Zero;
        vkAppInfo->pApplicationName = scratch.AllocANSIString(createInfo.ApplicationInfo.ApplicationName);
        vkAppInfo->applicationVersion = createInfo.ApplicationInfo.ApplicationVersion.ToUInt32();
        vkAppInfo->pEngineName = scratch.AllocANSIString(createInfo.ApplicationInfo.EngineName);
        vkAppInfo->engineVersion = createInfo.ApplicationInfo.EngineVersion.ToUInt32();
        vkAppInfo->apiVersion = createInfo.ApplicationInfo.ApiVersion.ToUInt32();

        vkCreateInfo->pApplicationInfo = vkAppInfo;

        // Marshal enabled Layer Names
        var layerCount = (UInt32)createInfo.EnabledLayerNames.Length;
        vkCreateInfo->enabledLayerCount = layerCount;
        if (layerCount > 0)
        {
            IntPtr* layerNames = scratch.Alloc<IntPtr>((int)layerCount);
            for (int i = 0; i < layerCount; i++)
            {
                layerNames[i] = scratch.AllocANSIString(createInfo.EnabledLayerNames[i]);
            }

            vkCreateInfo->ppEnabledLayerNames = layerNames;
        }
        else
        {
            vkCreateInfo->ppEnabledLayerNames = null;
        }

        // Marshal enabled Extension Names
        var extensionCount = (UInt32)createInfo.EnabledExtensionNames.Length;
        vkCreateInfo->enabledExtensionCount = extensionCount;
        if (extensionCount > 0)
        {
            IntPtr* extensionNames = scratch.Alloc<IntPtr>((int)extensionCount);
            for (int i = 0; i < extensionCount; i++)
            {
                extensionNames[i] = scratch.AllocANSIString(createInfo.EnabledExtensionNames[i]);
            }

            vkCreateInfo->ppEnabledExtensionNames = extensionNames;
        }
        else
        {
            vkCreateInfo->ppEnabledExtensionNames = null;
        }

        return Vk.vkCreateInstance(vkCreateInfo, null, out instance);
    }

    public static Vk.VkResult DestroyInstance(Vk.VkInstance instance)
    {
        Console.WriteLine($"Destroying Vulkan Instance with handle: 0x{instance.handle:X}");
        return Vk.vkDestroyInstance(instance, null);
    }

    public static Vk.VkResult DestroySurfaceKhr(Vk.VkInstance instance, Vk.VkSurfaceKHR surface)
    {
        Console.WriteLine($"Destroying Vulkan Surface with handle: 0x{surface.handle:X}");
        Vk.vkDestroySurfaceKHR(instance, surface, null);
        return Vk.VkResult.VK_SUCCESS;
    }

    public static PhysicalDevices GetPhysicalDevices(Vk.VkInstance instance, MemUtils.Arena scratch)
    {
        UInt32 deviceCount = 0;
        var result = Vk.vkEnumeratePhysicalDevices(instance, &deviceCount, null);
        if (result != Vk.VkResult.VK_SUCCESS || deviceCount == 0)
        {
            throw new Exception("Failed to enumerate physical devices or no devices found.");
        }

        Vk.VkPhysicalDevice* devices = scratch.Alloc<Vk.VkPhysicalDevice>((int)deviceCount);
        result = Vk.vkEnumeratePhysicalDevices(instance, &deviceCount, devices);
        if (result != Vk.VkResult.VK_SUCCESS)
        {
            throw new Exception("Failed to enumerate physical devices.");
        }

        var properties = scratch.Alloc<Vk.VkPhysicalDeviceProperties2>((int)deviceCount);
        Console.WriteLine("Fonud the following Physical Devices:");
        for (var i = 0; i < deviceCount; i++)
        {
            properties[i].sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_PROPERTIES_2;
            properties[i].pNext = IntPtr.Zero;
            Vk.vkGetPhysicalDeviceProperties2(devices[i], &properties[i]);
            string deviceName = Marshal.PtrToStringAnsi((IntPtr)(&properties[i])->properties.deviceName) ?? "Unknown";
            Console.WriteLine(
                $"   Physical Device {i}: {deviceName}, Type: {(&properties[i])->properties.deviceType}, " +
                $"API Version: {ApiVersionToStr((&properties[i])->properties.apiVersion)}");
        }

        var devicesStruct = new PhysicalDevices
        {
            Devices = new Vk.VkPhysicalDevice[deviceCount],
            Properties = new Vk.VkPhysicalDeviceProperties2[deviceCount]
        };
        for (var i = 0; i < deviceCount; i++)
        {
            devicesStruct.Devices[i] = devices[i];
            devicesStruct.Properties[i] = properties[i];
        }

        return devicesStruct;
    }

    public static PhysicalDeviceWithQueues FindSuitablePhysicalDevice(Vk.VkInstance instance,
        Vk.VkSurfaceKHR surface,
        MemUtils.Arena scratch)
    {
        var physicalDevices = GetPhysicalDevices(instance, scratch);
        var queuesToRequestArr = new QueuesToRequest[physicalDevices.Devices.Length];
        for (var i = 0; i < physicalDevices.Devices.Length; i++)
        {
            var queueFamilyCount = scratch.Alloc<UInt32>();
            Vk.vkGetPhysicalDeviceQueueFamilyProperties(physicalDevices.Devices[i], queueFamilyCount, null);
            var queueFamilyProperties = scratch.Alloc<Vk.VkQueueFamilyProperties>((int)*queueFamilyCount);
            Vk.vkGetPhysicalDeviceQueueFamilyProperties(physicalDevices.Devices[i], queueFamilyCount,
                queueFamilyProperties);
            Console.WriteLine($"Found the following Queue Families for Device {i}:");
            for (var j = 0; j < *queueFamilyCount; j++)
            {
                Console.WriteLine(
                    $"   Queue Family {j}: Flags: {queueFamilyProperties[j].queueFlags}, Count: {queueFamilyProperties[j].queueCount}, MinImageTransferGranularity: {queueFamilyProperties[j].minImageTransferGranularity.width}x{queueFamilyProperties[j].minImageTransferGranularity.height}x{queueFamilyProperties[j].minImageTransferGranularity.depth}");
                var timesUsed = 0;
                // Check for graphics support
                var graphicsSupport = Convert.ToBoolean(Vk.VkQueueFlagBits.VK_QUEUE_GRAPHICS_BIT &
                                                        queueFamilyProperties[j].queueFlags);
                if (graphicsSupport)
                    Console.WriteLine($"      -> Suitable for Graphics Commands");
                if (graphicsSupport && queuesToRequestArr[i].Graphics is null &&
                    timesUsed < queueFamilyProperties[j].queueCount)
                {
                    queuesToRequestArr[i].Graphics = j;
                    timesUsed++;
                }

                // Check for surface presentation support
                Vk.VkBool32 presentSupportBool32 = 0;
                var res = Vk.vkGetPhysicalDeviceSurfaceSupportKHR(physicalDevices.Devices[i], (uint)j, surface,
                    &presentSupportBool32);
                bool presentSupport = res == Vk.VkResult.VK_SUCCESS && presentSupportBool32 == Vk.VkBool32.VK_TRUE;
                if (presentSupport)
                    Console.WriteLine($"      -> Suitable for Surface Presentation");
                if (presentSupport && queuesToRequestArr[i].Present is null &&
                    timesUsed < queueFamilyProperties[j].queueCount)
                {
                    queuesToRequestArr[i].Present = j;
                }
            }
        }

        // Simple selection: prefer the first discrete GPU, otherwise take the first suitable one
        Vk.VkPhysicalDevice? selectedDevice = null;
        var selectedIndex = -1;
        for (int i = 0; i < physicalDevices.Devices.Length; i++)
        {
            if (queuesToRequestArr[i].Graphics is not null && queuesToRequestArr[i].Present is not null &&
                physicalDevices.Properties[i].properties.deviceType ==
                Vk.VkPhysicalDeviceType.VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU)
            {
                selectedDevice = physicalDevices.Devices[i];
                selectedIndex = i;
                break;
            }
            else if (queuesToRequestArr[i].Graphics is not null && queuesToRequestArr[i].Present is not null &&
                     selectedDevice is null)
            {
                selectedDevice = physicalDevices.Devices[i];
                selectedIndex = i;
            }
        }

        Console.WriteLine($"Selected Physical Device: {selectedIndex}");
        var physicalDeviceWithQueues = new PhysicalDeviceWithQueues
        {
            Device = selectedDevice ?? throw new Exception("No suitable physical device found."),
            Queues = queuesToRequestArr[selectedIndex]
        };
        return physicalDeviceWithQueues;
    }

    public static LogicalDeviceWithQueues CreateLogicalDevice(Vk.VkPhysicalDevice physicalDevice,
        QueuesToRequest queuesToRequest, MemUtils.Arena scratch,
        string[]? enabledLayerNames = null, string[]? enabledExtensionNames = null)
    {
        enabledLayerNames ??= [];
        enabledExtensionNames ??= ["VK_KHR_swapchain"];
        // Test if the requested layers are available
        var availableLayers = GetAvailableDeviceLayers(physicalDevice, scratch);
        if(!CheckIfLayersAvailable(enabledLayerNames, availableLayers))
        {
            throw new Exception("Not all requested device layers are available.");
        }
        var availableExtensions = GetAvailableDeviceExtensions(physicalDevice, scratch);
        if(!CheckIfExtensionsAvailable(enabledExtensionNames, availableExtensions))
        {
            throw new Exception("Not all requested device extensions are available.");
        }
        // Prepare Queue Create Infos
        int queueCreateInfoCount = 0;
        if (queuesToRequest.Graphics is not null) queueCreateInfoCount++;
        if (queuesToRequest.Present is not null && queuesToRequest.Present != queuesToRequest.Graphics)
            queueCreateInfoCount++;
        var queueCreateInfos = scratch.Alloc<Vk.VkDeviceQueueCreateInfo>(queueCreateInfoCount);
        var queuePriorities = scratch.Alloc<float>(queueCreateInfoCount); // One priority per queue create info
        int index = 0;
        if (queuesToRequest.Graphics is not null)
        {
            queueCreateInfos[index] = new Vk.VkDeviceQueueCreateInfo
            {
                sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO,
                pNext = IntPtr.Zero,
                flags = 0,
                queueFamilyIndex = (UInt32)queuesToRequest.Graphics.Value,
                queueCount = queuesToRequest.Present != queuesToRequest.Graphics ? 1U : 2U,
                pQueuePriorities = &queuePriorities[index]
            };
            queuePriorities[index] = 1.0f; // Highest priority
            index++;
        }
        if (queuesToRequest.Present is not null && queuesToRequest.Present != queuesToRequest.Graphics)
        {
            queueCreateInfos[index] = new Vk.VkDeviceQueueCreateInfo
            {
                sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO,
                pNext = IntPtr.Zero,
                flags = 0,
                queueFamilyIndex = (UInt32)queuesToRequest.Present.Value,
                queueCount = 1,
                pQueuePriorities = &queuePriorities[index]
            };
            queuePriorities[index] = 1.0f; // Highest priority
        }
        // Test for Supported Features
        var supportedDeviceFeatures2 = scratch.Alloc<Vk.VkPhysicalDeviceFeatures2>();
        supportedDeviceFeatures2->sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_FEATURES_2;
        var supportedVulkan13Features = scratch.Alloc<Vk.VkPhysicalDeviceVulkan13Features>();
        supportedVulkan13Features->sType =
            Vk.VkStructureType.VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_3_FEATURES;
        supportedDeviceFeatures2->pNext = (IntPtr) supportedVulkan13Features;
        var supportedExtendedDynamicStateFeatures =
            scratch.Alloc<Vk.VkPhysicalDeviceExtendedDynamicStateFeaturesEXT>();
        supportedExtendedDynamicStateFeatures->sType =
            Vk.VkStructureType.VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_EXTENDED_DYNAMIC_STATE_FEATURES_EXT;
        supportedVulkan13Features->pNext = (IntPtr) supportedExtendedDynamicStateFeatures;
        Vk.vkGetPhysicalDeviceFeatures2(physicalDevice, supportedDeviceFeatures2);
        if (supportedDeviceFeatures2->features.fillModeNonSolid != Vk.VkBool32.VK_TRUE)
        {
            Console.WriteLine("Warning: fillModeNonSolid feature not supported.");
            throw new Exception("fillModeNonSolid feature not supported.");
        }
        if (supportedVulkan13Features->dynamicRendering != Vk.VkBool32.VK_TRUE)
        {
            Console.WriteLine("Warning: dynamicRendering feature not supported.");
            throw new Exception("dynamicRendering feature not supported.");
        }
        if (supportedVulkan13Features->synchronization2 != Vk.VkBool32.VK_TRUE)
        {
            Console.WriteLine("Warning: synchronization2 feature not supported.");
            throw new Exception("synchronization2 feature not supported.");
        }
        if (supportedExtendedDynamicStateFeatures->extendedDynamicState != Vk.VkBool32.VK_TRUE)
        {
            Console.WriteLine("Warning: extendedDynamicState feature not supported.");
            throw new Exception("extendedDynamicState feature not supported.");
        }
        var requestDeviceFeatures2 = scratch.Alloc<Vk.VkPhysicalDeviceFeatures2>();
        requestDeviceFeatures2->sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_FEATURES_2;
        requestDeviceFeatures2->features.fillModeNonSolid = Vk.VkBool32.VK_TRUE;
        var requestVulkan13Features = scratch.Alloc<Vk.VkPhysicalDeviceVulkan13Features>();
        requestVulkan13Features->sType =
            Vk.VkStructureType.VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_3_FEATURES;
        requestDeviceFeatures2->pNext = (IntPtr) requestVulkan13Features;
        requestVulkan13Features->dynamicRendering = Vk.VkBool32.VK_TRUE;
        requestVulkan13Features->synchronization2 = Vk.VkBool32.VK_TRUE;
        var requestExtendedDynamicStateFeatures =
            scratch.Alloc<Vk.VkPhysicalDeviceExtendedDynamicStateFeaturesEXT>();
        requestExtendedDynamicStateFeatures->sType =
            Vk.VkStructureType.VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_EXTENDED_DYNAMIC_STATE_FEATURES_EXT;
        requestVulkan13Features->pNext = (IntPtr) requestExtendedDynamicStateFeatures;
        requestExtendedDynamicStateFeatures->extendedDynamicState = Vk.VkBool32.VK_TRUE;
        // Prepare Device Create Info
        var deviceCreateInfo = scratch.Alloc<Vk.VkDeviceCreateInfo>();
        deviceCreateInfo->sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO;
        deviceCreateInfo->pNext = (IntPtr) requestDeviceFeatures2;
        deviceCreateInfo->flags = 0;
        deviceCreateInfo->queueCreateInfoCount = (UInt32)queueCreateInfoCount;
        deviceCreateInfo->pQueueCreateInfos = queueCreateInfos;
        deviceCreateInfo->enabledLayerCount = (UInt32)enabledLayerNames.Length;
        deviceCreateInfo->enabledExtensionCount = (UInt32)enabledExtensionNames.Length;
        deviceCreateInfo->pEnabledFeatures = null; // Enable all features by default
        // Marshal enabled Layer Names
        if (deviceCreateInfo->enabledLayerCount > 0)
        {
            IntPtr* layerNames = scratch.Alloc<IntPtr>((int)deviceCreateInfo->enabledLayerCount);
            for (int i = 0; i < deviceCreateInfo->enabledLayerCount; i++)
            {
                layerNames[i] = scratch.AllocANSIString(enabledLayerNames[i]);
            }

            deviceCreateInfo->ppEnabledLayerNames = layerNames;
        }
        else
        {
            deviceCreateInfo->ppEnabledLayerNames = null;
        }

        // Marshal enabled Extension Names
        if (deviceCreateInfo->enabledExtensionCount > 0)
        {
            IntPtr* extensionNames = scratch.Alloc<IntPtr>((int)deviceCreateInfo->enabledExtensionCount);
            for (int i = 0; i < deviceCreateInfo->enabledExtensionCount; i++)
            {
                extensionNames[i] = scratch.AllocANSIString(enabledExtensionNames[i]);
            }

            deviceCreateInfo->ppEnabledExtensionNames = extensionNames;
        }
        else
        {
            deviceCreateInfo->ppEnabledExtensionNames = null;
        }

        // Create Logical Device
        var logicalDevice = scratch.Alloc<Vk.VkDevice>();
        var result = Vk.vkCreateDevice(physicalDevice, deviceCreateInfo, null, logicalDevice);
        if (result != Vk.VkResult.VK_SUCCESS)
        {
            throw new Exception($"Failed to create logical device: {result}");
        }

        Console.WriteLine($"Created Logical Device with handle: 0x{logicalDevice->handle:X}");

        var logicalDeviceManaged = new Vk.VkDevice
        {
            handle = logicalDevice->handle
        };
        // Retrieve Queues
        var logicalDeviceWithQueues = new LogicalDeviceWithQueues
        {
            Device = logicalDeviceManaged,
            GraphicsQueueFamilyIndex = queuesToRequest.Graphics ?? -1,
            PresentQueueFamilyIndex = queuesToRequest.Present ?? -1
        };
        if (queuesToRequest.Graphics is not null)
        {
            var graphicsQueue = scratch.Alloc<Vk.VkQueue>();
            Vk.vkGetDeviceQueue(*logicalDevice, (UInt32)queuesToRequest.Graphics.Value, 0, graphicsQueue);
            var graphicsQueueManaged = new Vk.VkQueue
            {
                handle = graphicsQueue->handle
            };
            logicalDeviceWithQueues.GraphicsQueue = graphicsQueueManaged;
            Console.WriteLine($"Retrieved Graphics Queue with handle: 0x{graphicsQueue->handle:X}");
        }

        if (queuesToRequest.Present is not null)
        {
            var presentQueue = scratch.Alloc<Vk.VkQueue>();
            Vk.vkGetDeviceQueue(*logicalDevice, (UInt32)queuesToRequest.Present.Value,
                queuesToRequest.Present != queuesToRequest.Graphics ? 0U : 1U, presentQueue);
            var presentQueueManaged = new Vk.VkQueue
            {
                handle = presentQueue->handle
            };
            logicalDeviceWithQueues.PresentQueue = presentQueueManaged;
            Console.WriteLine($"Retrieved Present Queue with handle: 0x{presentQueue->handle:X}");
        }

        return logicalDeviceWithQueues;
    }

    private static Vk.VkLayerProperties[] GetAvailableDeviceLayers(Vk.VkPhysicalDevice physicalDevice, MemUtils.Arena scratch)
    {
        UInt32 availableLayerCount = 0;
        var result = Vk.vkEnumerateDeviceLayerProperties(physicalDevice, &availableLayerCount, null);
        if (result != Vk.VkResult.VK_SUCCESS)
        {
            throw new Exception("Failed to enumerate device layer properties.");
        }
        var availableLayers = scratch.Alloc<Vk.VkLayerProperties>((int)availableLayerCount);
        result = Vk.vkEnumerateDeviceLayerProperties(physicalDevice, &availableLayerCount, availableLayers);
        if (result != Vk.VkResult.VK_SUCCESS)
        {
            throw new Exception("Failed to enumerate device layer properties.");
        }
        var availableLayersArray = new Vk.VkLayerProperties[availableLayerCount];
        for (int i = 0; i < availableLayerCount; i++)
        {
            availableLayersArray[i] = availableLayers[i];
        }
        return availableLayersArray;
    }

    public static bool CheckIfLayersAvailable(string[] requestedLayers, Vk.VkLayerProperties[] availableLayers)
    {
        var allFound = true;
        var availableLayersStrings = availableLayers
            .Select(availableLayer => Marshal.PtrToStringAnsi((IntPtr)availableLayer.layerName) ?? "").ToArray();
        foreach (var requestedLayer in requestedLayers)
        {
            var found = availableLayersStrings.Any(availableLayerName => requestedLayer == availableLayerName);
            if (!found)
            {
                allFound = false;
                Console.WriteLine($"Requested Layer {requestedLayer} not supported.");
            }
        }
        return allFound;
    }
    public static Vk.VkExtensionProperties[] GetAvailableDeviceExtensions(Vk.VkPhysicalDevice physicalDevice, MemUtils.Arena scratch)
    {
        UInt32 availableExtensionCount = 0;
        var result = Vk.vkEnumerateDeviceExtensionProperties(physicalDevice, IntPtr.Zero, &availableExtensionCount, null);
        if (result != Vk.VkResult.VK_SUCCESS)
        {
            throw new Exception("Failed to enumerate device extension properties.");
        }
        var availableExtensions = scratch.Alloc<Vk.VkExtensionProperties>((int)availableExtensionCount);
        result = Vk.vkEnumerateDeviceExtensionProperties(physicalDevice, IntPtr.Zero, &availableExtensionCount, availableExtensions);
        if (result != Vk.VkResult.VK_SUCCESS)
        {
            throw new Exception("Failed to enumerate device extension properties.");
        }
        var availableExtensionsArray = new Vk.VkExtensionProperties[availableExtensionCount];
        for (int i = 0; i < availableExtensionCount; i++)
        {
            availableExtensionsArray[i] = availableExtensions[i];
        }
        return availableExtensionsArray;
    }
    public static bool CheckIfExtensionsAvailable(string[] requestedExtensions, Vk.VkExtensionProperties[] availableExtensions)
    {
        var allFound = true;
        var availableExtensionsStrings = availableExtensions
            .Select(availableExtension => Marshal.PtrToStringAnsi((IntPtr)availableExtension.extensionName) ?? "").ToArray();
        foreach (var requestedExtension in requestedExtensions)
        {
            var found = availableExtensionsStrings.Any(availableExtensionName => requestedExtension == availableExtensionName);
            if (!found)
            {
                allFound = false;
                Console.WriteLine($"Requested Extension {requestedExtension} not supported.");
            }
        }
        return allFound;
    }

    public static SwapchainWithImages CreateSwapchain(Vk.VkDevice device, Vk.VkPhysicalDevice physicalDevice,
        Vk.VkSurfaceKHR surface, QueueDetails queueDetails, MemUtils.Arena scratch,
        Vk.VkExtent2D? desiredExtent = null,
        Vk.VkFormat? desiredFormat = null, Vk.VkColorSpaceKHR? desiredColorSpace = null,
        Vk.VkPresentModeKHR? desiredPresentMode = null)
    {
        var swapchainSupport = QuerySwapchainSupport(physicalDevice, surface, scratch);

        if (desiredFormat is null && desiredColorSpace is null)
        {
            foreach (var format in swapchainSupport.Formats)
            {
                if (format is
                    {
                        format: Vk.VkFormat.VK_FORMAT_B8G8R8A8_SRGB,
                        colorSpace: Vk.VkColorSpaceKHR.VK_COLOR_SPACE_SRGB_NONLINEAR_KHR
                    })
                {
                    desiredFormat = format.format;
                    desiredColorSpace = format.colorSpace;
                    break;
                }
            }
        }
        else
        {
            var found = false;
            foreach (var format in swapchainSupport.Formats)
            {
                if (format.format == desiredFormat &&
                    (desiredColorSpace is null || format.colorSpace == desiredColorSpace))
                {
                    found = true;
                    break;
                }
            }

            if (!found)
            {
                desiredFormat = null;
                desiredColorSpace = null;
            }
        }

        // If the preferred format is not found, just take the first available one
        if (desiredFormat is null && desiredColorSpace is null)
        {
            Console.WriteLine("Preferred format not found, using first available format.");
            desiredFormat = swapchainSupport.Formats[0].format;
            desiredColorSpace = swapchainSupport.Formats[0].colorSpace;
        }

        Console.WriteLine($"Selected Swapchain Format: {desiredFormat}, Color Space: {desiredColorSpace}");

        if (desiredExtent is null)
        {
            // Use the current extent if it's not the special value
            if (swapchainSupport.Capabilities.currentExtent.width != UInt32.MaxValue)
            {
                desiredExtent = swapchainSupport.Capabilities.currentExtent;
            }
            else
            {
                // Otherwise, set to some default value within the allowed range
                desiredExtent = new Vk.VkExtent2D
                {
                    width = Math.Clamp(800, swapchainSupport.Capabilities.minImageExtent.width,
                        swapchainSupport.Capabilities.maxImageExtent.width),
                    height = Math.Clamp(600, swapchainSupport.Capabilities.minImageExtent.height,
                        swapchainSupport.Capabilities.maxImageExtent.height)
                };
            }
        }

        Console.WriteLine($"Selected Swapchain Extent: {desiredExtent?.width}x{desiredExtent?.height}");

        if (desiredPresentMode is null)
        {
            // Prefer MAILBOX if available, otherwise use FIFO which is guaranteed to be available
            desiredPresentMode = Vk.VkPresentModeKHR.VK_PRESENT_MODE_FIFO_KHR;
            foreach (var presentMode in swapchainSupport.PresentModes)
            {
                if (presentMode == Vk.VkPresentModeKHR.VK_PRESENT_MODE_MAILBOX_KHR)
                {
                    desiredPresentMode = presentMode;
                    break;
                }
            }
        }

        Console.WriteLine($"Selected Present Mode: {desiredPresentMode}");

        // Prepare Swapchain Create Info
        var swapchainCreateInfo = scratch.Alloc<Vk.VkSwapchainCreateInfoKHR>();
        swapchainCreateInfo->sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_SWAPCHAIN_CREATE_INFO_KHR;
        swapchainCreateInfo->pNext = IntPtr.Zero;
        swapchainCreateInfo->flags = 0;
        swapchainCreateInfo->surface = surface;
        swapchainCreateInfo->minImageCount = 2; // Double buffering
        swapchainCreateInfo->imageFormat =
            desiredFormat ?? throw new UnreachableException("No desired format specified.");
        swapchainCreateInfo->imageColorSpace = desiredColorSpace ??
                                               throw new UnreachableException("No desired color space specified.");
        swapchainCreateInfo->imageExtent =
            desiredExtent ?? throw new UnreachableException("No desired extent specified.");
        swapchainCreateInfo->imageArrayLayers = 1;
        swapchainCreateInfo->imageUsage = Vk.VkImageUsageFlagBits.VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT;
        swapchainCreateInfo->preTransform = Vk.VkSurfaceTransformFlagBitsKHR.VK_SURFACE_TRANSFORM_IDENTITY_BIT_KHR;
        swapchainCreateInfo->compositeAlpha = Vk.VkCompositeAlphaFlagBitsKHR.VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR;
        swapchainCreateInfo->presentMode = desiredPresentMode ?? throw new UnreachableException();
        swapchainCreateInfo->clipped = Vk.VkBool32.VK_TRUE;
        swapchainCreateInfo->oldSwapchain = new Vk.VkSwapchainKHR { handle = 0 };
        if (queueDetails.GraphicsQueueFamilyIndex != queueDetails.PresentQueueFamilyIndex)
        {
            swapchainCreateInfo->imageSharingMode = Vk.VkSharingMode.VK_SHARING_MODE_CONCURRENT;
            swapchainCreateInfo->queueFamilyIndexCount = 2;
            var queueFamilyIndices = scratch.Alloc<uint>(2);
            queueFamilyIndices[0] = (uint)queueDetails.GraphicsQueueFamilyIndex;
            queueFamilyIndices[1] = (uint)queueDetails.PresentQueueFamilyIndex;
            swapchainCreateInfo->pQueueFamilyIndices = queueFamilyIndices;
        }
        else
        {
            swapchainCreateInfo->imageSharingMode = Vk.VkSharingMode.VK_SHARING_MODE_EXCLUSIVE;
            swapchainCreateInfo->queueFamilyIndexCount = 0;
            swapchainCreateInfo->pQueueFamilyIndices = null;
        }

        // Create Swapchain
        var swapchain = scratch.Alloc<Vk.VkSwapchainKHR>();
        var result = Vk.vkCreateSwapchainKHR(device, swapchainCreateInfo, null, swapchain);
        if (result != Vk.VkResult.VK_SUCCESS)
        {
            throw new Exception($"Failed to create swapchain: {result}");
        }

        Console.WriteLine($"Created Swapchain with handle: 0x{swapchain->handle:X}");
        var swapchainManaged = new Vk.VkSwapchainKHR
        {
            handle = swapchain->handle
        };
        // Retrieve Swapchain Images
        uint imageCount = 0;
        result = Vk.vkGetSwapchainImagesKHR(device, swapchainManaged, &imageCount, null);
        if (result != Vk.VkResult.VK_SUCCESS || imageCount == 0)
        {
            throw new Exception("Failed to get swapchain images or no images found.");
        }

        var images = scratch.Alloc<Vk.VkImage>((int)imageCount);
        result = Vk.vkGetSwapchainImagesKHR(device, swapchainManaged, &imageCount, images);
        if (result != Vk.VkResult.VK_SUCCESS)
        {
            throw new Exception("Failed to get swapchain images.");
        }

        Console.WriteLine($"Retrieved {imageCount} Swapchain Images.");
        var imagesManaged = new Vk.VkImage[imageCount];
        for (var i = 0; i < imageCount; i++)
        {
            var img = new Vk.VkImage
            {
                handle = images[i].handle
            };
            imagesManaged[i] = img;
            Console.WriteLine($"   Image {i}: Handle: 0x{images[i].handle:X}");
        }

        var swapchainWithImages = new SwapchainWithImages
        {
            Swapchain = swapchainManaged,
            Images = imagesManaged,
            ImageFormat = desiredFormat ?? throw new UnreachableException("No desired format specified."),
            ImageExtent = desiredExtent ?? throw new UnreachableException("No desired extent specified.")
        };
        return swapchainWithImages;
    }

    public static SwapchainSupportInfos QuerySwapchainSupport(Vk.VkPhysicalDevice physicalDevice,
        Vk.VkSurfaceKHR surface, MemUtils.Arena scratch)
    {
        // Capabilities
        var capabilities = scratch.Alloc<Vk.VkSurfaceCapabilitiesKHR>();
        var result = Vk.vkGetPhysicalDeviceSurfaceCapabilitiesKHR(physicalDevice, surface, capabilities);
        if (result != Vk.VkResult.VK_SUCCESS)
        {
            throw new Exception("Failed to get surface capabilities.");
        }

        // Formats
        UInt32 formatCount = 0;
        result = Vk.vkGetPhysicalDeviceSurfaceFormatsKHR(physicalDevice, surface, &formatCount, null);
        if (result != Vk.VkResult.VK_SUCCESS || formatCount == 0)
        {
            throw new Exception("Failed to get surface formats or no formats found.");
        }

        var formats = scratch.Alloc<Vk.VkSurfaceFormatKHR>((int)formatCount);
        result = Vk.vkGetPhysicalDeviceSurfaceFormatsKHR(physicalDevice, surface, &formatCount, formats);
        if (result != Vk.VkResult.VK_SUCCESS)
        {
            throw new Exception("Failed to get surface formats.");
        }

        // Present Modes
        UInt32 presentModeCount = 0;
        result = Vk.vkGetPhysicalDeviceSurfacePresentModesKHR(physicalDevice, surface, &presentModeCount, null);
        if (result != Vk.VkResult.VK_SUCCESS || presentModeCount == 0)
        {
            throw new Exception("Failed to get present modes or no present modes found.");
        }

        var presentModes = scratch.Alloc<Vk.VkPresentModeKHR>((int)presentModeCount);
        result = Vk.vkGetPhysicalDeviceSurfacePresentModesKHR(physicalDevice, surface, &presentModeCount,
            presentModes);
        if (result != Vk.VkResult.VK_SUCCESS)
        {
            throw new Exception("Failed to get present modes.");
        }

        var details = new SwapchainSupportInfos
        {
            Capabilities = *capabilities,
            Formats = new Vk.VkSurfaceFormatKHR[formatCount]
        };
        for (var i = 0; i < formatCount; i++)
        {
            details.Formats[i] = formats[i];
        }

        details.PresentModes = new Vk.VkPresentModeKHR[presentModeCount];
        for (var i = 0; i < presentModeCount; i++)
        {
            details.PresentModes[i] = presentModes[i];
        }

        return details;
    }

    public static Vk.VkImageView[] CreateSwapchainImageViews(Vk.VkDevice device, Vk.VkImage[] images,
        Vk.VkFormat format,
        MemUtils.Arena scratch)
    {
        var imageViews = new Vk.VkImageView[images.Length];
        for (var i = 0; i < images.Length; i++)
        {
            var createInfo = scratch.Alloc<Vk.VkImageViewCreateInfo>();
            createInfo->sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO;
            createInfo->pNext = IntPtr.Zero;
            createInfo->flags = 0;
            createInfo->image = images[i];
            createInfo->viewType = Vk.VkImageViewType.VK_IMAGE_VIEW_TYPE_2D;
            createInfo->format = format;
            createInfo->components = new Vk.VkComponentMapping
            {
                r = Vk.VkComponentSwizzle.VK_COMPONENT_SWIZZLE_IDENTITY,
                g = Vk.VkComponentSwizzle.VK_COMPONENT_SWIZZLE_IDENTITY,
                b = Vk.VkComponentSwizzle.VK_COMPONENT_SWIZZLE_IDENTITY,
                a = Vk.VkComponentSwizzle.VK_COMPONENT_SWIZZLE_IDENTITY
            };
            createInfo->subresourceRange = new Vk.VkImageSubresourceRange
            {
                aspectMask = Vk.VkImageAspectFlagBits.VK_IMAGE_ASPECT_COLOR_BIT,
                baseMipLevel = 0,
                levelCount = 1,
                baseArrayLayer = 0,
                layerCount = 1
            };

            var imageView = scratch.Alloc<Vk.VkImageView>();
            var result = Vk.vkCreateImageView(device, createInfo, null, imageView);
            if (result != Vk.VkResult.VK_SUCCESS)
            {
                throw new Exception($"Failed to create image view for image {i}: {result}");
            }

            Console.WriteLine($"Created Image View for Image {i} with handle: 0x{imageView->handle:X}");
            var imageViewManaged = new Vk.VkImageView
            {
                handle = imageView->handle
            };
            imageViews[i] = imageViewManaged;
        }

        return imageViews;
    }

    public static uint[] CompileGLSLtoSPIRV(string glslSource, GLSLang.glslang_stage_t shaderStage,
        MemUtils.Arena scratch)
    {
        var sourceAnsi = scratch.AllocANSIString(glslSource);
        var input = scratch.Alloc<GLSLang.glslang_input_t>();
        input->language = GLSLang.glslang_source_t.GLSLANG_SOURCE_GLSL;
        input->stage = shaderStage;
        input->client = GLSLang.glslang_client_t.GLSLANG_CLIENT_VULKAN;
        input->client_version = GLSLang.glslang_target_client_version_t.GLSLANG_TARGET_VULKAN_1_3;
        input->target_language = GLSLang.glslang_target_language_t.GLSLANG_TARGET_SPV;
        input->target_language_version = GLSLang.glslang_target_language_version_t.GLSLANG_TARGET_SPV_1_5;
        input->code = sourceAnsi;
        input->default_version = 450;
        input->default_profile = GLSLang.glslang_profile_t.GLSLANG_CORE_PROFILE;
        input->force_default_version_and_profile = 0;
        input->forward_compatible = 0;
        input->messages = GLSLang.glslang_messages_t.GLSLANG_MSG_DEFAULT_BIT |
                          GLSLang.glslang_messages_t.GLSLANG_MSG_SPV_RULES_BIT |
                          GLSLang.glslang_messages_t.GLSLANG_MSG_VULKAN_RULES_BIT;
        input->resource = (IntPtr)GLSLang.glslang_default_resource();

        var shader = GLSLang.glslang_shader_create(input);
        if (shader is null) throw new Exception("Failed to create glslang shader.");
        if (GLSLang.glslang_shader_preprocess(shader, input) == 0)
        {
            var log = Marshal.PtrToStringAnsi(GLSLang.glslang_shader_get_info_log(shader)) ?? "Unknown error";
            var debugLog = Marshal.PtrToStringAnsi(GLSLang.glslang_shader_get_info_debug_log(shader)) ??
                           "No debug info";
            GLSLang.glslang_shader_delete(shader);
            throw new Exception($"GLSL Preprocessing failed: \n{log}\n{debugLog}");
        }

        if (GLSLang.glslang_shader_parse(shader, input) == 0)
        {
            var log = Marshal.PtrToStringAnsi(GLSLang.glslang_shader_get_info_log(shader)) ?? "Unknown error";
            var debugLog = Marshal.PtrToStringAnsi(GLSLang.glslang_shader_get_info_debug_log(shader)) ??
                           "No debug info";
            GLSLang.glslang_shader_delete(shader);
            throw new Exception($"GLSL Parsing failed: \n{log}\n{debugLog}");
        }

        var program = GLSLang.glslang_program_create();
        if (program is null) throw new Exception("Failed to create glslang program.");
        GLSLang.glslang_program_add_shader(program, shader);
        if (GLSLang.glslang_program_link(program,
                GLSLang.glslang_messages_t.GLSLANG_MSG_SPV_RULES_BIT |
                GLSLang.glslang_messages_t.GLSLANG_MSG_VULKAN_RULES_BIT) == 0)
        {
            var log = Marshal.PtrToStringAnsi(GLSLang.glslang_program_get_info_log(program)) ?? "Unknown error";
            var debugLog = Marshal.PtrToStringAnsi(GLSLang.glslang_program_get_info_debug_log(program)) ??
                           "No debug info";
            GLSLang.glslang_program_delete(program);
            GLSLang.glslang_shader_delete(shader);
            throw new Exception($"GLSL Linking failed: \n{log}\n{debugLog}");
        }

        GLSLang.glslang_program_SPIRV_generate(program, shaderStage);
        var spirvSize = (UInt64)GLSLang.glslang_program_SPIRV_get_size(program);
        var spirvPtr = GLSLang.glslang_program_SPIRV_get_ptr(program);
        if (spirvPtr == IntPtr.Zero || spirvSize == 0) throw new Exception("Failed to get SPIR-V code.");
        var spirvWords = new uint[spirvSize];
        Marshal.Copy(spirvPtr, (int[])(object)spirvWords, 0, (int)spirvSize);
        GLSLang.glslang_program_delete(program);
        GLSLang.glslang_shader_delete(shader);
        return spirvWords;
    }
    public static CompiledSpirv CompileShaders(string? vertexShaderSource, string? fragmentShaderSource, MemUtils.Arena scratch)
    {
        var vertSpirv = vertexShaderSource is not null ? CompileGLSLtoSPIRV(vertexShaderSource, GLSLang.glslang_stage_t.GLSLANG_STAGE_VERTEX, scratch) : [];
        var fragSpirv = fragmentShaderSource is not null ? CompileGLSLtoSPIRV(fragmentShaderSource, GLSLang.glslang_stage_t.GLSLANG_STAGE_FRAGMENT, scratch) : [];
        return new CompiledSpirv
        {
            Vertex = vertSpirv,
            Fragment = fragSpirv
        };
    }

    public static BufferInfo CreateBuffer(Vk.VkDevice device, Vk.VkPhysicalDevice physicalDevice, Vk.VkDeviceSize size,
        Vk.VkBufferUsageFlagBits usage, Vk.VkMemoryPropertyFlagBits properties, MemUtils.Arena scratch)
    {
        var result = new BufferInfo();
        
        var bufferCreateInfo = scratch.Alloc<Vk.VkBufferCreateInfo>();
        bufferCreateInfo->sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO;
        bufferCreateInfo->pNext = IntPtr.Zero;
        bufferCreateInfo->flags = 0;
        bufferCreateInfo->size = size;
        bufferCreateInfo->usage = usage;
        bufferCreateInfo->sharingMode = Vk.VkSharingMode.VK_SHARING_MODE_EXCLUSIVE;
        bufferCreateInfo->queueFamilyIndexCount = 0;
        bufferCreateInfo->pQueueFamilyIndices = null;
        
        if(Vk.vkCreateBuffer(device, bufferCreateInfo, null, &result.Buffer) != Vk.VkResult.VK_SUCCESS)
        {
            throw new Exception("Failed to create buffer.");
        }

        result.Size = size.size;
        var memRequirements = scratch.Alloc<Vk.VkMemoryRequirements>();
        Vk.vkGetBufferMemoryRequirements(device, result.Buffer, memRequirements);
        var memoryTypeIndex = FindSuitableMemoryTypeIndex(physicalDevice, memRequirements->memoryTypeBits, properties, scratch);
        var allocInfo = scratch.Alloc<Vk.VkMemoryAllocateInfo>();
        allocInfo->sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO;
        allocInfo->pNext = IntPtr.Zero;
        allocInfo->allocationSize = memRequirements->size;
        allocInfo->memoryTypeIndex = memoryTypeIndex;
        if(Vk.vkAllocateMemory(device, allocInfo, null, &result.Memory) != Vk.VkResult.VK_SUCCESS)
        {
            throw new Exception("Failed to allocate buffer memory.");
        }
        if(Vk.vkBindBufferMemory(device, result.Buffer, result.Memory, new Vk.VkDeviceSize(0)) != Vk.VkResult.VK_SUCCESS)
        {
            throw new Exception("Failed to bind buffer memory.");
        }
        return result;
    }
    
    public static BufferInfo CreateBufferForArray<T>(Vk.VkDevice device, Vk.VkPhysicalDevice physicalDevice, T[] data,
        Vk.VkBufferUsageFlagBits usage, Vk.VkMemoryPropertyFlagBits properties, MemUtils.Arena scratch) where T : unmanaged
    {
        var size = new Vk.VkDeviceSize((ulong)(data.Length * sizeof(T)));
        return CreateBuffer(device, physicalDevice, size, usage, properties, scratch);
    }
    
    public static BufferInfo CreateVertexBufferForArray<T>(Vk.VkDevice device, Vk.VkPhysicalDevice physicalDevice, T[] data,
        MemUtils.Arena scratch) where T : unmanaged
    {
        
        var bufferUsageBits = Vk.VkBufferUsageFlagBits.VK_BUFFER_USAGE_VERTEX_BUFFER_BIT;
        var memoryPropertyBits = Vk.VkMemoryPropertyFlagBits.VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT |
                                 Vk.VkMemoryPropertyFlagBits.VK_MEMORY_PROPERTY_HOST_COHERENT_BIT;
        return CreateBufferForArray(device, physicalDevice, data, bufferUsageBits, memoryPropertyBits, scratch);
    }
    
    public static BufferInfo CreateIndexBufferForArray<T>(Vk.VkDevice device, Vk.VkPhysicalDevice physicalDevice, T[] data,
        MemUtils.Arena scratch) where T : unmanaged
    {
        
        var bufferUsageBits = Vk.VkBufferUsageFlagBits.VK_BUFFER_USAGE_INDEX_BUFFER_BIT;
        var memoryPropertyBits = Vk.VkMemoryPropertyFlagBits.VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT |
                                 Vk.VkMemoryPropertyFlagBits.VK_MEMORY_PROPERTY_HOST_COHERENT_BIT;
        return CreateBufferForArray(device, physicalDevice, data, bufferUsageBits, memoryPropertyBits, scratch);
    }
    
    public static uint FindSuitableMemoryTypeIndex(Vk.VkPhysicalDevice physicalDevice, uint typeFilter, Vk.VkMemoryPropertyFlagBits properties, MemUtils.Arena scratch)
    {
        var memProperties = scratch.Alloc<Vk.VkPhysicalDeviceMemoryProperties>();
        Vk.vkGetPhysicalDeviceMemoryProperties(physicalDevice, memProperties);
        Console.WriteLine("Searching for suitable Memory Type Index...");
        for(uint i = 0; i < memProperties->memoryTypeCount; i++)
        {
            var memoryType = memProperties->GetMemoryType((int)i);
            Console.WriteLine($"   Memory Type {i}: HeapIndex: 0x{memoryType.heapIndex:X}, PropertyFlags: 0x{memoryType.propertyFlags:X}");
            if((typeFilter & (1 << (int)i)) != 0 && (memoryType.propertyFlags & properties) == properties)
            {
                return i;
            }
        }
        throw new Exception("Failed to find suitable memory type.");
    }
    
    private static void LoadDataToBufferUnsafe(Vk.VkDevice device, BufferInfo bufferInfo, void* data, Vk.VkDeviceSize size)
    {
        void* mappedData = null;
        if(Vk.vkMapMemory(device, bufferInfo.Memory, new Vk.VkDeviceSize(0), size, 0, &mappedData) != Vk.VkResult.VK_SUCCESS)
        {
            throw new Exception("Failed to map buffer memory.");
        }
        Buffer.MemoryCopy(data, mappedData, bufferInfo.Size, size.size);
        Vk.vkUnmapMemory(device, bufferInfo.Memory);
    }
    
    public static void LoadDataToBuffer<T>(Vk.VkDevice device, BufferInfo bufferInfo, T[] data) where T : unmanaged
    {
        var size = new Vk.VkDeviceSize((ulong)(data.Length * sizeof(T)));
        if(size.size > bufferInfo.Size)
        {
            throw new Exception("Data size exceeds buffer size.");
        }
        unsafe
        {
            fixed(T* dataPtr = &data[0])
            {
                LoadDataToBufferUnsafe(device, bufferInfo, dataPtr, size);
            }
        }
    }
    
    public static void DestroyBuffer(Vk.VkDevice device, BufferInfo bufferInfo)
    {
        Vk.vkDestroyBuffer(device, bufferInfo.Buffer, null);
        Vk.vkFreeMemory(device, bufferInfo.Memory, null);
    }
    
    public static Vk.VkSemaphore CreateSemaphore(Vk.VkDevice device, MemUtils.Arena scratch)
    {
        var semaphoreCreateInfo = scratch.Alloc<Vk.VkSemaphoreCreateInfo>();
        semaphoreCreateInfo->sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO;
        semaphoreCreateInfo->pNext = IntPtr.Zero;
        semaphoreCreateInfo->flags = 0;
        var semaphore = scratch.Alloc<Vk.VkSemaphore>();
        if(Vk.vkCreateSemaphore(device, semaphoreCreateInfo, null, semaphore) != Vk.VkResult.VK_SUCCESS)
        {
            throw new Exception("Failed to create semaphore.");
        }
        Console.WriteLine($"Created Semaphore with handle: 0x{semaphore->handle:X}");
        return new Vk.VkSemaphore { handle = semaphore->handle };
    }
    
    public static Vk.VkSemaphore[] CreateSemaphores(Vk.VkDevice device, int count, MemUtils.Arena scratch)
    {
        var semaphores = new Vk.VkSemaphore[count];
        for(var i = 0; i < count; i++)
        {
            semaphores[i] = CreateSemaphore(device, scratch);
        }
        return semaphores;
    }
    
    public static Vk.VkFence CreateFence(Vk.VkDevice device, bool signaled, MemUtils.Arena scratch)
    {
        var fenceCreateInfo = scratch.Alloc<Vk.VkFenceCreateInfo>();
        fenceCreateInfo->sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_FENCE_CREATE_INFO;
        fenceCreateInfo->pNext = IntPtr.Zero;
        fenceCreateInfo->flags = signaled ? Vk.VkFenceCreateFlagBits.VK_FENCE_CREATE_SIGNALED_BIT : 0;
        var fence = scratch.Alloc<Vk.VkFence>();
        if(Vk.vkCreateFence(device, fenceCreateInfo, null, fence) != Vk.VkResult.VK_SUCCESS)
        {
            throw new Exception("Failed to create fence.");
        }
        Console.WriteLine($"Created Fence with handle: 0x{fence->handle:X}");
        return new Vk.VkFence { handle = fence->handle };
    }

    public static Vk.VkFence[] CreateFences(Vk.VkDevice device, int count, bool signaled, MemUtils.Arena scratch)
    {
        var fences = new Vk.VkFence[count];
        for(var i = 0; i < count; i++)
        {
            fences[i] = CreateFence(device, signaled, scratch);
        }
        return fences;
    }
    
    public static Vk.VkCommandPool CreateCommandPool(Vk.VkDevice device, uint queueFamilyIndex, MemUtils.Arena scratch)
    {
        var poolCreateInfo = scratch.Alloc<Vk.VkCommandPoolCreateInfo>();
        poolCreateInfo->sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO;
        poolCreateInfo->pNext = IntPtr.Zero;
        poolCreateInfo->flags = Vk.VkCommandPoolCreateFlagBits.VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT;
        poolCreateInfo->queueFamilyIndex = queueFamilyIndex;
        var commandPool = scratch.Alloc<Vk.VkCommandPool>();
        if(Vk.vkCreateCommandPool(device, poolCreateInfo, null, commandPool) != Vk.VkResult.VK_SUCCESS)
        {
            throw new Exception("Failed to create command pool.");
        }
        Console.WriteLine($"Created Command Pool with handle: 0x{commandPool->handle:X}");
        return new Vk.VkCommandPool { handle = commandPool->handle };
    }
    
    public static Vk.VkCommandBuffer CreateCommandBuffer(Vk.VkDevice device, Vk.VkCommandPool commandPool, MemUtils.Arena scratch)
    {
        var allocInfo = scratch.Alloc<Vk.VkCommandBufferAllocateInfo>();
        allocInfo->sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO;
        allocInfo->pNext = IntPtr.Zero;
        allocInfo->commandPool = commandPool;
        allocInfo->level = Vk.VkCommandBufferLevel.VK_COMMAND_BUFFER_LEVEL_PRIMARY;
        allocInfo->commandBufferCount = 1;
        var commandBuffer = scratch.Alloc<Vk.VkCommandBuffer>();
        if(Vk.vkAllocateCommandBuffers(device, allocInfo, commandBuffer) != Vk.VkResult.VK_SUCCESS)
        {
            throw new Exception("Failed to allocate command buffer.");
        }
        Console.WriteLine($"Allocated Command Buffer with handle: 0x{commandBuffer->handle:X}");
        return new Vk.VkCommandBuffer { handle = commandBuffer->handle };
    }
    
    public static Vk.VkCommandBuffer[] CreateCommandBuffers(Vk.VkDevice device, Vk.VkCommandPool commandPool, int count, MemUtils.Arena scratch)
    {
        var allocInfo = scratch.Alloc<Vk.VkCommandBufferAllocateInfo>(count);
        allocInfo->sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO;
        allocInfo->pNext = IntPtr.Zero;
        allocInfo->commandPool = commandPool;
        allocInfo->level = Vk.VkCommandBufferLevel.VK_COMMAND_BUFFER_LEVEL_PRIMARY;
        allocInfo->commandBufferCount = (uint)count;
        var commandBuffers = scratch.Alloc<Vk.VkCommandBuffer>(count);
        if(Vk.vkAllocateCommandBuffers(device, allocInfo, commandBuffers) != Vk.VkResult.VK_SUCCESS)
        {
            throw new Exception("Failed to allocate command buffer.");
        }
        var commandBuffersManaged = new Vk.VkCommandBuffer[count];
        for(var i = 0; i < count; i++)
        {
            commandBuffersManaged[i] = new Vk.VkCommandBuffer { handle = commandBuffers[i].handle };
        }
        Console.WriteLine($"Allocated Command Buffers with handles from 0x{commandBuffersManaged[0].handle:X} to 0x{commandBuffersManaged[^1].handle:X}");
        return commandBuffersManaged;
    }
    
    public static Vk.VkShaderModule CreateShaderModule(Vk.VkDevice device, uint[] spirvCode, MemUtils.Arena scratch)
    {
        var createInfo = scratch.Alloc<Vk.VkShaderModuleCreateInfo>();
        createInfo->sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO;
        createInfo->pNext = IntPtr.Zero;
        createInfo->flags = 0;
        createInfo->codeSize = (UIntPtr)(spirvCode.Length * sizeof(uint));
        fixed(uint* codePtr = &spirvCode[0])
        {
            createInfo->pCode = codePtr;
            var shaderModule = scratch.Alloc<Vk.VkShaderModule>();
            if(Vk.vkCreateShaderModule(device, createInfo, null, shaderModule) != Vk.VkResult.VK_SUCCESS)
            {
                throw new Exception("Failed to create shader module.");
            }
            Console.WriteLine($"Created Shader Module with handle: 0x{shaderModule->handle:X}");
            return new Vk.VkShaderModule { handle = shaderModule->handle };
        }
    }
    
    public static void DestroyShaderModule(Vk.VkDevice device, Vk.VkShaderModule shaderModule)
    {
        Vk.vkDestroyShaderModule(device, shaderModule, null);
    }

    public static Vk.VkPipeline CreatePipeline(Vk.VkDevice device, Vk.VkShaderModule vertexShader,
        Vk.VkShaderModule fragmentShader, Vk.VkFormat[] colourAttachmentFormats, MemUtils.Arena scratch)
    {
        // Pipeline Layout
        var pipelineCreateInfo = scratch.Alloc<Vk.VkPipelineLayoutCreateInfo>();
        pipelineCreateInfo->sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO;
        pipelineCreateInfo->pNext = IntPtr.Zero;
        pipelineCreateInfo->flags = 0;
        pipelineCreateInfo->setLayoutCount = 0;
        pipelineCreateInfo->pSetLayouts = null;
        pipelineCreateInfo->pushConstantRangeCount = 0;
        pipelineCreateInfo->pPushConstantRanges = null;
        var pipelineLayout = scratch.Alloc<Vk.VkPipelineLayout>();
        if(Vk.vkCreatePipelineLayout(device, pipelineCreateInfo, null, pipelineLayout) != Vk.VkResult.VK_SUCCESS)
        {
            throw new Exception("Failed to create pipeline layout.");
        }
        Console.WriteLine($"Created Pipeline Layout with handle: 0x{pipelineLayout->handle:X}");
        // Shader Stages
        var shaderStages = scratch.Alloc<Vk.VkPipelineShaderStageCreateInfo>(2);
        // Vertex Shader Stage
        shaderStages[0].sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO;
        shaderStages[0].pNext = IntPtr.Zero;
        shaderStages[0].flags = 0;
        shaderStages[0].stage = Vk.VkShaderStageFlagBits.VK_SHADER_STAGE_VERTEX_BIT;
        shaderStages[0].module = vertexShader;
        shaderStages[0].pName = scratch.AllocANSIString("main");
        shaderStages[0].pSpecializationInfo = null;
        // Fragment Shader Stage
        shaderStages[1].sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO;
        shaderStages[1].pNext = IntPtr.Zero;
        shaderStages[1].flags = 0;
        shaderStages[1].stage = Vk.VkShaderStageFlagBits.VK_SHADER_STAGE_FRAGMENT_BIT;
        shaderStages[1].module = fragmentShader;
        shaderStages[1].pName = scratch.AllocANSIString("main");
        shaderStages[1].pSpecializationInfo = null;
        // Vertex Input State
        var vertexBindingDescription = scratch.Alloc<Vk.VkVertexInputBindingDescription>();
        vertexBindingDescription->binding = 0;
        vertexBindingDescription->stride = (uint)Marshal.SizeOf<Vertex>();
        vertexBindingDescription->inputRate = Vk.VkVertexInputRate.VK_VERTEX_INPUT_RATE_VERTEX;
        var vertexAttributeDescriptions = scratch.Alloc<Vk.VkVertexInputAttributeDescription>(2);
        vertexAttributeDescriptions[0].location = 0;
        vertexAttributeDescriptions[0].binding = 0;
        vertexAttributeDescriptions[0].format = Vk.VkFormat.VK_FORMAT_R32G32_SFLOAT; // To be set based on vertex structure
        vertexAttributeDescriptions[0].offset = (uint)Marshal.OffsetOf<Vertex>("Position").ToInt32(); // To be set based on vertex structure
        vertexAttributeDescriptions[1].location = 1;
        vertexAttributeDescriptions[1].binding = 0;
        vertexAttributeDescriptions[1].format = Vk.VkFormat.VK_FORMAT_R32G32B32_SFLOAT; // To be set based on vertex structure
        vertexAttributeDescriptions[1].offset = (uint)Marshal.OffsetOf<Vertex>("Color").ToInt32(); // To be set based on vertex structure
        var vertexInputInfo = scratch.Alloc<Vk.VkPipelineVertexInputStateCreateInfo>();
        vertexInputInfo->sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_VERTEX_INPUT_STATE_CREATE_INFO;
        vertexInputInfo->pNext = IntPtr.Zero;
        vertexInputInfo->flags = 0;
        vertexInputInfo->vertexBindingDescriptionCount = 1;
        vertexInputInfo->pVertexBindingDescriptions = vertexBindingDescription;
        vertexInputInfo->vertexAttributeDescriptionCount = 2;
        vertexInputInfo->pVertexAttributeDescriptions = vertexAttributeDescriptions;
        // Input Assembly State
        var inputAssembly = scratch.Alloc<Vk.VkPipelineInputAssemblyStateCreateInfo>();
        inputAssembly->sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_INPUT_ASSEMBLY_STATE_CREATE_INFO;
        inputAssembly->pNext = IntPtr.Zero;
        inputAssembly->flags = 0;
        inputAssembly->topology = Vk.VkPrimitiveTopology.VK_PRIMITIVE_TOPOLOGY_TRIANGLE_LIST;
        inputAssembly->primitiveRestartEnable = Vk.VkBool32.VK_FALSE;
        // Viewport and Scissor
        var viewportState = scratch.Alloc<Vk.VkPipelineViewportStateCreateInfo>();
        viewportState->sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_VIEWPORT_STATE_CREATE_INFO;
        viewportState->pNext = IntPtr.Zero;
        viewportState->flags = 0;
        viewportState->viewportCount = 1;
        viewportState->pViewports = null; // We use dynimic viewport state
        viewportState->scissorCount = 1;
        viewportState->pScissors = null; // We use dynimic scissors state
        // Rasterization State
        var rasterizationState = scratch.Alloc<Vk.VkPipelineRasterizationStateCreateInfo>();
        rasterizationState->sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_RASTERIZATION_STATE_CREATE_INFO;
        rasterizationState->pNext = IntPtr.Zero;
        rasterizationState->flags = 0;
        rasterizationState->depthClampEnable = Vk.VkBool32.VK_FALSE;
        rasterizationState->rasterizerDiscardEnable = Vk.VkBool32.VK_FALSE;
        rasterizationState->polygonMode = Vk.VkPolygonMode.VK_POLYGON_MODE_FILL;
        rasterizationState->cullMode = Vk.VkCullModeFlagBits.VK_CULL_MODE_BACK_BIT;
        rasterizationState->frontFace = Vk.VkFrontFace.VK_FRONT_FACE_CLOCKWISE;
        rasterizationState->depthBiasEnable = Vk.VkBool32.VK_FALSE;
        rasterizationState->depthBiasConstantFactor = 0.0f;
        rasterizationState->depthBiasClamp = 0.0f;
        rasterizationState->depthBiasSlopeFactor = 0.0f;
        rasterizationState->lineWidth = 1.0f;
        // Multisample State
        var multisampleState = scratch.Alloc<Vk.VkPipelineMultisampleStateCreateInfo>();
        multisampleState->sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_MULTISAMPLE_STATE_CREATE_INFO;
        multisampleState->pNext = IntPtr.Zero;
        multisampleState->flags = 0;
        multisampleState->rasterizationSamples = Vk.VkSampleCountFlagBits.VK_SAMPLE_COUNT_1_BIT;
        multisampleState->sampleShadingEnable = Vk.VkBool32.VK_FALSE;
        multisampleState->minSampleShading = 1.0f;
        multisampleState->pSampleMask = null;
        multisampleState->alphaToCoverageEnable = Vk.VkBool32.VK_FALSE;
        multisampleState->alphaToOneEnable = Vk.VkBool32.VK_FALSE;
        // Color Blend State
        var colorBlendAttachment = scratch.Alloc<Vk.VkPipelineColorBlendAttachmentState>();
        colorBlendAttachment->blendEnable = Vk.VkBool32.VK_FALSE;
        colorBlendAttachment->srcColorBlendFactor = Vk.VkBlendFactor.VK_BLEND_FACTOR_ONE;
        colorBlendAttachment->dstColorBlendFactor = Vk.VkBlendFactor.VK_BLEND_FACTOR_ZERO;
        colorBlendAttachment->colorBlendOp = Vk.VkBlendOp.VK_BLEND_OP_ADD;
        colorBlendAttachment->srcAlphaBlendFactor = Vk.VkBlendFactor.VK_BLEND_FACTOR_ONE;
        colorBlendAttachment->dstAlphaBlendFactor = Vk.VkBlendFactor.VK_BLEND_FACTOR_ZERO;
        colorBlendAttachment->alphaBlendOp = Vk.VkBlendOp.VK_BLEND_OP_ADD;
        colorBlendAttachment->colorWriteMask = Vk.VkColorComponentFlagBits.VK_COLOR_COMPONENT_R_BIT |
                                              Vk.VkColorComponentFlagBits.VK_COLOR_COMPONENT_G_BIT |
                                              Vk.VkColorComponentFlagBits.VK_COLOR_COMPONENT_B_BIT |
                                              Vk.VkColorComponentFlagBits.VK_COLOR_COMPONENT_A_BIT;
        var colorBlendState = scratch.Alloc<Vk.VkPipelineColorBlendStateCreateInfo>();
        colorBlendState->sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_COLOR_BLEND_STATE_CREATE_INFO;
        colorBlendState->pNext = IntPtr.Zero;
        colorBlendState->flags = 0;
        colorBlendState->logicOpEnable = Vk.VkBool32.VK_FALSE;
        colorBlendState->logicOp = Vk.VkLogicOp.VK_LOGIC_OP_COPY;
        colorBlendState->attachmentCount = 1;
        colorBlendState->pAttachments = colorBlendAttachment;
        colorBlendState->blendConstants0 = 0.0f;
        colorBlendState->blendConstants1 = 0.0f;
        colorBlendState->blendConstants2 = 0.0f;
        colorBlendState->blendConstants3 = 0.0f;
        // Dynamic State
        Vk.VkDynamicState[] dynamicStatesToEnable = { 
            Vk.VkDynamicState.VK_DYNAMIC_STATE_VIEWPORT, 
            Vk.VkDynamicState.VK_DYNAMIC_STATE_SCISSOR,
            Vk.VkDynamicState.VK_DYNAMIC_STATE_CULL_MODE,
            Vk.VkDynamicState.VK_DYNAMIC_STATE_FRONT_FACE,
            Vk.VkDynamicState.VK_DYNAMIC_STATE_PRIMITIVE_TOPOLOGY,
        };
        var dynamicStates = scratch.Alloc<Vk.VkDynamicState>(dynamicStatesToEnable.Length);
        for(var i = 0; i < dynamicStatesToEnable.Length; i++)
        {
            dynamicStates[i] = dynamicStatesToEnable[i];
        }
        var dynamicState = scratch.Alloc<Vk.VkPipelineDynamicStateCreateInfo>();
        dynamicState->sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_DYNAMIC_STATE_CREATE_INFO;
        dynamicState->pNext = IntPtr.Zero;
        dynamicState->flags = 0;
        dynamicState->dynamicStateCount = (uint) dynamicStatesToEnable.Length;
        dynamicState->pDynamicStates = dynamicStates;
        // Rendering Info
        var renderingCreateInfo = scratch.Alloc<Vk.VkPipelineRenderingCreateInfo>();
        renderingCreateInfo->sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_RENDERING_CREATE_INFO;
        renderingCreateInfo->pNext = IntPtr.Zero;
        renderingCreateInfo->viewMask = 0;
        renderingCreateInfo->colorAttachmentCount = (uint)colourAttachmentFormats.Length;
        var colorFormats = scratch.Alloc<Vk.VkFormat>(colourAttachmentFormats.Length);
        for(var i = 0; i < colourAttachmentFormats.Length; i++)
        {
            colorFormats[i] = colourAttachmentFormats[i];
        }
        renderingCreateInfo->pColorAttachmentFormats = colorFormats;
        renderingCreateInfo->depthAttachmentFormat = Vk.VkFormat.VK_FORMAT_UNDEFINED;
        renderingCreateInfo->stencilAttachmentFormat = Vk.VkFormat.VK_FORMAT_UNDEFINED;
        // Pipeline Create Info
        var pipelineCreateInfoMain = scratch.Alloc<Vk.VkGraphicsPipelineCreateInfo>();
        pipelineCreateInfoMain->sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_GRAPHICS_PIPELINE_CREATE_INFO;
        pipelineCreateInfoMain->pNext = (IntPtr)renderingCreateInfo;
        pipelineCreateInfoMain->flags = 0;
        pipelineCreateInfoMain->stageCount = 2;
        pipelineCreateInfoMain->pStages = shaderStages;
        pipelineCreateInfoMain->pVertexInputState = vertexInputInfo;
        pipelineCreateInfoMain->pInputAssemblyState = inputAssembly;
        pipelineCreateInfoMain->pTessellationState = null;
        pipelineCreateInfoMain->pViewportState = viewportState;
        pipelineCreateInfoMain->pRasterizationState = rasterizationState;
        pipelineCreateInfoMain->pMultisampleState = multisampleState;
        pipelineCreateInfoMain->pDepthStencilState = null;
        pipelineCreateInfoMain->pColorBlendState = colorBlendState;
        pipelineCreateInfoMain->pDynamicState = dynamicState;
        pipelineCreateInfoMain->layout = *pipelineLayout;
        pipelineCreateInfoMain->renderPass = new Vk.VkRenderPass { handle = 0 }; // Not used with dynamic rendering
        pipelineCreateInfoMain->subpass = 0;
        pipelineCreateInfoMain->basePipelineHandle = new Vk.VkPipeline { handle = 0 };
        pipelineCreateInfoMain->basePipelineIndex = -1;
        // Pileline Creation
        var pipeline = scratch.Alloc<Vk.VkPipeline>();
        if(Vk.vkCreateGraphicsPipelines(device, new Vk.VkPipelineCache { handle = 0 }, 1, pipelineCreateInfoMain, null, pipeline) != Vk.VkResult.VK_SUCCESS)
        {
            throw new Exception("Failed to create graphics pipeline.");
        }
        Console.WriteLine($"Created Graphics Pipeline with handle: 0x{pipeline->handle:X}");
        return new Vk.VkPipeline { handle = pipeline->handle };
        
    }
}