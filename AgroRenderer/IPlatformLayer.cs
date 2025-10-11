using System.Runtime.InteropServices;

namespace AgroRenderer {

    
    public enum WindowEventType
    {
        None,
        Close,
        Resized,
        Moved,
        Focused,
        Unfocused,
        Minimized,
        Restored,
        MouseMoved,
        MouseButtonPressed,
        MouseButtonReleased,
        MouseWheelScrolled,
        KeyPressed,
        KeyReleased,
        RedrawRegion,
    }
    
    [StructLayout(LayoutKind.Explicit)]
    public unsafe struct WindowEvent
    {
        [FieldOffset(0)] public WindowEventType Type;
        [FieldOffset(4)] public fixed byte Data[28];
        [FieldOffset(4)] public RedrawRegionEventData RedrawRegionData;
        [FieldOffset(4)] public ResizedEventData ResizedData;
    }
    public struct RedrawRegionEventData
    {
        public int X;
        public int Y;
        public int Width;
        public int Height;
    }
    public struct ResizedEventData
    {
        public int Width;
        public int Height;
    }
    
    public interface IPlatformLayer
    {
        public const int MAX_EVENTS_IN_QUEUE = 256;
        public void OpenWindow(string title, int width, int height);
        public void CloseWindow();
        public Vk.VkSurfaceKHR CreateVulkanSurface(Vk.VkInstance instance, MemUtils.Arena scratch);
        
        public WindowEvent[] GetPendingEvents();
    }    
}
