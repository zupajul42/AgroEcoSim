using System.Runtime.InteropServices;

namespace AgroRenderer;

using xcb_keycode_t = Byte;
using xcb_window_t = UInt32;
using xcb_colormap_t = UInt32;
using xcb_visualid_t = UInt32;

public static unsafe class XCB
{
    // ----------------------------------------------------------------
    // XCB Definitions
    public const Int32 XCB_NONE = 0;
    public const Int32 XCB_COPY_FROM_PARENT = 0;
    public const Int32 XCB_CURRENT_TIME = 0;
    public const Int32 XCB_NO_SYMBOL = 0;
    
    // ----------------------------------------------------------------
    // PThreadStructures

    [StructLayout(LayoutKind.Sequential)]
    public struct pthread_mutex_t
    {
        fixed Byte __size[40];
    }
    
    // ----------------------------------------------------------------
    // XCB Enums

    public enum xcb_window_class_t : UInt16
    {
        XCB_WINDOW_CLASS_COPY_FROM_PARENT = 0,
        XCB_WINDOW_CLASS_INPUT_OUTPUT = 1,
        XCB_WINDOW_CLASS_INPUT_ONLY = 2
    }
    
    // ----------------------------------------------------------------
    // XCB Structures
    
    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_connection_t  {} // Apparently this is designed as an opaque struct

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_setup_t
    {
        public Byte status;
        public Byte pad0;
        public UInt16 protocol_major_version;
        public UInt16 protocol_minor_version;
        public UInt16 length;
        public UInt32 release_number;
        public UInt32 resource_id_base;
        public UInt32 resource_id_mask;
        public UInt32 motion_buffer_size;
        public UInt16 vendor_len;
        public UInt16 maximum_request_length;
        public Byte roots_len;
        public Byte pixmap_formats_len;
        public Byte image_byte_order;
        public Byte bitmap_format_bit_order;
        public Byte bitmap_format_scanline_unit;
        public Byte bitmap_format_scanline_pad;
        public xcb_keycode_t min_keycode;
        public xcb_keycode_t max_keycode;
        public fixed Byte pad1[4];
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_screen_iterator_t
    {
        public xcb_screen_t* data;
        public Int32 rem;
        public Int32 index;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_screen_t
    {
        public xcb_window_t root;
        public xcb_colormap_t default_colormap;
        public UInt32 white_pixel;
        public UInt32 black_pixel;
        public UInt32 current_input_masks;
        public UInt16 width_in_pixels;
        public UInt16 height_in_pixels;
        public UInt16 width_in_millimeters;
        public UInt16 height_in_millimeters;
        public UInt16 min_installed_maps;
        public UInt16 max_installed_maps;
        public xcb_visualid_t root_visual;
        public Byte backing_stores;
        public Byte save_unders;
        public Byte root_depth;
        public Byte allowed_depths_len;
    }
    
    // ----------------------------------------------------------------
    // XCB Function Imports
    
    [DllImport("libxcb")]
    public static extern xcb_connection_t* xcb_connect( 
        [MarshalAs(UnmanagedType.LPStr)] string displayname,
        Int32* screenp);

    [DllImport("libxcb")]
    public static extern void xcb_disconnect(xcb_connection_t* c);

    [DllImport("libxcb")]
    public static extern xcb_setup_t* xcb_get_setup(xcb_connection_t* c);

    [DllImport("libxcb")]
    public static extern xcb_screen_iterator_t xcb_setup_roots_iterator(xcb_setup_t* R);

    [DllImport("libxcb")]
    public static extern UInt32 xcb_generate_id(xcb_connection_t* c);
    
    [DllImport("libxcb")]
    public static extern Int32 xcb_flush(xcb_connection_t* c);
    
    [DllImport("libxcb")]
    public static extern void xcb_create_window (
        xcb_connection_t *c,
        Byte           depth,
        xcb_window_t      wid,
        xcb_window_t      parent,
        Int16           x,
        Int16           y,
        UInt16          width,
        UInt16          height,
        UInt16          border_width,
        UInt16          _class,
        xcb_visualid_t    visual,
        UInt32          value_mask,
        IntPtr* value_list // const void*
        );
    
    [DllImport("libxcb")]
    public static extern void xcb_map_window (
        xcb_connection_t *c,
        xcb_window_t      window
        );
    
    [DllImport("libxcb")]
    public static extern void xcb_screen_next (xcb_screen_iterator_t *i);
}