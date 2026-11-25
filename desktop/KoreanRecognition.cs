using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;

// The shared acoustic model stays loaded for the process lifetime. Each microphone
// session owns a decoder; Windows releases the shared model when Navigator exits.
internal sealed partial class KoreanRecognition : IDisposable {
    const string Library="libvosk";
    [DllImport(Library,CallingConvention=CallingConvention.Cdecl)] static extern IntPtr vosk_model_new(byte[] path);
    [DllImport(Library,CallingConvention=CallingConvention.Cdecl)] static extern IntPtr vosk_recognizer_new(IntPtr model,float rate);
    [DllImport(Library,CallingConvention=CallingConvention.Cdecl)] static extern IntPtr vosk_recognizer_new_grm(IntPtr model,float rate,byte[] grammar);
    [DllImport(Library,CallingConvention=CallingConvention.Cdecl)] static extern void vosk_recognizer_set_words(IntPtr decoder,int enabled);
    [DllImport(Library,CallingConvention=CallingConvention.Cdecl)] static extern int vosk_recognizer_accept_waveform(IntPtr decoder,byte[] pcm,int length);
    [DllImport(Library,CallingConvention=CallingConvention.Cdecl)] static extern IntPtr vosk_recognizer_result(IntPtr decoder);
    [DllImport(Library,CallingConvention=CallingConvention.Cdecl)] static extern IntPtr vosk_recognizer_final_result(IntPtr decoder);
    [DllImport(Library,CallingConvention=CallingConvention.Cdecl)] static extern void vosk_recognizer_free(IntPtr decoder);
    [DllImport(Library,CallingConvention=CallingConvention.Cdecl)] static extern int vosk_model_find_word(IntPtr model,byte[] word);
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
    static IntPtr GrammarDecoder(string[] choices){
        using(var grammar=new MemoryStream()){
            new DataContractJsonSerializer(typeof(string[])).WriteObject(grammar,choices);
            grammar.WriteByte(0);
            return vosk_recognizer_new_grm(model.Value,16000,grammar.ToArray());
        }
    }
    // Four syllables in a short held utterance must already resemble the active cargo command.
    // A grammar-only match may suggest a readback, but cannot complete the step.
    static int Vowel(char c){
        return c<'가'||c>'힣'?-1:(c-'가')/28%21;
    }
    static bool NearCargoCommand(string heard,string target){
        string s=(heard??"").Replace(" ","");
        if(s.Length==5&&s.EndsWith("다",StringComparison.Ordinal))s=s.Substring(0,4);
        if(s.Length!=4||s==target)return false;
        for(int i=0;i<4;i++)if(Vowel(s[i])<0)return false;
        int first=Vowel(s[0]),wanted=Vowel(target[0]);
        bool sameFirst=first==wanted||(first==Vowel('배')||first==Vowel('베'))&&wanted==Vowel('배');
        return sameFirst&&Vowel(s[1])==Vowel(target[1])&&
            (Vowel(s[2])==Vowel('완')||Vowel(s[2])==Vowel('월'))&&
            (s[3]=='료'||s[3]=='요');
    }
    static readonly string[] cargoGrammar={"적재 완료","배송 완료","하역 완료","픽업 완료","적재 중","배송 중","아직","취소","얼마나","언제","아니야"};
    static string CheckCargo(byte[] pcm,Phrase heard,string step,CancellationToken stop){
        if(pcm.Length>32000*3)return null;
        string target=step=="pickup"?"적재완료":step=="delivery"?"배송완료":null;
        if(target==null||!NearCargoCommand(heard.text,target))return null;
        var result=CheckRecording(pcm,cargoGrammar,stop);
        if(result==null||result.result==null||result.result.Length!=2||Array.Exists(result.result,w=>w.conf<.90f))return null;
        return (result.text??"").Replace(" ","")==target?result.text:null;
    }
    // A constrained decode may propose a pair, never a receipt number, quantity or edit.
    static string DictionaryTokens(string value,Dictionary<string,string> cache){
        if(value.Length==0)return "";
        string found;
        if(cache.TryGetValue(value,out found))return found;
        for(int length=value.Length;length>0;length--){
            string head=value.Substring(0,length);
            if(vosk_model_find_word(model.Value,Encoding.UTF8.GetBytes(head+"\0"))<0)continue;
            string tail=DictionaryTokens(value.Substring(length),cache);
            if(tail!=null)return cache[value]=tail.Length==0?head:head+" "+tail;
        }
        return cache[value]=null;
    }
    static readonly string[] editWords={"첫 번째 계약","두 번째 계약","세 번째 계약","몇 번째 미션","수량","얼마나","다음 목적지","아직","아니","다 취소","잘 모르겠어","적재 완료","배송 완료"};
    static readonly string[] spokenOrdinals={"첫","두","세","네","다섯","여섯","일곱","여덟","아홉","열"};
    static readonly string[] quantityFillers={"일","이","삼","사","오","육","칠","팔","구","십","십일","십이","십삼","십사","십오","십육","십칠","십팔","십구","이십","삼십"};
    static string ReceiptPair(byte[] pcm,Phrase free,string[] hints,CancellationToken stop,out string partialPlace,out int quantity){
        string heard=free.text;quantity=0;
        partialPlace=null;
        if(hints==null||hints.Length==0||pcm.Length<32000||pcm.Length>320000||
            !Regex.IsMatch(heard,@"(?:로|으로|바꿔|수정|변경)")||
            Regex.IsMatch(heard,@"(?:말고|취소|하지|아니|어디|얼마|제외|삭제|에서)"))return null;
        if(Regex.IsMatch(heard,@"(?:번|번째|째)\s*(?:계약|미션)")&&Regex.IsMatch(heard,@"(?:으?로)\s*(?:바꿔|고쳐|변경|수정)")){
            string compact=heard.Replace(" ","");
            foreach(string hint in hints){
                var fields=hint.Split('|');
                if(fields.Length==3&&compact.Contains(fields[1].Replace(" ",""))&&compact.Contains(fields[2].Replace(" ","")))return null;
            }
        }
        var cache=new Dictionary<string,string>();
        var grammar=new List<string>(editWords);
        foreach(string n in quantityFillers)grammar.Add(n+" 로 바꿔");
        var phrases=new Dictionary<string,string>();
        foreach(string hint in hints){
            string[] fields=hint.Split('|');
            if(fields.Length!=3)continue;
            string to=DictionaryTokens(fields[1].Replace(" ",""),cache);
            string cargo=DictionaryTokens(fields[2].Replace(" ",""),cache);
            if(to==null||cargo==null)continue;
            foreach(string middle in new[]{" 에 내릴 "," 행 "}){
                string expression=to+middle+cargo;
                int number;
                if(Int32.TryParse(fields[0],out number)&&number>=1&&number<=spokenOrdinals.Length)
                    grammar.Add(spokenOrdinals[number-1]+" 번째 계약 "+expression+" 만");
                if(phrases.ContainsKey(expression))continue;
                phrases.Add(expression,fields[1]+"|"+fields[2]);
                grammar.Add(expression+" 만");
            }
        }
        if(phrases.Count==0)return null;
        var constrained=CheckRecording(pcm,grammar.ToArray(),stop);
        if(constrained==null||constrained.result==null)return null;
        var spoken=new StringBuilder(" ");
        foreach(var w in constrained.result)spoken.Append(w.conf>=.80f?w.word:"?").Append(' ');
        string transcript=spoken.ToString();
        if(!transcript.EndsWith(" 바꿔 ",StringComparison.Ordinal)){
            // A place heard independently by both decoders can support a question only.
            string compactHeard=heard.Replace(" ","");
            foreach(var hint in hints){
                string place=hint.Split('|')[1].Replace(" ","");
                if(place.Length<2||!transcript.StartsWith(" "+DictionaryTokens(place,cache)+" ",StringComparison.Ordinal))continue;
                if(compactHeard.Length<place.Length||Initials(compactHeard.Substring(0,place.Length))!=Initials(place)||
                    compactHeard.Substring(1,place.Length-1)!=place.Substring(1))continue;
                if(partialPlace!=null&&partialPlace!=place){partialPlace=null;break;}
                partialPlace=place;
            }
            return null;
        }
        // Several commodities may share a destination. Preserve the place as a
        // question even when the complete row does not clear the confidence check.
        var possiblePlaces=new HashSet<string>();
        foreach(string hint in hints){
            var fields=hint.Split('|');
            if(fields.Length!=3)continue;
            string to=DictionaryTokens(fields[1].Replace(" ",""),cache);
            if(to!=null&&(transcript.Contains(" "+to+" 에 내릴 ")||transcript.Contains(" "+to+" 행 ")))possiblePlaces.Add(fields[1]);
        }
        if(possiblePlaces.Count==1)foreach(var place in possiblePlaces)partialPlace=place;
        string chosen=null;
        foreach(var pair in phrases){
            var expected=pair.Key.Split(' ');
            bool matched=false;
            for(int start=0;start+expected.Length<=constrained.result.Length;start++){
                float sum=0;
                for(int i=0;i<expected.Length;i++){
                    var word=constrained.result[start+i];
                    if(word.word!=expected[i]||word.conf<.50f)break;
                    sum+=word.conf;
                    if(i+1==expected.Length&&sum/expected.Length>=.86f)matched=true;
                }
            }
            if(!matched)continue;
            if(chosen!=null&&chosen!=pair.Value)return null;
            chosen=pair.Value;
        }
        if(chosen!=null||partialPlace!=null)quantity=EmbeddedQuantity(pcm,constrained,free,stop);
        return chosen;
    }
    // Recover a misheard commodity only when the card ordinal and amount already came
    // through in free dictation. The restricted pass must hear the same complete edit.
    static string MultiStopEdit(byte[] pcm,Phrase free,string[] hints,CancellationToken stop){
        if(hints==null||hints.Length==0||pcm.Length>320000)return null;
        var utterance=Regex.Match(free.text,@"^(첫|두|세|네|다섯|여섯|일곱|여덟|아홉|열)\s*번째\s*(?:의\s*)?(계약|미션)\s+([가-힣 ]{2,36}?)\s+(\[\d{1,2}\]|[일이삼사오육칠팔구십 ]{1,8})\s*(?:으로|로)\s*([가-힣 ]{1,12})$");
        if(!utterance.Success||Regex.IsMatch(free.text,@"취소|말고|하지|아니|대신|어디|에서"))return null;
        string ordinal=utterance.Groups[1].Value;
        string card=(Array.IndexOf(spokenOrdinals,ordinal)+1).ToString();
        string cargoHeard=utterance.Groups[3].Value.Replace(" ","").TrimEnd('을','를');
        int n=RecognizedQuantity(utterance.Groups[4].Value.Replace(" ",""));
        if(n==0)return null;
        var stops=new Dictionary<string,HashSet<string>>();
        foreach(string hint in hints){
            var parts=hint.Split('|');
            if(parts.Length!=3||parts[0]!=card)continue;
            HashSet<string> set;
            if(!stops.TryGetValue(parts[2],out set))stops.Add(parts[2],set=new HashSet<string>());
            set.Add(parts[1]);
        }
        var cache=new Dictionary<string,string>();
        var grammar=new List<string>{"취소","말고","다시","어디","아직"};
        string prefix=ordinal+" 번째 "+utterance.Groups[2].Value+" ";
        string candidate=null,token=null;
        foreach(var item in stops){
            string name=item.Key.Replace(" ","");
            string word=DictionaryTokens(name,cache);
            if(word==null)continue;
            grammar.Add(prefix+word+" 수량 을");
            if(item.Value.Count<2||name.Length>cargoHeard.Length)continue;
            foreach(string destination in item.Value)if(cargoHeard.Contains(destination.Replace(" ","")))return null;
            int same=0;
            for(int i=0;i<name.Length;i++)if(Vowel(name[i])==Vowel(cargoHeard[i]))same++;
            if(same<2||same<name.Length-1)continue;
            if(candidate!=null)return null;
            candidate=item.Key;token=word;
        }
        if(candidate==null)return null;
        if(free.Confidence>=.85f&&Regex.IsMatch(cargoHeard,"^"+Regex.Escape(candidate.Replace(" ",""))+"[을를]?(?:수량[을은]?)?$")&&Regex.IsMatch(utterance.Groups[5].Value,@"^(?:바꿔|고쳐|수정해|변경해)"))return null;
        for(int i=1;i<100;i++)grammar.Add(Sino(i)+" 로 바꿔");
        grammar.Add("바꿔 줘");grammar.Add("변경해 줘");
        var check=CheckRecording(pcm,grammar.ToArray(),stop);
        if(check==null||check.result==null||Array.Exists(check.result,w=>w.conf<.70f))return null;
        string condensed=check.text.Replace(" ","");
        string expected=(prefix+token+"수량").Replace(" ","");
        if(!Regex.IsMatch(condensed,"^"+Regex.Escape(expected)+"을?"+Sino(n)+"(?:으로|로)(?:바꿔|변경해)(?:줘)?$"))return null;
        return card+"번 계약 "+candidate+" 수량 "+n+"로 바꿔";
    }
    static bool SimilarPlaceSound(string heard,string place){
        if(heard.Length!=place.Length||place.Length<2)return false;
        int aligned=0;
        for(int i=0;i<place.Length;i++){
            int a=Vowel(heard[i]),b=Vowel(place[i]);
            if(a<0||b<0)return false;
            if(a==b)aligned++;
            else if(!((a==Vowel('오')&&b==Vowel('우'))||(a==Vowel('우')&&b==Vowel('오'))))return false;
        }
        return aligned>=place.Length-1;
    }
    static void ReadPlaceReply(byte[] pcm,Phrase free,string[] choices,CancellationToken stop){
        if(choices.Length<2||choices.Length>12||pcm.Length>96000||String.IsNullOrWhiteSpace(free.text))return;
        string heard=Regex.Replace(free.text,@"\[([1-9])\]",m=>Sino(Int32.Parse(m.Groups[1].Value))).Replace(" ","");
        heard=Regex.Replace(heard,@"(?:이요|이에요|예요|이야|요)$","");
        if(Regex.IsMatch(heard,@"취소|말고|아니|그만"))return;
        int exact=Array.FindIndex(choices,x=>x.Replace(" ","")==heard);
        if(exact>=0&&free.Confidence>=.85f){free.PlaceOption=exact+1;return;}
        var cache=new Dictionary<string,string>();
        var grammar=new List<string>{"아니","취소","네","다시","몰라","다른 곳"};
        int plausible=-1;
        for(int i=0;i<choices.Length;i++){
            string place=choices[i].Replace(" ","");
            string tokens=DictionaryTokens(place,cache);
            if(tokens!=null)grammar.Add(tokens);
            if(!SimilarPlaceSound(heard,place))continue;
            if(plausible>=0)return;
            plausible=i;
        }
        if(plausible<0)return;
        var check=CheckRecording(pcm,grammar.ToArray(),stop);
        if(check==null||check.result==null||check.result.Length==0||Array.Exists(check.result,w=>w.conf<.85f)||
            check.text.Replace(" ","")!=choices[plausible].Replace(" ",""))return;
        free.PlaceOption=plausible+1;
        free.ReviewPlace=true;
    }
    static readonly string[] yesWords={"네","예","응","맞아","맞아요","맞습니다","그래"};
    static readonly string[] answerGrammar={"네","예","응","맞아","그래","아니","아니요","취소"};
    internal static bool Affirmative(string text){return Array.IndexOf(yesWords,(text??"").Replace(" ",""))>=0;}
    static Phrase CheckRecording(byte[] pcm,string[] grammar,CancellationToken stop){
        stop.ThrowIfCancellationRequested();
        IntPtr check=GrammarDecoder(grammar);
        if(check==IntPtr.Zero)return null;
        try{
            vosk_recognizer_set_words(check,1);
            // Give the decoder quiet frames at the boundaries of a button-held clip.
            const int padding=8000; // 250 ms at 16 kHz, signed 16-bit mono
            var padded=new byte[pcm.Length+2*padding];Buffer.BlockCopy(pcm,0,padded,padding,pcm.Length);
            int ended=vosk_recognizer_accept_waveform(check,padded,padded.Length);
            if(ended<0)return null;
            return Read(ended==0?vosk_recognizer_final_result(check):vosk_recognizer_result(check));
        }finally{vosk_recognizer_free(check);}
    }
    // Only recheck an isolated, similar-sounding name. A constrained decoder
    // alone can fit ordinary conversation to a wake word.
    Phrase CheckName(Phrase phrase){
        try{
            string initials=Initials(phrase.text??"");
            if(Array.IndexOf(names,phrase.text)>=0||!Array.Exists(names,n=>Initials(n)==initials))return phrase;
            IntPtr check=GrammarDecoder(names);
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
    internal sealed class Word {[DataMember] public float conf {get;set;} [DataMember] public string word {get;set;} [DataMember] public double start {get;set;} [DataMember] public double end {get;set;}}
    [DataContract]
    internal sealed class Phrase {
        [DataMember] public string text {get;set;}
        internal int SuggestedQuantity,PlaceOption;
        internal bool ReviewPlace;
        internal string MultiStopReview,CargoReadback,ReceiptPairHint,PartialReceiptPlace;
        internal bool ConfirmedAnswer;
        [DataMember] public Word[] result {get;set;}
        internal float Confidence {get{
            if(result==null||result.Length==0)return 0;
            float total=0;foreach(var word in result)total+=word.conf;
            return total/result.Length;
        }}
    }
    static Phrase Read(IntPtr pointer){return ReadJson<Phrase>(pointer);}
    static T ReadJson<T>(IntPtr pointer){
        int size=0;while(Marshal.ReadByte(pointer,size)!=0)size++;
        var bytes=new byte[size];Marshal.Copy(pointer,bytes,0,size);
        using(var stream=new MemoryStream(bytes,false))return (T)new DataContractJsonSerializer(typeof(T)).ReadObject(stream);
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
    internal static Phrase FromRecording(byte[] pcm,CancellationToken stop,string cargoStep=null,bool verifyingCargo=false,string[] receiptHints=null,bool quantityReply=false,bool receiptConfirm=false,string[] placeOptions=null){
        using(var engine=new KoreanRecognition()){
            var parts=new List<string>();var words=new List<Word>();
            Action<Phrase> collect=p=>{if(p!=null&&!String.IsNullOrWhiteSpace(p.text)){parts.Add(p.text);if(p.result!=null)words.AddRange(p.result);}};
            var buffer=new byte[8000];
            for(int i=0;i<pcm.Length;i+=buffer.Length){
                stop.ThrowIfCancellationRequested();
                int n=Math.Min(pcm.Length-i,buffer.Length);Buffer.BlockCopy(pcm,i,buffer,0,n);collect(engine.Feed(buffer,n));
            }
            collect(engine.Finish());
            var phrase=new Phrase{text=String.Join(" ",parts.ToArray()),result=words.ToArray()};
            if((verifyingCargo||receiptConfirm)&&pcm.Length<=64000&&Affirmative(phrase.text)&&phrase.Confidence>=.60f&&phrase.Confidence<.85f){
                var check=CheckRecording(pcm,answerGrammar,stop);
                phrase.ConfirmedAnswer=check!=null&&check.Confidence>=.93f&&Affirmative(check.text);
            }else if(cargoStep!=null)phrase.CargoReadback=CheckCargo(pcm,phrase,cargoStep,stop);
            if(phrase.CargoReadback==null&&receiptHints!=null)phrase.MultiStopReview=MultiStopEdit(pcm,phrase,receiptHints,stop);
            if(phrase.CargoReadback==null&&phrase.MultiStopReview==null&&receiptHints!=null)phrase.ReceiptPairHint=ReceiptPair(pcm,phrase,receiptHints,stop,out phrase.PartialReceiptPlace,out phrase.SuggestedQuantity);
            if(placeOptions!=null)ReadPlaceReply(pcm,phrase,placeOptions,stop);
            if(quantityReply)phrase.SuggestedQuantity=ReplyQuantity(pcm,phrase,stop);
            return phrase;
        }
    }
    public void Dispose(){if(decoder!=IntPtr.Zero){vosk_recognizer_free(decoder);decoder=IntPtr.Zero;}}
}
