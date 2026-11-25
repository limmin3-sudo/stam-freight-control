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
    string cargoReadbackStep;
    DateTime cargoReadbackUntil;
    bool configuring,buttonRecording;
    internal bool TestingMic {get;private set;}
    internal string MicCheckStatus {get;private set;}
    bool resumeVoice,resumeRide;
    DateTime testDeadline;
    internal void ToggleMicCheck(){
        if(TestingMic){FinishMicCheck(T("점검을 취소했어요.","Check cancelled."),false);return;}
        if(Listening||decoding!=null||koreanHold!=null){ReportTalk(T("진행 중인 녹음이 끝나면 점검할 수 있어요.","Finish the current recording first."));return;}
        resumeVoice=VoiceEnabled;resumeRide=RideAlong;
        if(resumeVoice)StopVoice();
        TestingMic=true;testDeadline=DateTime.UtcNow.AddSeconds(45);
        MicCheckStatus=KeyName(keyTalk)+T("을 길게 누르고 말한 뒤 떼세요."," · hold, speak, then release.");
        ReportTalk(MicCheckStatus);
    }
    void FinishMicCheck(string result,bool reply){
        TestingMic=false;gesturePending=false;EndTalk();
        if(resumeVoice){resumeVoice=false;rideAlong=resumeRide;ToggleVoice();}
        MicCheckStatus=result;ReportTalk(result);
        if(reply)Answer(T("함장님, 잘 들려요.","Captain, I hear you clearly."),true);
    }
    bool TestTranscript(string text){
        if(!TestingMic)return false;
        FinishMicCheck(T("들은 말 · ","Heard · ")+text+T(" / 부조종사 · 함장님, 잘 들려요."," / Copilot · Captain, I hear you clearly."),true);
        return true;
    }
    void RecordingError(string message){
        if(TestingMic)FinishMicCheck(message,false);
        else{EndTalk();ReportTalk(message);}
    }
    DateTime buttonDeadline;
    CancellationTokenSource koreanLive,koreanHold;
    int contextVersion;
    static readonly Regex WakePrefix=new Regex(@"^\s*(?:스\s*탐|(?:브리지\s*)?오퍼레이터|(?:수석\s*)?항해사|[내네]비게이터|파트너|STAM\b|navigator\b|operator\b)(?:아|야)?[\s,.!?，]*",RegexOptions.IgnoreCase);
    DateTime listeningUntil=DateTime.MinValue;
    bool rideAlong;
    DateTime lastBanter=DateTime.MinValue;
    internal bool RideAlong {get{return rideAlong&&VoiceEnabled;}}
    string ListenHint {get{return rideAlong?T("동승 중 · 호출 없이 말하세요","Riding along · speak directly"):T("듣는 중 · “스탐”으로 부르세요","Listening · say STAM");}}
    internal void ToggleRideAlong(){
        if(TestingMic)return;
        rideAlong=!rideAlong;
        listeningUntil=DateTime.MinValue;
        Interlocked.Increment(ref contextVersion);
        if(!VoiceEnabled)ToggleVoice();else ReportTalk(ListenHint);
    }
    string VoiceHint {get{return KeyName(keyTalk)+T(" 짧게 계약 읽기 · 길게 말하기"," · tap to read a contract, hold to talk");}}
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
    bool sideWasDown,gesturePending,readFocusAtPress;
    readonly System.Diagnostics.Stopwatch pressDuration=new System.Diagnostics.Stopwatch();
    const int HoldMilliseconds=320;
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window,out uint id);
    static bool GameFocused(){
        try{uint id;GetWindowThreadProcessId(GetForegroundWindow(),out id);
            using(var app=System.Diagnostics.Process.GetProcessById((int)id))return String.Equals(app.ProcessName,"StarCitizen",StringComparison.OrdinalIgnoreCase);
        }catch{return false;}
    }
    Func<bool> canReadGame=GameFocused;
    void BeginGesture(){readFocusAtPress=canReadGame();gesturePending=true;pressDuration.Restart();}
    void PollGesture(){
        bool down=TalkKeyDown();
        if(!configuring&&!disposing){
            if(SideButton(keyTalk)&&down&&!sideWasDown)BeginGesture();
            if(gesturePending&&(!down||pressDuration.ElapsedMilliseconds>=HoldMilliseconds)){
                gesturePending=false;
                if(down){if(!VoiceEnabled)StartHeldTalk();}
                else if(!TestingMic&&pressDuration.ElapsedMilliseconds<HoldMilliseconds&&readFocusAtPress&&canReadGame())send("read-contract");
            }
        }else gesturePending=false;
        sideWasDown=down;
        if(!SideButton(keyTalk)&&!gesturePending)mousePoll.Stop();
    }
    internal void ContractNotice(Dictionary<string,object> notice){
        string code=Convert.ToString(notice["code"]),key=KeyName(keyTalk);
        if(code=="picker"||code=="picker-close"){PickerNotice(notice);return;}
        string message;
        if(code=="missing"){
            var fields=new List<string>();
            foreach(object field in (IEnumerable)notice["fields"]){
                switch(Convert.ToString(field)){
                    case "pickup":fields.Add(T("픽업지","pickup"));break;
                    case "destination":fields.Add(T("배송지","destination"));break;
                    case "cargo":fields.Add(T("품목","commodity"));break;
                    case "quantity":fields.Add(T("수량","quantity"));break;
                }
            }
            string names=String.Join(", ",fields.ToArray());
            object label;string card=notice.TryGetValue(english?"labelEn":"labelKo",out label)?Convert.ToString(label):"";
            message=card+" · "+T(names+" 확인이 필요해요. ","Please check "+names+". ");
            if(!Convert.ToBoolean(notice["armed"]))message+=T("네비게이터의 게임 계약 읽기에서 게임 창을 먼저 선택해 주세요. ","First select the game window in Read contracts. ");
            message+=T("진행 중인 계약의 상세 목표를 열고 "+key+" 버튼을 짧게 눌러주세요.","Open the accepted contract objectives and tap "+key+".");
        }else if(code=="setup")message=T("네비게이터의 게임 계약 읽기에서 게임 창을 선택한 뒤 다시 눌러주세요.","Select the game window in Navigator’s Read contracts, then tap again.");
        else if(code=="busy")message=T("앞서 누른 계약 화면을 읽고 있어요.","Still reading the previous screen.");
        else if(code=="choose")message=T("이 화면을 보관했어요. 새 수신 정보가 들어오면 계약을 다시 대조할게요.","Screen saved. I’ll check again when new contract details arrive.");
        else if(code=="complete"){
            string place=Convert.ToString(notice["destination"]);
            message=place.Length==0?T("확인했어요. 계약의 경로와 화물 정보가 준비됐어요.","Confirmed. The route and cargo details are ready."):T("확인했어요. 배송지는 "+place+"입니다. 경로를 계산할 수 있어요.","Confirmed delivery to "+place+". The route is ready.");
        }else if(code=="partial"||code=="unreadable")message=T("남은 목표 줄이 보이도록 계약 창을 스크롤하고 "+key+" 버튼을 한 번 더 눌러주세요.","Scroll to the remaining objectives and tap "+key+" again.");
        else message=T("계약 화면을 읽지 못했어요. 진행 중인 계약을 열고 다시 눌러주세요.","Could not read the contract. Open its objectives and try again.");
        if((code=="partial"||code=="complete")&&notice.ContainsKey("details")&&Convert.ToString(notice["details"])!="")message=Convert.ToString(notice["details"]);
        ReportTalk(message);Answer(message,true);RenderDeck();
    }
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
        Text=T("STAM 네비게이터 · 오버레이","STAM Navigator · Overlay");ShowInTaskbar=false;FormBorderStyle=FormBorderStyle.None;TopMost=true;
        StartPosition=FormStartPosition.Manual;
        MinimumSize=new Size(345,200);Size=new Size(380,212);
        BackColor=DeckTheme.Gilt;ForeColor=DeckTheme.Ink;Padding=new Padding(1);
        var layout=new TableLayoutPanel{BackColor=DeckTheme.Housing,Dock=DockStyle.Fill,Margin=Padding.Empty,Padding=new Padding(0),ColumnCount=1,RowCount=5};
        layout.SizeChanged+=(a,e)=>{if(layout.Width>1&&layout.Height>1){var old=layout.Region;using(var round=FlightChrome.Rounded(layout.ClientRectangle,7))layout.Region=new Region(round);if(old!=null)old.Dispose();}};
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute,41));layout.RowStyles.Add(new RowStyle(SizeType.Percent,100));layout.RowStyles.Add(new RowStyle(SizeType.Absolute,49));
        toolRow=new RowStyle(SizeType.Absolute,0);layout.RowStyles.Add(toolRow);BuildIntake(layout);Controls.Add(layout);
        var top=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=6,RowCount=1,Padding=new Padding(10,8,14,6),Margin=Padding.Empty};
        top.RowStyles.Add(new RowStyle(SizeType.Percent,100));faceColumn=new ColumnStyle(SizeType.Absolute,26);
        top.ColumnStyles.Add(faceColumn);top.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));top.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,44));top.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,48));top.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,48));top.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,28));
        var mark=new Panel{Dock=DockStyle.Fill,Margin=Padding.Empty};logo.Dock=DockStyle.Fill;logo.SizeMode=PictureBoxSizeMode.Zoom;
        try{using(var original=Image.FromFile(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"app","assets","stam-logo-transparent.png")))logo.Image=new Bitmap(original);}catch(IOException){}catch(ArgumentException){}
        mark.Controls.Add(logo);portrait.Margin=Padding.Empty;mark.Controls.Add(portrait);portrait.BringToFront();top.Controls.Add(mark,0,0);
        heading.Dock=DockStyle.Fill;heading.Font=HoloFonts.At(11);heading.Margin=new Padding(7,4,0,0);top.Controls.Add(heading,1,0);
        progressLabel.Dock=DockStyle.Fill;progressLabel.ForeColor=DeckTheme.Ink;progressLabel.Font=HoloFonts.At(10);progressLabel.Margin=new Padding(4,4,0,0);top.Controls.Add(progressLabel,2,0);
        var more=new Button{Text="⋯",AccessibleName=T("오버레이 도구","Overlay tools"),FlatStyle=FlatStyle.Flat,Dock=DockStyle.Fill,Margin=Padding.Empty,TabStop=true,ForeColor=DeckTheme.Muted,BackColor=DeckTheme.Housing};more.FlatAppearance.BorderSize=0;freightMode.Text=T("운송","Haul");tradeMode.Text=T("무역","Trade");
        foreach(var modeButton in new[]{freightMode,tradeMode}){modeButton.Dock=DockStyle.Fill;modeButton.Margin=Padding.Empty;modeButton.Font=HoloFonts.At(10);}
        freightMode.Click+=(a,e)=>send("mode-flight");tradeMode.Click+=(a,e)=>send("mode-trade");
        top.Controls.Add(freightMode,3,0);top.Controls.Add(tradeMode,4,0);top.Controls.Add(more,5,0);layout.Controls.Add(top,0,0);
        var middle=new TableLayoutPanel{Dock=DockStyle.Fill,Margin=Padding.Empty,Padding=new Padding(16,9,14,4),BackColor=Color.FromArgb(42,46,41),ColumnCount=1,RowCount=3};
        middle.RowStyles.Add(new RowStyle(SizeType.Absolute,20));middle.RowStyles.Add(new RowStyle(SizeType.Absolute,37));middle.RowStyles.Add(new RowStyle(SizeType.Percent,100));
        kindLabel.Dock=DockStyle.Fill;kindLabel.ForeColor=Color.FromArgb(217,189,128);kindLabel.Font=HoloFonts.At(10);kindLabel.Margin=Padding.Empty;
        destinationLabel.Dock=DockStyle.Fill;destinationLabel.Font=HoloFonts.At(21);destinationLabel.Margin=body.Margin=Padding.Empty;
        body.Dock=DockStyle.Fill;body.Font=HoloFonts.At(12);body.Text=T("웹 부조종사에서 네비게이터를 연결하세요.","Connect STAM Navigator from the web copilot.");
        middle.Controls.Add(kindLabel,0,0);middle.Controls.Add(destinationLabel,0,1);middle.Controls.Add(body,0,2);layout.Controls.Add(middle,0,1);
        var footer=new TableLayoutPanel{Dock=DockStyle.Fill,Margin=Padding.Empty,Padding=new Padding(16,8,18,7),ColumnCount=2,RowCount=1};
        footer.RowStyles.Add(new RowStyle(SizeType.Percent,100));footer.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));footer.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,104));
        footerLabel.Dock=DockStyle.Fill;footerLabel.Margin=new Padding(0,6,0,0);footerLabel.Font=HoloFonts.At(11);footerLabel.ForeColor=DeckTheme.Muted;var footerSlot=new Panel{Dock=DockStyle.Fill,Margin=Padding.Empty};footerSlot.Controls.Add(footerLabel);compareBuyer.Dock=DockStyle.Fill;compareBuyer.Text=TradeLabel("compare");compareBuyer.Click+=(a,e)=>{if(TradeReady&&tradeAction.ContainsKey("remaining"))TradeCommand(Convert.ToString(tradeAction["id"]),"compare:0");else TradeInput("compare");};footerSlot.Controls.Add(compareBuyer);footer.Controls.Add(footerSlot,0,0);
        advance.Dock=DockStyle.Fill;advance.Margin=new Padding(0,0,0,0);advance.Primary=true;advance.Click+=(a,e)=>CompleteCurrent();footer.Controls.Add(advance,1,0);layout.Controls.Add(footer,0,2);
        toolActions=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=4,RowCount=2,Visible=false,Margin=Padding.Empty,Padding=new Padding(6,0,12,0)};
        toolActions.RowStyles.Add(new RowStyle(SizeType.Percent,100));toolActions.RowStyles.Add(new RowStyle(SizeType.Absolute,21));
        foreach(var button in new[]{pricesButton,workButton,talkButton,continuousButton}){toolActions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,25));button.Dock=DockStyle.Fill;button.Font=HoloFonts.At(10);toolActions.Controls.Add(button);}
        pricesButton.Click+=(a,e)=>{if(proposalId==null)send("show-prices");else CopilotRequest("apply",1,proposalId);};
        workButton.Click+=(a,e)=>{if(proposalId==null)send("show-my-work");else CopilotRequest("cancel",1,proposalId);};
        ShowProposalActions(false);talkButton.Text=ButtonTalkLabel;talkButton.AccessibleDescription=TalkLabel;talkButton.Click+=(a,e)=>ToggleButtonTalk();
        continuousButton.Text=ContinuousLabel;continuousButton.Click+=(a,e)=>ToggleVoice();layout.Controls.Add(toolActions,0,3);status.Font=HoloFonts.At(9);status.ForeColor=DeckTheme.Muted;status.Dock=DockStyle.Fill;toolActions.Controls.Add(status,0,1);toolActions.SetColumnSpan(status,4);
        var menu=new ContextMenuStrip();menu.Items.Add(T("음성·무역 도구","Voice and trade tools"),null,(a,e)=>{toolsOpen=!toolsOpen;RenderDeck();});var rideItem=new ToolStripMenuItem(T("동승 모드 · 호출 없이 듣기","Ride along without a wake word"));
        menu.Items.Add(rideItem);menu.Opening+=(a,e)=>rideItem.Checked=RideAlong;rideItem.Click+=(a,e)=>ToggleRideAlong();
        var tradeTools=new ToolStripMenuItem(T("무역 작업","Trade actions"));menu.Items.Add(tradeTools);
        foreach(string verb in new[]{"buy","sell","compare"}){string v=verb;tradeTools.DropDownItems.Add(TradeLabel(v),null,(a,e)=>TradeInput(v));}
        tradeTools.DropDownItems.Add(T("판매처 선택 취소","Cancel buyer selection"),null,(a,e)=>{if(TradeReady)TradeCommand(Convert.ToString(tradeAction["id"]),"dismiss");});
        foreach(string turn in new[]{"prev","next"}){string v=turn;tradeTools.DropDownItems.Add(v=="prev"?T("이전 품목","Previous items"):T("다음 품목","More items"),null,(a,e)=>TradeCommand(Convert.ToString(tradeAction["id"]),v));}
        menu.Opening+=(a,e)=>{tradeTools.Visible=TradeReady;if(TradeReady){tradeTools.DropDownItems[0].Enabled=TradeList("buy").Count>0;tradeTools.DropDownItems[1].Enabled=tradeTools.DropDownItems[2].Enabled=TradeList("sell").Count>0&&TradeVerb!="arrive";tradeTools.DropDownItems[3].Enabled=TradeVerb=="buyer";tradeTools.DropDownItems[4].Visible=Object.Equals(tradeAction["prev"],true);tradeTools.DropDownItems[5].Visible=Object.Equals(tradeAction["next"],true);}};
        menu.Items.Add(T("클릭 통과","Click through"),null,(a,e)=>ToggleInput());menu.Items.Add(T("오버레이 숨기기","Hide overlay"),null,(a,e)=>Hide());more.Click+=(a,e)=>menu.Show(more,new Point(0,more.Height));top.ContextMenuStrip=menu;Disposed+=(a,e)=>menu.Dispose();
        FlightChrome.Attach(this,()=>{Clamp();Save();},top,mark,logo,portrait,heading,progressLabel);
        try{var saved=new JavaScriptSerializer().Deserialize<Dictionary<string,object>>(File.ReadAllText(settings));object voice;if(saved.TryGetValue("narrator",out voice)&&(ValidNarrator(voice as string)||voice as string=="off"))Narrator=(string)voice;Location=new Point(Convert.ToInt32(saved["x"]),Convert.ToInt32(saved["y"]));int w,h;
            if(saved.ContainsKey("width")&&saved.ContainsKey("height")&&int.TryParse(Convert.ToString(saved["width"]),out w)&&int.TryParse(Convert.ToString(saved["height"]),out h)&&w>0&&h>0){
                var area=Screen.FromPoint(Location).WorkingArea;
                Size=new Size(Math.Min(w,area.Width),Math.Min(h,area.Height));
            }
            keyOverlay=Key(saved,"overlay",keyOverlay);keyPrices=Key(saved,"prices",keyPrices);keyWork=Key(saved,"work",keyWork);keyTalk=ReadTalkKey(saved);}catch{Location=new Point(Screen.PrimaryScreen.WorkingArea.Right-Width-24,Screen.PrimaryScreen.WorkingArea.Bottom-Height-24);}
        ShowPartner(null);RenderDeck();
        if(keyTalk==keyOverlay||keyTalk==keyPrices||keyTalk==keyWork)keyTalk=Mouse4;
        mousePoll.Tick+=(s,e)=>PollGesture();
        holdPoll.Tick+=(s,e)=>CheckHeldKey();
        Clamp();expiry.Interval=1000;expiry.Tick+=(s,e)=>{if(TestingMic&&DateTime.UtcNow>=testDeadline)FinishMicCheck(T("점검 시간이 끝났어요. 다시 시도하세요.","Microphone check timed out. Try again."),false);if((DateTime.UtcNow-received).TotalSeconds>12&&(displayedMode!=null||DateTime.UtcNow>=answerUntil)){ClearGuidance();nav=null;SetStep(null,null);body.Text=T("웹 화면 연결 대기","Waiting for the web view");ShowPartner(null);}RenderDeck();if(DeckChanged!=null)DeckChanged();};expiry.Start();
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
        Interlocked.Increment(ref contextVersion);stepId=id;stepKind=kind;cargoReadbackStep=null;requestedAt=DateTime.MinValue;heardStep=null;lastSentStep=null;
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
    readonly PictureBox logo=new PictureBox();
    readonly HoloLabel kindLabel=new HoloLabel(),progressLabel=new HoloLabel(),footerLabel=new HoloLabel();
    readonly HoloLabel destinationLabel=new HoloLabel();
    readonly DeckButton advance=new DeckButton();
    readonly ColumnStyle faceColumn;readonly RowStyle toolRow;readonly TableLayoutPanel toolActions;
    bool toolsOpen;DateTime requestedAt;
    Dictionary<string,object> nav;
    internal event Action DeckChanged;
    internal string DeckValue(string key){object v;return nav!=null&&nav.TryGetValue(key,out v)?Convert.ToString(v):"";}
    internal bool HasDisplay{get{return displayedMode!=null||DateTime.UtcNow<answerUntil;}}
    internal bool HasStep{get{return stepId!=null||TradeReady&&TradeVerb!="";}}
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
    internal bool ManifestLine(int index,out string item,out string quantity){
        item=quantity="";object data;
        if(nav==null||!nav.TryGetValue("cargo",out data))return false;
        var list=data as IList;if(list==null||index<0||index>=list.Count)return false;
        var row=(Dictionary<string,object>)list[index];
        item=Convert.ToString(row["item"]);if(stepKind=="stop")item=(Convert.ToString(row["action"])=="pickup"?T("적재 · ","Load · "):T("하역 · ","Unload · "))+item;
        quantity=row["scu"]==null?T("수량 미확인","Quantity unknown"):Convert.ToString(row["scu"])+" SCU";return true;
    }
    internal string LoadSummary{get{
        object raw;
        if(nav==null||!nav.TryGetValue("cargo",out raw)||Convert.ToInt32(nav["extra"])!=0)return "";
        decimal total=0;int count=0;
        foreach(Dictionary<string,object> row in (IEnumerable)raw){
            if(row["scu"]==null)return "";total+=Convert.ToDecimal(row["scu"]);count++;
        }
        return count>0?"   ·   "+total.ToString("0.##")+" SCU":"";
    }}
    internal bool CanComplete{get{return TradeReady&&TradeVerb!=""||InFlight&&stepId!=null&&proposalId==null&&(DateTime.UtcNow-received).TotalSeconds<10&&
        (lastSentStep!=stepId||(requestedAt!=DateTime.MinValue&&(DateTime.UtcNow-requestedAt).TotalSeconds>=5));}}
    internal string StepLabel{get{if(TradeReady)return TradeLabel(TradeVerb);switch(stepKind){case "pickup":return T("적재 완료","Loaded");case "delivery":return T("하역 완료","Unloaded");case "departure":return T("출발 완료","Departed");case "jump":return T("점프 완료","Jump complete");default:return T("거점 작업 완료","Complete stop");}}}
    internal void CompleteCurrent(){
        if(!CanComplete)return;
        if(TradeReady){TradeInput(TradeVerb);return;}
        cargoReadbackStep=null;
        lastSentStep=stepId;requestedAt=DateTime.UtcNow;send("complete-flight:"+stepId);
        RenderDeck();if(DeckChanged!=null)DeckChanged();
    }
    void RenderDeck(){
        bool replying=narrating||DateTime.UtcNow<answerUntil||proposalId!=null;
        faceColumn.Width=26;portrait.Visible=replying&&portrait.Image!=null;logo.Visible=!portrait.Visible;
        heading.Text=replying?PartnerPortrait.Title(IsNavigator,english):"STAM NAV";heading.ForeColor=replying?PartnerColor:DeckTheme.Ink;
        destinationLabel.Text=Destination!=""?Destination:displayedMode==null?T("운항 대기","Waiting for flight"):InFlight?T("운송 안내","Flight guidance"):T("무역 안내","Trade guidance");
        freightMode.Enabled=tradeMode.Enabled=switchable&&displayedMode!=null;
        freightMode.Primary=InFlight;tradeMode.Primary=displayedMode=="personal";
        freightMode.Invalidate();tradeMode.Invalidate();
        bool remainder=TradeReady&&tradeAction.ContainsKey("remaining");
        compareBuyer.Text=remainder?T("남은 "+tradeAction["remaining"]+" SCU 판매처 비교","Compare buyers · "+tradeAction["remaining"]+" SCU"):TradeLabel("compare");
        compareBuyer.Visible=TradeReady&&(TradeVerb=="sell"||remainder);if(compareBuyer.Visible)compareBuyer.BringToFront();
        advance.Visible=HasStep;advance.Enabled=CanComplete;advance.Text=lastSentStep!=null&&lastSentStep==stepId&&!CanComplete?T("반영 중","Updating"):StepLabel;
        string action=stepKind=="delivery"?T("하역","Unload"):stepKind=="pickup"?T("적재","Load"):stepKind=="jump"?T("점프","Jump"):stepKind=="departure"?T("출발","Departure"):T("거점 작업","Stop");
        kindLabel.Text=Finished?T("운항 결과","Flight result"):stepKind=="delivery"?T("다음 하역지","Next delivery"):stepKind=="pickup"?T("다음 적재지","Next pickup"):T("다음 목적지","Next destination");
        progressLabel.Text=DeckValue("visitCount")!=""?DeckValue("visitNumber")+" / "+DeckValue("visitCount"):InFlight?T("운항 중","In flight"):"";
        footerLabel.Text=Listening||VoiceEnabled&&DateTime.UtcNow<listeningUntil?TalkStatus:Finished?T("운항 완료","Haul complete"):InFlight?action+LoadSummary:displayedMode==null?T("연결 대기","Waiting for link"):T("무역 안내","Trade desk");
        if(InFlight&&!replying){object value;var items=new List<string>();
            if(nav!=null&&nav.TryGetValue("cargo",out value))foreach(Dictionary<string,object> row in (IEnumerable)value){
                string prefix=stepKind=="stop"?(Convert.ToString(row["action"])=="pickup"?T("적재 ","Load "):T("하역 ","Unload ")):"";
                items.Add(prefix+Convert.ToString(row["item"])+" "+(row["scu"]==null?T("수량 미확인","Qty unknown"):Convert.ToString(row["scu"])+" SCU"));
            }
            if(items.Count>0){int count=Math.Min(3,items.Count),other=items.Count-count+Convert.ToInt32(nav["extra"]);
                body.Text=String.Join(" · ",items.GetRange(0,count).ToArray())+(other>0?"  +"+other:"");}
            else {var rows=CargoRows();body.Text=rows.Count>0?rows[0]:summaryLines;}
        }
        bool showTools=toolsOpen||proposalId!=null;
        if(showTools!=toolActions.Visible&&Visible){
            int height=showTools?Height+64:Math.Max(MinimumSize.Height,Height-64);
            Size=new Size(Width,Math.Min(height,Screen.FromControl(this).WorkingArea.Height));Clamp();
        }
        toolRow.Height=showTools?64:0;toolActions.Visible=showTools;DrawIntake();
    }
    internal void UpdateDisplay(object raw){var d=raw as Dictionary<string,object>;
        UpdateTrade(d);object intake;inbox=d!=null&&d.TryGetValue("inbox",out intake)?intake as Dictionary<string,object>:null;
        SetStep(d!=null&&d.ContainsKey("stepId")?Convert.ToString(d["stepId"]):null,
                d!=null&&d.ContainsKey("step")?Convert.ToString(d["step"]):null);
        if(d==null){nav=null;if(displayedMode==null&&DateTime.UtcNow<answerUntil)return;ClearGuidance();received=DateTime.MinValue;ShowPartner(null);body.Text=T("웹 화면 연결 대기","Waiting for the web view");RenderDeck();return;}received=DateTime.UtcNow;object partner;ShowPartner(d.TryGetValue("partner",out partner)?partner as string:null);var lines=new List<string>();var list=d["lines"] as IEnumerable;if(list!=null)foreach(var line in list)lines.Add(Convert.ToString(line));summaryLines=String.Join("\n",lines.ToArray());UpdateGuidance(d);object navigation;nav=d.TryGetValue("navigation",out navigation)?navigation as Dictionary<string,object>:null;RenderDeck();}
    void RegisterKeys(){
        mousePoll.Stop();gesturePending=false;EndTalk();
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
    protected override void OnHandleDestroyed(EventArgs e){mousePoll.Stop();gesturePending=false;EndTalk();foreach(int id in registered)UnregisterHotKey(Handle,id);registered.Clear();base.OnHandleDestroyed(e);}
    protected override void WndProc(ref Message m){
        if(m.Msg==0x312){
            int id=m.WParam.ToInt32();
            if(configuring)return;
            if(id==5100)Toggle();else if(id==5101)send("show-prices");else if(id==5102)send("show-my-work");else if(id==5103&&!gesturePending){BeginGesture();mousePoll.Start();}
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
    Grammar CommandGrammar(RecognizerInfo engine){
        bool en=engine.Culture.TwoLetterISOLanguageName=="en";
        var phrases=new Choices(en?new[]{"STAM","Navigator","Operator","STAM prices","STAM my work","STAM overlay","STAM trade","STAM flight"}:
            new[]{"스탐","항해사","브리지 오퍼레이터","스탐 가격","스탐 내 작업","스탐 오버레이","스탐 무역","스탐 운송"});
        foreach(var word in FlightPhrases.Keys){
            if((word[0]<128)!=en)continue;
            phrases.Add(word);
            if(en)foreach(var call in new[]{"STAM ","Navigator ","Operator "})phrases.Add(call+word);
        }
        AddQueries(phrases);
        var builder=new GrammarBuilder{Culture=engine.Culture};
        builder.Append(phrases);
        return new Grammar(builder);
    }
    static readonly Dictionary<string,string> FlightPhrases=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase){
        {"다음 단계","next"},{"적재 완료","pickup"},{"다 실었어","pickup"},{"다 실었어요","pickup"},{"픽업 완료","pickup"},{"배송 완료","delivery"},{"하역 완료","delivery"},{"출발 완료","departure"},{"점프 완료","jump"},{"거점 작업 완료","stop"},
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
        cargoReadbackStep=null;
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
        if(TestingMic)return;
        if(buttonRecording){FinishRecording();return;}
        if(heldMic==null)BeginRecording(true);
    }
    void BeginRecording(bool fromButton){
        if(VoiceEnabled){ReportTalk(T("연속 듣기 중","Continuous listening is on"));return;}
        if(decoding!=null||koreanHold!=null){ReportTalk(T("직전 음성을 인식 중입니다. 잠시 뒤 다시 누르세요.","Finishing the previous phrase. Press again shortly."));return;}
        try{
            StopNarration();heldPicker=CurrentPicker;heldStep=stepId;heldProposal=proposalId;heldReceiptView=receiptView;heldHints=receiptHints;heldQuantityPrompt=quantityPrompt;heldPlacePrompt=placePrompt;
            heldMic=openCapture();buttonRecording=fromButton;buttonDeadline=DateTime.UtcNow.AddSeconds(30);holdPoll.Start();
            CheckHeldKey();
            if(Listening)ReportTalk(fromButton?T("듣는 중 · 녹음 끝내기를 누르세요","Listening · click Finish recording"):T("듣는 중 · 키를 떼면 전송","Listening · release to send"));
        }catch(Exception error){RecordingError(error.Message);}
    }
    void CheckHeldKey(){
        if(heldMic==null)return;
        try{
            if(buttonRecording&&DateTime.UtcNow>=buttonDeadline){FinishRecording();return;}
            if(buttonRecording||TalkKeyDown()){heldMic.Drain();return;}
            FinishRecording();
        }catch(Exception error){RecordingError(error.Message);}
    }
    void FinishRecording(){
        try{
            buttonRecording=false;
            holdPoll.Stop();
            heldAudio=heldMic.Finish();heldMic=null;
            if(heldAudio.Length==0){RecordingError(T("입력된 음성이 없습니다.","No speech captured."));return;}
            if(english)DecodeHeldTalk();else DecodeKoreanHold();
        }catch(Exception error){RecordingError(error.Message);}
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
                if(e.Error!=null||e.Cancelled||words.Count==0){RecordingError(e.Error==null?T("인식한 말이 없습니다.","No speech recognized."):e.Error.Message);return;}
                string phrase=String.Join(" ",words.ToArray());
                if(TestTranscript(phrase)||ReplyToPicker(heldPicker,phrase,confidence))return;
                DispatchSpeech(phrase,confidence,heldStep,heldProposal,commandGrammar&&words.Count==1,true,heldReceiptView);
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
        heardPicker=CurrentPicker;ignoreUtterance=narrating;heardProposal=proposalId;heardReceiptView=receiptView;
        heardStep=position>=stepAudioStart?stepId:null;
    }
    void HandlePhrase(string phrase,float confidence){
        string captured=heardStep;heardStep=null;
        if(ignoreUtterance||narrating)return;
        DispatchSpeech(phrase,confidence,captured,heardProposal,true,false,heardReceiptView);
    }
    void DispatchSpeech(string phrase,float confidence,string captured,string proposal,bool commands,bool direct,string capturedReceipt=null){
        if(String.IsNullOrWhiteSpace(phrase))return;
        if(!direct&&ReplyToPicker(english?heardPicker:CurrentPicker,phrase,confidence))return;
        var wake=WakePrefix.Match(phrase);
        bool addressed=wake.Success&&confidence>=.62f;
        if(addressed&&linkedPartner!=null){
            string name=Normal(wake.Value);
            bool wrongPartner=linkedPartner=="operator"?ContainsAny(name,"항해사","navigator"):ContainsAny(name,"오퍼레이터","operator");
            if(wrongPartner)return;
        }
        string request=addressed?phrase.Substring(wake.Length).Trim():phrase;
        if(direct||addressed)ReportTalk(T("들은 말 · ","Heard · ")+phrase);
        if(addressed&&request.Length==0){
            listeningUntil=DateTime.UtcNow.AddSeconds(15);
            Answer(T("말씀해 주십시오.","Listening. How can I help?"),true);
            return;
        }
        bool followingWake=DateTime.UtcNow<listeningUntil;
        listeningUntil=DateTime.MinValue;
        bool reply=DateTime.UtcNow<clarifyUntil||(DateTime.UtcNow-received).TotalSeconds<=10&&
            (receiptFollowup||awaitingDetails||proposal!=null&&proposal==proposalId&&Regex.IsMatch(Normal(request),"^(적용(해(줘)?)?|확정(해)?|취소(해)?|apply|confirm|cancel)$"));
        if(receiptReadback&&proposal!=null&&proposal==proposalId&&Regex.IsMatch(Normal(request),@"^(?:(?:맞아|맞아요|맞습니다|정확해|yes|correct)$|아니|정정|no|correction)"))reply=true;
        if(!direct&&!addressed&&!followingWake&&!reply&&!rideAlong)return;
        bool ambient=rideAlong&&!direct&&!addressed&&!followingWake&&!reply;
        if(!reply&&confidence>=.76f&&Regex.IsMatch(request,@"^(?:잡담|이어서|let[’']s chat|chat|follow up)(?:[ ,，:]+|$)",RegexOptions.IgnoreCase)){
            if(!rideChat||(DateTime.UtcNow-received).TotalSeconds>10){
                Answer(T("웹 부조종사에서 온라인 자유 대화를 켜 주세요.","Enable online conversation in the web copilot."),true);return;
            }
            if(request.Length<=160){quoteRequested=DateTime.UtcNow;readQuote=true;send("copilot-say:"+request);}
            return;
        }
        if(rideAlong&&!reply&&confidence>=.70f&&TryBanter(request))return;
        string view=commands?VoiceCommand(phrase,confidence):null;
        if(view=="toggle-overlay"){Toggle();return;}
        if(view!=null){send(view);return;}
        if(CopilotRequest(request,confidence,proposal,capturedReceipt)||Query(request,confidence))return;
        string command=commands&&captured!=lastSentStep&&(DateTime.UtcNow-received).TotalSeconds<=10
            ?FlightCommand(request,confidence,captured,stepId,stepKind):null;
        if(command!=null){
            lastSentStep=captured;requestedAt=DateTime.UtcNow;send(command);
            ReportTalk(T("현재 단계 완료 요청을 보냈습니다.","Current step completion requested."));return;
        }
        if(!ambient&&(direct||addressed||followingWake||reply))Answer(T("잘 못 들었어요. “다음 목적지 알려줘”처럼 말해 주세요.","Try asking “next destination”."),
            confidence>=.62f);
    }

    bool TryBanter(string phrase){
        string q=Normal(phrase),line;
        if(q.Contains("주차")&&ContainsAny(q,"저렇게","저래","저따위","꼬라지","뭐같","같게","막았","엉망","개판")||
            Regex.IsMatch(phrase,@"\b(terrible|awful|bad) parking\b|\bparked like",RegexOptions.IgnoreCase))
            line=IsNavigator?T("주차한 분은 내리면서 꽤 만족하셨을 겁니다.","I suspect the pilot was rather pleased with that parking job."):T("아니, 대체 어떻게 대놨길래요?","Oh wow. How did they even park it?");
        else if(ContainsAny(q,"풍경좋","경치좋","경치진짜좋","경치끝내","whataview","beautifulview"))
            line=IsNavigator?T("이런 날은 항해 일지를 한 줄 더 쓰게 됩니다.","A view worth an extra line in the ship’s log."):T("이럴 땐 화물 말고 창밖도 좀 봐야죠!","Now that sounds worth looking up from the manifest for!");
        else if(ContainsAny(q,"착륙잘했","착륙깔끔","착륙부드","착륙성공","smoothlanding","nailedthelanding"))
            line=IsNavigator?T("그 정도면 승객도 계속 잤겠습니다.","I imagine the passengers slept right through that."):T("오, 함장님 손맛인데요?","Oh, that sounds like a captain with a light touch!");
        else if(ContainsAny(q,"엘리베이터언제오냐","대기너무길","대기지겨","줄이너무길","waitingforever","suchalongqueue"))
            line=IsNavigator?T("기다릴 때만 시계가 느려지는군요.","The clock does seem to slow down in a queue."):T("기다리는 게 짐 나르는 것보다 힘들 때도 있어요.","Some days waiting is the hardest part of hauling.");
        else if(ContainsAny(q,"하역힘들","하역빡세","짐내리기힘들","상자너무많","상자가너무많","somanyboxes","unloadingisexhausting"))
            line=IsNavigator?T("오늘은 팔이 항해 일지를 먼저 쓰겠습니다.","I suspect your arms will remember this haul tomorrow."):T("그 정도면 다음 상자는 스스로 걸어 나와야죠.","At this rate the next crate should walk itself out.");
        else return false;
        if(DateTime.UtcNow-lastBanter>=TimeSpan.FromSeconds(15)){lastBanter=DateTime.UtcNow;Answer(line,true);}
        return true;
    }
    bool CargoVoiceReady(string captured){
        return captured!=null&&captured==stepId&&CanComplete&&!receiptFollowup&&!awaitingDetails&&DateTime.UtcNow>=clarifyUntil;
    }
    bool HandleCargoReadback(KoreanRecognition.Phrase phrase,string captured){
        bool waiting=cargoReadbackStep!=null&&cargoReadbackStep==captured&&DateTime.UtcNow<=cargoReadbackUntil;
        cargoReadbackStep=null;
        if(!CargoVoiceReady(captured))return phrase.CargoReadback!=null;
        if(waiting){
            string answer=Normal(phrase.text??"");
            if((phrase.Confidence>=.85f||phrase.ConfirmedAnswer)&&KoreanRecognition.Affirmative(answer)){
                CompleteCurrent();return true;
            }
            if(KoreanRecognition.Affirmative(answer)){
                cargoReadbackStep=captured;Answer("확인 답변이 잘 들리지 않았어요. 다시 말씀해 주세요.",true);return true;
            }
            if(Regex.IsMatch(answer,"^(취소|아니|아냐|아니요|아니야)$")){
                Answer("현재 단계를 유지할게요.",true);return true;
            }
        }
        if(phrase.CargoReadback==null)return false;
        cargoReadbackStep=captured;cargoReadbackUntil=DateTime.UtcNow.AddSeconds(15);
        Answer(phrase.CargoReadback+"로 들었어요. 맞으면 ‘네’라고 해 주세요.",true);return true;
    }
    string[] receiptHints=new string[0],heldHints;
    string pendingHintPair,pendingHintPlace;
    int pendingHintQuantity;
    string[] pendingHintRows;
    DateTime hintDeadline;
    static string ReceiptChoice(string heard){
        var ordinal=Regex.Match(heard,@"^(첫|두|세|네|다섯|여섯|일곱|여덟|아홉|열)\s*(?:번째|째)(?:\s*(?:계약|미션))?$");
        if(ordinal.Success)return (1+Array.IndexOf(new[]{"첫","두","세","네","다섯","여섯","일곱","여덟","아홉","열"},ordinal.Groups[1].Value)).ToString();
        var m=Regex.Match(heard,@"^(?:계약\s*)?(?:\[([0-9]+)\]|([0-9]+)|([일이삼사오육칠팔구]))\s*(?:번(?:\s*(?:계약|미션))?)?$");
        if(!m.Success)return null;
        if(m.Groups[1].Success)return m.Groups[1].Value;
        if(m.Groups[2].Success)return m.Groups[2].Value;
        return ("일이삼사오육칠팔구".IndexOf(m.Groups[3].Value,StringComparison.Ordinal)+1).ToString();
    }
    bool HandleReceiptPair(KoreanRecognition.Phrase phrase,string view,string[] hints){
        if(hints==null||hints!=receiptHints||view==null||view!=receiptView||!copilot||
            proposalId!=null||awaitingDetails||receiptFollowup||(DateTime.UtcNow-received).TotalSeconds>10)return false;
        if(phrase.MultiStopReview!=null&&canReviewQuantity){
            pendingHintPlace=pendingHintPair=null;
            ReviewQuantity(view,phrase.MultiStopReview);return true;
        }
        string heard=phrase.text.Trim();
        if(pendingHintRows!=hints||DateTime.UtcNow>hintDeadline)pendingHintPlace=pendingHintPair=null;
        if((pendingHintPlace!=null||pendingHintPair!=null)&&Regex.IsMatch(heard,@"^(?:아니|취소|그만)")){
            pendingHintPlace=pendingHintPair=null;Answer("계약 수정을 취소했어요.",true);return true;
        }
        int quantity=phrase.SuggestedQuantity;
        if(quantity==0&&phrase.PartialReceiptPlace==null&&phrase.ReceiptPairHint==null&&(pendingHintPlace!=null||pendingHintPair!=null))quantity=pendingHintQuantity;
        string pair=phrase.ReceiptPairHint;
        bool newPair=pair!=null;
        string place=phrase.PartialReceiptPlace??pendingHintPlace;
        if(pair==null&&place!=null){
            var goods=new List<string>();
            foreach(string hint in hints){
                var fields=hint.Split('|');
                if(fields[1]==place&&!goods.Contains(fields[2]))goods.Add(fields[2]);
            }
            if(goods.Count==0)return false;
            if(place==pendingHintPlace&&phrase.Confidence>=.85f){
                string reply=Normal(Regex.Replace(heard,@"(?:이요|이야|요|만)$",""));
                foreach(string cargo in goods)if(Normal(cargo)==reply){pair=place+"|"+cargo;newPair=true;break;}
            }
            if(pair==null){
                if(pendingHintPlace!=null&&heard.Length>12&&phrase.PartialReceiptPlace==null){pendingHintPlace=null;return false;}
                pendingHintPair=null;pendingHintPlace=place;pendingHintRows=hints;pendingHintQuantity=quantity;hintDeadline=DateTime.UtcNow.AddSeconds(30);
                Answer(place+"행 화물 중 어느 품목인가요? "+String.Join(", ",goods.ToArray())+" 중에서 말씀해 주세요.",true);
                return true;
            }
        }
        pendingHintPlace=null;
        pair=pair??pendingHintPair;
        if(pair==null)return false;
        string[] parts=pair.Split('|');
        var cards=new List<string>();
        foreach(string hint in hints){
            if(!hint.EndsWith("|"+pair,StringComparison.Ordinal))continue;
            string card=hint.Substring(0,hint.IndexOf('|'));
            if(!cards.Contains(card))cards.Add(card);
        }
        if(cards.Count==0)return false;
        string cardNumber=null;
        if(newPair){
            pendingHintPair=null;
            var addressed=Regex.Match(heard,@"^(.{1,14}?(?:번|번째|째))\s*(?:계약|미션)");
            string explicitNumber=addressed.Success?ReceiptChoice(addressed.Groups[1].Value):null;
            if(explicitNumber!=null&&!cards.Contains(explicitNumber)){
                Answer(explicitNumber+"번 계약에서 해당 화물을 찾을 수 없어요. 계약 번호를 확인해 주세요.",true);
                return true;
            }
            if(explicitNumber!=null&&phrase.Confidence>=.85f)cardNumber=explicitNumber;
            else if(cards.Count==1)cardNumber=cards[0];
        }else{
            string n=ReceiptChoice(heard);
            if(n==null){pendingHintPair=null;return false;}
            if(phrase.Confidence>=.85f&&cards.Contains(n))cardNumber=n;
        }
        if(cardNumber==null){
            pendingHintPair=pair;pendingHintRows=hints;pendingHintQuantity=quantity;hintDeadline=DateTime.UtcNow.AddSeconds(30);
            Answer(parts[0]+"행 "+parts[1]+"으로 들었어요. "+String.Join("번, ",cards.ToArray())+"번 중 어느 계약인가요?",true);
            return true;
        }
        pendingHintPair=null;
        if(quantity>0&&canReviewQuantity){
            ReviewQuantity(view,cardNumber+"번 계약 "+parts[0]+"에 내릴 "+parts[1]+" 수량 "+quantity+"로 바꿔");
            return true;
        }
        return CopilotRequest(cardNumber+"번 계약 "+parts[0]+"에 내릴 "+parts[1]+" 수량 바꿔줘",1,null,view);
    }
    void ReviewQuantity(string stamp,string body){
        quoteRequested=DateTime.UtcNow;readQuote=true;send("receipt-review:"+stamp+":"+body);
    }
    bool HandlePlaceReply(KoreanRecognition.Phrase result,string question,string view){
        if(question==null&&placePrompt==null)return false;
        if(question==null||question!=placePrompt||view!=receiptView||(DateTime.UtcNow-received).TotalSeconds>10){
            Answer("거점 선택지가 바뀌었어요. 현재 질문을 확인해 주세요.",true);return true;
        }
        int option=result.PlaceOption;
        if(option==0&&result.Confidence>=.85f&&Regex.IsMatch(result.text,@"(?:번|번째|째)(?:이요|요)?$")){
            string ordinal=ReceiptChoice(Regex.Replace(result.text,@"(?:이요|요)$",""));
            Int32.TryParse(ordinal,out option);
        }
        if(placeOptions==null)return false;
        if(option<1||option>placeOptions.Length){
            string text=result.text.Trim();
            if(text.Length>48||Regex.IsMatch(text,@"계약|미션|취소|그만|되돌|바꿔|변경|말고"))return false;
            if(result.Confidence<.85f){
                Answer("거점을 다시 말씀해 주세요. "+String.Join(", ",placeOptions)+" 중에서 고를 수 있어요.",true);
            }else{
                quoteRequested=DateTime.UtcNow;readQuote=true;send("receipt-place:"+question+":reply:"+text);
            }
            return true;
        }
        quoteRequested=DateTime.UtcNow;readQuote=true;
        send("receipt-place:"+question+":"+(result.ReviewPlace?"review":"heard")+":"+option);
        return true;
    }
    bool HandleReceiptQuantity(KoreanRecognition.Phrase phrase,string question,string proposal,string capturedView){
        if(question!=quantityPrompt||capturedView!=receiptView){
            if(question==null&&quantityPrompt==null)return false;
            Answer("계약 질문이 바뀌었어요. 현재 수량을 다시 말씀해 주세요.",true);return true;
        }
        if(question!=null&&phrase.SuggestedQuantity>0&&copilot&&receiptFollowup&&proposalId==null&&(DateTime.UtcNow-received).TotalSeconds<=10){
            ReviewQuantity(question,phrase.SuggestedQuantity.ToString());return true;
        }
        if(proposal!=null&&proposal==proposalId&&receiptReadback&&KoreanRecognition.Affirmative(phrase.text)&&(phrase.ConfirmedAnswer||phrase.Confidence>=.85f))
            return CopilotRequest("맞아",1,proposal,capturedView);
        return false;
    }
    async void DecodeKoreanHold(){
        byte[] pcm=heldAudio.ToArray();heldAudio.Dispose();heldAudio=null;
        var session=koreanHold=new CancellationTokenSource();
        string captured=heldStep,proposal=heldProposal,capturedView=heldReceiptView;
        string place=heldPlacePrompt;
        string[] choices=place!=null&&place==placePrompt?placeOptions:null;
        string screen=heldPicker;string question=heldQuantityPrompt;
        bool receiptConfirm=proposal!=null&&proposal==proposalId&&receiptReadback;
        string cargoStep=screen==null&&!receiptConfirm&&CargoVoiceReady(captured)?stepKind:null;
        bool verifyingCargo=cargoStep!=null&&cargoReadbackStep==captured&&DateTime.UtcNow<=cargoReadbackUntil;
        string[] hints=screen==null&&capturedView==receiptView&&heldHints==receiptHints&&!receiptFollowup&&proposal==null&&!awaitingDetails?heldHints:null;
        ReportTalk("음성 인식 중");
        try{
            bool testing=TestingMic;
            var result=await Task.Run(()=>testing?KoreanRecognition.FromRecording(pcm,session.Token):KoreanRecognition.FromRecording(pcm,session.Token,cargoStep,verifyingCargo,hints,question!=null,receiptConfirm,choices));
            if(koreanHold!=session||disposing)return;
            if(String.IsNullOrWhiteSpace(result.text)){RecordingError("인식한 말이 없습니다. 마이크 입력을 확인해 주세요.");return;}
            if(TestTranscript(result.text)||ReplyToPicker(screen,result.text,result.Confidence)||HandlePlaceReply(result,place,capturedView)||HandleReceiptQuantity(result,question,proposal,capturedView)||HandleCargoReadback(result,captured)||HandleReceiptPair(result,capturedView,hints))return;
            DispatchSpeech(result.text,result.Confidence,captured,proposal,true,true,capturedView);
        }catch(Exception error){if(koreanHold==session&&!disposing)RecordingError(error.Message);}
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
                        ui.Post(_=>{if(koreanLive==session&&!disposing)ReportTalk(ListenHint);},null);
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
                                DispatchSpeech(result.text,result.Confidence,stepId,proposalId,true,false,receiptView);
                            },null);
                        }
                    }
                }
            });
        }catch(Exception error){if(koreanLive==session&&!disposing){koreanLive=null;rideAlong=false;ReportTalk(error.Message);}}
        finally{if(koreanLive==session)koreanLive=null;session.Dispose();}
    }
    internal void ToggleVoice(){
        if(TestingMic)return;
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
            engine.SpeechRecognized+=(s,e)=>OnVoiceEvent(engine,()=>{if(e.Result.Grammar is DictationGrammar){if(!ignoreUtterance&&!narrating)DispatchSpeech(e.Result.Text,e.Result.Confidence,heardStep,heardProposal,false,false,heardReceiptView);heardStep=null;}else HandlePhrase(e.Result.Text,e.Result.Confidence);});
            engine.RecognizeCompleted+=(s,e)=>OnVoiceEvent(engine,()=>{
                StopVoice();ReportTalk(e.Error!=null?e.Error.Message:T("연속 듣기가 종료되었습니다.","Continuous listening ended."));
            });
            engine.RecognizeAsync(RecognizeMode.Multiple);
            ReportTalk(ListenHint);
        }catch(Exception error){StopVoice();ReportTalk(error.Message);}
    }
    void StopVoice(){
        rideAlong=false;lastBanter=DateTime.MinValue;
        listeningUntil=DateTime.MinValue;
        if(koreanLive!=null){koreanLive.Cancel();koreanLive=null;}
        var engine=speech;speech=null;heardStep=null;
        if(engine==null)return;
        try{engine.RecognizeAsyncCancel();}catch(InvalidOperationException){}
        engine.Dispose();
    }
    protected override void Dispose(bool value){if(value){disposing=true;StopNarration();EndTalk();StopVoice();expiry.Dispose();foreach(int id in registered)if(IsHandleCreated)UnregisterHotKey(Handle,id);registered.Clear();}base.Dispose(value);if(value){if(logo.Image!=null)logo.Image.Dispose();holdPoll.Dispose();mousePoll.Dispose();}}
}
