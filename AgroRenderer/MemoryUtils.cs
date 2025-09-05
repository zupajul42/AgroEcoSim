using Silk.NET.Vulkan;

namespace AgroRenderer
{
    public static class MemUtils
    {
        public static DeferDisposable<T> Defer<T>(Action<T> action, T param1) =>
            new DeferDisposable<T>(action, param1);

        public static DeferDisposableRet<T1, TRes> Defer<T1, TRes>(Func<T1, TRes> func, T1 param1) =>
            new DeferDisposableRet<T1, TRes>(func, param1);
        
        public static DeferDisposableRet<T1, T2, TRes> Defer<T1, T2, TRes>(Func<T1, T2, TRes> func, T1 param1, T2 param2) =>
            new DeferDisposableRet<T1, T2, TRes>(func, param1, param2);

        public readonly struct DeferDisposable<T1> : IDisposable
        {
            readonly Action<T1> _action;
            readonly T1 _param1;
            public DeferDisposable(Action<T1> action, T1 param1) => (_action, _param1) = (action, param1);
            public void Dispose() => _action.Invoke(_param1);
        }   
        
        public readonly struct DeferDisposableRet<T1, TRes> : IDisposable
        {
            readonly Func<T1, TRes> _func;
            readonly T1 _param1;
            public DeferDisposableRet(Func<T1, TRes> func, T1 param1) => (_func, _param1) = (func, param1);
            public void Dispose() => _func.Invoke(_param1);
        }

        public readonly struct DeferDisposableRet<T1, T2, TRes> : IDisposable
        {
            readonly Func<T1, T2, TRes> _func;
            readonly T1 _param1;
            readonly T2 _param2;
            public DeferDisposableRet(Func<T1, T2, TRes> func, T1 param1, T2 param2) => (_func, _param1, _param2) = (func, param1, param2);
            public void Dispose() => _func.Invoke(_param1, _param2);
        }
        
    }
}