using System.Diagnostics.CodeAnalysis;
using System.Runtime.InteropServices;

namespace AgroRenderer;

// ----------------------------------------------------------------
// Vulkan Handles that are actually just typedefs to uint64_t

[SuppressMessage("ReSharper", "InconsistentNaming")]
public static partial class Vk
{
    private static PFN_vkCreateDebugUtilsMessengerEXT? _vkCreateDebugUtilsMessengerEXT;


    // ----------------------------------------------------------------
    // Non Vulkan Helper Functions

    // Return Type: VkResult (*PFN_vkCreateDebugUtilsMessengerEXT)(VkInstance instance, const VkDebugUtilsMessengerCreateInfoEXT* pCreateInfo, const VkAllocationCallbacks* pAllocator, VkDebugUtilsMessengerEXT* pMessenger)
    // In Delegaet Speak: delegate* unmanaged<VkInstance, IntPtr, IntPtr, IntPtr, VkResult>
    public static PFN_vkCreateDebugUtilsMessengerEXT? Get_vkCreateDebugUtilsMessengerEXT(VkInstance instance)
    {
        if (_vkCreateDebugUtilsMessengerEXT is null)
        {
            var name = Marshal.StringToHGlobalAnsi("vkCreateDebugUtilsMessengerEXT");
            var funcPtr = vkGetInstanceProcAddr(instance, name);
            Marshal.FreeHGlobal(name);
            if (funcPtr == IntPtr.Zero)
                Console.WriteLine("Failed to get function pointer for vkCreateDebugUtilsMessengerEXT");
            else
                _vkCreateDebugUtilsMessengerEXT =
                    Marshal.GetDelegateForFunctionPointer<PFN_vkCreateDebugUtilsMessengerEXT>(funcPtr);
        }

        return _vkCreateDebugUtilsMessengerEXT;
    }
}