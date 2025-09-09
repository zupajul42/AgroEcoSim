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
        public static void Main(string[] args)
        {
            Console.WriteLine("Starting Up the Vulkan Rendering Test!");
            var scratch = new MemUtils.Arena(1024 * 1024); // 1 MB scratch space
            var system_is_linux = true;
            var window_manager = "X11";
            
            Console.WriteLine("Opening a Window...");
            IPlatformLayer platform = new X11PlatformLayer();
            platform.OpenWindow("AgroEcoSim Vulkan Test", 800, 600);

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
            if (system_is_linux && window_manager == "X11")
            {
                instanceExtensions.AddRange(["VK_KHR_surface", "VK_KHR_xcb_surface"]);
            }
            else
            {
                throw new NotImplementedException("Only Linux with X11 is supported in this example.");
            }
            
            var applicationInfo = new VkSharp.ApplicationInfo
            {
                applicationName = "AgroEcoSim",
                applicationVersion = Vk.VK_MAKE_VERSION(1,0,0),
                engineName = "AgroRenderer",
                engineVersion = Vk.VK_MAKE_VERSION(1,0,0),
                apiVersion = Vk.VK_MAKE_API_VERSION(0, 1, 3 ,0)
            };
            var instanceCreateInfo = new VkSharp.InstanceCreateInfo
            {
                flags = 0,
                applicationInfo = applicationInfo,
                enabledLayerNames = instanceLayers.ToArray(),
                enabledExtensionNames = instanceExtensions.ToArray()
            };
            unsafe
            {
                Vk.VkDebugUtilsMessengerCreateInfoEXT? debugCreateInfo = null;
                if (enableVkDebug)
                {
                    debugCreateInfo = new Vk.VkDebugUtilsMessengerCreateInfoEXT
                    {
                        messageSeverity = Vk.VkDebugUtilsMessageSeverityFlagBitsEXT
                                              .VK_DEBUG_UTILS_MESSAGE_SEVERITY_VERBOSE_BIT_EXT |
                                          Vk.VkDebugUtilsMessageSeverityFlagBitsEXT
                                              .VK_DEBUG_UTILS_MESSAGE_SEVERITY_WARNING_BIT_EXT |
                                          Vk.VkDebugUtilsMessageSeverityFlagBitsEXT
                                              .VK_DEBUG_UTILS_MESSAGE_SEVERITY_ERROR_BIT_EXT,
                        messageType =
                            Vk.VkDebugUtilsMessageTypeFlagBitsEXT.VK_DEBUG_UTILS_MESSAGE_TYPE_GENERAL_BIT_EXT |
                            Vk.VkDebugUtilsMessageTypeFlagBitsEXT.VK_DEBUG_UTILS_MESSAGE_TYPE_VALIDATION_BIT_EXT |
                            Vk.VkDebugUtilsMessageTypeFlagBitsEXT.VK_DEBUG_UTILS_MESSAGE_TYPE_PERFORMANCE_BIT_EXT,
                        pfnUserCallback = &VkDebugCallback,
                        pUserData = IntPtr.Zero
                    };
                }

                var res = VkSharp.CreateInstance(ref instanceCreateInfo, out var instance, scratch, debugCreateInfo);
                if (res != Vk.VkResult.VK_SUCCESS)
                {
                    Console.WriteLine("Failed to create Vulkan Instance with error: " + res);
                    return;
                }
                Console.WriteLine($"Createed a Vulkan Instance with handle: 0x{instance.ptr:X}");
                var surface = platform.CreateVulkanSurface(instance, scratch);
                Console.WriteLine($"Created a Vulkan Surface with handle: 0x{surface.handle:X}");
                //using (var _0 = MemUtils.Defer(VkSharp.DestroySurfaceKHR, instance, surface)) ;
                var physicalDevice = VkSharp.FindSuitablePhysicalDevice(instance, surface, scratch);
                

                //using var _ = MemUtils.Defer(VkSharp.DestroyInstance, instance);

            }

            Console.WriteLine("Shutting Down the Vulkan Rendering Test!");
            platform.CloseWindow();
        }
    }
}