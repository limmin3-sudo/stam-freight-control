using System;
using System.Collections;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Speech.Recognition;
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
    readonly System.Windows.Forms.Timer expiry=new System.Windows.Forms.Timer();
    readonly List<int> registered=new List<int>();
    SpeechRecognitionEngine speech;
    DateTime received=DateTime.MinValue;
    bool interactive=false,disposing=false;
    readonly DeckButton talkButton=new DeckButton(),continuousButton=new DeckButton();
    SpeechRecognitionEngine oneShot;
    internal event Action TalkChanged;
    internal bool Listening {get{return oneShot!=null;}}
    string heardStep,lastSentStep;
    TimeSpan stepAudioStart;
    internal string ContinuousLabel {get{return VoiceEnabled?T("연속 듣기 끄기","Stop continuous listening"):T("연속 듣기 켜기","Listen continuously");}}
    string stepId,stepKind;
    internal string TalkStatus {get;private set;}
    int keyTalk=(int)Keys.M;
    int keyOverlay=(int)Keys.O,keyPrices=(int)Keys.P,keyWork=(int)Keys.W;
    string T(string ko,string en){return english?en:ko;}
    internal bool VoiceEnabled {get{return speech!=null;}}
    internal CompanionOverlay(Action<string> command,bool en,string directory){
        send=command;english=en;Narrator="off";LoadQuestions();settings=Path.Combine(directory,"overlay.json");
        Text=T("STAM · 운항 오버레이","STAM · Flight overlay");ShowInTaskbar=false;FormBorderStyle=FormBorderStyle.SizableToolWindow;TopMost=true;
        StartPosition=FormStartPosition.Manual;
        MinimumSize=new Size(390,310);
        Size=new Size(600,460);
        BackColor=Color.FromArgb(8,23,33);ForeColor=Color.FromArgb(224,241,245);Opacity=.96;
        var layout=new DeckSurface{ShowEmblem=true,Dock=DockStyle.Fill,Padding=new Padding(18),ColumnCount=1,RowCount=4};
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute,42));layout.RowStyles.Add(new RowStyle(SizeType.Percent,100));layout.RowStyles.Add(new RowStyle(SizeType.Absolute,94));layout.RowStyles.Add(new RowStyle(SizeType.Absolute,44));Controls.Add(layout);
        heading.Dock=body.Dock=status.Dock=DockStyle.Fill;heading.Font=HoloFonts.At(19);body.Font=HoloFonts.At(16);status.Font=HoloFonts.At(12);heading.ForeColor=Color.FromArgb(240,205,142);
        heading.Text="STAM / FREIGHT DIVISION";body.Text=T("웹 관제실에서 ‘로그 앱에 표시’를 켜세요.","Enable companion display in the web console.");
        layout.Controls.Add(heading);layout.Controls.Add(body);
        var actions=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=2,RowCount=2,BackColor=Color.Transparent};
        for(int i=0;i<2;i++){actions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,50));actions.RowStyles.Add(new RowStyle(SizeType.Percent,50));}
        foreach(string action in new[]{"show-prices","show-my-work"}){string a=action;var b=new DeckButton{Text=a=="show-prices"?T("가격 보기","Prices"):T("내 작업","My work"),Dock=DockStyle.Fill,Margin=new Padding(0,0,6,0)};b.Click+=(s,e)=>send(a);actions.Controls.Add(b);}talkButton.Dock=DockStyle.Fill;talkButton.Text=T("눌러서 말하기","Speak once");talkButton.Click+=(s,e)=>SpeakOnce();actions.Controls.Add(talkButton);
        continuousButton.Dock=DockStyle.Fill;continuousButton.Text=ContinuousLabel;continuousButton.Click+=(s,e)=>ToggleVoice();actions.Controls.Add(continuousButton);
        foreach(Control button in actions.Controls){button.Font=HoloFonts.At(13);((DeckButton)button).FlatFace=true;}
        layout.Controls.Add(actions);layout.Controls.Add(status);
        try{var saved=new JavaScriptSerializer().Deserialize<Dictionary<string,object>>(File.ReadAllText(settings));object voice;if(saved.TryGetValue("narrator",out voice)&&ValidNarrator(voice as string))Narrator=(string)voice;Location=new Point(Convert.ToInt32(saved["x"]),Convert.ToInt32(saved["y"]));int w,h;
            if(saved.ContainsKey("width")&&saved.ContainsKey("height")&&int.TryParse(Convert.ToString(saved["width"]),out w)&&int.TryParse(Convert.ToString(saved["height"]),out h)&&w>0&&h>0){
                var area=Screen.FromPoint(Location).WorkingArea;
                Size=new Size(Math.Min(w,area.Width),Math.Min(h,area.Height));
            }
            keyOverlay=Key(saved,"overlay",keyOverlay);keyPrices=Key(saved,"prices",keyPrices);keyWork=Key(saved,"work",keyWork);keyTalk=Key(saved,"talk",keyTalk);}catch{Location=new Point(Screen.PrimaryScreen.WorkingArea.Right-Width-24,Screen.PrimaryScreen.WorkingArea.Top+40);}
        while(keyTalk==keyOverlay||keyTalk==keyPrices||keyTalk==keyWork)keyTalk=keyTalk==(int)Keys.Z?(int)Keys.A:keyTalk+1;
        Clamp();expiry.Interval=1000;expiry.Tick+=(s,e)=>{if((DateTime.UtcNow-received).TotalSeconds>12){ClearGuidance();SetStep(null,null);body.Text=T("웹 화면 연결 대기","Waiting for the web view");heading.Text="STAM / FREIGHT DIVISION";}};expiry.Start();
        FormClosing+=(s,e)=>{if(!disposing&&e.CloseReason==CloseReason.UserClosing){e.Cancel=true;Hide();}};
        Move+=(s,e)=>Save();ResizeEnd+=(s,e)=>{Clamp();Save();};
        // Create the message window even while the overlay is hidden.
        var ignored=Handle;RegisterKeys();
    }
    static int Key(Dictionary<string,object> s,string name,int fallback){int key=s.ContainsKey(name)?Convert.ToInt32(s[name]):fallback;return key>=(int)Keys.A&&key<=(int)Keys.Z?key:fallback;}
    void Save(){try{Directory.CreateDirectory(Path.GetDirectoryName(settings));File.WriteAllText(settings,new JavaScriptSerializer().Serialize(new{x=Left,y=Top,width=Width,height=Height,narrator=Narrator,overlay=keyOverlay,prices=keyPrices,work=keyWork,talk=keyTalk}));}catch{}}
    void Clamp(){var area=Screen.FromPoint(Location).WorkingArea;Size=new Size(Math.Min(Width,area.Width),Math.Min(Height,area.Height));Location=new Point(Math.Max(area.Left,Math.Min(Left,area.Right-Width)),Math.Max(area.Top,Math.Min(Top,area.Bottom-Height)));}
    protected override CreateParams CreateParams {get{var p=base.CreateParams;p.ExStyle|=0x80;if(!interactive)p.ExStyle|=0x20|0x80000|0x8000000;return p;}}
    protected override bool ShowWithoutActivation {get{return !interactive;}}
    internal void Toggle(){if(Visible)Hide();else{Clamp();Show();}}
    internal void ToggleInput(){interactive=!interactive;RecreateHandle();RegisterKeys();status.Text=interactive?T("조작 모드 · 이동/버튼 사용","Input mode · move or click buttons"):T("클릭 통과 · 게임 입력 유지","Click-through mode");}
    void SetStep(string id,string kind){
        if(id==stepId&&kind==stepKind)return;
        stepId=id;stepKind=kind;heardStep=null;lastSentStep=null;
        stepAudioStart=speech==null?TimeSpan.Zero:speech.AudioPosition;
    }
    internal void UpdateDisplay(object raw){var d=raw as Dictionary<string,object>;
        SetStep(d!=null&&d.ContainsKey("stepId")?Convert.ToString(d["stepId"]):null,
                d!=null&&d.ContainsKey("step")?Convert.ToString(d["step"]):null);
        if(d==null){ClearGuidance();received=DateTime.MinValue;heading.Text="STAM / FREIGHT DIVISION";body.Text=T("웹 화면 연결 대기","Waiting for the web view");return;}received=DateTime.UtcNow;heading.Text=Convert.ToString(d["title"]);var lines=new List<string>();var list=d["lines"] as IEnumerable;if(list!=null)foreach(var line in list)lines.Add(Convert.ToString(line));summaryLines=String.Join("\n",lines.ToArray());UpdateGuidance(d);}
    void RegisterKeys(){foreach(int id in registered)UnregisterHotKey(Handle,id);registered.Clear();int[] keys={keyOverlay,keyPrices,keyWork,keyTalk};for(int i=0;i<keys.Length;i++){if(RegisterHotKey(Handle,5100+i,0x4000|0x2|0x1,(uint)keys[i]))registered.Add(5100+i);}status.Text=registered.Count==4?T("Ctrl+Alt 단축키 · 트레이에서 설정","Ctrl+Alt shortcuts · configure in tray"):T("단축키 충돌 · 트레이 설정에서 변경","Shortcut conflict · change keys in tray");}
    protected override void OnHandleDestroyed(EventArgs e){foreach(int id in registered)UnregisterHotKey(Handle,id);registered.Clear();base.OnHandleDestroyed(e);}
    protected override void WndProc(ref Message m){if(m.Msg==0x312){int id=m.WParam.ToInt32();if(id==5100)Toggle();else if(id==5101)send("show-prices");else if(id==5102)send("show-my-work");else if(id==5103)SpeakOnce();return;}base.WndProc(ref m);}
    internal void Configure(){using(var dialog=new Form{Text=T("STAM 단축키","STAM shortcuts"),Size=new Size(420,325),StartPosition=FormStartPosition.CenterScreen,BackColor=BackColor,ForeColor=ForeColor,Font=HoloFonts.At(11),FormBorderStyle=FormBorderStyle.FixedDialog,MaximizeBox=false,MinimizeBox=false}){
        var surface=new DeckSurface{Dock=DockStyle.Fill};dialog.Controls.Add(surface);var panel=new FlowLayoutPanel{Dock=DockStyle.Fill,Padding=new Padding(18),FlowDirection=FlowDirection.TopDown,BackColor=Color.Transparent};surface.Controls.Add(panel);var boxes=new List<ComboBox>();int[] keys={keyOverlay,keyPrices,keyWork,keyTalk};string[] labels={T("오버레이","Overlay"),T("가격 보기","Prices"),T("내 작업","My work"),T("눌러서 말하기","Speak once")};
        for(int i=0;i<keys.Length;i++){var row=new FlowLayoutPanel{Width=360,Height=40,BackColor=Color.Transparent};row.Controls.Add(new Label{Text=labels[i]+" · Ctrl+Alt+",Width=220});var box=new ComboBox{DropDownStyle=ComboBoxStyle.DropDownList,Width=70,FlatStyle=FlatStyle.Flat,BackColor=Color.FromArgb(12,29,37),ForeColor=ForeColor};for(char c='A';c<='Z';c++)box.Items.Add(c.ToString());box.SelectedIndex=keys[i]-(int)Keys.A;boxes.Add(box);row.Controls.Add(box);panel.Controls.Add(row);}
        var save=new DeckButton{Text=T("저장","Save"),Width=140,Height=36,Warm=true};save.Click+=(s,e)=>{if(new HashSet<int>(boxes.ConvertAll(box=>box.SelectedIndex)).Count!=boxes.Count){MessageBox.Show(T("서로 다른 키를 선택하세요.","Choose different keys."));return;}keyOverlay=boxes[0].SelectedIndex+(int)Keys.A;keyPrices=boxes[1].SelectedIndex+(int)Keys.A;keyWork=boxes[2].SelectedIndex+(int)Keys.A;keyTalk=boxes[3].SelectedIndex+(int)Keys.A;Save();RegisterKeys();dialog.Close();};panel.Controls.Add(save);dialog.ShowDialog();}}
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
        talkButton.Text=Listening?T("듣기 취소","Cancel"):T("눌러서 말하기","Speak once");
        continuousButton.Text=ContinuousLabel;continuousButton.Primary=VoiceEnabled;continuousButton.Invalidate();
        if(TalkChanged!=null)TalkChanged();
    }
    void EndTalk(){
        var engine=oneShot;oneShot=null;
        if(engine!=null){try{engine.RecognizeAsyncCancel();}catch(InvalidOperationException){}engine.Dispose();}
    }
    internal void SpeakOnce(){
        if(Listening){EndTalk();ReportTalk(T("듣기를 취소했습니다.","Listening cancelled."));return;}
        if(VoiceEnabled)StopVoice();
        string captured=stepId;
        if((DateTime.UtcNow-received).TotalSeconds>10){
            ReportTalk(T("운송 또는 무역 화면에서 로그 앱 표시를 연결하세요.","Connect the companion display in the freight or trade console."));return;
        }
        StopNarration();
        try{
            RecognizerInfo selected=SelectRecognizer();
            var engine=new SpeechRecognitionEngine(selected);oneShot=engine;
            var phrases=new Choices();
            foreach(var word in FlightPhrases.Keys)if((word[0]<128)==english)phrases.Add(word);
            AddQueries(phrases);
            var grammar=new GrammarBuilder{Culture=selected.Culture};grammar.Append(phrases);
            engine.LoadGrammar(new Grammar(grammar));
            engine.SetInputToDefaultAudioDevice();engine.InitialSilenceTimeout=TimeSpan.FromSeconds(6);
            engine.RecognizeCompleted+=(sender,e)=>{
                if(disposing||IsDisposed||!IsHandleCreated)return;
                BeginInvoke((Action)(()=>{
                    if(oneShot!=engine)return;
                    var result=!e.Cancelled&&e.Error==null?e.Result:null;
                    string phrase=result==null?"":result.Text;
                    float confidence=result==null?0:result.Confidence;
                    string command=(DateTime.UtcNow-received).TotalSeconds<=10?FlightCommand(phrase,confidence,captured,stepId,stepKind):null;
                    oneShot=null;engine.Dispose();
                    if(Query(phrase,confidence)){ReportTalk(T("조회 요청","Information request"));return;}
                    if(command!=null)send(command);
                    ReportTalk(command!=null?T("현재 단계 완료 요청을 보냈습니다.","Current step completion requested."):T("현재 단계와 일치하지 않습니다. 다시 말하세요.","No matching step. Press to try again."));
                }));
            };
            engine.RecognizeAsync(RecognizeMode.Single);
            ReportTalk(displayedMode=="flight"?T("듣는 중 · 다음 목적지 알려줘 / 적재 완료","Listening · next destination / loading complete"):T("듣는 중 · 금 어디서 팔아 / 금 매입가 알려줘","Listening · where can I sell gold / gold buy price"));
        }catch(Exception e){EndTalk();ReportTalk(e.Message);}
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
        ignoreUtterance=narrating;
        heardStep=position>=stepAudioStart?stepId:null;
    }
    void HandlePhrase(string phrase,float confidence){
        string captured=heardStep;heardStep=null;
        if(ignoreUtterance||narrating)return;
        if(Query(phrase,confidence))return;
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
            engine.LoadGrammar(CommandGrammar(selected));
            engine.SetInputToDefaultAudioDevice();
            engine.SpeechDetected+=(s,e)=>OnVoiceEvent(engine,()=>DetectPhrase(e.AudioPosition));
            engine.SpeechRecognitionRejected+=(s,e)=>OnVoiceEvent(engine,()=>{heardStep=null;});
            engine.SpeechRecognized+=(s,e)=>OnVoiceEvent(engine,()=>HandlePhrase(e.Result.Text,e.Result.Confidence));
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
    protected override void Dispose(bool value){if(value){disposing=true;StopNarration();EndTalk();StopVoice();expiry.Dispose();foreach(int id in registered)if(IsHandleCreated)UnregisterHotKey(Handle,id);registered.Clear();}base.Dispose(value);}
}
