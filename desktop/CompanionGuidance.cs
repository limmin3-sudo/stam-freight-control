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

    sealed class HelpCopy {
        public string[] examples {get;set;}
        public string[][] groups {get;set;}
        public string answer {get;set;}
    }
    sealed class HelpTopic {
        public string id {get;set;}
        public HelpCopy ko {get;set;}
        public HelpCopy en {get;set;}
    }
    readonly Dictionary<string,HelpCopy> help=new Dictionary<string,HelpCopy>();
    readonly Dictionary<string,string> goodNames=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);
    static string Normal(string s){return Regex.Replace(s.ToLowerInvariant(),@"[^\p{L}\p{N}]+","");}
    static bool ContainsAny(string phrase,params string[] words){
        return Array.Exists(words,word=>phrase.Contains(word));
    }
    string MatchHelp(string phrase){
        string best=null;int highest=0;
        foreach(var entry in help){
            int score=0;
            foreach(var group in entry.Value.groups){
                int longest=0;
                foreach(string word in group)if(phrase.Contains(word))longest=Math.Max(longest,word.Length);
                if(longest==0){score=0;break;}
                score+=100+longest;
            }
            if(score>highest){highest=score;best=entry.Key;}
        }
        return best;
    }
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
        queries[T("다 실었는데 어디로 가","where do I go after loading")]="afterLoad";
        queries[T("다음 목적지는 어디야","where are we going")]="destination";
        queries[T("얼마나 실어야 해","how much should I load")]="load";
        queries[T("얼마나 실어야 돼","how much cargo")]="load";
        var helpFile=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"app","data","companion-help.json");
        if(File.Exists(helpFile)){
            var topics=new JavaScriptSerializer().Deserialize<List<HelpTopic>>(File.ReadAllText(helpFile));
            foreach(var topic in topics){
                string key="help-"+topic.id;
                var copy=english?topic.en:topic.ko;
                help.Add(key,copy);
                foreach(string example in copy.examples)AddPhrase(example,key);
            }
        }
        var file=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"app","data","voice-goods.json");
        if(!File.Exists(file))return;
        var goods=new JavaScriptSerializer().Deserialize<List<Dictionary<string,object>>>(File.ReadAllText(file));
        foreach(var good in goods){
            string name=Regex.Replace(Convert.ToString(good[english?"en":"ko"]),@"[^\p{L}\p{N}]+"," ").Trim();
            if(name.Length==0)continue;
            string id=Convert.ToString(good["id"],CultureInfo.InvariantCulture);
            string alias=Normal(name),prior;
            goodNames[alias]=goodNames.TryGetValue(alias,out prior)&&prior!=id?"":id;
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
          .Replace("하십시오.","해 주세요.").Replace("누르십시오.","눌러 주세요.").Replace("펼치십시오.","펼쳐 주세요.").Replace("물어보십시오.","물어봐 주세요.").Replace("고르십시오.","골라 주세요.").Replace("주십시오.","주세요.").Replace("합니다.","해요.").Replace("됩니다.","돼요.").Replace("있습니다.","있어요.").Replace("없습니다.","없어요.").Replace("입니까?","인가요?").Replace("찾으십니까?","찾아요?").Replace("말씀해 주세요.","말해 주세요!").Replace("살 수 있습니다.","살 수 있어요!").Replace("팔 수 있습니다.","팔 수 있어요!").Replace("도착했습니다.","도착했어요.").Replace("끝났습니다.","끝났어요.");
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
    string pendingGood,pendingSide,pendingAmount;
    DateTime clarifyUntil=DateTime.MinValue;
    void EndClarification(){
        pendingGood=pendingSide=pendingAmount=null;clarifyUntil=DateTime.MinValue;
    }
    void ClearGuidance(){
        EndClarification();
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
    static string SpokenAmount(string phrase,bool followup,out bool invalid){
        invalid=false;
        string unit=@"(?:scu|에스\s*씨\s*유|에스\s*시\s*유)";
        var m=Regex.Match(phrase,@"(?<![0-9.,-])([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)\s*"+unit,RegexOptions.IgnoreCase);
        if(followup&&!m.Success)m=Regex.Match(phrase,@"^\s*([0-9]+)\s*(?:이요|요|이야)?\s*[.!?]?\s*$");
        if(m.Success){
            int value;
            if(Int32.TryParse(m.Groups[1].Value.Replace(",",""),out value)&&value>0&&value<1000000)return value.ToString(CultureInfo.InvariantCulture);
            invalid=true;return null;
        }
        var spelled=Regex.Match(phrase,@"([일이삼사오육칠팔구십백천만]+)\s*"+unit,RegexOptions.IgnoreCase);
        if(!spelled.Success&&followup)spelled=Regex.Match(phrase,@"^\s*([일이삼사오육칠팔구십백천만]+)\s*(?:이요|요)?[.!?]?\s*$");
        if(spelled.Success){
            int total=0,part=0,digit=0;
            foreach(char ch in spelled.Groups[1].Value){
                int n="일이삼사오육칠팔구".IndexOf(ch)+1;
                if(n>0){digit=n;continue;}
                if(ch=='만'){total+=Math.Max(1,part+digit)*10000;part=0;}
                else part+=Math.Max(1,digit)*(ch=='천'?1000:ch=='백'?100:10);
                digit=0;
            }
            int amount=total+part+digit;
            if(amount>0&&amount<1000000)return amount.ToString(CultureInfo.InvariantCulture);
        }
        invalid=Regex.IsMatch(phrase,unit,RegexOptions.IgnoreCase);
        return null;
    }
    string MarketQuestion(string phrase,string q){
        bool waiting=DateTime.UtcNow<clarifyUntil;
        bool buy=ContainsAny(q,"매입","구매","살수","사려","살만","사면","살까","어디서사","buy","purchase");
        bool sell=ContainsAny(q,"판매","팔수","팔아","팔면","팔까","팔지","팔만","팔려","팔고","팔곳","팔거","sell");
        if(!buy&&!sell&&!waiting&&!ContainsAny(q,"시세","가격","얼마에","quote","price"))return null;
        bool badAmount;string amount=SpokenAmount(phrase,waiting,out badAmount);
        string id=null;int length=0;
        foreach(var entry in goodNames){
            string name=entry.Key;
            if(!q.Contains(name)||name.Length<length)continue;
            // A one-character commodity such as 금 must not match 지금 or 자금.
            if(name.Length==1&&!Regex.IsMatch(phrase,@"(?<![가-힣])"+Regex.Escape(name)+@"(?=$|[\s0-9.,!?]|을|를|은|는|이|가|의|좀|어디|매입|판매|가격|시세)"))continue;
            if(name.Length==length&&entry.Value!=id)id="";
            else id=entry.Value;
            length=name.Length;
        }
        if(!waiting)EndClarification();
        if(id!=null)pendingGood=id;
        if(buy!=sell)pendingSide=buy?"buy":"sell";
        else if(buy)pendingSide=null;
        if(amount!=null)pendingAmount=amount;
        string prompt=null;
        if(badAmount){pendingAmount="?";prompt=T("몇 SCU인지 숫자로 다시 말씀해 주십시오.","How many SCU? Please repeat the number.");}
        else if(String.IsNullOrEmpty(pendingGood))prompt=T("어떤 품목입니까? 예를 들어 티타늄이라고 말씀해 주십시오.","Which commodity? For example, titanium.");
        else if(pendingSide==null)prompt=T("매입처와 판매처 중 어느 쪽을 찾으십니까?","Are you looking to buy or to sell?");
        else if(pendingAmount=="?")prompt=T("거래할 수량은 몇 SCU입니까?","How many SCU are you trading?");
        if(prompt!=null){clarifyUntil=DateTime.UtcNow.AddSeconds(60);return "ask:"+prompt;}
        string command="quote-"+pendingSide+":"+pendingGood+(pendingAmount==null?"":":"+pendingAmount);
        EndClarification();return command;
    }
    string LookupQuestion(string phrase){
        string key;string q=Normal(phrase);
        if(DateTime.UtcNow<clarifyUntil&&ContainsAny(q,"질문취소","취소","됐어","그만","cancel","nevermind")){
            EndClarification();return "ask:"+T("질문을 취소했습니다.","Question cancelled.");
        }
        if(queries.TryGetValue(phrase,out key)){
            if(!key.StartsWith("quote-")||DateTime.UtcNow>=clarifyUntil){EndClarification();return key;}
        }
        key=MatchHelp(q);
        if(key!=null){EndClarification();return key;}
        if(ContainsAny(q,"다실었","다싣고","적재후","적재끝","픽업끝","afterloading","finishedloading")&&ContainsAny(q,"어디","다음","where","next"))return "afterLoad";
        if(displayedMode=="personal"||displayedMode=="fleet"){
            key=MarketQuestion(phrase,q);
            if(key!=null)return key;
        }
        bool destination=ContainsAny(q,"목적지","어디로","어디가","어디야","어디에가","다음거점","다음배송지","destination","nextstop");
        bool load=ContainsAny(q,"얼마나실","얼마실","몇개실","몇개를실","몇에스씨유","적재량","적재수량","배송수량","몇scu","화물수량","howmuchcargo","howmuchshouldiload");
        if(destination&&load)return "task";
        if(load)return "load";
        if(destination)return "destination";
        if(ContainsAny(q,"다음작업","다음단계뭐","뭐해야","뭘해야","nexttask"))return "task";
        if(ContainsAny(q,"자본","잔액","잔고","cashbalance"))return "cash";
        if(ContainsAny(q,"손익","실현수익","실제수익","realizedprofit"))return "profit";
        return null;
    }
    bool Query(string phrase,float confidence){
        if(confidence<.62f)return false;
        string key=LookupQuestion(phrase);
        if(key==null)return false;
        bool aloud=!phrase.EndsWith("띄워줘",StringComparison.Ordinal);
        if(key.StartsWith("ask:")){Answer(key.Substring(4),aloud);return true;}
        HelpCopy copy;
        if(help.TryGetValue(key,out copy)){Answer(copy.answer,aloud);return true;}
        if(key=="quote-side"||key=="ambiguous"){
            Answer(T("품목과 매입 또는 판매를 함께 말해 주십시오. 예를 들어 금 어디서 팔아라고 물어보십시오.","Include an item and whether you are buying or selling, for example where can I sell gold."),aloud);
            return true;
        }
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
