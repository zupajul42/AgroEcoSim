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
            string message = Marshal.PtrToStringAnsi(callbackData.message) ?? "Unknown";
            Console.WriteLine($"[VULKAN DEBUG]: {message}");
            return Vk.VkBool32.VK_FALSE;
        }
        public static void Main(string[] args)
        {
            Console.WriteLine("Starting Up the Vulkan Rendering Test!");

            Console.WriteLine("Initializing Vulkan...");

            const bool enableVkDebug = true;
            
            List<string> validationLayers = ["VK_LAYER_KHRONOS_validation"];
            List<string> instanceLayers = [];
            List<string> instanceExtensions = [];

            if (enableVkDebug)
            {
                instanceLayers.AddRange(validationLayers);
                instanceExtensions.AddRange([Vk.VK_EXT_DEBUG_UTILS_EXTENSION_NAME]);
            }
            
            var applicationInfo = new VkSharp.ApplicationInfo
            {
                applicationName = "AgroEcoSim",
                applicationVersion = Vk.VkMakeVersion(1,0,0),
                engineName = "AgroRenderer",
                engineVersion = Vk.VkMakeVersion(1,0,0),
                apiVersion = Vk.VkMakeApiVersion(0, 1, 3 ,0)
            };
            var instanceCreateInfo = new VkSharp.InstanceCreateInfo
            {
                flags = 0,
                applicationInfo = applicationInfo,
                enabledLayerNames = instanceLayers.ToArray(),
                enabledExtensionNames = instanceExtensions.ToArray()
            };
            Vk.VkDebugUtilsMessengerCreateInfoEXT? debugCreateInfo = null;
            if (enableVkDebug)
            {
                debugCreateInfo = new Vk.VkDebugUtilsMessengerCreateInfoEXT
                {
                    messageSeverity = Vk.VkDebugUtilsMessageSeverityFlagBitsEXT.VK_DEBUG_UTILS_MESSAGE_SEVERITY_VERBOSE_BIT_EXT |
                                      Vk.VkDebugUtilsMessageSeverityFlagBitsEXT.VK_DEBUG_UTILS_MESSAGE_SEVERITY_WARNING_BIT_EXT |
                                      Vk.VkDebugUtilsMessageSeverityFlagBitsEXT.VK_DEBUG_UTILS_MESSAGE_SEVERITY_ERROR_BIT_EXT,
                    messageType = Vk.VkDebugUtilsMessageTypeFlagBitsEXT.VK_DEBUG_UTILS_MESSAGE_TYPE_GENERAL_BIT_EXT |
                                  Vk.VkDebugUtilsMessageTypeFlagBitsEXT.VK_DEBUG_UTILS_MESSAGE_TYPE_VALIDATION_BIT_EXT |
                                  Vk.VkDebugUtilsMessageTypeFlagBitsEXT.VK_DEBUG_UTILS_MESSAGE_TYPE_PERFORMANCE_BIT_EXT,
                    userCallback = VkDebugCallback,
                    userData = IntPtr.Zero
                };
            }
            var res = VkSharp.CreateInstance(ref instanceCreateInfo, out var instance, debugCreateInfo);
            if(res != Vk.VkResult.VK_SUCCESS)
            {
                Console.WriteLine("Failed to create Vulkan Instance with error: " + res);
                return;
            }
            MemUtils.Defer(VkSharp.DestroyInstance, instance);
            
            Console.WriteLine("Createed a Vulkan Instance with handle: " + instance.ptr);
            
            Console.WriteLine("Shutting Down the Vulkan Rendering Test!");













        }

    }

}