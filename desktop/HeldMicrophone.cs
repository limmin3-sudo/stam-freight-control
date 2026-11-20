using System;
using System.IO;
using System.Runtime.InteropServices;

// PCM is kept in memory. The recognizer only receives it after the microphone closes.
internal interface IHoldCapture : IDisposable {
    void Drain();
    MemoryStream Finish();
}
internal sealed class HeldMicrophone : IHoldCapture {
    [StructLayout(LayoutKind.Sequential,Pack=2)]
    struct Format { public ushort tag,channels;public uint rate,bytesPerSecond;public ushort alignment,bits,extra; }
    [StructLayout(LayoutKind.Sequential)]
    struct Header { public IntPtr data;public uint size,recorded;public UIntPtr user;public uint flags,loops;public IntPtr next;public UIntPtr reserved; }
    [DllImport("winmm.dll")] static extern uint waveInOpen(out IntPtr device,uint id,ref Format format,IntPtr callback,IntPtr instance,uint flags);
    [DllImport("winmm.dll")] static extern uint waveInPrepareHeader(IntPtr device,IntPtr header,uint size);
    [DllImport("winmm.dll")] static extern uint waveInAddBuffer(IntPtr device,IntPtr header,uint size);
    [DllImport("winmm.dll")] static extern uint waveInStart(IntPtr device);
    [DllImport("winmm.dll")] static extern uint waveInReset(IntPtr device);
    [DllImport("winmm.dll")] static extern uint waveInUnprepareHeader(IntPtr device,IntPtr header,uint size);
    [DllImport("winmm.dll")] static extern uint waveInClose(IntPtr device);
    static readonly uint headerSize=(uint)Marshal.SizeOf(typeof(Header));
    readonly byte[] transfer=new byte[8192];
    readonly IntPtr[] headers=new IntPtr[8],buffers=new IntPtr[8];
    readonly bool[] prepared=new bool[8];
    IntPtr device;
    MemoryStream audio=new MemoryStream();
    int next;
    static void Check(uint code){if(code!=0)throw new InvalidOperationException("Windows microphone (MMRESULT "+code+")");}
    internal HeldMicrophone(){
        try{
            var format=new Format{tag=1,channels=1,rate=16000,bytesPerSecond=32000,alignment=2,bits=16};
            Check(waveInOpen(out device,UInt32.MaxValue,ref format,IntPtr.Zero,IntPtr.Zero,0));
            for(int i=0;i<headers.Length;i++){
                buffers[i]=Marshal.AllocHGlobal(transfer.Length);
                headers[i]=Marshal.AllocHGlobal((int)headerSize);
                Marshal.StructureToPtr(new Header{data=buffers[i],size=(uint)transfer.Length},headers[i],false);
                Check(waveInPrepareHeader(device,headers[i],headerSize));prepared[i]=true;
                Check(waveInAddBuffer(device,headers[i],headerSize));
            }
            Check(waveInStart(device));
        }catch{Dispose();throw;}
    }
    public void Drain(){ReadBuffers(true);}
    void ReadBuffers(bool requeue){
        for(int count=0;count<headers.Length;count++){
            var header=(Header)Marshal.PtrToStructure(headers[next],typeof(Header));
            if((header.flags&1)==0)break;
            int length=checked((int)header.recorded);
            Marshal.Copy(buffers[next],transfer,0,length);audio.Write(transfer,0,length);
            if(requeue)Check(waveInAddBuffer(device,headers[next],headerSize));
            next=(next+1)%headers.Length;
        }
    }
    public MemoryStream Finish(){
        Check(waveInReset(device));ReadBuffers(false);
        MemoryStream result=audio;result.Position=0;audio=null;Dispose();return result;
    }
    public void Dispose(){
        if(device!=IntPtr.Zero){
            waveInReset(device);
            for(int i=0;i<headers.Length;i++)if(prepared[i])waveInUnprepareHeader(device,headers[i],headerSize);
            waveInClose(device);device=IntPtr.Zero;
        }
        for(int i=0;i<headers.Length;i++){
            if(headers[i]!=IntPtr.Zero){Marshal.FreeHGlobal(headers[i]);headers[i]=IntPtr.Zero;}
            if(buffers[i]!=IntPtr.Zero){Marshal.FreeHGlobal(buffers[i]);buffers[i]=IntPtr.Zero;}
        }
        if(audio!=null){audio.Dispose();audio=null;}
    }
}
