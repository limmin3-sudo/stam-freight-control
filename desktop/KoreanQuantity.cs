using System;
using System.Collections.Generic;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Runtime.Serialization;
using System.Text.RegularExpressions;
using System.Threading;

internal sealed partial class KoreanRecognition {
    [DllImport(Library,CallingConvention=CallingConvention.Cdecl)]
    static extern void vosk_recognizer_set_max_alternatives(IntPtr decoder,int count);
    [DataContract] sealed class Alternative {
        [DataMember] public string text {get;set;}
        [DataMember] public double confidence {get;set;}
    }
    [DataContract] sealed class Alternatives {
        [DataMember] public Alternative[] alternatives {get;set;}
    }
    static readonly string[] unitNames={"","일","이","삼","사","오","육","칠","팔","구"};
    static string Sino(int n){
        int tens=n/10, units=n%10;
        return (tens>1?unitNames[tens]:"")+(tens>0?"십":"")+unitNames[units];
    }
    static readonly Lazy<string[]> quantityGrammar=new Lazy<string[]>(()=>{
        var names=new List<string>{"네","예","취소","다시","아니","아직","말고"};
        for(int i=1;i<100;i++)names.Add(Sino(i));
        return names.ToArray();
    });
    // A second view of the same short recording reduces low-frequency noise.
    static byte[] HighPass(byte[] pcm,int cutoffHz){
        double k=Math.Tan(Math.PI*cutoffHz/16000),norm=1/(1+Math.Sqrt(2)*k+k*k);
        double a1=2*(k*k-1)*norm,a2=(1-Math.Sqrt(2)*k+k*k)*norm;
        double x1=0,x2=0,y1=0,y2=0;
        var result=new byte[pcm.Length];
        for(int i=0;i+1<pcm.Length;i+=2){
            short x=(short)(pcm[i]|pcm[i+1]<<8);
            double y=norm*(x-2*x1+x2)-a1*y1-a2*y2;
            short sample=(short)Math.Max(Int16.MinValue,Math.Min(Int16.MaxValue,y));
            result[i]=(byte)sample;result[i+1]=(byte)(sample>>8);
            x2=x1;x1=x;y2=y1;y1=y;
        }
        return result;
    }
    static HashSet<int> NumericAlternatives(byte[] pcm,CancellationToken stop){
        stop.ThrowIfCancellationRequested();
        var values=new HashSet<int>();
        IntPtr decoder=GrammarDecoder(quantityGrammar.Value);
        if(decoder==IntPtr.Zero)return values;
        try{
            vosk_recognizer_set_max_alternatives(decoder,6);
            var padded=new byte[pcm.Length+16000];
            Buffer.BlockCopy(pcm,0,padded,8000,pcm.Length);
            int ended=vosk_recognizer_accept_waveform(decoder,padded,padded.Length);
            if(ended<0)return values;
            var list=ReadJson<Alternatives>(ended==0?vosk_recognizer_final_result(decoder):vosk_recognizer_result(decoder)).alternatives;
            if(list==null||list.Length==0)return values;
            foreach(var item in list){
                if(item.confidence<list[0].confidence-3.0)continue;
                string word=(item.text??"").Replace(" ","");
                for(int n=1;n<100;n++)if(word==Sino(n)){values.Add(n);break;}
            }
        }finally{vosk_recognizer_free(decoder);}
        return values;
    }
    static int LastUnit(string heard){
        int whole=RecognizedQuantity(heard);
        if(whole>0)return whole%10;
        var tail=Regex.Match(heard,@"(?:\[([1-9])\]|([1-9])|([일이삼사오육칠팔구]))$");
        if(!tail.Success)return -1;
        return tail.Groups[3].Success?Array.IndexOf(unitNames,tail.Groups[3].Value):
            Int32.Parse(tail.Groups[1].Success?tail.Groups[1].Value:tail.Groups[2].Value,CultureInfo.InvariantCulture);
    }
    // Return only a readback candidate. Both decodes must contain it near the top.
    // A corroborating last digit and syllable count separate e.g. 사 / 십사 / 이십사.
    static int QuantityCandidate(byte[] pcm,int suffix,int syllables,CancellationToken stop){
        if(pcm.Length<3840||pcm.Length>64000||suffix<0||syllables<1||syllables>3)return 0;
        var first=NumericAlternatives(pcm,stop);
        var second=NumericAlternatives(HighPass(pcm,200),stop);
        first.RemoveWhere(n=>n%10!=suffix||Sino(n).Length!=syllables);
        second.RemoveWhere(n=>n%10!=suffix||Sino(n).Length!=syllables);
        var agreement=new HashSet<int>(first);
        agreement.IntersectWith(second);
        if(agreement.Count==0){
            first.UnionWith(second);
            if(first.Count==0)return 0;
            first.IntersectWith(NumericAlternatives(HighPass(pcm,500),stop));
            agreement=first;
        }
        if(agreement.Count==1)foreach(int n in agreement)return n;
        return 0;
    }
    internal static int RecognizedQuantity(string text){
        string word=(text??"").Trim();
        var literal=Regex.Match(word,@"^(?:\[(\d{1,2})\]|(\d{1,2}))$");
        if(literal.Success)return Int32.Parse(literal.Groups[1].Success?literal.Groups[1].Value:literal.Groups[2].Value,CultureInfo.InvariantCulture);
        for(int n=1;n<100;n++)if(word==Sino(n))return n;
        return 0;
    }
    static int ReplyQuantity(byte[] pcm,Phrase free,CancellationToken stop){
        string text=(free.text??"").Trim();
        int exact=RecognizedQuantity(text);
        if(exact>0&&free.Confidence>=.85f)return 0;
        if(exact>0)return QuantityCandidate(pcm,exact%10,Sino(exact).Length,stop);
        // Only an isolated number-like reply. Never join separately recognized digits.
        if(!Regex.IsMatch(text,@"^(?:[가-힣A-Za-z]{1,2} ){0,2}(?:[가-힣]|\[[1-9]\])$")||
            Regex.IsMatch(text,@"취소|아니|말고|대신|다시|그만|하지|^안 |^못 "))return 0;
        string syllables=Regex.Replace(text,@"\[([1-9])\]","$1").Replace(" ","");
        int suffix=LastUnit(text);
        if(suffix<0&&text.Contains(" ")){
            // A changed initial consonant can leave a Korean syllable's vowel and
            // final consonant intact. Only propose a digit when that ending is unique.
            char last=text[text.Length-1];
            if(last>='가'&&last<='힣'){
                for(int i=1;i<unitNames.Length;i++){
                    if((last-'가')%588!=(unitNames[i][0]-'가')%588)continue;
                    if(suffix>=0)return 0;
                    suffix=i;
                }
            }
        }
        return QuantityCandidate(pcm,suffix,syllables.Length,stop);
    }
    static int EmbeddedQuantity(byte[] pcm,Phrase constrained,Phrase free,CancellationToken stop){
        var words=constrained.result;
        int particle=words.Length-2;
        if(particle<2||words[particle].word!="로"||words[particle+1].word!="바꿔")return 0;
        int start=particle-1;
        while(start>=0&&words[start].word!="만")start--;
        if(start<0||particle-start<2)return 0;
        // CheckRecording adds 250 ms of silence before time zero of the held audio.
        double begin=words[start].end-.25, end=words[particle].start-.25;
        int first=Math.Max(0,(int)(begin*16000))*2,last=Math.Min(pcm.Length/2,(int)(end*16000))*2;
        if(last-first<3840||last-first>64000)return 0;
        int suffix=LastUnit(words[particle-1].word);
        if(suffix<0||free.result==null)return 0;
        int syllables=0;
        foreach(var w in free.result){
            double center=(w.start+w.end)/2;
            if(center<begin-.045||center>end+.045)continue;
            int n=RecognizedQuantity(w.word);
            if(n!=0)syllables+=Sino(n).Length;
            else if(Regex.IsMatch(w.word,@"^[가-힣A-Za-z]{1,3}$"))syllables+=w.word.Length;
        }
        var clip=new byte[last-first];Buffer.BlockCopy(pcm,first,clip,0,clip.Length);
        return QuantityCandidate(clip,suffix,syllables,stop);
    }
}
