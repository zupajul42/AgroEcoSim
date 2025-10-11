using System.Runtime.InteropServices;

namespace AgroRenderer;

using xcb_keycode_t = byte;
using xcb_window_t = uint;
using xcb_colormap_t = uint;
using xcb_visualid_t = uint;
using xcb_timestamp_t = uint;
using xcb_drawable_t = uint;
using xcb_atom_t = uint;

public static unsafe class XCB
{
    public enum EventOpCodes : uint
    {
        XCB_KEY_PRESS = 2,
        XCB_KEY_RELEASE = 3,
        XCB_BUTTON_PRESS = 4,
        XCB_BUTTON_RELEASE = 5,
        XCB_MOTION_NOTIFY = 6,
        XCB_ENTER_NOTIFY = 7,
        XCB_LEAVE_NOTIFY = 8,
        XCB_FOCUS_IN = 9,
        XCB_FOCUS_OUT = 10,
        XCB_KEYMAP_NOTIFY = 11,
        XCB_EXPOSE = 12,
        XCB_GRAPHICS_EXPOSURE = 13,
        XCB_NO_EXPOSURE = 14,
        XCB_VISIBILITY_NOTIFY = 15,
        XCB_CREATE_NOTIFY = 16,
        XCB_DESTROY_NOTIFY = 17,
        XCB_UNMAP_NOTIFY = 18,
        XCB_MAP_NOTIFY = 19,
        XCB_MAP_REQUEST = 20,
        XCB_REPARENT_NOTIFY = 21,
        XCB_CONFIGURE_NOTIFY = 22,
        XCB_CONFIGURE_REQUEST = 23,
        XCB_GRAVITY_NOTIFY = 24,
        XCB_RESIZE_REQUEST = 25,
        XCB_CIRCULATE_NOTIFY = 26,
        XCB_CIRCULATE_REQUEST = 27,
        XCB_PROPERTY_NOTIFY = 28,
        XCB_SELECTION_CLEAR = 29,
        XCB_SELECTION_REQUEST = 30,
        XCB_SELECTION_NOTIFY = 31,
        XCB_COLORMAP_NOTIFY = 32,
        XCB_CLIENT_MESSAGE = 33,
        XCB_MAPPING_NOTIFY = 34,
        XCB_GE_GENERIC = 35
    }

    public enum xcb_atom_enum_t
    {
        XCB_ATOM_NONE = 0,
        XCB_ATOM_ANY = 0,
        XCB_ATOM_PRIMARY = 1,
        XCB_ATOM_SECONDARY = 2,
        XCB_ATOM_ARC = 3,
        XCB_ATOM_ATOM = 4,
        XCB_ATOM_BITMAP = 5,
        XCB_ATOM_CARDINAL = 6,
        XCB_ATOM_COLORMAP = 7,
        XCB_ATOM_CURSOR = 8,
        XCB_ATOM_CUT_BUFFER0 = 9,
        XCB_ATOM_CUT_BUFFER1 = 10,
        XCB_ATOM_CUT_BUFFER2 = 11,
        XCB_ATOM_CUT_BUFFER3 = 12,
        XCB_ATOM_CUT_BUFFER4 = 13,
        XCB_ATOM_CUT_BUFFER5 = 14,
        XCB_ATOM_CUT_BUFFER6 = 15,
        XCB_ATOM_CUT_BUFFER7 = 16,
        XCB_ATOM_DRAWABLE = 17,
        XCB_ATOM_FONT = 18,
        XCB_ATOM_INTEGER = 19,
        XCB_ATOM_PIXMAP = 20,
        XCB_ATOM_POINT = 21,
        XCB_ATOM_RECTANGLE = 22,
        XCB_ATOM_RESOURCE_MANAGER = 23,
        XCB_ATOM_RGB_COLOR_MAP = 24,
        XCB_ATUM_RBG_BEST_MAP = 25,
        XCB_ATOM_RGB_BLUE_MAP = 26,
        XCB_ATOM_RGB_DEFAULT_MAP = 27,
        XCB_ATOM_RGB_GRAY_MAP = 28,
        XCB_ATOM_RGB_GREEN_MAP = 29,
        XCB_ATOM_RGB_RED_MAP = 30,
        XCB_ATOM_STRING = 31,
        XCB_ATOM_VISUALID = 32,
        XCB_ATOM_WINDOW = 33,
        XCB_ATOM_WM_COMMAND = 34,
        XCB_ATOM_WM_HINTS = 35,
        XCB_ATOM_WM_CLIENT_MACHINE = 36,
        XCB_ATOM_WM_ICON_NAME = 37,
        XCB_ATOM_WM_ICON_SIZE = 38,
        XCB_ATOM_WM_NAME = 39,
        XCB_ATOM_WM_NORMAL_HINTS = 40,
        XCB_ATOM_WM_SIZE_HINTS = 41,
        XCB_ATOM_WM_ZOOM_HINTS = 42,
        XCB_ATOM_MIN_SPACE = 43,
        XCB_ATOM_NORM_SPACE = 44,
        XCB_ATOM_MAX_SPACE = 45,
        XCB_ATOM_END_SPACE = 46,
        XCB_ATOM_SUPERSCRIPT_X = 47,
        XCB_ATOM_SUPERSCRIPT_Y = 48,
        XCB_ATOM_SUBSCRIPT_X = 49,
        XCB_ATOM_SUBSCRIPT_Y = 50,
        XCB_ATOM_UNDERLINE_POSITION = 51,
        XCB_ATOM_UNDERLINE_THICKNESS = 52,
        XCB_ATOM_STRIKEOUT_ASCENT = 53,
        XCB_ATOM_STRIKEOUT_DESCENT = 54,
        XCB_ATOM_ITALIC_ANGLE = 55,
        XCB_ATOM_X_HEIGHT = 56,
        XCB_ATOM_QUAD_WIDTH = 57,
        XCB_ATOM_WEIGHT = 58,
        XCB_ATOM_POINT_SIZE = 59,
        XCB_ATOM_RESOLUTION = 60,
        XCB_ATOM_COPYRIGHT = 61,
        XCB_ATOM_NOTICE = 62,
        XCB_ATOM_FONT_NAME = 63,
        XCB_ATOM_FAMILY_NAME = 64,
        XCB_ATOM_FULL_NAME = 65,
        XCB_ATOM_CAP_HEIGHT = 66,
        XCB_ATOM_WM_CLASS = 67,
        XCB_ATOM_WM_TRANSIENT_FOR = 68
    }

    [Flags]
    public enum xcb_button_mask_t
    {
        XCB_BUTTON_MASK_NONE = 0,
        XCB_BUTTON_MASK_1 = 1 << 8,
        XCB_BUTTON_MASK_2 = 1 << 9,
        XCB_BUTTON_MASK_3 = 1 << 10,
        XCB_BUTTON_MASK_4 = 1 << 11,
        XCB_BUTTON_MASK_5 = 1 << 12,
        XCB_BUTTON_MASK_ANY = 1 << 15
    }

    public enum xcb_colormap_enum_t
    {
        XCB_COLORMAP_NONE = 0
    }

    public enum xcb_colormap_state_t
    {
        XCB_COLORMAP_STATE_UNINSTALLED = 0,

        /**
         * The colormap was uninstalled.
         */
        XCB_COLORMAP_STATE_INSTALLED = 1
        /** The colormap was installed. */
    }

    [Flags]
    public enum xcb_cw_t : uint
    {
        XCB_CW_BACK_PIXMAP = 1 << 0,
        XCB_CW_BACK_PIXEL = 1 << 1,
        XCB_CW_BORDER_PIXMAP = 1 << 2,
        XCB_CW_BORDER_PIXEL = 1 << 3,
        XCB_CW_BIT_GRAVITY = 1 << 4,
        XCB_CW_WIN_GRAVITY = 1 << 5,
        XCB_CW_BACKING_STORE = 1 << 6,
        XCB_CW_BACKING_PLANES = 1 << 7,
        XCB_CW_BACKING_PIXEL = 1 << 8,
        XCB_CW_OVERRIDE_REDIRECT = 1 << 9,
        XCB_CW_SAVE_UNDER = 1 << 10,
        XCB_CW_EVENT_MASK = 1 << 11,
        XCB_CW_DONT_PROPAGATE = 1 << 12,
        XCB_CW_COLORMAP = 1 << 13,
        XCB_CW_CURSOR = 1 << 14
    }

    [Flags]
    public enum xcb_event_mask_t : uint
    {
        XCB_EVENT_MASK_NO_EVENT = 0,
        XCB_EVENT_MASK_KEY_PRESS = 1 << 0,
        XCB_EVENT_MASK_KEY_RELEASE = 1 << 1,
        XCB_EVENT_MASK_BUTTON_PRESS = 1 << 2,
        XCB_EVENT_MASK_BUTTON_RELEASE = 1 << 3,
        XCB_EVENT_MASK_ENTER_WINDOW = 1 << 4,
        XCB_EVENT_MASK_LEAVE_WINDOW = 1 << 5,
        XCB_EVENT_MASK_POINTER_MOTION = 1 << 6,
        XCB_EVENT_MASK_POINTER_MOTION_HINT = 1 << 7,
        XCB_EVENT_MASK_BUTTON_1_MOTION = 1 << 8,
        XCB_EVENT_MASK_BUTTON_2_MOTION = 1 << 9,
        XCB_EVENT_MASK_BUTTON_3_MOTION = 1 << 10,
        XCB_EVENT_MASK_BUTTON_4_MOTION = 1 << 11,
        XCB_EVENT_MASK_BUTTON_5_MOTION = 1 << 12,
        XCB_EVENT_MASK_BUTTON_MOTION = 1 << 13,
        XCB_EVENT_MASK_KEYMAP_STATE = 1 << 14,
        XCB_EVENT_MASK_EXPOSURE = 1 << 15,
        XCB_EVENT_MASK_VISIBILITY_CHANGE = 1 << 16,
        XCB_EVENT_MASK_STRUCTURE_NOTIFY = 1 << 17,
        XCB_EVENT_MASK_RESIZE_REDIRECT = 1 << 18,
        XCB_EVENT_MASK_SUBSTRUCTURE_NOTIFY = 1 << 19,
        XCB_EVENT_MASK_SUBSTRUCTURE_REDIRECT = 1 << 20,
        XCB_EVENT_MASK_FOCUS_CHANGE = 1 << 21,
        XCB_EVENT_MASK_PROPERTY_CHANGE = 1 << 22,
        XCB_EVENT_MASK_COLOR_MAP_CHANGE = 1 << 23,
        XCB_EVENT_MASK_OWNER_GRAB_BUTTON = 1 << 24
    }

    [Flags]
    public enum xcb_key_but_mask_t
    {
        XCB_KEY_BUT_MASK_NONE = 0,
        XCB_KEY_BUT_MASK_SHIFT = 1 << 0,
        XCB_KEY_BUT_MASK_LOCK = 1 << 1,
        XCB_KEY_BUT_MASK_CONTROL = 1 << 2,
        XCB_KEY_BUT_MASK_MOD1 = 1 << 3,
        XCB_KEY_BUT_MASK_MOD2 = 1 << 4,
        XCB_KEY_BUT_MASK_MOD3 = 1 << 5,
        XCB_KEY_BUT_MASK_MOD4 = 1 << 6,
        XCB_KEY_BUT_MASK_MOD5 = 1 << 7,
        XCB_KEY_BUT_MASK_BUTTON1 = 1 << 8,
        XCB_KEY_BUT_MASK_BUTTON2 = 1 << 9,
        XCB_KEY_BUT_MASK_BUTTON3 = 1 << 10,
        XCB_KEY_BUT_MASK_BUTTON4 = 1 << 11,
        XCB_KEY_BUT_MASK_BUTTON5 = 1 << 12
    }

    [Flags]
    public enum xcb_mod_mask_t
    {
        XCB_MOD_MASK_SHIFT = 1 << 0,
        XCB_MOD_MASK_LOCK = 1 << 1,
        XCB_MOD_MASK_CONTROL = 1 << 2,
        XCB_MOD_MASK_1 = 1 << 3,
        XCB_MOD_MASK_2 = 1 << 4,
        XCB_MOD_MASK_3 = 1 << 5,
        XCB_MOD_MASK_4 = 1 << 6,
        XCB_MOD_MASK_5 = 1 << 7,
        XCB_MOD_MASK_ANY = 1 << 15
    }

    public enum xcb_motion_t
    {
        XCB_MOTION_NORMAL = 0,
        XCB_MOTION_HINT = 1
    }

    public enum xcb_notify_detail_t
    {
        XCB_NOTIFY_DETAIL_ANCESTOR = 0,
        XCB_NOTIFY_DETAIL_VIRTUAL = 1,
        XCB_NOTIFY_DETAIL_INFERIOR = 2,
        XCB_NOTIFY_DETAIL_NONLINEAR = 3,
        XCB_NOTIFY_DETAIL_NONLINEAR_VIRTUAL = 4,
        XCB_NOTIFY_DETAIL_POINTER = 5,
        XCB_NOTIFY_DETAIL_POINTER_ROOT = 6,
        XCB_NOTIFY_DETAIL_NONE = 7
    }

    public enum xcb_notify_mode_t
    {
        XCB_NOTIFY_MODE_NORMAL = 0,
        XCB_NOTIFY_MODE_GRAB = 1,
        XCB_NOTIFY_MODE_UNGRAB = 2,
        XCB_NOTIFY_MODE_WHILE_GRABBED = 3
    }

    public enum xcb_place_t
    {
        XCB_PLACE_ON_TOP = 0,
        XCB_PLACE_ON_BOTTOM = 1
    }

    public enum xcb_prop_mode_t : byte
    {
        XCB_PROP_MODE_REPLACE = 0,

        /**
         * Discard the previous property value and store the new data.
         */
        XCB_PROP_MODE_PREPEND = 1,

        /**
         * Insert the new data before the beginning of existing data. The `format` must
         * match existing property value. If the property is undefined, it is treated as
         * defined with the correct type and format with zero-length data.
         */
        CB_PROP_MODE_APPEND = 2
        /** Insert the new data after the beginning of existing data. The `format` must
            match existing property value. If the property is undefined, it is treated as
            defined with the correct type and format with zero-length data. */
    }

    public enum xcb_property_t
    {
        XCB_PROPERTY_NEW_VALUE = 0,
        XCB_PROPERTY_DELETE = 1
    }

    public enum xcb_time_t
    {
        XCB_TIME_CURRENT_TIME = 0
    }

    public enum xcb_visibility_t
    {
        XCB_VISIBILITY_UNOBSCURED = 0,
        XCB_VISIBILITY_PARTIALLY_OBSCURED = 1,
        XCB_VISIBILITY_FULLY_OBSCURED = 2
    }

    // ----------------------------------------------------------------
    // XCB Enums

    public enum xcb_window_class_t : ushort
    {
        XCB_WINDOW_CLASS_COPY_FROM_PARENT = 0,
        XCB_WINDOW_CLASS_INPUT_OUTPUT = 1,
        XCB_WINDOW_CLASS_INPUT_ONLY = 2
    }

    public enum xcb_window_enum_t
    {
        XCB_WINDOW_NONE = 0
    }

    private const string LIBC_DLL = "libc";
    private const string LIBXCB_DLL = "libxcb";

    // ----------------------------------------------------------------
    // XCB Definitions
    public const int XCB_NONE = 0;
    public const int XCB_COPY_FROM_PARENT = 0;
    public const int XCB_CURRENT_TIME = 0;

    public const int XCB_NO_SYMBOL = 0;
    // ----------------------------------------------------------------
    // XCB Function Imports

    [DllImport(LIBXCB_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern xcb_connection_t* xcb_connect(
        [MarshalAs(UnmanagedType.LPStr)] string displayname,
        int* screenp);

    [DllImport(LIBXCB_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern void xcb_disconnect(xcb_connection_t* c);

    [DllImport(LIBXCB_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern xcb_setup_t* xcb_get_setup(xcb_connection_t* c);

    [DllImport(LIBXCB_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern xcb_screen_iterator_t xcb_setup_roots_iterator(xcb_setup_t* R);

    [DllImport(LIBXCB_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern uint xcb_generate_id(xcb_connection_t* c);

    [DllImport(LIBXCB_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern int xcb_flush(xcb_connection_t* c);

    [DllImport(LIBXCB_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern xcb_void_cookie_t xcb_create_window(
        xcb_connection_t* c,
        byte depth,
        xcb_window_t wid,
        xcb_window_t parent,
        short x,
        short y,
        ushort width,
        ushort height,
        ushort border_width,
        ushort _class,
        xcb_visualid_t visual,
        uint value_mask,
        void* value_list
    );

    [DllImport(LIBXCB_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern xcb_void_cookie_t xcb_map_window(
        xcb_connection_t* c,
        xcb_window_t window
    );

    [DllImport(LIBXCB_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern void xcb_screen_next(xcb_screen_iterator_t* i);

    [DllImport(LIBXCB_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern xcb_void_cookie_t xcb_change_window_attributes(
        xcb_connection_t* c,
        xcb_window_t window,
        uint value_mask,
        void* value_list
    );

    [DllImport(LIBXCB_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern xcb_void_cookie_t xcb_change_property(
        xcb_connection_t* c,
        byte mode,
        xcb_window_t window,
        xcb_atom_t property,
        xcb_atom_t type,
        byte format,
        uint data_len,
        void* data // const void* data
    );

    [DllImport(LIBXCB_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern xcb_generic_event_t* xcb_poll_for_event(xcb_connection_t* c);

    [DllImport(LIBXCB_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern xcb_intern_atom_cookie_t xcb_intern_atom(
        xcb_connection_t* c,
        byte only_if_exists,
        ushort name_len,
        IntPtr name // const char* name
    );

    [DllImport(LIBXCB_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern xcb_intern_atom_reply_t* xcb_intern_atom_reply(
        xcb_connection_t* c,
        xcb_intern_atom_cookie_t cookie,
        xcb_generic_error_t** e // xcb_generic_error_t **e
    );

    // ----------------------------------------------------------------   
    // Functions from the C stardard library
    [DllImport(LIBC_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern void free(void* ptr);

    // ----------------------------------------------------------------
    // PThreadStructures

    [StructLayout(LayoutKind.Sequential)]
    public struct pthread_mutex_t
    {
        private fixed Byte __size[40];
    }

    // ----------------------------------------------------------------
    // XCB Structures

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_connection_t
    {
    } // Apparently this is designed as an opaque struct

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

    [StructLayout(LayoutKind.Explicit)]
    public struct xcb_client_message_data_t
    {
        [FieldOffset(0)] public fixed Byte data8[20];
        [FieldOffset(0)] public fixed UInt16 data16[10];
        [FieldOffset(0)] public fixed UInt32 data32[5];
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_intern_atom_cookie_t
    {
        public UInt32 sequence;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_intern_atom_reply_t
    {
        public Byte response_type;
        public Byte pad0;
        public UInt16 sequence;
        public UInt32 length;
        public xcb_atom_t atom;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_generic_error_t
    {
        public Byte response_type;
        public Byte error_code;
        public UInt16 sequence;
        public UInt32 resource_id;
        public UInt16 minor_code;
        public Byte major_code;
        public Byte pad0;
        public fixed UInt32 pad[5];
        public UInt32 full_sequence;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_void_cookie_t
    {
        public UInt32 sequence;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_generic_event_t
    {
        public Byte response_type;
        public Byte pad0;
        public UInt16 sequence;
        public fixed UInt32 pad[7];
        public UInt32 full_sequence;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_ge_event_t
    {
        public Byte response_type;
        public Byte pad0;
        public UInt16 sequence;
        public UInt32 length;
        public UInt16 event_type;
        public UInt16 pad1;
        public fixed UInt32 pad[5];
        public UInt32 full_sequence;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_raw_generic_event_t
    {
        public Byte response_type;
        public Byte pad0;
        public UInt16 sequence;
        public fixed UInt16 pad[7];
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_generic_reply_t
    {
        public Byte response_type;
        public Byte pad0;
        public UInt16 sequence;
        public UInt32 length;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_generic_iterator_t
    {
        public void* data;
        public Int32 rem;
        public Int32 index;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_key_press_event_t
    {
        public Byte response_type;
        public xcb_keycode_t detail;
        public UInt16 sequence;
        public xcb_timestamp_t time;
        public xcb_window_t root;
        public xcb_window_t @event;
        public xcb_window_t child;
        public Int16 root_x;
        public Int16 root_y;
        public Int16 event_x;
        public Int16 event_y;
        public UInt16 state;
        public Byte same_screen;
        public Byte pad0;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_key_release_event_t
    {
        public Byte response_type;
        public xcb_keycode_t detail;
        public UInt16 sequence;
        public xcb_timestamp_t time;
        public xcb_window_t root;
        public xcb_window_t @event;
        public xcb_window_t child;
        public Int16 root_x;
        public Int16 root_y;
        public Int16 event_x;
        public Int16 event_y;
        public UInt16 state;
        public Byte same_screen;
        public Byte pad0;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_button_press_event_t
    {
        public Byte response_type;
        public xcb_keycode_t detail;
        public UInt16 sequence;
        public xcb_timestamp_t time;
        public xcb_window_t root;
        public xcb_window_t @event;
        public xcb_window_t child;
        public Int16 root_x;
        public Int16 root_y;
        public Int16 event_x;
        public Int16 event_y;
        public UInt16 state;
        public Byte same_screen;
        public Byte pad0;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_button_release_event_t
    {
        public Byte response_type;
        public xcb_keycode_t detail;
        public UInt16 sequence;
        public xcb_timestamp_t time;
        public xcb_window_t root;
        public xcb_window_t @event;
        public xcb_window_t child;
        public Int16 root_x;
        public Int16 root_y;
        public Int16 event_x;
        public Int16 event_y;
        public UInt16 state;
        public Byte same_screen;
        public Byte pad0;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_motion_notify_event_t
    {
        public Byte response_type;
        public xcb_keycode_t detail;
        public UInt16 sequence;
        public xcb_timestamp_t time;
        public xcb_window_t root;
        public xcb_window_t @event;
        public xcb_window_t child;
        public Int16 root_x;
        public Int16 root_y;
        public Int16 event_x;
        public Int16 event_y;
        public UInt16 state;
        public Byte same_screen;
        public Byte is_hint;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_enter_notify_event_t
    {
        public Byte response_type;
        public xcb_keycode_t detail;
        public UInt16 sequence;
        public xcb_timestamp_t time;
        public xcb_window_t root;
        public xcb_window_t @event;
        public xcb_window_t child;
        public Int16 root_x;
        public Int16 root_y;
        public Int16 event_x;
        public Int16 event_y;
        public UInt16 state;
        public Byte mode;
        public Byte same_screen_focus;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_leave_notify_event_t
    {
        public Byte response_type;
        public xcb_keycode_t detail;
        public UInt16 sequence;
        public xcb_timestamp_t time;
        public xcb_window_t root;
        public xcb_window_t @event;
        public xcb_window_t child;
        public Int16 root_x;
        public Int16 root_y;
        public Int16 event_x;
        public Int16 event_y;
        public UInt16 state;
        public Byte mode;
        public Byte same_screen_focus;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_focus_in_event_t
    {
        public Byte response_type;
        public Byte detail;
        public UInt16 sequence;
        public xcb_window_t @event;
        public Byte mode;
        public fixed Byte pad0[3];
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_focus_out_event_t
    {
        public Byte response_type;
        public Byte detail;
        public UInt16 sequence;
        public xcb_window_t @event;
        public Byte mode;
        public fixed Byte pad0[3];
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_keymap_notify_event_t
    {
        public Byte response_type;
        public fixed Byte keys[31];
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_expose_event_t
    {
        public Byte response_type;
        public Byte pad0;
        public UInt16 sequence;
        public xcb_window_t window;
        public UInt16 x;
        public UInt16 y;
        public UInt16 width;
        public UInt16 height;
        public UInt16 count;
        public fixed Byte pad1[2];
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_graphics_exposure_event_t
    {
        public Byte response_type;
        public Byte pad0;
        public UInt16 sequence;
        public xcb_drawable_t drawable;
        public UInt16 x;
        public UInt16 y;
        public UInt16 width;
        public UInt16 height;
        public UInt16 minor_opcode;
        public UInt16 count;
        public Byte major_opcode;
        public fixed Byte pad1[3];
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_no_exposure_event_t
    {
        public Byte response_type;
        public Byte pad0;
        public UInt16 sequence;
        public xcb_drawable_t drawable;
        public UInt16 minor_opcode;
        public Byte major_opcode;
        public Byte pad1;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_visibility_notify_event_t
    {
        public Byte response_type;
        public Byte pad0;
        public UInt16 sequence;
        public xcb_window_t window;
        public Byte state;
        public fixed Byte pad1[3];
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_create_notify_event_t
    {
        public Byte response_type;
        public Byte pad0;
        public UInt16 sequence;
        public xcb_window_t parent;
        public xcb_window_t window;
        public Int16 x;
        public Int16 y;
        public UInt16 width;
        public UInt16 height;
        public UInt16 border_width;
        public Byte override_redirect;
        public Byte pad1;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_destroy_notify_event_t
    {
        public Byte response_type;
        public Byte pad0;
        public UInt16 sequence;
        public xcb_window_t @event;
        public xcb_window_t window;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_unmap_notify_event_t
    {
        public Byte response_type;
        public Byte pad0;
        public UInt16 sequence;
        public xcb_window_t @event;
        public xcb_window_t window;
        public Byte from_configure;
        public fixed Byte pad1[3];
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_map_notify_event_t
    {
        public Byte response_type;
        public Byte pad0;
        public UInt16 sequence;
        public xcb_window_t @event;
        public xcb_window_t window;
        public Byte override_redirect;
        public fixed Byte pad1[3];
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_map_request_event_t
    {
        public Byte response_type;
        public Byte pad0;
        public UInt16 sequence;
        public xcb_window_t parent;
        public xcb_window_t window;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_reparent_notify_event_t
    {
        public Byte response_type;
        public Byte pad0;
        public UInt16 sequence;
        public xcb_window_t @event;
        public xcb_window_t window;
        public xcb_window_t parent;
        public Int16 x;
        public Int16 y;
        public Byte override_redirect;
        public fixed Byte pad1[3];
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_configure_notify_event_t
    {
        public Byte response_type;
        public Byte pad0;
        public UInt16 sequence;
        public xcb_window_t @event;
        public xcb_window_t window;
        public xcb_window_t above_sibling;
        public Int16 x;
        public Int16 y;
        public UInt16 width;
        public UInt16 height;
        public UInt16 border_width;
        public Byte override_redirect;
        public Byte pad1;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_configure_request_event_t
    {
        public Byte response_type;
        public Byte stack_mode;
        public UInt16 sequence;
        public xcb_window_t parent;
        public xcb_window_t window;
        public xcb_window_t sibling;
        public Int16 x;
        public Int16 y;
        public UInt16 width;
        public UInt16 height;
        public UInt16 border_width;
        public UInt16 value_mask;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_gravity_notify_event_t
    {
        public Byte response_type;
        public Byte pad0;
        public UInt16 sequence;
        public xcb_window_t @event;
        public xcb_window_t window;
        public Int16 x;
        public Int16 y;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_resize_request_event_t
    {
        public Byte response_type;
        public Byte pad0;
        public UInt16 sequence;
        public xcb_window_t window;
        public UInt16 width;
        public UInt16 height;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_circulate_notify_event_t
    {
        public Byte response_type;
        public Byte pad0;
        public UInt16 sequence;
        public xcb_window_t @event;
        public xcb_window_t window;
        public fixed Byte pad1[4];
        public Byte place;
        public fixed Byte pad2[3];
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_property_notify_event_t
    {
        public Byte response_type;
        public Byte pad0;
        public UInt16 sequence;
        public xcb_window_t window;
        public xcb_atom_t atom;
        public xcb_timestamp_t time;
        public Byte state;
        public fixed Byte pad1[3];
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_selection_clear_event_t
    {
        public Byte response_type;
        public Byte pad0;
        public UInt16 sequence;
        public xcb_timestamp_t time;
        public xcb_window_t owner;
        public xcb_atom_t selection;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_selection_request_event_t
    {
        public Byte response_type;
        public Byte pad0;
        public UInt16 sequence;
        public xcb_timestamp_t time;
        public xcb_window_t owner;
        public xcb_window_t requestor;
        public xcb_atom_t selection;
        public xcb_atom_t target;
        public xcb_atom_t property;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_selection_notify_event_t
    {
        public Byte response_type;
        public Byte pad0;
        public UInt16 sequence;
        public xcb_timestamp_t time;
        public xcb_window_t requestor;
        public xcb_atom_t selection;
        public xcb_atom_t target;
        public xcb_atom_t property;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_colormap_notify_event_t
    {
        public Byte response_type;
        public Byte pad0;
        public UInt16 sequence;
        public xcb_window_t window;
        public xcb_colormap_t colormap;
        public Byte _new;
        public Byte state;
        public fixed Byte pad1[2];
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_client_message_data_iterator_t
    {
        public xcb_client_message_data_t* data;
        public Int32 rem;
        public Int32 index;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_client_message_event_t
    {
        public Byte response_type;
        public Byte format;
        public UInt16 sequence;
        public xcb_window_t window;
        public xcb_atom_t type;
        public xcb_client_message_data_t data;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_mapping_notify_event_t
    {
        public Byte response_type;
        public Byte pad0;
        public UInt16 sequence;
        public Byte request;
        public xcb_keycode_t first_keycode;
        public Byte count;
        public Byte pad1;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct xcb_ge_generic_event_t
    {
        public Byte response_type;
        public Byte extension;
        public UInt16 sequence;
        public UInt32 length;
        public UInt16 event_type;
        public fixed Byte pad0[22];
        public UInt32 full_sequence;
    }
}