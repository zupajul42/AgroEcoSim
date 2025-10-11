namespace AgroRenderer;

public class X11PlatformLayer : IPlatformLayer
{
    private X11Data data;
    private MemUtils.Arena scratch;
    private unsafe XCB.xcb_intern_atom_reply_t* wm_delete_window_reply = null;

    public X11PlatformLayer()
    {
        data = new X11Data();
        scratch = new MemUtils.Arena(1024 * 512); // 512 KB scratch space
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
            Console.WriteLine(
                $"Connected to X11 server. Screen {screen->root} size: {screen->width_in_pixels}x{screen->height_in_pixels}");
            // Create the window
            data.window = XCB.xcb_generate_id(data.connection);
            var value_mask = XCB.xcb_cw_t.XCB_CW_BACK_PIXEL | XCB.xcb_cw_t.XCB_CW_EVENT_MASK;
            var value_list = scratch.Alloc<uint>(2);
            value_list[0] = screen->black_pixel;
            value_list[1] = (uint)(
                XCB.xcb_event_mask_t.XCB_EVENT_MASK_EXPOSURE |
                XCB.xcb_event_mask_t.XCB_EVENT_MASK_KEY_PRESS |
                XCB.xcb_event_mask_t.XCB_EVENT_MASK_KEY_RELEASE |
                XCB.xcb_event_mask_t.XCB_EVENT_MASK_STRUCTURE_NOTIFY |
                XCB.xcb_event_mask_t.XCB_EVENT_MASK_BUTTON_PRESS |
                XCB.xcb_event_mask_t.XCB_EVENT_MASK_BUTTON_RELEASE
            );
            XCB.xcb_create_window(
                data.connection,
                XCB.XCB_COPY_FROM_PARENT,
                data.window,
                screen->root,
                0,
                0,
                (ushort)width,
                (ushort)height,
                0,
                (ushort)XCB.xcb_window_class_t.XCB_WINDOW_CLASS_COPY_FROM_PARENT,
                screen->root_visual,
                (uint)value_mask,
                value_list
            );
            // Setup close event handling
            var wm_protocols_string = scratch.AllocANSIString("WM_PROTOCOLS");
            var wm_delete_window_string = scratch.AllocANSIString("WM_DELETE_WINDOW");
            var wm_protocols_atom =
                XCB.xcb_intern_atom(data.connection, 1, (ushort)"WM_PROTOCOLS".Length, wm_protocols_string);
            var wm_protocols_reply = XCB.xcb_intern_atom_reply(data.connection, wm_protocols_atom, null);
            var wm_delete_window_atom = XCB.xcb_intern_atom(data.connection, 0, (ushort)"WM_DELETE_WINDOW".Length,
                wm_delete_window_string);
            wm_delete_window_reply = XCB.xcb_intern_atom_reply(data.connection, wm_delete_window_atom, null);
            XCB.xcb_change_property(
                data.connection,
                (byte)XCB.xcb_prop_mode_t.XCB_PROP_MODE_REPLACE,
                data.window,
                wm_protocols_reply->atom,
                (uint)XCB.xcb_atom_enum_t.XCB_ATOM_ATOM, // XA_ATOM
                32,
                1,
                &wm_delete_window_reply->atom);
            XCB.free(wm_protocols_reply);
            // Show the window
            XCB.xcb_map_window(data.connection, data.window);
            XCB.xcb_flush(data.connection);
            Console.WriteLine("Window created and mapped.");
        }
    }

    public WindowEvent[] GetPendingEvents()
    {
        var events = new WindowEvent[IPlatformLayer.MAX_EVENTS_IN_QUEUE];
        Array.Fill(events, new WindowEvent { Type = WindowEventType.None });
        var eventCount = 0;
        unsafe
        {
            var genericEvent = XCB.xcb_poll_for_event(data.connection);
            while (genericEvent != null)
            {
                if (eventCount > IPlatformLayer.MAX_EVENTS_IN_QUEUE)
                {
                    Console.WriteLine("Error: Received more events than the maximum queue size.");
                    break;
                }

                var eventType = (XCB.EventOpCodes)(genericEvent->response_type & ~0x80); // Mask out the highest bit
                switch (eventType)
                {
                    case XCB.EventOpCodes.XCB_EXPOSE:
                        var exposeEvent = (XCB.xcb_expose_event_t*)genericEvent;
                        events[eventCount].Type = WindowEventType.RedrawRegion;
                        events[eventCount].RedrawRegionData.X = exposeEvent->x;
                        events[eventCount].RedrawRegionData.Y = exposeEvent->y;
                        events[eventCount].RedrawRegionData.Width = exposeEvent->width;
                        events[eventCount].RedrawRegionData.Height = exposeEvent->height;
                        break;
                    case XCB.EventOpCodes.XCB_KEY_PRESS:
                        events[eventCount].Type = WindowEventType.KeyPressed;
                        break;
                    case XCB.EventOpCodes.XCB_KEY_RELEASE:
                        events[eventCount].Type = WindowEventType.KeyReleased;
                        break;
                    case XCB.EventOpCodes.XCB_BUTTON_PRESS:
                        events[eventCount].Type = WindowEventType.MouseButtonPressed;
                        break;
                    case XCB.EventOpCodes.XCB_BUTTON_RELEASE:
                        events[eventCount].Type = WindowEventType.MouseButtonReleased;
                        break;
                    case XCB.EventOpCodes.XCB_CONFIGURE_NOTIFY:
                        var configureEvent = (XCB.xcb_configure_notify_event_t*)genericEvent;
                        if (configureEvent->width == 0 || configureEvent->height == 0)
                        {
                            events[eventCount].Type = WindowEventType.Minimized;
                        }
                        else
                        {
                            events[eventCount].Type = WindowEventType.Resized;
                            // Store width and height in Data
                            events[eventCount].ResizedData.Width = configureEvent->width;
                            events[eventCount].ResizedData.Height = configureEvent->height;
                        }

                        break;
                    case XCB.EventOpCodes.XCB_CLIENT_MESSAGE:
                        var clientMessageEvent = (XCB.xcb_client_message_event_t*)genericEvent;
                        if (clientMessageEvent->data.data32[0] == wm_delete_window_reply->atom)
                            events[eventCount].Type = WindowEventType.Close;
                        else
                            eventCount--; // Ignore unhandled client messages
                        break;
                    default:
                        eventCount--; // Ignore unhandled events
                        break;
                }

                eventCount++;
                XCB.free(genericEvent);
                genericEvent = XCB.xcb_poll_for_event(data.connection);
            }

            return events;
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
            Console.WriteLine($"Creating Surface at location: 0x{(ulong)surface:X}");
            var result = Vk.vkCreateXcbSurfaceKHR(instance, createInfo, null, surface);
            if (result != Vk.VkResult.VK_SUCCESS) throw new Exception($"Failed to create Vulkan XCB surface: {result}");
            Console.WriteLine($"Creaded Vulkan XCB surface: 0x{surface->handle:X}");
            var surfaceManaged = new Vk.VkSurfaceKHR();
            surfaceManaged.handle = surface->handle;

            return surfaceManaged;
        }
    }
}

internal unsafe struct X11Data
{
    public XCB.xcb_connection_t* connection = null;
    public XCB.xcb_setup_t* setup = null;
    public uint window = 0;

    public X11Data()
    {
    }
}