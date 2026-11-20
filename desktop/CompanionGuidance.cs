using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Media;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Speech.Recognition;
using System.Speech.Synthesis;
using System.Text.RegularExpressions;
using System.Windows.Forms;
using System.Web.Script.Serialization;

internal sealed partial class CompanionOverlay {
    // The microphone and spoken replies are separate preferences.
    internal string Narrator {get;private set;}
    SpeechSynthesizer narrator;
    CancellationTokenSource localSpeech;
    SoundPlayer player;
    static readonly HttpClient localTts=new HttpClient(new HttpClientHandler {UseProxy=false,AllowAutoRedirect=false}) {
        BaseAddress=new Uri("http://127.0.0.1:7788/"),Timeout=TimeSpan.FromSeconds(18),MaxResponseContentBufferSize=8*1024*1024
    };
    static bool ValidNarrator(string id){return id=="female"||id=="male"||id=="supertonic-female"||id=="supertonic-male";}
    bool FemaleVoice {get{return Narrator=="female"||Narrator=="supertonic-female";}}
    volatile bool narrating;
    volatile bool ignoreUtterance;
    DateTime answerUntil=DateTime.MinValue,quoteRequested=DateTime.MinValue;
    bool readQuote;
    string displayedMode,lastTask,lastReply,summaryLines="";
    Dictionary<string,object> facts;
    readonly Dictionary<string,string> queries=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);

    void AddQuestion(string name,string command){
        foreach(var suffix in english?new[]{""," please"}:new[]{" 알려줘"," 띄워줘"," 알려 주세요"}){
            AddPhrase(name+suffix,command);
        }
    }
    void AddPhrase(string phrase,string command){
        string prior;
        queries[phrase]=queries.TryGetValue(phrase,out prior)&&prior!=command?"ambiguous":command;
    }
    void LoadQuestions(){
        AddQuestion(T("다음 목적지","next destination"),"destination");
        AddQuestion(T("다음 작업","next task"),"task");
        AddQuestion(T("적재 수량","cargo quantity"),"load");
        AddQuestion(T("자본","cash balance"),"cash");
        AddQuestion(T("실현 손익","realized profit"),"profit");
        queries[T("다음 목적지는 어디야","where are we going")]="destination";
        queries[T("얼마나 실어야 해","how much should I load")]="load";
        queries[T("얼마나 실어야 돼","how much cargo")]="load";
        var file=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"app","data","voice-goods.json");
        if(!File.Exists(file))return;
        var goods=new JavaScriptSerializer().Deserialize<List<Dictionary<string,object>>>(File.ReadAllText(file));
        foreach(var good in goods){
            string name=Regex.Replace(Convert.ToString(good[english?"en":"ko"]),@"[^\p{L}\p{N}]+"," ").Trim();
            if(name.Length==0)continue;
            string id=Convert.ToString(good["id"],CultureInfo.InvariantCulture);
            AddQuestion(english?name+" buy price":name+" 매입가","quote-buy:"+id);
            AddQuestion(english?name+" sell price":name+" 판매가","quote-sell:"+id);
            AddPhrase(english?"where can I buy "+name:name+" 어디서 사","quote-buy:"+id);
            AddPhrase(english?"where can I sell "+name:name+" 어디서 팔아","quote-sell:"+id);
        }
    }
    void AddQueries(Choices choices){foreach(var phrase in queries.Keys)choices.Add(phrase);}

    internal void SetNarrator(string choice){
        StopNarration();
        Narrator=ValidNarrator(choice)?choice:"off";
        Save();
        ReportTalk(Narrator=="off"?T("음성 안내 꺼짐","Spoken guidance off"):T("음성 안내 켜짐","Spoken guidance on"));
    }
    internal void PreviewNarrator(){
        if(Narrator=="off"){ReportTalk(T("먼저 음성 안내 목소리를 선택하세요.","Choose a guidance voice first."));return;}
        if(!english&&Narrator.StartsWith("supertonic-")){
            PreviewSample();return;
        }
        Say(T("다음 목적지는 로어빌입니다. 금 8 SCU를 적재해 주십시오.","Your next destination is Lorville. Load eight SCU of gold."));
    }
    async void PreviewSample(){
        StopNarration();
        var request=new CancellationTokenSource();
        localSpeech=request;
        try{
            var filename=FemaleVoice?"partner-female-ko.wav":"partner-male-ko.wav";
            using(var sound=new SoundPlayer(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"app","desktop","voices",filename))){
                player=sound;ignoreUtterance=true;narrating=true;
                await Task.Run(()=>{if(!request.IsCancellationRequested)sound.PlaySync();});
            }
        }catch(Exception e){if(!request.IsCancellationRequested)ReportTalk(e.Message);}
        finally{if(localSpeech==request){localSpeech=null;player=null;narrating=false;}request.Dispose();}
    }
    void StopNarration(){
        if(localSpeech!=null){localSpeech.Cancel();localSpeech=null;}
        if(player!=null){player.Stop();player=null;}
        if(narrator!=null){try{narrator.SpeakAsyncCancelAll();}catch(InvalidOperationException){}narrator.Dispose();narrator=null;}
        narrating=false;
    }
    static string Friendly(string text){
        if(text.Contains("운송이 끝났습니다."))return "야호, 함장님! 이번 운송도 해냈어요!";
        bool travel=text.StartsWith("다음 목적지는 ")||text.StartsWith("다음 무역 목적지는 ");
        bool cargo=text.Contains("적재해 주십시오.")||text.Contains("배송해 주십시오.");
        string lead=travel?"좋아! 함장님, ":cargo?"자자, ":"";
        return lead+Regex.Replace(text.Replace("다음 목적지는 ","다음은 "),@"(\S)입니다\.",m=>{
            char c=m.Groups[1].Value[0];
            bool consonant=c>='가'&&c<='힣'&&(c-'가')%28!=0;
            return c+(consonant?"이에요.":"예요.");
        }).Replace("적재해 주십시오.","실어 봐요!").Replace("배송해 주십시오.","배송해 봐요!")
          .Replace("해 주십시오.","해 주세요!").Replace("없습니다.","없어요.").Replace("살 수 있습니다.","살 수 있어요!").Replace("팔 수 있습니다.","팔 수 있어요!").Replace("도착했습니다.","도착했어요.").Replace("끝났습니다.","끝났어요.");
    }
    void Say(string text){
        if(Narrator=="off"||Listening||String.IsNullOrEmpty(text))return;
        if(FemaleVoice&&!english)text=Friendly(text);
        if(!english)text=text.Replace("SCU","에스씨유").Replace("aUEC","에이유이씨");
        if(Narrator.StartsWith("supertonic-")){SpeakLocal(text);return;}
        try{
            if(narrator==null){
                narrator=new SpeechSynthesizer();
                var gender=Narrator=="female"?VoiceGender.Female:VoiceGender.Male;
                VoiceInfo voice=null;
                foreach(var v in narrator.GetInstalledVoices()){
                    if(!v.Enabled||v.VoiceInfo.Culture.TwoLetterISOLanguageName!=(english?"en":"ko"))continue;
                    if(voice==null)voice=v.VoiceInfo;
                    if(v.VoiceInfo.Gender==gender){voice=v.VoiceInfo;break;}
                }
                if(voice==null)throw new InvalidOperationException(T("Windows 한국어 읽기 음성을 설치하세요.","Install an English Windows text-to-speech voice."));
                narrator.SelectVoice(voice.Name);
                narrator.SetOutputToDefaultAudioDevice();
                narrator.Rate=Narrator=="female"?1:-1;
                var owner=narrator;
                narrator.StateChanged+=(sender,e)=>{if(narrator==owner)narrating=e.State!=SynthesizerState.Ready;};
            }
            narrator.SpeakAsyncCancelAll();
            ignoreUtterance=true;narrating=true;
            narrator.SpeakAsync(text);
        }catch(Exception e){StopNarration();status.Text=e.Message;}
    }
    async void SpeakLocal(string text){
        StopNarration();
        var request=new CancellationTokenSource();
        localSpeech=request;
        try{
            var payload=new JavaScriptSerializer().Serialize(new {text=text,voice=FemaleVoice?"F1":"M1",lang=english?"en":"ko",speed=FemaleVoice?1.08:0.97});
            using(var content=new StringContent(payload,Encoding.UTF8,"application/json"))
            using(var response=await localTts.PostAsync("v1/tts",content,request.Token)){
                response.EnsureSuccessStatusCode();
                var bytes=await response.Content.ReadAsByteArrayAsync();
                if(bytes.Length<44||Encoding.ASCII.GetString(bytes,0,4)!="RIFF"||Encoding.ASCII.GetString(bytes,8,4)!="WAVE")throw new InvalidDataException();
                if(request.IsCancellationRequested)return;
                using(var stream=new MemoryStream(bytes,false))
                using(var sound=new SoundPlayer(stream)){
                    sound.Load();player=sound;ignoreUtterance=true;narrating=true;
                    await Task.Run(()=>{if(!request.IsCancellationRequested)sound.PlaySync();});
                }
            }
        }catch(Exception){
            if(!request.IsCancellationRequested)ReportTalk(T("Supertonic 연결을 확인하세요 · 로컬 서버 실행: supertonic serve","Start the local Supertonic server: supertonic serve"));
        }finally{
            if(localSpeech==request){localSpeech=null;player=null;narrating=false;}
            request.Dispose();
        }
    }
    void Answer(string text,bool aloud){
        body.Text=text;answerUntil=DateTime.UtcNow.AddSeconds(10);
        if(aloud)Say(text);
    }
    void ClearGuidance(){
        if(displayedMode!=null)StopNarration();
        displayedMode=null;facts=null;lastTask=null;lastReply=null;
        quoteRequested=answerUntil=DateTime.MinValue;
    }
    void UpdateGuidance(Dictionary<string,object> display){
        object raw;
        var mode=Convert.ToString(display["mode"]);
        if(displayedMode!=mode)ClearGuidance();
        displayedMode=mode;
        facts=display.TryGetValue("guidance",out raw)?raw as Dictionary<string,object>:null;
        string task=facts!=null&&facts.TryGetValue("task",out raw)?Convert.ToString(raw):"";
        if(task!=lastTask){
            lastTask=task;answerUntil=DateTime.MinValue;
            if(task.Length!=0)Say(task);
        }
        var answer=display.TryGetValue("answer",out raw)?raw as Dictionary<string,object>:null;
        if(answer!=null&&Convert.ToString(answer["id"])!=lastReply){
            lastReply=Convert.ToString(answer["id"]);
            if((DateTime.UtcNow-quoteRequested).TotalSeconds<40)Answer(Convert.ToString(answer["text"]),readQuote);
            quoteRequested=DateTime.MinValue;
        }
        if(DateTime.UtcNow>=answerUntil)body.Text=summaryLines;
    }
    bool Query(string phrase,float confidence){
        string key;if(confidence<.8f||!queries.TryGetValue(phrase,out key))return false;
        bool aloud=!phrase.EndsWith("띄워줘",StringComparison.Ordinal);
        if((DateTime.UtcNow-received).TotalSeconds>10){Answer(T("연결된 화면의 최신 정보가 없습니다.","No current connected view."),aloud);return true;}
        if(key.StartsWith("quote-")&&(displayedMode=="personal"||displayedMode=="fleet")){
            if((DateTime.UtcNow-quoteRequested).TotalSeconds<40)return true;
            quoteRequested=DateTime.UtcNow;readQuote=aloud;send(key);return true;
        }
        object value;
        string reply=facts!=null&&facts.TryGetValue(key,out value)?Convert.ToString(value):"";
        if(String.IsNullOrWhiteSpace(reply))reply=T("현재 화면에서 확인할 수 있는 정보가 없습니다.","That information is unavailable in this view.");
        Answer(reply,aloud);return true;
    }
}
