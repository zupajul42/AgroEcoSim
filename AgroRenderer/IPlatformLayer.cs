namespace AgroRenderer
{
    public interface IPlatformLayer
    {
        public void OpenWindow(string title, int width, int height);
        public void CloseWindow();
        public Vk.VkSurfaceKHR CreateVulkanSurface(Vk.VkInstance instance, MemUtils.Arena scratch);
    }    
}
