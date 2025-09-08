using System.Runtime.InteropServices;

namespace AgroRenderer;

public class X11PlatformLayer : IPlatformLayer
{
    private X11Data data;
    
    public X11PlatformLayer()
    {
        data = new X11Data();
    }
    
    public void OpenWindow(string title, int width, int height)
    {
        unsafe
        {
            data.connection = XCB.xcb_connect(null, null);
            data.setup = XCB.xcb_get_setup(data.connection);
            var iter = XCB.xcb_setup_roots_iterator(data.setup);
            // Just select the first screen
            var screen = iter.data;
            Console.WriteLine($"Connected to X11 server. Screen {screen->root} size: {screen->width_in_pixels}x{screen->height_in_pixels}");
            data.window = XCB.xcb_generate_id(data.connection);
            XCB.xcb_create_window(
                c: data.connection,
                depth: XCB.XCB_COPY_FROM_PARENT,
                wid: data.window,
                parent: screen->root,
                x: 0,
                y: 0,
                width: (UInt16)width,
                height: (UInt16)height,
                border_width: 0,
                _class: (UInt16) XCB.xcb_window_class_t.XCB_WINDOW_CLASS_COPY_FROM_PARENT,
                visual: screen->root_visual,
                value_mask: 0,
                value_list: null // const void*
                );
            XCB.xcb_map_window(data.connection, data.window);
            XCB.xcb_flush(data.connection);
            Console.WriteLine("Window created and mapped.");
        }
    }

    public void CloseWindow()
    {
        unsafe
        {
            XCB.xcb_disconnect(data.connection);
        }
    }

    public Vk.VkSurfaceKHR CreateVulkanSurface(Vk.VkInstance instance, MemUtils.Arena scratch)
    {
        unsafe
        {
            var createInfo = scratch.Alloc<Vk.VkXcbSurfaceCreateInfoKHR>();
            createInfo->sType = Vk.VkStructureType.VK_STRUCTURE_TYPE_XCB_SURFACE_CREATE_INFO_KHR;
            createInfo->pNext = IntPtr.Zero;
            createInfo->flags = 0;
            createInfo->connection = (IntPtr)data.connection;
            createInfo->window = data.window;
            
            var surface = scratch.Alloc<Vk.VkSurfaceKHR>();
            var result = Vk.vkCreateXcbSurfaceKHR(instance, createInfo, null, surface);
            if (result != Vk.VkResult.VK_SUCCESS)
            {
                throw new Exception($"Failed to create Vulkan XCB surface: {result}");
            }
            var surfaceManaged = Marshal.PtrToStructure<Vk.VkSurfaceKHR>((IntPtr)surface);

            return surfaceManaged;
        }
    }
}

unsafe struct X11Data
{
    public XCB.xcb_connection_t* connection = null;
    public XCB.xcb_setup_t* setup = null;
    public UInt32 window = 0;

    public X11Data()
    {
    }
} 