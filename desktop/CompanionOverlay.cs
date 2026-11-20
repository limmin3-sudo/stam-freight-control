using System;
using System.Collections;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Speech.Recognition;
using System.Speech.AudioFormat;
using System.Windows.Forms;
using System.Web.Script.Serialization;

// Separate native display; no process injection, game input or arbitrary commands.
internal sealed partial class CompanionOverlay : Form {
    [DllImport("user32.dll")] static extern bool RegisterHotKey(IntPtr h,int id,uint modifiers,uint key);
    [DllImport("user32.dll")] static extern bool UnregisterHotKey(IntPtr h,int id);
    readonly Action<string> send;
    readonly bool english;
    readonly string settings;
    readonly HoloLabel heading=new HoloLabel(),body=new HoloLabel(),status=new HoloLabel();
    readonly PartnerPortrait portrait=new PartnerPortrait(true);
    readonly System.Windows.Forms.Timer expiry=new System.Windows.Forms.Timer();
    readonly List<int> registered=new List<int>();
    SpeechRecognitionEngine speech;
    DateTime received=DateTime.MinValue;
    bool interactive=false,disposing=false;
    readonly DeckButton pricesButton=new DeckButton(),workButton=new DeckButton();
    readonly DeckButton talkButton=new DeckButton(),continuousButton=new DeckButton();
    [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
    readonly System.Windows.Forms.Timer holdPoll=new System.Windows.Forms.Timer{Interval=15};
    readonly Func<IHoldCapture> openCapture;
    IHoldCapture heldMic;
    SpeechRecognitionEngine decoding;
    MemoryStream heldAudio;
    string heldStep,heldProposal;
    bool configuring;
    internal event Action TalkChanged;
    internal bool Listening {get{return heldMic!=null;}}
    string heardStep,lastSentStep;
    TimeSpan stepAudioStart;
    internal string ContinuousLabel {get{return VoiceEnabled?T("연속 듣기 끄기","Stop continuous listening"):T("연속 듣기 켜기","Listen continuously");}}
    string stepId,stepKind;
    internal string TalkStatus {get;private set;}
    const int GraveKey=0xC0;
    int keyTalk=GraveKey;
    static bool Chord(int key){return key>=(int)Keys.A&&key<=(int)Keys.Z;}
    static string KeyName(int key){return key==GraveKey?"`":Chord(key)?"Ctrl+Alt+"+(char)key:((Keys)key).ToString();}
    internal string TalkLabel {get{return Listening?T("듣는 중 · 키를 떼면 전송","Listening · release to send"):KeyName(keyTalk)+T(" 길게 눌러 말하기"," · hold to talk");}}
    static int ReadTalkKey(Dictionary<string,object> saved){
        object raw;int key;
        if(saved.TryGetValue("holdKey",out raw)&&Int32.TryParse(Convert.ToString(raw),out key)&&(key==GraveKey||Chord(key)||(key>=(int)Keys.F1&&key<=(int)Keys.F11)))return key;
        int old=Key(saved,"talk",(int)Keys.M);
        return old==(int)Keys.M?GraveKey:old;
    }
    int keyOverlay=(int)Keys.O,keyPrices=(int)Keys.P,keyWork=(int)Keys.W;
    string T(string ko,string en){return english?en:ko;}
    internal bool VoiceEnabled {get{return speech!=null;}}
    internal CompanionOverlay(Action<string> command,bool en,string directory,Func<IHoldCapture> captureFactory=null){
        openCapture=captureFactory??(()=>new HeldMicrophone());
        send=command;english=en;Narrator="off";LoadQuestions();settings=Path.Combine(directory,"overlay.json");
        Text=T("STAM 네비게이터 · 오버레이","STAM Navigator · Overlay");ShowInTaskbar=false;FormBorderStyle=FormBorderStyle.SizableToolWindow;TopMost=true;
        StartPosition=FormStartPosition.Manual;
        MinimumSize=new Size(390,310);
        Size=new Size(600,460);
        BackColor=DeckTheme.Housing;ForeColor=DeckTheme.Ink;
        var layout=new TableLayoutPanel{BackColor=DeckTheme.Housing,Dock=DockStyle.Fill,Padding=new Padding(12),ColumnCount=1,RowCount=3};
        layout.RowStyles.Add(new RowStyle(SizeType.Percent,100));layout.RowStyles.Add(new RowStyle(SizeType.Absolute,94));layout.RowStyles.Add(new RowStyle(SizeType.Absolute,44));Controls.Add(layout);
        heading.Dock=body.Dock=status.Dock=DockStyle.Fill;heading.Font=HoloFonts.At(15);body.Font=HoloFonts.At(17);status.Font=HoloFonts.At(12);heading.ForeColor=DeckTheme.Platinum;status.ForeColor=DeckTheme.Muted;
        body.Text=T("웹 상단의 부조종사를 열고 ‘네비게이터 연결’을 켜세요.","Open the web copilot and select Connect STAM Navigator.");
        var brief=new DeckSurface{ShowEmblem=true,Dock=DockStyle.Fill,Padding=new Padding(12,6,12,8),Margin=new Padding(0,0,0,8),ColumnCount=2,RowCount=2};
        brief.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,55));brief.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));
        brief.RowStyles.Add(new RowStyle(SizeType.Absolute,48));brief.RowStyles.Add(new RowStyle(SizeType.Percent,100));
        heading.Margin=body.Margin=Padding.Empty;portrait.Margin=new Padding(0,0,7,0);
        brief.Controls.Add(portrait,0,0);brief.Controls.Add(heading,1,0);brief.Controls.Add(body,0,1);brief.SetColumnSpan(body,2);layout.Controls.Add(brief);
        var actions=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=2,RowCount=2,BackColor=Color.Transparent};
        for(int i=0;i<2;i++){actions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,50));actions.RowStyles.Add(new RowStyle(SizeType.Percent,50));}
        foreach(var button in new[]{pricesButton,workButton}){
            bool first=button==pricesButton;button.Text=first?T("가격 보기","Prices"):T("내 작업","My work");
            button.Dock=DockStyle.Fill;button.Margin=new Padding(0,0,6,0);
            button.Click+=(s,e)=>{if(proposalId==null)send(first?"show-prices":"show-my-work");else CopilotRequest(first?"apply":"cancel",1,proposalId);};
            actions.Controls.Add(button);
        }talkButton.Dock=DockStyle.Fill;talkButton.Text=TalkLabel;talkButton.AccessibleDescription=T("키를 누르고 있는 동안 녹음합니다. 클릭하면 키 설정을 엽니다.","Hold the keyboard shortcut to record. Click to change it.");talkButton.Click+=(s,e)=>Configure();actions.Controls.Add(talkButton);
        continuousButton.Dock=DockStyle.Fill;continuousButton.Text=ContinuousLabel;continuousButton.Click+=(s,e)=>ToggleVoice();actions.Controls.Add(continuousButton);
        foreach(Control button in actions.Controls){button.Font=HoloFonts.At(13);}
        layout.Controls.Add(actions);layout.Controls.Add(status);
        try{var saved=new JavaScriptSerializer().Deserialize<Dictionary<string,object>>(File.ReadAllText(settings));object voice;if(saved.TryGetValue("narrator",out voice)&&ValidNarrator(voice as string))Narrator=(string)voice;Location=new Point(Convert.ToInt32(saved["x"]),Convert.ToInt32(saved["y"]));int w,h;
            if(saved.ContainsKey("width")&&saved.ContainsKey("height")&&int.TryParse(Convert.ToString(saved["width"]),out w)&&int.TryParse(Convert.ToString(saved["height"]),out h)&&w>0&&h>0){
                var area=Screen.FromPoint(Location).WorkingArea;
                Size=new Size(Math.Min(w,area.Width),Math.Min(h,area.Height));
            }
            keyOverlay=Key(saved,"overlay",keyOverlay);keyPrices=Key(saved,"prices",keyPrices);keyWork=Key(saved,"work",keyWork);keyTalk=ReadTalkKey(saved);}catch{Location=new Point(Screen.PrimaryScreen.WorkingArea.Right-Width-24,Screen.PrimaryScreen.WorkingArea.Top+40);}
        ShowPartner(null);
        if(keyTalk==keyOverlay||keyTalk==keyPrices||keyTalk==keyWork)keyTalk=GraveKey;
        holdPoll.Tick+=(s,e)=>CheckHeldKey();
        Clamp();expiry.Interval=1000;expiry.Tick+=(s,e)=>{if((DateTime.UtcNow-received).TotalSeconds>12&&(displayedMode!=null||DateTime.UtcNow>=answerUntil)){ClearGuidance();SetStep(null,null);body.Text=T("웹 화면 연결 대기","Waiting for the web view");ShowPartner(null);}};expiry.Start();
        FormClosing+=(s,e)=>{if(!disposing&&e.CloseReason==CloseReason.UserClosing){e.Cancel=true;Hide();}};
        Move+=(s,e)=>Save();ResizeEnd+=(s,e)=>{Clamp();Save();};
        // Create the message window even while the overlay is hidden.
        var ignored=Handle;RegisterKeys();
    }
    static int Key(Dictionary<string,object> s,string name,int fallback){int key=s.ContainsKey(name)?Convert.ToInt32(s[name]):fallback;return key>=(int)Keys.A&&key<=(int)Keys.Z?key:fallback;}
    void Save(){try{Directory.CreateDirectory(Path.GetDirectoryName(settings));File.WriteAllText(settings,new JavaScriptSerializer().Serialize(new{x=Left,y=Top,width=Width,height=Height,narrator=Narrator,overlay=keyOverlay,prices=keyPrices,work=keyWork,holdKey=keyTalk}));}catch{}}
    void Clamp(){var area=Screen.FromPoint(Location).WorkingArea;Size=new Size(Math.Min(Width,area.Width),Math.Min(Height,area.Height));Location=new Point(Math.Max(area.Left,Math.Min(Left,area.Right-Width)),Math.Max(area.Top,Math.Min(Top,area.Bottom-Height)));}
    protected override CreateParams CreateParams {get{var p=base.CreateParams;p.ExStyle|=0x80;if(!interactive)p.ExStyle|=0x20|0x80000|0x8000000;return p;}}
    [DllImport("user32.dll")]
    static extern bool SetLayeredWindowAttributes(IntPtr window,uint key,byte alpha,uint flags);
    protected override void OnHandleCreated(EventArgs e){
        base.OnHandleCreated(e);
        // Click-through uses a layered window even when the metal face is fully opaque.
        if(!interactive)SetLayeredWindowAttributes(Handle,0,255,2);
    }
    protected override bool ShowWithoutActivation {get{return !interactive;}}
    internal void Toggle(){if(Visible)Hide();else{Clamp();Show();}}
    internal void ToggleInput(){interactive=!interactive;RecreateHandle();RegisterKeys();status.Text=interactive?T("조작 모드 · 이동/버튼 사용","Input mode · move or click buttons"):T("클릭 통과 · 게임 입력 유지","Click-through mode");}
    void SetStep(string id,string kind){
        if(id==stepId&&kind==stepKind)return;
        stepId=id;stepKind=kind;heardStep=null;lastSentStep=null;
        stepAudioStart=speech==null?TimeSpan.Zero:speech.AudioPosition;
    }
    string linkedPartner;
    internal bool IsNavigator {get{return linkedPartner=="navigator"||(linkedPartner==null&&ValidNarrator(Narrator)&&!FemaleVoice);}}
    internal Color PartnerColor {get{return IsNavigator?DeckTheme.NavigatorInk:DeckTheme.OperatorInk;}}
    void ShowPartner(string partner){
        linkedPartner=partner=="operator"||partner=="navigator"?partner:null;
        heading.Text=PartnerPortrait.Title(IsNavigator,english);heading.ForeColor=PartnerColor;portrait.SelectPartner(IsNavigator,english);
    }
    internal void UpdateDisplay(object raw){var d=raw as Dictionary<string,object>;
        SetStep(d!=null&&d.ContainsKey("stepId")?Convert.ToString(d["stepId"]):null,
                d!=null&&d.ContainsKey("step")?Convert.ToString(d["step"]):null);
        if(d==null){if(displayedMode==null&&DateTime.UtcNow<answerUntil)return;ClearGuidance();received=DateTime.MinValue;ShowPartner(null);body.Text=T("웹 화면 연결 대기","Waiting for the web view");return;}received=DateTime.UtcNow;object partner;ShowPartner(d.TryGetValue("partner",out partner)?partner as string:null);var lines=new List<string>();var list=d["lines"] as IEnumerable;if(list!=null)foreach(var line in list)lines.Add(Convert.ToString(line));summaryLines=String.Join("\n",lines.ToArray());UpdateGuidance(d);}
    void RegisterKeys(){
        EndTalk();
        foreach(int id in registered)UnregisterHotKey(Handle,id);registered.Clear();
        int[] keys={keyOverlay,keyPrices,keyWork,keyTalk};
        for(int i=0;i<keys.Length;i++){
            uint modifiers=i==3&&!Chord(keyTalk)?0u:3u;
            if(RegisterHotKey(Handle,5100+i,0x4000u|modifiers,(uint)keys[i]))registered.Add(5100+i);
        }
        ReportTalk(registered.Count==4?TalkLabel:T("단축키 충돌 · 단축키 설정에서 변경하세요.","Shortcut unavailable · choose another key in settings."));
    }
    protected override void OnHandleDestroyed(EventArgs e){EndTalk();foreach(int id in registered)UnregisterHotKey(Handle,id);registered.Clear();base.OnHandleDestroyed(e);}
    protected override void WndProc(ref Message m){
        if(m.Msg==0x312){
            int id=m.WParam.ToInt32();
            if(configuring)return;
            if(id==5100)Toggle();else if(id==5101)send("show-prices");else if(id==5102)send("show-my-work");else if(id==5103)StartHeldTalk();
            return;
        }
        base.WndProc(ref m);
    }
    internal void Configure(){
        if(configuring)return;
        configuring=true;EndTalk();
        try{using(var dialog=new Form{Text=T("STAM 단축키","STAM shortcuts"),Size=new Size(460,325),StartPosition=FormStartPosition.CenterScreen,BackColor=BackColor,ForeColor=ForeColor,Font=HoloFonts.At(11),FormBorderStyle=FormBorderStyle.FixedDialog,MaximizeBox=false,MinimizeBox=false}){
            var surface=new DeckSurface{Dock=DockStyle.Fill};dialog.Controls.Add(surface);
            var panel=new FlowLayoutPanel{Dock=DockStyle.Fill,Padding=new Padding(16),FlowDirection=FlowDirection.TopDown,BackColor=Color.Transparent};surface.Controls.Add(panel);
            var boxes=new List<ComboBox>();int[] keys={keyOverlay,keyPrices,keyWork,keyTalk};
            string[] labels={T("오버레이","Overlay"),T("가격 보기","Prices"),T("내 작업","My work"),T("길게 눌러 말하기","Hold to talk")};
            var talkKeys=new List<int>{GraveKey};
            for(int k=(int)Keys.F1;k<=(int)Keys.F11;k++)talkKeys.Add(k);
            for(int k=(int)Keys.A;k<=(int)Keys.Z;k++)talkKeys.Add(k);
            for(int i=0;i<keys.Length;i++){
                var row=new FlowLayoutPanel{Width=400,Height=40,BackColor=Color.Transparent};
                row.Controls.Add(new Label{Text=labels[i],Width=170});
                var box=new ComboBox{DropDownStyle=ComboBoxStyle.DropDownList,Width=165};
                if(i==3){foreach(int k in talkKeys)box.Items.Add(KeyName(k));box.SelectedIndex=talkKeys.IndexOf(keyTalk);}
                else{for(int k=(int)Keys.A;k<=(int)Keys.Z;k++)box.Items.Add(KeyName(k));box.SelectedIndex=keys[i]-(int)Keys.A;}
                boxes.Add(box);row.Controls.Add(box);panel.Controls.Add(row);
            }
            var save=new DeckButton{Text=T("저장","Save"),Width=140,Height=36,Primary=true};
            save.Click+=(s,e)=>{
                int[] selected={boxes[0].SelectedIndex+(int)Keys.A,boxes[1].SelectedIndex+(int)Keys.A,boxes[2].SelectedIndex+(int)Keys.A,talkKeys[boxes[3].SelectedIndex]};
                if(new HashSet<int>(selected).Count!=4){MessageBox.Show(T("서로 다른 키를 선택하세요.","Choose different keys."));return;}
                keyOverlay=selected[0];keyPrices=selected[1];keyWork=selected[2];keyTalk=selected[3];RegisterKeys();
                if(registered.Count!=4){
                    string error=status.Text;
                    keyOverlay=keys[0];keyPrices=keys[1];keyWork=keys[2];keyTalk=keys[3];RegisterKeys();
                    MessageBox.Show(error);return;
                }
                Save();dialog.Close();
            };
            panel.Controls.Add(save);dialog.ShowDialog();
        }}finally{configuring=false;}
    }
    static string VoiceCommand(string word,float confidence){if(confidence<.8f)return null;return word=="STAM prices"||word=="스탐 가격"?"show-prices":word=="STAM my work"||word=="스탐 내 작업"?"show-my-work":word=="STAM trade"||word=="스탐 무역"?"open-trade":word=="STAM flight"||word=="스탐 운송"?"open-flight":word=="STAM overlay"||word=="스탐 오버레이"?"toggle-overlay":null;}
    Grammar CommandGrammar(RecognizerInfo engine){var phrases=new Choices(engine.Culture.TwoLetterISOLanguageName=="en"?new[]{"STAM prices","STAM my work","STAM overlay","STAM trade","STAM flight"}:new[]{"스탐 가격","스탐 내 작업","스탐 오버레이","스탐 무역","스탐 운송"});foreach(var word in FlightPhrases.Keys)if((word[0]<128)==(engine.Culture.TwoLetterISOLanguageName=="en"))phrases.Add(word);AddQueries(phrases);var builder=new GrammarBuilder{Culture=engine.Culture};builder.Append(phrases);return new Grammar(builder);}
    static readonly Dictionary<string,string> FlightPhrases=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase){
        {"다음 단계","next"},{"적재 완료","pickup"},{"픽업 완료","pickup"},{"배송 완료","delivery"},{"출발 완료","departure"},{"점프 완료","jump"},{"거점 작업 완료","stop"},
        {"next step","next"},{"loading complete","pickup"},{"pickup complete","pickup"},{"delivery complete","delivery"},{"departure complete","departure"},{"jump complete","jump"},{"stop complete","stop"}
    };
    static string FlightCommand(string phrase,float confidence,string captured,string current,string kind){
        string match;
        if(String.IsNullOrEmpty(captured)||captured!=current||confidence<.8f||!FlightPhrases.TryGetValue(phrase,out match))return null;
        return match=="next"||match==kind?"complete-flight:"+captured:null;
    }
    void ReportTalk(string message){
        TalkStatus=status.Text=message;
        talkButton.Text=TalkLabel;talkButton.Primary=Listening;talkButton.Invalidate();
        continuousButton.Text=ContinuousLabel;continuousButton.Primary=VoiceEnabled;continuousButton.Invalidate();
        if(TalkChanged!=null)TalkChanged();
    }
    void EndTalk(){
        holdPoll.Stop();
        if(heldMic!=null){heldMic.Dispose();heldMic=null;}
        var engine=decoding;decoding=null;
        if(engine!=null){try{engine.RecognizeAsyncCancel();}catch(InvalidOperationException){}engine.Dispose();}
        if(heldAudio!=null){heldAudio.Dispose();heldAudio=null;}
    }
    static void AddDictation(SpeechRecognitionEngine engine){
        try{var dictation=new DictationGrammar();dictation.Weight=.35f;engine.LoadGrammar(dictation);}
        catch(NotSupportedException){}catch(InvalidOperationException){}catch(ArgumentException){}
    }
    bool TalkKeyDown(){
        return GetAsyncKeyState(keyTalk)<0&&(!Chord(keyTalk)||(GetAsyncKeyState((int)Keys.ControlKey)<0&&GetAsyncKeyState((int)Keys.Menu)<0));
    }
    void StartHeldTalk(){
        if(heldMic!=null||!TalkKeyDown())return;
        if(VoiceEnabled){ReportTalk(T("연속 듣기 중","Continuous listening is on"));return;}
        if(decoding!=null){ReportTalk(T("직전 음성을 인식 중입니다. 잠시 뒤 다시 누르세요.","Finishing the previous phrase. Press again shortly."));return;}
        try{
            StopNarration();heldStep=stepId;heldProposal=proposalId;
            heldMic=openCapture();holdPoll.Start();
            CheckHeldKey();
            if(Listening)ReportTalk(T("듣는 중 · 키를 떼면 전송","Listening · release to send"));
        }catch(Exception error){EndTalk();ReportTalk(error.Message);}
    }
    void CheckHeldKey(){
        if(heldMic==null)return;
        try{
            if(TalkKeyDown()){heldMic.Drain();return;}
            holdPoll.Stop();
            heldAudio=heldMic.Finish();heldMic=null;
            if(heldAudio.Length==0){EndTalk();ReportTalk(T("입력된 음성이 없습니다.","No speech captured."));return;}
            DecodeHeldTalk();
        }catch(Exception error){EndTalk();ReportTalk(error.Message);}
    }
    void DecodeHeldTalk(){
        var selected=SelectRecognizer();
        var engine=new SpeechRecognitionEngine(selected);decoding=engine;
        engine.LoadGrammar(CommandGrammar(selected));AddDictation(engine);
        engine.SetInputToAudioStream(heldAudio,new SpeechAudioFormatInfo(16000,AudioBitsPerSample.Sixteen,AudioChannel.Mono));
        var words=new List<string>();float confidence=1f;bool commandGrammar=true;
        engine.SpeechRecognized+=(s,e)=>{
            words.Add(e.Result.Text);confidence=Math.Min(confidence,e.Result.Confidence);
            if(e.Result.Grammar is DictationGrammar)commandGrammar=false;
        };
        engine.RecognizeCompleted+=(s,e)=>{
            if(disposing||!IsHandleCreated)return;
            try{BeginInvoke((Action)(()=>{
                if(decoding!=engine)return;
                decoding=null;engine.Dispose();heldAudio.Dispose();heldAudio=null;
                if(e.Error!=null||e.Cancelled||words.Count==0){ReportTalk(e.Error==null?T("인식한 말이 없습니다.","No speech recognized."):e.Error.Message);return;}
                string phrase=String.Join(" ",words.ToArray());
                if(CopilotRequest(phrase,confidence,heldProposal)||Query(phrase,confidence)){ReportTalk(T("요청을 보냈습니다.","Request sent."));return;}
                string command=commandGrammar&&words.Count==1&&(DateTime.UtcNow-received).TotalSeconds<=10?FlightCommand(phrase,confidence,heldStep,stepId,stepKind):null;
                if(command!=null)send(command);
                ReportTalk(command!=null?T("현재 단계 완료 요청을 보냈습니다.","Current step completion requested."):T("일치하는 명령이 없습니다.","No matching command."));
            }));}catch(InvalidOperationException){}
        };
        engine.RecognizeAsync(RecognizeMode.Multiple);
        ReportTalk(T("키를 뗐습니다 · 음성 인식 중","Key released · recognizing speech"));
    }
    RecognizerInfo SelectRecognizer(){
        foreach(var engine in SpeechRecognitionEngine.InstalledRecognizers())if(engine.Culture.TwoLetterISOLanguageName==(english?"en":"ko"))return engine;
        throw new InvalidOperationException(T("Windows 언어 설정에서 한국어 음성 인식을 설치하세요.","Install English speech recognition in Windows language settings."));
    }
    void OnVoiceEvent(SpeechRecognitionEngine engine,Action action){
        if(disposing||!IsHandleCreated)return;
        try{BeginInvoke((Action)(()=>{if(!disposing&&speech==engine)action();}));}
        catch(InvalidOperationException){} // The overlay handle was closed or recreated.
    }
    void DetectPhrase(TimeSpan position){
        ignoreUtterance=narrating;heardProposal=proposalId;
        heardStep=position>=stepAudioStart?stepId:null;
    }
    void HandlePhrase(string phrase,float confidence){
        string captured=heardStep;heardStep=null;
        if(ignoreUtterance||narrating)return;
        if(CopilotRequest(phrase,confidence,heardProposal)||Query(phrase,confidence))return;
        string view=VoiceCommand(phrase,confidence);
        if(view=="toggle-overlay"){Toggle();return;}
        if(view!=null){send(view);return;}
        if(captured==null||captured==lastSentStep||(DateTime.UtcNow-received).TotalSeconds>10)return;
        string command=FlightCommand(phrase,confidence,captured,stepId,stepKind);
        if(command==null)return;
        lastSentStep=captured;send(command);
        ReportTalk(T("연속 듣는 중 · 현재 단계 완료 요청을 보냈습니다.","Listening continuously · step completion requested."));
    }
    internal void ToggleVoice(){
        if(VoiceEnabled){StopVoice();ReportTalk(T("연속 듣기 꺼짐","Continuous listening off"));return;}
        EndTalk();
        try{
            RecognizerInfo selected=SelectRecognizer();
            var engine=new SpeechRecognitionEngine(selected);speech=engine;
            heardStep=null;stepAudioStart=TimeSpan.Zero;
            engine.LoadGrammar(CommandGrammar(selected));AddDictation(engine);
            engine.SetInputToDefaultAudioDevice();
            engine.SpeechDetected+=(s,e)=>OnVoiceEvent(engine,()=>DetectPhrase(e.AudioPosition));
            engine.SpeechRecognitionRejected+=(s,e)=>OnVoiceEvent(engine,()=>{heardStep=null;});
            engine.SpeechRecognized+=(s,e)=>OnVoiceEvent(engine,()=>{if(e.Result.Grammar is DictationGrammar){if(!ignoreUtterance&&!narrating&&!CopilotRequest(e.Result.Text,e.Result.Confidence,heardProposal))Query(e.Result.Text,e.Result.Confidence);heardStep=null;}else HandlePhrase(e.Result.Text,e.Result.Confidence);});
            engine.RecognizeCompleted+=(s,e)=>OnVoiceEvent(engine,()=>{
                StopVoice();ReportTalk(e.Error!=null?e.Error.Message:T("연속 듣기가 종료되었습니다.","Continuous listening ended."));
            });
            engine.RecognizeAsync(RecognizeMode.Multiple);
            ReportTalk(T("연속 듣는 중 · 다음 작업 알려줘 / 금 판매가 알려줘","Listening continuously · next task / gold sell price"));
        }catch(Exception error){StopVoice();ReportTalk(error.Message);}
    }
    void StopVoice(){
        var engine=speech;speech=null;heardStep=null;
        if(engine==null)return;
        try{engine.RecognizeAsyncCancel();}catch(InvalidOperationException){}
        engine.Dispose();
    }
    protected override void Dispose(bool value){if(value){disposing=true;StopNarration();EndTalk();StopVoice();expiry.Dispose();foreach(int id in registered)if(IsHandleCreated)UnregisterHotKey(Handle,id);registered.Clear();}base.Dispose(value);if(value)holdPoll.Dispose();}
}
