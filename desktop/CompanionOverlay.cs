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
    int keyOverlay=(int)Keys.O,keyPrices=(int)Keys.P,keyWork=(int)Keys.W;
    string T(string ko,string en){return english?en:ko;}
    internal bool VoiceEnabled {get{return speech!=null;}}
    internal CompanionOverlay(Action<string> command,bool en,string directory){
        send=command;english=en;settings=Path.Combine(directory,"overlay.json");
        Text="STAM";ShowInTaskbar=false;FormBorderStyle=FormBorderStyle.SizableToolWindow;TopMost=true;
        StartPosition=FormStartPosition.Manual;Size=new Size(420,310);MinimumSize=new Size(330,240);MaximumSize=new Size(700,600);
        BackColor=Color.FromArgb(8,23,33);ForeColor=Color.FromArgb(224,241,245);Opacity=.96;
        var layout=new DeckSurface{Dock=DockStyle.Fill,Padding=new Padding(22),ColumnCount=1,RowCount=4};
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute,34));layout.RowStyles.Add(new RowStyle(SizeType.Percent,100));layout.RowStyles.Add(new RowStyle(SizeType.Absolute,40));layout.RowStyles.Add(new RowStyle(SizeType.Absolute,32));Controls.Add(layout);
        heading.Dock=body.Dock=status.Dock=DockStyle.Fill;heading.Font=HoloFonts.At(15);body.Font=HoloFonts.At(12);status.Font=HoloFonts.At(9);heading.ForeColor=Color.FromArgb(240,205,142);
        heading.Text="STAM / FREIGHT DIVISION";body.Text=T("웹 관제실에서 ‘로그 앱에 표시’를 켜세요.","Enable companion display in the web console.");
        layout.Controls.Add(heading);layout.Controls.Add(body);
        var actions=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=2,BackColor=Color.Transparent};actions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,50));actions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,50));
        foreach(string action in new[]{"show-prices","show-my-work"}){string a=action;var b=new DeckButton{Text=a=="show-prices"?T("가격 보기","Prices"):T("내 작업","My work"),Dock=DockStyle.Fill,Margin=new Padding(0,0,6,0)};b.Click+=(s,e)=>send(a);actions.Controls.Add(b);}layout.Controls.Add(actions);layout.Controls.Add(status);
        try{var saved=new JavaScriptSerializer().Deserialize<Dictionary<string,object>>(File.ReadAllText(settings));Location=new Point(Convert.ToInt32(saved["x"]),Convert.ToInt32(saved["y"]));keyOverlay=Key(saved,"overlay",keyOverlay);keyPrices=Key(saved,"prices",keyPrices);keyWork=Key(saved,"work",keyWork);}catch{Location=new Point(Screen.PrimaryScreen.WorkingArea.Right-450,70);}
        Clamp();expiry.Interval=1000;expiry.Tick+=(s,e)=>{if((DateTime.UtcNow-received).TotalSeconds>12){body.Text=T("웹 화면 연결 대기","Waiting for the web view");heading.Text="STAM / FREIGHT DIVISION";}};expiry.Start();
        FormClosing+=(s,e)=>{if(!disposing&&e.CloseReason==CloseReason.UserClosing){e.Cancel=true;Hide();}};
        Move+=(s,e)=>Save();ResizeEnd+=(s,e)=>{Clamp();Save();};
        // Create the message window even while the overlay is hidden.
        var ignored=Handle;RegisterKeys();
    }
    static int Key(Dictionary<string,object> s,string name,int fallback){int key=s.ContainsKey(name)?Convert.ToInt32(s[name]):fallback;return key>=(int)Keys.A&&key<=(int)Keys.Z?key:fallback;}
    void Save(){try{Directory.CreateDirectory(Path.GetDirectoryName(settings));File.WriteAllText(settings,new JavaScriptSerializer().Serialize(new{x=Left,y=Top,overlay=keyOverlay,prices=keyPrices,work=keyWork}));}catch{}}
    void Clamp(){var area=Screen.FromPoint(Location).WorkingArea;Location=new Point(Math.Max(area.Left,Math.Min(Left,area.Right-Width)),Math.Max(area.Top,Math.Min(Top,area.Bottom-Height)));}
    protected override CreateParams CreateParams {get{var p=base.CreateParams;p.ExStyle|=0x80;if(!interactive)p.ExStyle|=0x20|0x80000|0x8000000;return p;}}
    protected override bool ShowWithoutActivation {get{return !interactive;}}
    internal void Toggle(){if(Visible)Hide();else{Clamp();Show();}}
    internal void ToggleInput(){interactive=!interactive;RecreateHandle();RegisterKeys();status.Text=interactive?T("조작 모드 · 이동/버튼 사용","Input mode · move or click buttons"):T("클릭 통과 · 게임 입력 유지","Click-through mode");}
    internal void UpdateDisplay(object raw){var d=raw as Dictionary<string,object>;if(d==null){received=DateTime.MinValue;heading.Text="STAM / FREIGHT DIVISION";body.Text=T("웹 화면 연결 대기","Waiting for the web view");return;}received=DateTime.UtcNow;heading.Text=Convert.ToString(d["title"]);var lines=new List<string>();var list=d["lines"] as IEnumerable;if(list!=null)foreach(var line in list)lines.Add(Convert.ToString(line));body.Text=String.Join("\n",lines.ToArray());}
    void RegisterKeys(){foreach(int id in registered)UnregisterHotKey(Handle,id);registered.Clear();int[] keys={keyOverlay,keyPrices,keyWork};for(int i=0;i<keys.Length;i++){if(RegisterHotKey(Handle,5100+i,0x4000|0x2|0x1,(uint)keys[i]))registered.Add(5100+i);}status.Text=registered.Count==3?T("Ctrl+Alt 단축키 · 트레이에서 설정","Ctrl+Alt shortcuts · configure in tray"):T("단축키 충돌 · 트레이 설정에서 변경","Shortcut conflict · change keys in tray");}
    protected override void OnHandleDestroyed(EventArgs e){foreach(int id in registered)UnregisterHotKey(Handle,id);registered.Clear();base.OnHandleDestroyed(e);}
    protected override void WndProc(ref Message m){if(m.Msg==0x312){int id=m.WParam.ToInt32();if(id==5100)Toggle();else if(id==5101)send("show-prices");else if(id==5102)send("show-my-work");return;}base.WndProc(ref m);}
    internal void Configure(){using(var dialog=new Form{Text=T("STAM 단축키","STAM shortcuts"),Size=new Size(420,270),StartPosition=FormStartPosition.CenterScreen,BackColor=BackColor,ForeColor=ForeColor,Font=HoloFonts.At(11),FormBorderStyle=FormBorderStyle.FixedDialog,MaximizeBox=false,MinimizeBox=false}){
        var panel=new FlowLayoutPanel{Dock=DockStyle.Fill,Padding=new Padding(18),FlowDirection=FlowDirection.TopDown};dialog.Controls.Add(panel);var boxes=new List<ComboBox>();int[] keys={keyOverlay,keyPrices,keyWork};string[] labels={T("오버레이","Overlay"),T("가격 보기","Prices"),T("내 작업","My work")};
        for(int i=0;i<3;i++){var row=new FlowLayoutPanel{Width=360,Height=40};row.Controls.Add(new Label{Text=labels[i]+" · Ctrl+Alt+",Width=220});var box=new ComboBox{DropDownStyle=ComboBoxStyle.DropDownList,Width=70};for(char c='A';c<='Z';c++)box.Items.Add(c.ToString());box.SelectedIndex=keys[i]-(int)Keys.A;boxes.Add(box);row.Controls.Add(box);panel.Controls.Add(row);}
        var save=new DeckButton{Text=T("저장","Save"),Width=140};save.Click+=(s,e)=>{if(boxes[0].SelectedIndex==boxes[1].SelectedIndex||boxes[0].SelectedIndex==boxes[2].SelectedIndex||boxes[1].SelectedIndex==boxes[2].SelectedIndex){MessageBox.Show(T("서로 다른 키를 선택하세요.","Choose different keys."));return;}keyOverlay=boxes[0].SelectedIndex+(int)Keys.A;keyPrices=boxes[1].SelectedIndex+(int)Keys.A;keyWork=boxes[2].SelectedIndex+(int)Keys.A;Save();RegisterKeys();dialog.Close();};panel.Controls.Add(save);dialog.ShowDialog();}}
    static string VoiceCommand(string word,float confidence){if(confidence<.8f)return null;return word=="STAM prices"||word=="스탐 가격"?"show-prices":word=="STAM my work"||word=="스탐 내 작업"?"show-my-work":word=="STAM trade"||word=="스탐 무역"?"open-trade":word=="STAM flight"||word=="스탐 운송"?"open-flight":word=="STAM overlay"||word=="스탐 오버레이"?"toggle-overlay":null;}
    static Grammar CommandGrammar(RecognizerInfo engine){var phrases=new Choices(engine.Culture.TwoLetterISOLanguageName=="en"?new[]{"STAM prices","STAM my work","STAM overlay","STAM trade","STAM flight"}:new[]{"스탐 가격","스탐 내 작업","스탐 오버레이","스탐 무역","스탐 운송"});var builder=new GrammarBuilder{Culture=engine.Culture};builder.Append(phrases);return new Grammar(builder);}
    internal void ToggleVoice(){if(speech!=null){StopVoice();return;}try{
        RecognizerInfo selected=null;foreach(var engine in SpeechRecognitionEngine.InstalledRecognizers())if(engine.Culture.TwoLetterISOLanguageName==(english?"en":"ko")){selected=engine;break;}
        if(selected==null)throw new InvalidOperationException(T("Windows 한국어 음성 인식 엔진이 없습니다. Windows 언어 설정에서 음성 기능을 설치하세요.","No English speech recognizer is installed. Add speech recognition in Windows language settings."));
        var next=new SpeechRecognitionEngine(selected);speech=next;next.LoadGrammar(CommandGrammar(selected));next.SetInputToDefaultAudioDevice();
        next.SpeechRecognized+=(s,e)=>{string command=VoiceCommand(e.Result.Text,e.Result.Confidence);if(command!=null&&!IsDisposed)BeginInvoke((Action)(()=>{if(command=="toggle-overlay")Toggle();else send(command);}));};
        next.RecognizeAsync(RecognizeMode.Multiple);status.Text=T("마이크 켜짐 · 스탐 가격 / 내 작업 / 오버레이 / 무역 / 운송","Microphone on · STAM prices / my work / overlay / trade / flight");
    }catch(Exception error){StopVoice();MessageBox.Show(error.Message,"STAM");}}
    void StopVoice(){if(speech!=null){try{speech.RecognizeAsyncCancel();speech.Dispose();}catch{}speech=null;}status.Text=T("마이크 꺼짐","Microphone off");}
    protected override void Dispose(bool value){if(value){disposing=true;StopVoice();expiry.Dispose();foreach(int id in registered)if(IsHandleCreated)UnregisterHotKey(Handle,id);registered.Clear();}base.Dispose(value);}
}
