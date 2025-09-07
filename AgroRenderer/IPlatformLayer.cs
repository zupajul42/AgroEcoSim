namespace AgroRenderer
{
    public interface IPlatformLayer
    {
        public void OpenWindow(string title, int width, int height);
        public void CloseWindow();
        public void CreateVulkanSurface(Vk.VkInstance instance);
    }    
}
