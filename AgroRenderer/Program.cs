// See https://aka.ms/new-console-template for more information

using Silk.NET.Windowing;
using Silk.NET.Vulkan;
using Silk.NET.Vulkan.Extensions.KHR;
using Silk.NET.Vulkan.Extensions.EXT;
using Silk.NET.Core.Native;
using System.Runtime.InteropServices;
using Silk.NET.Core;

class Utilities
{
    public static unsafe string[] ConvertCStrArrtoCsharp(IntPtr cStrArr, int size)
    {
        string[] result = new string[size];
        for (int i = 0; i < size; i++)
        {
            IntPtr strPtr = Marshal.ReadIntPtr(cStrArr, i * IntPtr.Size);
            result[i] = Marshal.PtrToStringAnsi(strPtr) ?? string.Empty;
        }
        return result;
    }    
}


struct Vec3F
{
    public float X = 0, Y = 0, Z = 0;
        
    public Vec3F(float x, float y, float z)
    {
        this.X = x;
        this.Y = y;
        this.Z = z;
    }
    
    public Vec3F() {}
    
}

struct Vec2F
{
    public float X = 0, Y = 0;
        
    public Vec2F(float x, float y)
    {
        this.X = x;
        this.Y = y;
    }
    
    public Vec2F() {}
}

struct Vertex
{
    public Vec3F Position = new Vec3F();
    public Vec3F Color = new Vec3F();
    public Vec2F TexCoord = new Vec2F();

    public Vertex(Vec3F position, Vec3F color, Vec2F texCoord)
    {
        this.Position = position;
        this.Color = color;
        this.TexCoord = texCoord;
    }

    public Vertex()
    {
    }
}

struct VkQueueFamilyInfo
{
    public int FamilyIdx = -1;
    public bool GraphicsSupport = false;
    public bool PresentSupport = false;
    
    public VkQueueFamilyInfo(int familyIdx, int queueIdx)
    {
        this.FamilyIdx = familyIdx;
    }
}

class Program
{
    public static void Main(string[] args)
    {
        Console.WriteLine("Starting Up the Vulkan Rendering Test!");

        var options = WindowOptions.DefaultVulkan;
        options.Title = "AgroRenderer Vulkan Test";
        IWindow window = Window.Create(options);

        Console.WriteLine("Initializing Vulkan...");
        unsafe
        {
            ExtDebugUtils debugUtils;

            const int MAX_FRAMES_IN_FLIGHT = 2;

            uint currentFrame = 0;
            bool isFramebufferResized = false;

            Instance vkInstance;
            DebugUtilsMessengerEXT vkDebugMessenger;
            
            SurfaceKHR vkSurface;
            // SwapChainData swapChainData;
          
            PhysicalDevice vkPhysicalDevice;
            Device vkDevice;
               
            Queue graphicsQueue;
            Queue presentQueue;
                       
            Framebuffer[] swapChainFramebuffers;

            CommandPool commandPool;      
            CommandBuffer[] commandBuffers;

            RenderPass renderPass;
            DescriptorSetLayout descriptorSetLayout;

            PipelineLayout pipelineLayout;
            Pipeline graphicsPipeline;

            Silk.NET.Vulkan.Semaphore[] imageAvailableSemaphores;
            Silk.NET.Vulkan.Semaphore[] renderFinishedSemaphores;
            Fence[] inFlightFences;

            // BufferData vertexBuffer;
            // BufferData indexBuffer;
            // BufferData[] uniformBuffers;

            // TextureData textureData;
            
            // DepthBufferData depthBuffer;
            
             DescriptorPool descriptorPool;
             DescriptorSet[] descriptorSets;

             string[] validationLayers = { "VK_LAYER_KHRONOS_validation" };
              
             string[] requiredExtensions = {};
             string[] instanceExtensions = { ExtDebugUtils.ExtensionName };
             string[] deviceExtensions = { KhrSwapchain.ExtensionName };
                
             Vertex[] vertices = new Vertex[]
             {
                    new Vertex(new (-0.5f, -0.5f, 0.0f), new (1.0f, 0.0f, 0.0f), new (1.0f, 0.0f)),
                    new Vertex(new (0.5f, -0.5f, 0.0f), new (0.0f, 1.0f, 0.0f), new (0.0f, 0.0f)),
                    new Vertex(new (0.5f, 0.5f, 0.0f), new (0.0f, 0.0f, 1.0f), new (0.0f, 1.0f)),
                    new Vertex(new (-0.5f, 0.5f, 0.0f), new (1.0f, 1.0f, 1.0f), new (1.0f, 1.0f)),

                    new Vertex(new (-0.5f, -0.5f, -0.5f), new (1.0f, 0.0f, 0.0f), new (1.0f, 0.0f)),
                    new Vertex(new (0.5f, -0.5f, -0.5f), new (0.0f, 1.0f, 0.0f), new (0.0f, 0.0f)),
                    new Vertex(new (0.5f, 0.5f, -0.5f), new (0.0f, 0.0f, 1.0f), new (0.0f, 1.0f)),
                    new Vertex(new (-0.5f, 0.5f, -0.5f), new (1.0f, 1.0f, 1.0f), new (1.0f, 1.0f))
             };

             ushort[] indices = new ushort[] 
             {
                    0, 1, 2, 2, 3, 0,
                    4, 5, 6, 6, 7, 4
             };
            
            // Initialize Vulkan
            Vk vk = Vk.GetApi();
            // Create the Vulkan instance
            ApplicationInfo appInfo = new()
            {
                SType = StructureType.ApplicationInfo,
                PApplicationName = (byte*)Marshal.StringToHGlobalAnsi("AgroRenderer Vulkan Test"),
                ApplicationVersion = new Version32(0, 1, 0),
                PEngineName = (byte*)Marshal.StringToHGlobalAnsi("AgroRenderer"),
                EngineVersion = new Version32(0, 1, 0),
                ApiVersion = Vk.Version12
            };
            // Prepare Validation Layer Info
            var validationLayerPtr = stackalloc byte*[validationLayers.Length];
            for (int i = 0; i < validationLayers.Length; i++)
            {
                validationLayerPtr[i] = (byte*)Marshal.StringToHGlobalAnsi(validationLayers[i]);
            }
            // Prepare Required Extensions
            if (window.VkSurface == null)
            {
                throw new NullReferenceException("window.VkSurface is null");
            }
            var reqExtArrPtr =  window.VkSurface.GetRequiredExtensions(out var reqExtArrSize);
            requiredExtensions = Utilities.ConvertCStrArrtoCsharp((IntPtr) reqExtArrPtr, (int) reqExtArrSize);
            var extensions = requiredExtensions.Concat(instanceExtensions).ToArray();
            var extensionsPtr = stackalloc byte*[extensions.Length];
            for (int i = 0; i < extensions.Length; i++)
            {
                extensionsPtr[i] = (byte*)Marshal.StringToHGlobalAnsi(extensions[i]);
            }
            InstanceCreateInfo instanceCreateInfo = new()
            {
                SType = StructureType.InstanceCreateInfo,
                PApplicationInfo = &appInfo,
                EnabledLayerCount = (uint)validationLayers.Length,
                PpEnabledLayerNames = validationLayerPtr,
                EnabledExtensionCount = (uint)extensions.Length,
                PpEnabledExtensionNames = extensionsPtr
            };
            Result res = vk.CreateInstance(in instanceCreateInfo, null, out vkInstance);
            if (res != Result.Success)
            {
                throw new Exception($"Failed to create Vulkan instance: {res}");
            }
            // Setup Vk Debug Messenger Callbacks
            if (!vk.TryGetInstanceExtension(vkInstance, out debugUtils, ExtDebugUtils.ExtensionName))
            {
                throw new Exception("Failed to get Vulkan debug utils extension");
            }

            PfnDebugUtilsMessengerCallbackEXT debugCallbackHandle = new PfnDebugUtilsMessengerCallbackEXT(DebugCallback);
            DebugUtilsMessengerCreateInfoEXT debugCreateInfo = new()
            {
                SType = StructureType.DebugUtilsMessengerCreateInfoExt,
                MessageSeverity = DebugUtilsMessageSeverityFlagsEXT.VerboseBitExt | DebugUtilsMessageSeverityFlagsEXT.WarningBitExt | DebugUtilsMessageSeverityFlagsEXT.ErrorBitExt,
                MessageType = DebugUtilsMessageTypeFlagsEXT.GeneralBitExt | DebugUtilsMessageTypeFlagsEXT.ValidationBitExt | DebugUtilsMessageTypeFlagsEXT.PerformanceBitExt,
                PfnUserCallback = debugCallbackHandle,
            };
            res = debugUtils.CreateDebugUtilsMessenger(vkInstance, in debugCreateInfo, null, out vkDebugMessenger);
            if (res != Result.Success)
            {
                throw new Exception($"Failed to create Vulkan debug utils messenger: {res}");
            }
            // Get A Surface
            var vkSurfaceHandle = window.VkSurface.Create<AllocationCallbacks>(vkInstance.ToHandle(), null);
            
            // Cleanup for our manually allocated strings
            Marshal.FreeHGlobal((IntPtr)appInfo.PApplicationName);
            Marshal.FreeHGlobal((IntPtr)appInfo.PEngineName);
            for (int i = 0; i < validationLayers.Length; i++)
            {
                Marshal.FreeHGlobal((IntPtr)validationLayerPtr[i]);
            }

            for (int i = 0; i < extensions.Length; i++)
            {
                Marshal.FreeHGlobal((IntPtr)extensionsPtr[i]);
            }
        }

        window.Run();


    }
    private static unsafe uint DebugCallback  (
        DebugUtilsMessageSeverityFlagsEXT messageSeverity,
        DebugUtilsMessageTypeFlagsEXT messageTypes,
        DebugUtilsMessengerCallbackDataEXT* pCallbackData,
        void* pUserData)
    {
        string message = Marshal.PtrToStringAnsi((IntPtr)pCallbackData->PMessage) ?? String.Empty;
        Console.WriteLine($"VK Debug Callback: {message}");
        return Vk.False;
    }
    
    private static unsafe VkQueueFamilyInfo[] GetQueueFamilyInfo(
        Vk vk, Instance vkInstance, PhysicalDevice vkPhysicalDevice, SurfaceKHR vkSurface)
    {
        uint queueFamilyCount = 0;
        vk.GetPhysicalDeviceQueueFamilyProperties(vkPhysicalDevice, &queueFamilyCount, null);
        if (queueFamilyCount == 0)
        {
            throw new Exception("No queue families found");
        }

        VkQueueFamilyInfo[] queueFamilies = new VkQueueFamilyInfo[queueFamilyCount];
        QueueFamilyProperties* queueFamiliesPtr = stackalloc QueueFamilyProperties[(int)queueFamilyCount];
        vk.GetPhysicalDeviceQueueFamilyProperties(vkPhysicalDevice, &queueFamilyCount, queueFamiliesPtr);

        for (uint i = 0; i < queueFamilyCount; i++)
        {
            queueFamilies[i].FamilyIdx = (int)i;
            queueFamilies[i].GraphicsSupport = (queueFamiliesPtr[i].QueueFlags & QueueFlags.GraphicsBit) != 0;

            KhrSurface khrSurface;
            if(!vk.TryGetInstanceExtension(vkInstance, out khrSurface, KhrSurface.ExtensionName))
            {
                throw new Exception("Failed to get Vulkan surface extension");
            }
            Bool32 presentSupport = false;
            var res = khrSurface.GetPhysicalDeviceSurfaceSupport(vkPhysicalDevice, i, vkSurface, out presentSupport);
            if (res != Result.Success)
            {
                throw new Exception($"Failed to get physical device surface support: {res}");
            }
            queueFamilies[i].PresentSupport = presentSupport;
        }

        return queueFamilies;
    }
    
    private static unsafe PhysicalDevice PickPhysicalDevice(
        Vk vk, Instance vkInstance, SurfaceKHR vkSurface)
    {
        uint deviceCount = 0;
        vk.EnumeratePhysicalDevices(vkInstance, &deviceCount, null);
        if (deviceCount == 0)
        {
            throw new Exception("No Vulkan physical devices found");
        }
        PhysicalDevice* devicesPtr = stackalloc PhysicalDevice[(int)deviceCount];
        vk.EnumeratePhysicalDevices(vkInstance, &deviceCount, devicesPtr);
        for (uint i = 0; i < deviceCount; i++)
        {
            var queueFamilies = GetQueueFamilyInfo(vk, vkInstance, devicesPtr[i], vkSurface);
            foreach (var queueFamily in queueFamilies)
            {
                if(queueFamily.GraphicsSupport && queueFamily.PresentSupport)
                {
                    var device = devicesPtr[i];
                    return device;
                }
            }
        }

        throw new Exception("No suitable physical Vulkan device found");
    }
    
    private static unsafe Device CreateLogicalDevice(
        Vk vk, Instance vkInstance, PhysicalDevice vkPhysicalDevice, SurfaceKHR vkSurface, string[] deviceExtensions)
    {
        var queueFamilies = GetQueueFamilyInfo(vk, vkInstance, vkPhysicalDevice, vkSurface);
        
        DeviceQueueCreateInfo[] queueCreateInfos = new DeviceQueueCreateInfo[queueFamilies.Length];
        for (int i = 0; i < queueFamilies.Length; i++)
        {
            if (!queueFamilies[i].GraphicsSupport && !queueFamilies[i].PresentSupport)
            {
                continue; // Skip families that don't support graphics or presentation
            }
            var queuePriority = stackalloc float[] { 1.0f };
            queueCreateInfos[i] = new DeviceQueueCreateInfo
            {
                SType = StructureType.DeviceQueueCreateInfo,
                QueueFamilyIndex = (uint)queueFamilies[i].FamilyIdx,
                QueueCount = 1,
                PQueuePriorities = queuePriority,
            };
        }
        IntPtr queueCreateInfosPtr = Marshal.AllocHGlobal(Marshal.SizeOf<DeviceQueueCreateInfo>() * queueCreateInfos.Length);
        var enabledExtensionsPtr = stackalloc byte*[deviceExtensions.Length];
        try
        {
            for (int i = 0; i < queueCreateInfos.Length; i++)
            {
                Marshal.StructureToPtr(queueCreateInfos[i], queueCreateInfosPtr + (i * Marshal.SizeOf<DeviceQueueCreateInfo>()), false);
            }
            PhysicalDeviceFeatures deviceFeatures = new PhysicalDeviceFeatures{};
            for (int i = 0; i < deviceExtensions.Length; i++)
            {
                enabledExtensionsPtr[i] = (byte*)Marshal.StringToHGlobalAnsi(deviceExtensions[i]);
            }
            DeviceCreateInfo deviceCreateInfo = new DeviceCreateInfo
            {
                SType = StructureType.DeviceCreateInfo,
                QueueCreateInfoCount = (uint)queueCreateInfos.Length,
                PQueueCreateInfos = (DeviceQueueCreateInfo*) queueCreateInfosPtr,
                PEnabledFeatures = &deviceFeatures,
                EnabledExtensionCount = (uint) deviceExtensions.Length,
                PpEnabledExtensionNames = enabledExtensionsPtr,
            };

            Result res = vk.CreateDevice(vkPhysicalDevice, in deviceCreateInfo, null, out Device vkDevice);
            if (res != Result.Success)
            {
                throw new Exception($"Failed to create Vulkan logical device: {res}");
            }
  
            return vkDevice;
        }
        finally
        {
            Marshal.FreeHGlobal(queueCreateInfosPtr);
            for(int i = 0; i < deviceExtensions.Length; i++)
            {
                Marshal.FreeHGlobal((IntPtr)enabledExtensionsPtr[i]);
            }

        }
    }
}
