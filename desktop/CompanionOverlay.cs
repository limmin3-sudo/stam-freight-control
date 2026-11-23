using System;
using System.Collections;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Speech.Recognition;
using System.Speech.AudioFormat;
using System.Threading;
using System.Threading.Tasks;
using System.Text.RegularExpressions;
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
    bool configuring,buttonRecording;
    DateTime buttonDeadline;
    CancellationTokenSource koreanLive,koreanHold;
    int contextVersion;
    static readonly Regex WakePrefix=new Regex(@"^\s*(?:스\s*탐|(?:브리지\s*)?오퍼레이터|(?:수석\s*)?항해사|[내네]비게이터|파트너|STAM\b|navigator\b|operator\b)(?:아|야)?[\s,.!?，]*",RegexOptions.IgnoreCase);
    DateTime listeningUntil=DateTime.MinValue;
    string VoiceHint {get{return KeyName(keyTalk)+T(" 길게 눌러 질문 · 연속 듣기에서는 “항해사”"," · hold to ask, or say “Navigator” in continuous mode");}}
    internal string ButtonTalkLabel {get{return buttonRecording?T("녹음 끝내기","Finish recording"):T("클릭해 말하기","Click to speak");}}

    internal event Action TalkChanged;
    internal bool Listening {get{return heldMic!=null;}}
    string heardStep,lastSentStep;
    TimeSpan stepAudioStart;
    internal string ContinuousLabel {get{return VoiceEnabled?T("연속 듣기 끄기","Stop continuous listening"):T("연속 듣기 켜기","Listen continuously");}}
    string stepId,stepKind;
    internal string TalkStatus {get;private set;}
    const int GraveKey=0xC0,Mouse4=(int)Keys.XButton1,Mouse5=(int)Keys.XButton2;
    int keyTalk=Mouse4;
    readonly System.Windows.Forms.Timer mousePoll=new System.Windows.Forms.Timer{Interval=30};
    bool sideWasDown;
    static bool SideButton(int key){return key==Mouse4||key==Mouse5;}
    bool KeysReady {get{return registered.Count==(SideButton(keyTalk)?3:4)&&(!SideButton(keyTalk)||mousePoll.Enabled);}}
    static bool Chord(int key){return key>=(int)Keys.A&&key<=(int)Keys.Z;}
    string KeyName(int key){return key==Mouse4?T("마우스 4 · 뒤로","Mouse 4 · Back"):key==Mouse5?T("마우스 5 · 앞으로","Mouse 5 · Forward"):key==GraveKey?"`":Chord(key)?"Ctrl+Alt+"+(char)key:((Keys)key).ToString();}
    internal string TalkLabel {get{return Listening?T("듣는 중 · 키를 떼면 전송","Listening · release to send"):KeyName(keyTalk)+T(" 길게 눌러 말하기"," · hold to talk");}}
    static int ReadTalkKey(Dictionary<string,object> saved){
        object raw;int key;
        if(saved.TryGetValue("holdKey",out raw)&&Int32.TryParse(Convert.ToString(raw),out key)&&(SideButton(key)||key==GraveKey||Chord(key)||(key>=(int)Keys.F1&&key<=(int)Keys.F11))){
            // Earlier versions also saved the default when the overlay moved.
            return key==GraveKey&&!saved.ContainsKey("holdBindingVersion")?Mouse4:key;
        }
        int old=Key(saved,"talk",(int)Keys.M);
        return old==(int)Keys.M?Mouse4:old;
    }
    int keyOverlay=(int)Keys.O,keyPrices=(int)Keys.P,keyWork=(int)Keys.W;
    string T(string ko,string en){return english?en:ko;}
    internal bool VoiceEnabled {get{return speech!=null||koreanLive!=null;}}
    internal CompanionOverlay(Action<string> command,bool en,string directory,Func<IHoldCapture> captureFactory=null){
        openCapture=captureFactory??(()=>new HeldMicrophone());
        send=command;english=en;Narrator="partner";LoadQuestions();settings=Path.Combine(directory,"overlay.json");
        Text=T("STAM 네비게이터 · 오버레이","STAM Navigator · Overlay");ShowInTaskbar=false;FormBorderStyle=FormBorderStyle.SizableToolWindow;TopMost=true;
        StartPosition=FormStartPosition.Manual;
        MinimumSize=new Size(354,240);Size=new Size(446,300);
        BackColor=DeckTheme.Gilt;ForeColor=DeckTheme.Ink;Padding=new Padding(1);
        var layout=new TableLayoutPanel{BackColor=DeckTheme.Housing,Dock=DockStyle.Fill,Padding=new Padding(12,6,12,8),ColumnCount=1,RowCount=5};
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute,32));layout.RowStyles.Add(new RowStyle(SizeType.Absolute,42));
        layout.RowStyles.Add(new RowStyle(SizeType.Percent,100));layout.RowStyles.Add(new RowStyle(SizeType.Absolute,36));
        toolRow=new RowStyle(SizeType.Absolute,0);layout.RowStyles.Add(toolRow);Controls.Add(layout);
        heading.Dock=body.Dock=status.Dock=DockStyle.Fill;heading.Font=HoloFonts.At(13);body.Font=HoloFonts.At(15);status.Font=HoloFonts.At(10);
        heading.ForeColor=DeckTheme.Platinum;status.ForeColor=DeckTheme.Muted;
        var top=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=3,Margin=Padding.Empty};
        faceColumn=new ColumnStyle(SizeType.Absolute,0);top.ColumnStyles.Add(faceColumn);top.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));top.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,96));
        top.Controls.Add(portrait,0,0);top.Controls.Add(heading,1,0);
        var more=new DeckButton{Dock=DockStyle.Fill,Text=T("도구","Tools")};top.Controls.Add(more,2,0);layout.Controls.Add(top);
        destinationLabel.Dock=DockStyle.Fill;destinationLabel.Font=HoloFonts.At(23);layout.Controls.Add(destinationLabel);
        body.Text=T("웹 부조종사에서 네비게이터를 연결하세요.","Connect STAM Navigator from the web copilot.");layout.Controls.Add(body);
        var footer=new TableLayoutPanel{Dock=DockStyle.Fill,Margin=Padding.Empty,ColumnCount=2};footer.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));footer.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,134));
        footer.Controls.Add(status);advance.Dock=DockStyle.Fill;advance.Primary=true;advance.Click+=(a,e)=>CompleteCurrent();footer.Controls.Add(advance);layout.Controls.Add(footer);
        toolActions=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=4,Visible=false,Margin=Padding.Empty};
        foreach(var button in new[]{pricesButton,workButton,talkButton,continuousButton}){toolActions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,25));button.Dock=DockStyle.Fill;button.Font=HoloFonts.At(10);toolActions.Controls.Add(button);}
        pricesButton.Click+=(a,e)=>{if(proposalId==null)send("show-prices");else CopilotRequest("apply",1,proposalId);};
        workButton.Click+=(a,e)=>{if(proposalId==null)send("show-my-work");else CopilotRequest("cancel",1,proposalId);};
        ShowProposalActions(false);talkButton.Text=ButtonTalkLabel;talkButton.AccessibleDescription=TalkLabel;talkButton.Click+=(a,e)=>ToggleButtonTalk();
        continuousButton.Text=ContinuousLabel;continuousButton.Click+=(a,e)=>ToggleVoice();layout.Controls.Add(toolActions);
        more.Click+=(a,e)=>{toolsOpen=!toolsOpen;RenderDeck();};
        try{var saved=new JavaScriptSerializer().Deserialize<Dictionary<string,object>>(File.ReadAllText(settings));object voice;if(saved.TryGetValue("narrator",out voice)&&(ValidNarrator(voice as string)||voice as string=="off"))Narrator=(string)voice;Location=new Point(Convert.ToInt32(saved["x"]),Convert.ToInt32(saved["y"]));int w,h;
            if(saved.ContainsKey("width")&&saved.ContainsKey("height")&&int.TryParse(Convert.ToString(saved["width"]),out w)&&int.TryParse(Convert.ToString(saved["height"]),out h)&&w>0&&h>0){
                var area=Screen.FromPoint(Location).WorkingArea;
                Size=new Size(Math.Min(w,area.Width),Math.Min(h,area.Height));
            }
            keyOverlay=Key(saved,"overlay",keyOverlay);keyPrices=Key(saved,"prices",keyPrices);keyWork=Key(saved,"work",keyWork);keyTalk=ReadTalkKey(saved);}catch{Location=new Point(Screen.PrimaryScreen.WorkingArea.Right-Width-24,Screen.PrimaryScreen.WorkingArea.Bottom-Height-24);}
        ShowPartner(null);RenderDeck();
        if(keyTalk==keyOverlay||keyTalk==keyPrices||keyTalk==keyWork)keyTalk=Mouse4;
        mousePoll.Tick+=(s,e)=>{
            bool down=TalkKeyDown();
            bool pressed=down&&!sideWasDown;
            sideWasDown=down;
            if(pressed&&!configuring&&!VoiceEnabled&&!disposing)StartHeldTalk();
        };
        holdPoll.Tick+=(s,e)=>CheckHeldKey();
        Clamp();expiry.Interval=1000;expiry.Tick+=(s,e)=>{if((DateTime.UtcNow-received).TotalSeconds>12&&(displayedMode!=null||DateTime.UtcNow>=answerUntil)){ClearGuidance();nav=null;SetStep(null,null);body.Text=T("웹 화면 연결 대기","Waiting for the web view");ShowPartner(null);}RenderDeck();if(DeckChanged!=null)DeckChanged();};expiry.Start();
        FormClosing+=(s,e)=>{if(!disposing&&e.CloseReason==CloseReason.UserClosing){e.Cancel=true;Hide();}};
        Move+=(s,e)=>Save();ResizeEnd+=(s,e)=>{Clamp();Save();};
        // Create the message window even while the overlay is hidden.
        var ignored=Handle;RegisterKeys();
    }
    static int Key(Dictionary<string,object> s,string name,int fallback){int key=s.ContainsKey(name)?Convert.ToInt32(s[name]):fallback;return key>=(int)Keys.A&&key<=(int)Keys.Z?key:fallback;}
    void Save(){try{Directory.CreateDirectory(Path.GetDirectoryName(settings));File.WriteAllText(settings,new JavaScriptSerializer().Serialize(new{x=Left,y=Top,width=Width,height=Height,narrator=Narrator,overlay=keyOverlay,prices=keyPrices,work=keyWork,holdKey=keyTalk,holdBindingVersion=2}));}catch{}}
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
    internal void ToggleFromNavigator(){
        if(Visible){Hide();return;}
        if(!interactive)ToggleInput();
        Clamp();Show();
    }
    internal void ToggleInput(){interactive=!interactive;RecreateHandle();RegisterKeys();status.Text=interactive?T("조작 모드 · 이동/버튼 사용","Input mode · move or click buttons"):T("클릭 통과 · 게임 입력 유지","Click-through mode");}
    void SetStep(string id,string kind){
        if(id==stepId&&kind==stepKind)return;
        if(Narrator=="partner"){StopNarration();lastTask=null;}
        Interlocked.Increment(ref contextVersion);stepId=id;stepKind=kind;requestedAt=DateTime.MinValue;heardStep=null;lastSentStep=null;
        stepAudioStart=speech==null?TimeSpan.Zero:speech.AudioPosition;
    }
    string linkedPartner;
    internal bool IsNavigator {get{return linkedPartner=="navigator"||(linkedPartner==null&&ValidNarrator(Narrator)&&!FemaleVoice);}}
    internal Color PartnerColor {get{return IsNavigator?DeckTheme.NavigatorInk:DeckTheme.OperatorInk;}}
    void ShowPartner(string partner){
        string next=partner=="operator"||partner=="navigator"?partner:null;
        if(Narrator=="partner"&&next!=linkedPartner){StopNarration();lastTask=null;}
        linkedPartner=next;
        portrait.SelectPartner(IsNavigator,english);
    }
    readonly HoloLabel destinationLabel=new HoloLabel();
    readonly DeckButton advance=new DeckButton();
    readonly ColumnStyle faceColumn;readonly RowStyle toolRow;readonly TableLayoutPanel toolActions;
    bool toolsOpen;DateTime requestedAt;
    Dictionary<string,object> nav;
    internal event Action DeckChanged;
    internal string DeckValue(string key){object v;return nav!=null&&nav.TryGetValue(key,out v)?Convert.ToString(v):"";}
    internal bool HasDisplay{get{return displayedMode!=null||DateTime.UtcNow<answerUntil;}}
    internal bool HasStep{get{return stepId!=null;}}
    internal bool PartnerSpeaking{get{return narrating||DateTime.UtcNow<answerUntil;}}
    internal bool Finished{get{return DeckValue("finished")=="True";}}
    internal bool InFlight{get{return displayedMode=="flight";}}
    internal string Destination{get{
        if(Finished)return T("운항 완료","Haul complete");
        if(DeckValue("destination")!="")return DeckValue("destination");
        var text=NavigationDestination??"";
        const string ko="다음 목적지는 ",en="Your next working stop is ";
        if(text.StartsWith(ko)&&text.EndsWith("입니다."))return text.Substring(ko.Length,text.Length-ko.Length-"입니다.".Length);
        if(text.StartsWith(en)&&text.EndsWith("."))return text.Substring(en.Length,text.Length-en.Length-1);
        return text;
    }}
    internal string Route{get{object data;var parts=new List<string>();if(nav!=null&&nav.TryGetValue("route",out data))foreach(object v in (IEnumerable)data)parts.Add(Convert.ToString(v));return String.Join("  →  ",parts.ToArray());}}
    internal List<string> CargoRows(){var rows=new List<string>();object cargo;
        if(nav!=null&&nav.TryGetValue("cargo",out cargo))foreach(Dictionary<string,object> item in (IEnumerable)cargo){
            rows.Add((Convert.ToString(item["action"])=="pickup"?T("적재","Load"):T("하역","Unload"))+"   "+Convert.ToString(item["item"])+"   ·   "+(item["scu"]==null?T("수량 미확인","Quantity unknown"):Convert.ToString(item["scu"])+" SCU"));
        }
        if(nav!=null&&Convert.ToInt32(nav["extra"])>0)rows.Add(T("웹에서 더 보기 · ","More on web · ")+DeckValue("extra"));
        if(nav==null&&InFlight&&facts!=null&&facts.TryGetValue("load",out cargo)&&!String.IsNullOrWhiteSpace(Convert.ToString(cargo)))rows.Add(Convert.ToString(cargo));
        return rows;
    }
    internal bool CanComplete{get{return InFlight&&stepId!=null&&proposalId==null&&(DateTime.UtcNow-received).TotalSeconds<10&&
        (lastSentStep!=stepId||(requestedAt!=DateTime.MinValue&&(DateTime.UtcNow-requestedAt).TotalSeconds>=5));}}
    internal string StepLabel{get{switch(stepKind){case "pickup":return T("적재 완료","Loaded");case "delivery":return T("하역 완료","Unloaded");case "departure":return T("출발 완료","Departed");case "jump":return T("점프 완료","Jump complete");default:return T("거점 작업 완료","Complete stop");}}}
    internal void CompleteCurrent(){
        if(!CanComplete)return;
        lastSentStep=stepId;requestedAt=DateTime.UtcNow;send("complete-flight:"+stepId);
        RenderDeck();if(DeckChanged!=null)DeckChanged();
    }
    void RenderDeck(){
        bool replying=narrating||DateTime.UtcNow<answerUntil||proposalId!=null;
        faceColumn.Width=replying?32:0;portrait.Visible=replying&&portrait.Image!=null;
        heading.Text=replying?PartnerPortrait.Title(IsNavigator,english):"STAM NAV";heading.ForeColor=replying?PartnerColor:DeckTheme.Platinum;
        destinationLabel.Text=Destination!=""?Destination:displayedMode==null?T("운항 대기","Waiting for flight"):InFlight?T("운송 안내","Flight guidance"):T("무역 안내","Trade guidance");
        advance.Visible=stepId!=null;advance.Enabled=CanComplete;advance.Text=lastSentStep!=null&&lastSentStep==stepId&&!CanComplete?T("반영 중","Updating"):StepLabel;
        if(InFlight&&!replying){var rows=CargoRows();if(rows.Count>0)body.Text=rows[0]+(rows.Count>1?Environment.NewLine+rows[1]:"")+(rows.Count>2?T("  외 ","  +")+(rows.Count-2):"");else body.Text=summaryLines;}
        bool showTools=toolsOpen||proposalId!=null;toolRow.Height=showTools?38:0;toolActions.Visible=showTools;
    }
    internal void UpdateDisplay(object raw){var d=raw as Dictionary<string,object>;
        SetStep(d!=null&&d.ContainsKey("stepId")?Convert.ToString(d["stepId"]):null,
                d!=null&&d.ContainsKey("step")?Convert.ToString(d["step"]):null);
        if(d==null){nav=null;if(displayedMode==null&&DateTime.UtcNow<answerUntil)return;ClearGuidance();received=DateTime.MinValue;ShowPartner(null);body.Text=T("웹 화면 연결 대기","Waiting for the web view");RenderDeck();return;}received=DateTime.UtcNow;object partner;ShowPartner(d.TryGetValue("partner",out partner)?partner as string:null);var lines=new List<string>();var list=d["lines"] as IEnumerable;if(list!=null)foreach(var line in list)lines.Add(Convert.ToString(line));summaryLines=String.Join("\n",lines.ToArray());UpdateGuidance(d);object navigation;nav=d.TryGetValue("navigation",out navigation)?navigation as Dictionary<string,object>:null;RenderDeck();}
    void RegisterKeys(){
        mousePoll.Stop();EndTalk();
        foreach(int id in registered)UnregisterHotKey(Handle,id);registered.Clear();
        int[] keys={keyOverlay,keyPrices,keyWork,keyTalk};
        for(int i=0;i<keys.Length;i++){
            if(i==3&&SideButton(keyTalk)){
                // Mouse buttons send no WM_HOTKEY. Read their state even when the game has focus.
                sideWasDown=TalkKeyDown();mousePoll.Start();continue;
            }
            uint modifiers=i==3&&!Chord(keyTalk)?0u:3u;
            if(RegisterHotKey(Handle,5100+i,0x4000u|modifiers,(uint)keys[i]))registered.Add(5100+i);
        }
        talkButton.AccessibleDescription=TalkLabel;
        ReportTalk(KeysReady?VoiceHint:T("단축키 충돌 · 단축키 설정에서 변경하세요.","Shortcut unavailable · choose another key in settings."));
    }
    protected override void OnHandleDestroyed(EventArgs e){mousePoll.Stop();EndTalk();foreach(int id in registered)UnregisterHotKey(Handle,id);registered.Clear();base.OnHandleDestroyed(e);}
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
            var talkKeys=new List<int>{Mouse4,Mouse5,GraveKey};
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
                if(!KeysReady){
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
    Grammar CommandGrammar(RecognizerInfo engine){var phrases=new Choices(engine.Culture.TwoLetterISOLanguageName=="en"?new[]{"STAM","Navigator","Operator","STAM prices","STAM my work","STAM overlay","STAM trade","STAM flight"}:new[]{"스탐","항해사","브리지 오퍼레이터","스탐 가격","스탐 내 작업","스탐 오버레이","스탐 무역","스탐 운송"});foreach(var word in FlightPhrases.Keys)if((word[0]<128)==(engine.Culture.TwoLetterISOLanguageName=="en"))phrases.Add(word);AddQueries(phrases);var builder=new GrammarBuilder{Culture=engine.Culture};builder.Append(phrases);return new Grammar(builder);}
    static readonly Dictionary<string,string> FlightPhrases=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase){
        {"다음 단계","next"},{"적재 완료","pickup"},{"픽업 완료","pickup"},{"배송 완료","delivery"},{"출발 완료","departure"},{"점프 완료","jump"},{"거점 작업 완료","stop"},
        {"next step","next"},{"loading complete","pickup"},{"pickup complete","pickup"},{"delivery complete","delivery"},{"departure complete","departure"},{"jump complete","jump"},{"stop complete","stop"}
    };
    static string FlightCommand(string phrase,float confidence,string captured,string current,string kind){
        string match;
        if(!String.IsNullOrEmpty(phrase)&&phrase[0]>=128){
            foreach(var entry in FlightPhrases)if(Normal(phrase)==Normal(entry.Key)){phrase=entry.Key;break;}
        }
        if(String.IsNullOrEmpty(captured)||captured!=current||confidence<.8f||!FlightPhrases.TryGetValue(phrase,out match))return null;
        return match=="next"||match==kind?"complete-flight:"+captured:null;
    }
    void ReportTalk(string message){
        if(message!=null&&message.StartsWith("Windows microphone (MMRESULT ",StringComparison.Ordinal))
            message=T("Windows의 기본 입력 장치와 설정 → 개인정보 및 보안 → 마이크의 데스크톱 앱 접근을 확인하세요.","Check your default input device and allow desktop apps in Windows microphone privacy settings.")+" "+message;
        TalkStatus=status.Text=message;
        talkButton.Text=ButtonTalkLabel;talkButton.Primary=Listening;talkButton.Invalidate();
        continuousButton.Text=ContinuousLabel;continuousButton.Primary=VoiceEnabled;continuousButton.Invalidate();
        if(TalkChanged!=null)TalkChanged();
    }
    void EndTalk(){
        buttonRecording=false;
        if(koreanHold!=null){koreanHold.Cancel();koreanHold=null;}
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
        BeginRecording(false);
    }
    internal void ToggleButtonTalk(){
        if(buttonRecording){FinishRecording();return;}
        if(heldMic==null)BeginRecording(true);
    }
    void BeginRecording(bool fromButton){
        if(VoiceEnabled){ReportTalk(T("연속 듣기 중","Continuous listening is on"));return;}
        if(decoding!=null||koreanHold!=null){ReportTalk(T("직전 음성을 인식 중입니다. 잠시 뒤 다시 누르세요.","Finishing the previous phrase. Press again shortly."));return;}
        try{
            StopNarration();heldStep=stepId;heldProposal=proposalId;
            heldMic=openCapture();buttonRecording=fromButton;buttonDeadline=DateTime.UtcNow.AddSeconds(30);holdPoll.Start();
            CheckHeldKey();
            if(Listening)ReportTalk(fromButton?T("듣는 중 · 녹음 끝내기를 누르세요","Listening · click Finish recording"):T("듣는 중 · 키를 떼면 전송","Listening · release to send"));
        }catch(Exception error){EndTalk();ReportTalk(error.Message);}
    }
    void CheckHeldKey(){
        if(heldMic==null)return;
        try{
            if(buttonRecording&&DateTime.UtcNow>=buttonDeadline){FinishRecording();return;}
            if(buttonRecording||TalkKeyDown()){heldMic.Drain();return;}
            FinishRecording();
        }catch(Exception error){EndTalk();ReportTalk(error.Message);}
    }
    void FinishRecording(){
        try{
            buttonRecording=false;
            holdPoll.Stop();
            heldAudio=heldMic.Finish();heldMic=null;
            if(heldAudio.Length==0){EndTalk();ReportTalk(T("입력된 음성이 없습니다.","No speech captured."));return;}
            if(english)DecodeHeldTalk();else DecodeKoreanHold();
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
                DispatchSpeech(phrase,confidence,heldStep,heldProposal,commandGrammar&&words.Count==1,true);
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
        DispatchSpeech(phrase,confidence,captured,heardProposal,true,false);
    }
    void DispatchSpeech(string phrase,float confidence,string captured,string proposal,bool commands,bool direct){
        if(String.IsNullOrWhiteSpace(phrase))return;
        var wake=WakePrefix.Match(phrase);
        bool addressed=wake.Success&&confidence>=.62f;
        string request=addressed?phrase.Substring(wake.Length).Trim():phrase;
        if(direct||addressed)ReportTalk(T("들은 말 · ","Heard · ")+phrase);
        if(addressed&&request.Length==0){
            listeningUntil=DateTime.UtcNow.AddSeconds(15);
            Answer(T("말씀해 주십시오.","Listening. How can I help?"),true);
            return;
        }
        bool followingWake=DateTime.UtcNow<listeningUntil;
        listeningUntil=DateTime.MinValue;
        string view=commands?VoiceCommand(phrase,confidence):null;
        if(view=="toggle-overlay"){Toggle();return;}
        if(view!=null){send(view);return;}
        if(CopilotRequest(request,confidence,proposal)||Query(request,confidence))return;
        string command=commands&&captured!=lastSentStep&&(DateTime.UtcNow-received).TotalSeconds<=10
            ?FlightCommand(request,confidence,captured,stepId,stepKind):null;
        if(command!=null){
            lastSentStep=captured;requestedAt=DateTime.UtcNow;send(command);
            ReportTalk(T("현재 단계 완료 요청을 보냈습니다.","Current step completion requested."));return;
        }
        if(direct||addressed||followingWake)Answer(T("잘 못 들었어요. “다음 목적지 알려줘”처럼 말해 주세요.","Try asking “next destination”."),
            confidence>=.62f);
    }

    async void DecodeKoreanHold(){
        byte[] pcm=heldAudio.ToArray();heldAudio.Dispose();heldAudio=null;
        var session=koreanHold=new CancellationTokenSource();
        string captured=heldStep,proposal=heldProposal;
        ReportTalk("음성 인식 중");
        try{
            var result=await Task.Run(()=>KoreanRecognition.FromRecording(pcm,session.Token));
            if(koreanHold!=session||disposing)return;
            if(String.IsNullOrWhiteSpace(result.text)){ReportTalk("인식한 말이 없습니다. 마이크 입력을 확인해 주세요.");return;}
            DispatchSpeech(result.text,result.Confidence,captured,proposal,true,true);
        }catch(Exception error){if(koreanHold==session&&!disposing)ReportTalk(error.Message);}
        finally{if(koreanHold==session)koreanHold=null;session.Dispose();}
    }
    async void StartKoreanLive(){
        var session=koreanLive=new CancellationTokenSource();
        var ui=SynchronizationContext.Current;
        ReportTalk("한국어 음성 인식을 준비하고 있어요…");
        try{
            await Task.Run(()=>{
                using(var engine=new KoreanRecognition()){
                    session.Token.ThrowIfCancellationRequested();
                    using(var mic=new HeldMicrophone()){
                        ui.Post(_=>{if(koreanLive==session&&!disposing)ReportTalk("듣는 중 · “항해사” 또는 “다음 목적지 알려줘”");},null);
                        int version=Volatile.Read(ref contextVersion);
                        bool discard=false;DateTime quietAfter=DateTime.MinValue;
                        while(!session.Token.WaitHandle.WaitOne(35)){
                            var chunk=mic.TakeChunk();
                            if(narrating)quietAfter=DateTime.UtcNow.AddMilliseconds(550);
                            if(chunk.Length==0)continue;
                            if(narrating||DateTime.UtcNow<quietAfter){
                                if(!discard)engine.Finish();
                                discard=true;continue;
                            }
                            discard=false;
                            int current=Volatile.Read(ref contextVersion);
                            if(current!=version){engine.Finish();version=current;continue;}
                            var result=engine.Feed(chunk,chunk.Length);
                            if(result==null||String.IsNullOrWhiteSpace(result.text))continue;
                            int utteranceVersion=version;
                            ui.Post(_=>{
                                if(koreanLive!=session||disposing||narrating||utteranceVersion!=contextVersion)return;
                                DispatchSpeech(result.text,result.Confidence,stepId,proposalId,true,false);
                            },null);
                        }
                    }
                }
            });
        }catch(Exception error){if(koreanLive==session&&!disposing){koreanLive=null;ReportTalk(error.Message);}}
        finally{if(koreanLive==session)koreanLive=null;session.Dispose();}
    }
    internal void ToggleVoice(){
        if(VoiceEnabled){StopVoice();ReportTalk(T("연속 듣기 꺼짐","Continuous listening off"));return;}
        EndTalk();
        if(!english){StartKoreanLive();return;}
        try{
            RecognizerInfo selected=SelectRecognizer();
            var engine=new SpeechRecognitionEngine(selected);speech=engine;
            heardStep=null;stepAudioStart=TimeSpan.Zero;
            engine.LoadGrammar(CommandGrammar(selected));AddDictation(engine);
            engine.SetInputToDefaultAudioDevice();
            engine.SpeechDetected+=(s,e)=>OnVoiceEvent(engine,()=>DetectPhrase(e.AudioPosition));
            engine.SpeechRecognitionRejected+=(s,e)=>OnVoiceEvent(engine,()=>{heardStep=null;});
            engine.SpeechRecognized+=(s,e)=>OnVoiceEvent(engine,()=>{if(e.Result.Grammar is DictationGrammar){if(!ignoreUtterance&&!narrating)DispatchSpeech(e.Result.Text,e.Result.Confidence,heardStep,heardProposal,false,false);heardStep=null;}else HandlePhrase(e.Result.Text,e.Result.Confidence);});
            engine.RecognizeCompleted+=(s,e)=>OnVoiceEvent(engine,()=>{
                StopVoice();ReportTalk(e.Error!=null?e.Error.Message:T("연속 듣기가 종료되었습니다.","Continuous listening ended."));
            });
            engine.RecognizeAsync(RecognizeMode.Multiple);
            ReportTalk(T("연속 듣는 중 · 다음 작업 알려줘 / 금 판매가 알려줘","Listening continuously · next task / gold sell price"));
        }catch(Exception error){StopVoice();ReportTalk(error.Message);}
    }
    void StopVoice(){
        listeningUntil=DateTime.MinValue;
        if(koreanLive!=null){koreanLive.Cancel();koreanLive=null;}
        var engine=speech;speech=null;heardStep=null;
        if(engine==null)return;
        try{engine.RecognizeAsyncCancel();}catch(InvalidOperationException){}
        engine.Dispose();
    }
    protected override void Dispose(bool value){if(value){disposing=true;StopNarration();EndTalk();StopVoice();expiry.Dispose();foreach(int id in registered)if(IsHandleCreated)UnregisterHotKey(Handle,id);registered.Clear();}base.Dispose(value);if(value){holdPoll.Dispose();mousePoll.Dispose();}}
}
