using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;

// The shared acoustic model stays loaded for the process lifetime. Each microphone
// session owns a decoder; Windows releases the shared model when Navigator exits.
internal sealed class KoreanRecognition : IDisposable {
    const string Library="libvosk";
    [DllImport(Library,CallingConvention=CallingConvention.Cdecl)] static extern IntPtr vosk_model_new(byte[] path);
    [DllImport(Library,CallingConvention=CallingConvention.Cdecl)] static extern IntPtr vosk_recognizer_new(IntPtr model,float rate);
    [DllImport(Library,CallingConvention=CallingConvention.Cdecl)] static extern IntPtr vosk_recognizer_new_grm(IntPtr model,float rate,byte[] grammar);
    [DllImport(Library,CallingConvention=CallingConvention.Cdecl)] static extern void vosk_recognizer_set_words(IntPtr decoder,int enabled);
    [DllImport(Library,CallingConvention=CallingConvention.Cdecl)] static extern int vosk_recognizer_accept_waveform(IntPtr decoder,byte[] pcm,int length);
    [DllImport(Library,CallingConvention=CallingConvention.Cdecl)] static extern IntPtr vosk_recognizer_result(IntPtr decoder);
    [DllImport(Library,CallingConvention=CallingConvention.Cdecl)] static extern IntPtr vosk_recognizer_final_result(IntPtr decoder);
    [DllImport(Library,CallingConvention=CallingConvention.Cdecl)] static extern void vosk_recognizer_free(IntPtr decoder);
    static readonly Lazy<IntPtr> model=new Lazy<IntPtr>(()=>vosk_model_new(Encoding.UTF8.GetBytes(
        Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"vosk-model-small-ko-0.22")+"\0")));
    static readonly string[] names={"항해사","오퍼레이터","스탐","네비게이터","파트너"};
    readonly Queue<byte[]> tail=new Queue<byte[]>();
    int tailBytes;
    IntPtr decoder;
    static string Initials(string text){
        var result=new StringBuilder();
        foreach(char c in text){
            if(Char.IsWhiteSpace(c))continue;
            if(c<'가'||c>'힣')return null;
            result.Append((char)('A'+(c-'가')/588));
        }
        return result.ToString();
    }
    // Only recheck an isolated, similar-sounding name. A constrained decoder
    // alone can fit ordinary conversation to a wake word.
    Phrase CheckName(Phrase phrase){
        try{
            string initials=Initials(phrase.text??"");
            if(Array.IndexOf(names,phrase.text)>=0||!Array.Exists(names,n=>Initials(n)==initials))return phrase;
            IntPtr check;
            using(var grammar=new MemoryStream()){
                new DataContractJsonSerializer(typeof(string[])).WriteObject(grammar,names);
                grammar.WriteByte(0);
                check=vosk_recognizer_new_grm(model.Value,16000,grammar.ToArray());
            }
            if(check==IntPtr.Zero)return phrase;
            try{
                vosk_recognizer_set_words(check,1);
                foreach(var chunk in tail)vosk_recognizer_accept_waveform(check,chunk,chunk.Length);
                var match=Read(vosk_recognizer_final_result(check));
                return match.Confidence>=.9f&&Array.IndexOf(names,match.text)>=0&&Initials(match.text)==initials?match:phrase;
            }finally{vosk_recognizer_free(check);}
        }finally{tail.Clear();tailBytes=0;}
    }
    internal KoreanRecognition(){
        if(model.Value==IntPtr.Zero)throw new InvalidOperationException("한국어 인식 모델을 열 수 없습니다. 네비게이터 ZIP 전체를 풀어 주세요.");
        decoder=vosk_recognizer_new(model.Value,16000);
        if(decoder==IntPtr.Zero)throw new InvalidOperationException("한국어 음성 인식을 시작하지 못했습니다.");
        vosk_recognizer_set_words(decoder,1);
    }
    [DataContract]
    internal sealed class Word {[DataMember] public float conf {get;set;}}
    [DataContract]
    internal sealed class Phrase {
        [DataMember] public string text {get;set;}
        [DataMember] public Word[] result {get;set;}
        internal float Confidence {get{
            if(result==null||result.Length==0)return 0;
            float total=0;foreach(var word in result)total+=word.conf;
            return total/result.Length;
        }}
    }
    static Phrase Read(IntPtr pointer){
        int size=0;while(Marshal.ReadByte(pointer,size)!=0)size++;
        var bytes=new byte[size];Marshal.Copy(pointer,bytes,0,size);
        using(var stream=new MemoryStream(bytes,false))return (Phrase)new DataContractJsonSerializer(typeof(Phrase)).ReadObject(stream);
    }
    internal Phrase Feed(byte[] pcm,int length){
        var copy=new byte[length];Buffer.BlockCopy(pcm,0,copy,0,length);
        tail.Enqueue(copy);tailBytes+=length;
        while(tailBytes>96000&&tail.Count>1)tailBytes-=tail.Dequeue().Length;
        int ended=vosk_recognizer_accept_waveform(decoder,pcm,length);
        if(ended<0)throw new InvalidDataException("녹음한 소리를 읽을 수 없습니다.");
        return ended==0?null:CheckName(Read(vosk_recognizer_result(decoder)));
    }
    internal Phrase Finish(){return CheckName(Read(vosk_recognizer_final_result(decoder)));}
    internal static Phrase FromRecording(byte[] pcm,CancellationToken stop){
        using(var engine=new KoreanRecognition()){
            var parts=new List<string>();var words=new List<Word>();
            Action<Phrase> collect=p=>{if(p!=null&&!String.IsNullOrWhiteSpace(p.text)){parts.Add(p.text);if(p.result!=null)words.AddRange(p.result);}};
            var buffer=new byte[8000];
            for(int i=0;i<pcm.Length;i+=buffer.Length){
                stop.ThrowIfCancellationRequested();
                int n=Math.Min(pcm.Length-i,buffer.Length);Buffer.BlockCopy(pcm,i,buffer,0,n);collect(engine.Feed(buffer,n));
            }
            collect(engine.Finish());
            return new Phrase{text=String.Join(" ",parts.ToArray()),result=words.ToArray()};
        }
    }
    public void Dispose(){if(decoder!=IntPtr.Zero){vosk_recognizer_free(decoder);decoder=IntPtr.Zero;}}
}
