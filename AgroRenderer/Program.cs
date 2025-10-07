// See https://aka.ms/new-console-template for more information

using System.Runtime.InteropServices;

namespace AgroRenderer
{
    class Utilities
    {
        public static string[] ConvertCStrArrtoCsharp(IntPtr cStrArr, int size)
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

        public Vec3F()
        {
        }
    }

    struct Vec2F
    {
        public float X = 0, Y = 0;

        public Vec2F(float x, float y)
        {
            this.X = x;
            this.Y = y;
        }

        public Vec2F()
        {
        }
    }

    struct Vertex
    {
        public Vec2F Position = new Vec2F();
        public Vec3F Color = new Vec3F();

        public Vertex(Vec2F position, Vec3F color)
        {
            this.Position = position;
            this.Color = color;
        }

        public Vertex()
        {
        }
    }

    class Program
    {
        private static Vk.VkBool32 VkDebugCallback(
            Vk.VkDebugUtilsMessageSeverityFlagBitsEXT messageSeverity,
            Vk.VkDebugUtilsMessageTypeFlagBitsEXT messageTypes,
            IntPtr pCallbackData, // const VkDebugUtilsMessengerCallbackDataEXT*  
            IntPtr pUserData // void*
        )
        {
            var callbackData = Marshal.PtrToStructure<Vk.VkDebugUtilsMessengerCallbackDataEXT>(pCallbackData);
            string message = Marshal.PtrToStringAnsi(callbackData.pMessage) ?? "Unknown";
            Console.WriteLine($"[VULKAN DEBUG]: {message}");
            return Vk.VkBool32.VK_FALSE;
        }

        private static readonly Vertex[] Vertices = new Vertex[]
        {
            new Vertex(new Vec2F(0.0f, -0.5f), new Vec3F(1.0f, 0.0f, 0.0f)),
            new Vertex(new Vec2F(0.5f, 0.5f), new Vec3F(0.0f, 1.0f, 0.0f)),
            new Vertex(new Vec2F(-0.5f, 0.5f), new Vec3F(0.0f, 0.0f, 1.0f))
        };

        private static readonly UInt16[] Indices = new UInt16[]
        {
            0, 1, 2
        };
        
        public static void Main(string[] args)
        {
            Console.WriteLine("Starting Up the Vulkan Rendering Test!");
            var scratch = new MemUtils.Arena(1024 * 1024); // 1 MB scratch space
            var systemIsLinux = true;
            var windowManager = "X11";
            const int numFramesInFlight = 2;

            Console.WriteLine("Opening a Window...");
            IPlatformLayer platform = new X11PlatformLayer();
            platform.OpenWindow("AgroEcoSim Vulkan Test", 800, 600);
            
            Console.WriteLine("Compiling Shaders...");
            const string vertexShaderCode = """

                                                #version 450
                                                layout(location = 0) in vec2 inPos;
                                                layout(location = 1) in vec3 inColor;
                                                layout(location = 0) out vec3 outColor;
                                                void main() {
                                                    gl_Position = vec4(inPos, 0.0, 1.0);
                                                    outColor = inColor;
                                                }

                                            """;
            const string fragmentShaderCode = """

                                                  #version 450
                                                  layout(location = 0) in vec3 inColor;
                                                  layout(location = 0) out vec4 outFragColor;
                                                  void main() { outFragColor = vec4(inColor, 1.0); }

                                              """;
            var spirvCode = VkSharp.CompileShaders(vertexShaderCode, fragmentShaderCode, scratch);
            
            Console.WriteLine("Initializing Vulkan...");

            const bool enableVkDebug = true;

            List<string> validationLayers = ["VK_LAYER_KHRONOS_validation"];
            // The following layers are useful for debugging API errors, but are very noisy
            // validationLayers.Add("VK_LAYER_LUNARG_api_dump");
            List<string> instanceLayers = [];
            List<string> instanceExtensions = [];

            if (enableVkDebug)
            {
                instanceLayers.AddRange(validationLayers);
                instanceExtensions.AddRange([Vk.VK_EXT_DEBUG_UTILS_EXTENSION_NAME]);
            }

            if (systemIsLinux && windowManager == "X11")
            {
                instanceExtensions.AddRange(["VK_KHR_surface", "VK_KHR_xcb_surface"]);
            }
            else
            {
                throw new NotImplementedException("Only Linux with X11 is supported in this example.");
            }

            var applicationInfo = new VkSharp.ApplicationInfo
            {
                ApplicationName = "AgroEcoSim",
                ApplicationVersion = new VkSharp.Version(0, 1, 0, 0),
                EngineName = "AgroRenderer",
                EngineVersion = new VkSharp.Version(0, 1, 0, 0),
                ApiVersion = new VkSharp.Version(0, 1, 3, 0)
            };
            var instanceCreateInfo = new VkSharp.InstanceCreateInfo
            {
                Flags = 0,
                ApplicationInfo = applicationInfo,
                EnabledLayerNames = instanceLayers.ToArray(),
                EnabledExtensionNames = instanceExtensions.ToArray()
            };
            VkSharp.DebugMessengerCreateInfo? debugCreateInfo = null;
            if (enableVkDebug)
            {
                debugCreateInfo = new VkSharp.DebugMessengerCreateInfo
                {
                    PfnUserCallback = VkDebugCallback,
                };
            }

            var res = VkSharp.CreateInstance(ref instanceCreateInfo, out var instance, scratch, debugCreateInfo);
            if (res != Vk.VkResult.VK_SUCCESS)
            {
                Console.WriteLine("Failed to create Vulkan Instance with error: " + res);
                return;
            }

            Console.WriteLine($"Createed a Vulkan Instance with handle: 0x{instance.handle:X}");
            var surface = platform.CreateVulkanSurface(instance, scratch);
            Console.WriteLine($"Created a Vulkan Surface with handle: 0x{surface.handle:X}");
            //using (var _0 = MemUtils.Defer(VkSharp.DestroySurfaceKHR, instance, surface)) ;
            var (physicalDevice, queuesToRequest) = VkSharp.FindSuitablePhysicalDevice(instance, surface, scratch);
            var (logicalDevice, queueDetails) = VkSharp.CreateLogicalDevice(physicalDevice, queuesToRequest, scratch);
            var (swapchain, swapchainImages, imageFormat, imageExtent)
                = VkSharp.CreateSwapchain(logicalDevice, physicalDevice, surface, queueDetails, scratch);
            var imageViews = VkSharp.CreateSwapchainImageViews(logicalDevice, swapchainImages, imageFormat, scratch);
            var vertexShaderModule = VkSharp.CreateShaderModule(logicalDevice, spirvCode.Vertex, scratch);
            var fragmentShaderModule = VkSharp.CreateShaderModule(logicalDevice, spirvCode.Fragment, scratch);
            var vertexBuffer =
                VkSharp.CreateVertexBufferForArray(logicalDevice, physicalDevice, Vertices, scratch);
            var indexBuffer =
                VkSharp.CreateIndexBufferForArray(logicalDevice, physicalDevice, Indices, scratch);
            Console.WriteLine($"Created vertex and index buffers with handles: 0x{vertexBuffer.Buffer.handle:X}, 0x{indexBuffer.Buffer.handle:X}");
            VkSharp.LoadDataToBuffer(logicalDevice, vertexBuffer, Vertices);
            VkSharp.LoadDataToBuffer(logicalDevice, indexBuffer, Indices);
            var imageAvailableSemaphores = VkSharp.CreateSemaphores(logicalDevice, numFramesInFlight, scratch);
            var renderFinishedSemaphores = VkSharp.CreateSemaphores(logicalDevice, numFramesInFlight, scratch);
            var inFlightFences = VkSharp.CreateFences(logicalDevice, numFramesInFlight, true, scratch);
            var commandPool = VkSharp.CreateCommandPool(logicalDevice, (uint)queueDetails.GraphicsQueueFamilyIndex, scratch);
            var commandBuffers = VkSharp.CreateCommandBuffers(logicalDevice, commandPool, numFramesInFlight, scratch);
            
            //using var _ = MemUtils.Defer(VkSharp.DestroyInstance, instance);

            Console.WriteLine("Shutting Down the Vulkan Rendering Test!");
            platform.CloseWindow();
        }
    }
}