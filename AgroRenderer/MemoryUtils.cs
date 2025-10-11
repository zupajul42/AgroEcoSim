using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Text;

namespace AgroRenderer;

public static class MemUtils
{
    public static DeferDisposable<T> Defer<T>(Action<T> action, T param1)
    {
        return new DeferDisposable<T>(action, param1);
    }

    public static DeferDisposableRet<T1, TRes> Defer<T1, TRes>(Func<T1, TRes> func, T1 param1)
    {
        return new DeferDisposableRet<T1, TRes>(func, param1);
    }

    public static DeferDisposableRet<T1, T2, TRes> Defer<T1, T2, TRes>(Func<T1, T2, TRes> func, T1 param1, T2 param2)
    {
        return new DeferDisposableRet<T1, T2, TRes>(func, param1, param2);
    }

    public readonly struct DeferDisposable<T1> : IDisposable
    {
        private readonly Action<T1> _action;
        private readonly T1 _param1;

        public DeferDisposable(Action<T1> action, T1 param1)
        {
            (_action, _param1) = (action, param1);
        }

        public void Dispose()
        {
            _action.Invoke(_param1);
        }
    }

    public readonly struct DeferDisposableRet<T1, TRes> : IDisposable
    {
        private readonly Func<T1, TRes> _func;
        private readonly T1 _param1;

        public DeferDisposableRet(Func<T1, TRes> func, T1 param1)
        {
            (_func, _param1) = (func, param1);
        }

        public void Dispose()
        {
            _func.Invoke(_param1);
        }
    }

    public readonly struct DeferDisposableRet<T1, T2, TRes> : IDisposable
    {
        private readonly Func<T1, T2, TRes> _func;
        private readonly T1 _param1;
        private readonly T2 _param2;

        public DeferDisposableRet(Func<T1, T2, TRes> func, T1 param1, T2 param2)
        {
            (_func, _param1, _param2) = (func, param1, param2);
        }

        public void Dispose()
        {
            _func.Invoke(_param1, _param2);
        }
    }


    public unsafe struct Arena(int size) : IDisposable
    {
        private readonly int _size = size;
        private readonly byte* _mem = (byte*)Marshal.AllocHGlobal(size);
        private int _offset = 0;

        private IntPtr Alloc(int size, int alignment = 8)
        {
            if (alignment <= 0 || (alignment & (alignment - 1)) != 0)
                throw new ArgumentException("Alignment must be a power of two");
            if (size <= 1) throw new ArgumentException("Size must be positive");
            var alignmentOffset =
                alignment - (_offset & (alignment - 1)); // o % a === o & (a - 1) when a is power of two
            if (_offset + alignmentOffset + size > _size) throw new OutOfMemoryException("Arena out of memory");

            var ptr = (IntPtr)(_mem + _offset + alignmentOffset);
            _offset = _offset + alignmentOffset + size;
            // Zero Initialize Memory
            Unsafe.InitBlockUnaligned((void*)ptr, 0, (uint)size);
            return ptr;
        }

        public T* Alloc<T>(int count = 1, int alignment = 8) where T : unmanaged
        {
            var elemSize = Unsafe.SizeOf<T>();
            return (T*)Alloc(elemSize * count, alignment);
        }

        public IntPtr AllocANSIString(string str)
        {
            var bytes = Encoding.ASCII.GetBytes(str);
            var ptr = Alloc<byte>(bytes.Length + 1, 1);
            for (var i = 0; i < bytes.Length; i++) ptr[i] = bytes[i];
            ptr[bytes.Length] = 0; // Null-terminate
            return (IntPtr)ptr;
        }

        public void Reset()
        {
            _offset = 0;
        }

        public void Dispose()
        {
            Marshal.FreeHGlobal((IntPtr)_mem);
        }
    }
}