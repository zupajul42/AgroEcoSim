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
        public Vk.VkDebugUtilsMessageSeverityFlagBitsEXT MessageSeverity = 0;
        public Vk.VkDebugUtilsMessageTypeFlagBitsEXT MessageType = 0;
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
        public Vk.VkPhysicalDeviceProperties[] Properties;
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
        public int GraphicsQueueIndex;
        public Vk.VkQueue GraphicsQueue;
        public int PresentQueueIndex;
        public Vk.VkQueue PresentQueue;
    }

    public struct LogicalDeviceWithQueues
    {
        public Vk.VkDevice Device;
        public int GraphicsQueueIndex;
        public Vk.VkQueue GraphicsQueue;
        public int PresentQueueIndex;
        public Vk.VkQueue PresentQueue;

        public void Deconstruct(out Vk.VkDevice device, out QueueDetails queueDetails)
        {
            device = Device;
            queueDetails = new QueueDetails
            {
                GraphicsQueueIndex = GraphicsQueueIndex,
                GraphicsQueue = GraphicsQueue,
                PresentQueueIndex = PresentQueueIndex,
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

        var properties = scratch.Alloc<Vk.VkPhysicalDeviceProperties>((int)deviceCount);
        Console.WriteLine("Fonud the following Physical Devices:");
        for (var i = 0; i < deviceCount; i++)
        {
            Vk.vkGetPhysicalDeviceProperties(devices[i], &properties[i]);
            string deviceName = Marshal.PtrToStringAnsi((IntPtr)(&properties[i])->deviceName) ?? "Unknown";
            Console.WriteLine(
                $"   Physical Device {i}: {deviceName}, Type: {(&properties[i])->deviceType}, API Version: {ApiVersionToStr((&properties[i])->apiVersion)}");
        }

        var devicesStruct = new PhysicalDevices
        {
            Devices = new Vk.VkPhysicalDevice[deviceCount],
            Properties = new Vk.VkPhysicalDeviceProperties[deviceCount]
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
                physicalDevices.Properties[i].deviceType ==
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

        // Prepare Device Create Info
        var deviceCreateInfo = scratch.Alloc<Vk.VkDeviceCreateInfo>();
        deviceCreateInfo->sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO;
        deviceCreateInfo->pNext = IntPtr.Zero;
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
            GraphicsQueueIndex = queuesToRequest.Graphics ?? -1,
            PresentQueueIndex = queuesToRequest.Present ?? -1
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
        if (queueDetails.GraphicsQueueIndex != queueDetails.PresentQueueIndex)
        {
            swapchainCreateInfo->imageSharingMode = Vk.VkSharingMode.VK_SHARING_MODE_CONCURRENT;
            swapchainCreateInfo->queueFamilyIndexCount = 2;
            var queueFamilyIndices = scratch.Alloc<uint>(2);
            queueFamilyIndices[0] = (uint)queueDetails.GraphicsQueueIndex;
            queueFamilyIndices[1] = (uint)queueDetails.PresentQueueIndex;
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
}