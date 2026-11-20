using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;
using System.Web.Script.Serialization;
using System.Collections.Generic;

internal static class Launcher {
    const string WakeEvent="Local\\STAM-Freight-Control.Activate";
    [System.Runtime.InteropServices.DllImport("user32.dll")] static extern bool AllowSetForegroundWindow(int processId);
    static void AllowExistingForeground(){
        if(Environment.OSVersion.Platform!=PlatformID.Win32NT)return;
        foreach(var process in Process.GetProcessesByName(Path.GetFileNameWithoutExtension(Application.ExecutablePath)))using(process){
            try{if(process.Id!=Process.GetCurrentProcess().Id&&String.Equals(process.MainModule.FileName,Application.ExecutablePath,StringComparison.OrdinalIgnoreCase))AllowSetForegroundWindow(process.Id);}catch{}
        }
    }
    static bool WakeExisting(){for(int attempt=0;attempt<20;attempt++){try{using(var signal=EventWaitHandle.OpenExisting(WakeEvent)){AllowExistingForeground();signal.Set();return true;}}catch(WaitHandleCannotBeOpenedException){Thread.Sleep(50);}catch(UnauthorizedAccessException){return false;}}return false;}
    [STAThread] static int Main(string[] args) {
        if (args.Length == 1 && args[0] == "--self-test") return SelfTest();
        if (args.Length == 1 && args[0] == "--self-test-window") {Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);return BridgeWindow.CheckLifecycle()?0:1;}
        if (args.Length == 1 && args[0] == "--self-test-language") {Application.EnableVisualStyles();using(var window=new BridgeWindow(false))return window.CheckLanguages()?0:1;}
        if (args.Length == 2 && (args[0] == "--capture-ui" || args[0] == "--capture-ui-en")) {
            Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
            using(var window=new BridgeWindow(args[0]=="--capture-ui-en")) {window.Show();Application.DoEvents();using(var bitmap=new Bitmap(window.Width,window.Height)){window.DrawToBitmap(bitmap,new Rectangle(Point.Empty,window.Size));bitmap.Save(args[1],System.Drawing.Imaging.ImageFormat.Png);}window.Close();}return 0;
        }
        if(args.Length==2&&args[0]=="--capture-design"){Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);try{BridgeWindow.CaptureDesign(args[1]);return 0;}catch(Exception error){Console.Error.WriteLine(error);return 1;}}
        if(args.Length==2&&args[0]=="--self-test-overlay"){Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);return CompanionOverlay.CheckNative(args[1]);}
        bool created;
        using (var mutex = new Mutex(true, "Local\\STAM-Freight-Control", out created)) {
            if (!created) { if(WakeExisting())return 0;MessageBox.Show(BridgeWindow.ReadEnglish()?"STAM is already running. Open it from the STAM system tray icon.":"STAM이 이미 실행 중입니다. 트레이의 STAM 아이콘으로 연결 창을 열어 주십시오.", "STAM"); return 0; }
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            using(var signal=new EventWaitHandle(false,EventResetMode.AutoReset,WakeEvent))
            using(var window=new BridgeWindow()) {
                var wake=ThreadPool.RegisterWaitForSingleObject(signal,(state,timedOut)=>window.ShowFromLauncher(),null,Timeout.Infinite,false);
                try{Application.Run(window);}finally{wake.Unregister(null);}
            }
        }
        return 0;
    }
    internal static Process StartBridge(string file, bool test) {
        string root = AppDomain.CurrentDomain.BaseDirectory;
        var info = new ProcessStartInfo(Path.Combine(root,"runtime","node.exe"), "\""+Path.Combine(root,"app","desktop","bridge.mjs")+"\" \""+file+"\""+(test?" --self-test":""));
        info.WorkingDirectory = Path.Combine(root,"app"); info.UseShellExecute=false; info.CreateNoWindow=true;
        info.RedirectStandardOutput=true; info.RedirectStandardError=true; info.RedirectStandardInput=true;
        info.StandardOutputEncoding=new System.Text.UTF8Encoding(false);info.StandardErrorEncoding=new System.Text.UTF8Encoding(false);
        info.EnvironmentVariables.Remove("NODE_OPTIONS"); info.EnvironmentVariables.Remove("NODE_PATH");
        return Process.Start(info);
    }
    internal static string ReadUrl(string line) {
        var message=new JavaScriptSerializer().Deserialize<Dictionary<string,object>>(line);
        if ((string)message["type"] != "ready") throw new InvalidOperationException(message.ContainsKey("code")?(string)message["code"]:"startup-failed");
        string url=(string)message["url"]; Uri parsed;
        if(!Uri.TryCreate(url,UriKind.Absolute,out parsed)||parsed.Scheme!="http"||parsed.Host!="127.0.0.1"||!System.Text.RegularExpressions.Regex.IsMatch(parsed.Fragment,"^#token=[a-f0-9]{64}$")) throw new InvalidOperationException("invalid-address");
        return url;
    }
    internal static void Stop(Process child) {
        if(child==null)return;
        try { if(!child.HasExited){child.StandardInput.WriteLine("stop");child.StandardInput.Flush();if(!child.WaitForExit(3000))child.Kill();} } catch { try{if(!child.HasExited)child.Kill();}catch{} }
        child.Dispose();
    }
    static int SelfTest() {
        string file=Path.Combine(Path.GetTempPath(),"stam-launcher-"+Guid.NewGuid()+".log");Process child=null;
        try {
            string mission="11111111-1111-4111-8111-111111111111";
            string fixture="<2026-11-05T10:00:00.000Z> [Notice] <SHUDEvent_OnNotification> Added notification \"Contract Accepted: Test haul: \" [1] to queue. MissionId: ["+mission+"], ObjectiveId: [dropoff_test_1]\n";
            File.WriteAllText(file,fixture);child=StartBridge(file,true);
            var read=child.StandardOutput.ReadLineAsync();if(!read.Wait(15000))throw new Exception("startup-timeout");
            string url=ReadUrl(read.Result);var uri=new Uri(url);var website=new Uri(BridgeWindow.SiteAddress(url,false));if(website.Scheme!="https"||website.Host!="limmin3-sudo.github.io"||website.AbsolutePath!="/stam-freight-control/"||website.Fragment!="#/mission?lang=ko")throw new Exception("public-website-address");if(new Uri(BridgeWindow.SiteAddress(null,true)).Fragment!="#/mission?lang=en")throw new Exception("unpaired-website-address");
            using(var discovery=new WebClient()) {
                discovery.Headers["Origin"]="https://limmin3-sudo.github.io";discovery.Headers["X-STAM-Client"]="flight-deck";
                var pairing=new JavaScriptSerializer().Deserialize<Dictionary<string,object>>(discovery.DownloadString(new Uri(uri,"/api/pair")));
                if((string)pairing["token"]!=uri.Fragment.Substring(7))throw new Exception("auto-pairing");
            }
            using(var client=new WebClient()) {
                client.Headers["Authorization"]="Bearer "+uri.Fragment.Substring(7);
                if(!client.DownloadString(new Uri(uri,"/api/status")).Contains("\"protocol\":1"))throw new Exception("protocol");
                try{client.DownloadString(new Uri(uri,"/index.html"));throw new Exception("unexpected-local-ui");}catch(WebException error){if(((HttpWebResponse)error.Response).StatusCode!=HttpStatusCode.NotFound)throw;}
                bool received=false;
                for(int i=0;i<50;i++){if(client.DownloadString(new Uri(uri,"/api/snapshot")).Contains(mission)){received=true;break;}Thread.Sleep(100);}
                if(!received||File.ReadAllText(file)!=fixture)throw new Exception("contract-read-only");
                string nextMission="77777777-7777-4777-8777-777777777777";
                string appended="<2026-11-05T10:01:00.000Z> [Notice] <SHUDEvent_OnNotification> Added notification \"Contract Accepted: Another hauling template\" [2] to queue. MissionId: ["+nextMission+"], ObjectiveId: [pickup_test_0]\n"+
                    "<2026-11-05T10:01:00.000Z> [Notice] <CLocalMissionPhaseMarker::CreateMarker> missionId ["+nextMission+"], contract [Unrecognised_Template], contractDefinitionId[ad7fe12b-b1fb-48f9-8347-8c12f8dcad79], objectiveId [pickup_test_0], zoneHostId [42], position [x: 1, y: 2, z: 3]\n";
                File.AppendAllText(file,appended);received=false;
                for(int i=0;i<50;i++){string snapshot=client.DownloadString(new Uri(uri,"/api/snapshot"));if(snapshot.Contains(nextMission)&&snapshot.Contains("Unrecognised_Template")){received=true;break;}Thread.Sleep(100);}
                if(!received||File.ReadAllText(file)!=fixture+appended)throw new Exception("appended-template-receipt-read-only");
            }
            return 0;
        } catch { return 1; } finally { Stop(child);File.Delete(file); }
    }
}
internal sealed class BridgeWindow : Form {
    // Present the glass surfaces and their transparent child controls in one repaint.
    protected override CreateParams CreateParams {get{var p=base.CreateParams;p.ExStyle|=0x02000000;return p;}}
    readonly bool preview;
    bool english,quitting,manualStop;
    Process child;string selected="--auto",phase="idle";
    int failures;
    readonly System.Windows.Forms.Timer retry=new System.Windows.Forms.Timer();
    readonly NotifyIcon tray=new NotifyIcon();
    readonly ToolTip hints=new ToolTip();
    readonly HoloLabel title=new HoloLabel(),subtitle=new HoloLabel(),state=new HoloLabel(),detail=new HoloLabel(),fileLabel=new HoloLabel(),filePath=new HoloLabel(),bytes=new HoloLabel(),updated=new HoloLabel(),footer=new HoloLabel();
    readonly DeckButton choose=new DeckButton(),search=new DeckButton(),open=new DeckButton(),disconnect=new DeckButton(),korean=new DeckButton(),englishButton=new DeckButton(),narratorButton=new DeckButton(),overlayButton=new DeckButton(),shortcutsButton=new DeckButton(),voiceButton=new DeckButton(),continuousButton=new DeckButton();
    readonly string settings,languageSettings;
    CompanionOverlay overlay;
    readonly HoloLabel voiceFeedback=new HoloLabel();
    Image brandLogo;
    readonly PartnerPortrait portrait=new PartnerPortrait(false);
    ColumnStyle portraitColumn;
    void UpdatePortrait(bool navigator){
        title.Text=PartnerPortrait.Title(navigator,english);
        title.ForeColor=navigator?DeckTheme.NavigatorInk:DeckTheme.OperatorInk;
        portrait.SelectPartner(navigator,english);
        portraitColumn.Width=portrait.Image==null?0:168f*AutoScaleDimensions.Width/96f;
    }
    CompanionOverlay Overlay(){if(overlay==null||overlay.IsDisposed){
        overlay=new CompanionOverlay(SendCommand,english,Path.GetDirectoryName(settings));
        overlay.TalkChanged+=()=>{UpdateTools();voiceFeedback.Text=overlay.TalkStatus;};
        UpdateTools();
    }return overlay;}
    void SendCommand(string command){try{if(child!=null&&!child.HasExited){child.StandardInput.WriteLine(new JavaScriptSerializer().Serialize(new{type="command",command=command}));child.StandardInput.Flush();}}catch{}}
    static readonly string languageFile=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"STAM","ui-language.txt");
    static readonly Color Ink=DeckTheme.Ink,Muted=DeckTheme.Muted;
    internal static bool ReadEnglish(string file=null){try{return File.ReadAllText(file??languageFile).Trim()=="en";}catch{return false;}}
    string T(string ko,string en){return english?en:ko;}
    static HoloLabel Label(string text,float size,Color colour){return new HoloLabel{Text=text,Font=HoloFonts.At(size),ForeColor=colour,Dock=DockStyle.Fill,Margin=Padding.Empty};}
    void ApplyLanguage(){
        if(overlay!=null){overlay.Dispose();overlay=null;}
        voiceFeedback.Text="";Text=T("STAM 네비게이터","STAM Navigator");
        subtitle.Text="";
        choose.Text=T("파일 직접 선택","Choose Game.log");search.Text=T("자동으로 찾기","Find automatically");open.Text=T("미션콘솔 열기  ↗","Open mission console  ↗");disconnect.Text=manualStop?T("다시 연결","Reconnect"):T("연결 중지","Disconnect");
        footer.Text=T("창을 닫아도 트레이에서 수신합니다. 종료는 트레이 메뉴를 이용하세요.\n게임 로그는 읽기만 하며, 음성 완료는 연결한 STAM 운항에 반영됩니다.","Closing this window keeps the app in your system tray. Quit from its menu.\nRead-only game log access. Spoken confirmations update your linked STAM flight.");
        korean.Primary=!english;englishButton.Primary=english;korean.Invalidate();englishButton.Invalidate();updated.Text="";RenderStatus(null);UpdateTools();BuildTray();
    }
    void UpdateTools(){
        UpdatePortrait(overlay!=null&&overlay.IsNavigator);narratorButton.Text=T("부조종사 선택","Choose copilot");
        continuousButton.Text=overlay==null?T("연속 듣기 켜기","Listen continuously"):overlay.ContinuousLabel;
        continuousButton.Primary=overlay!=null&&overlay.VoiceEnabled;continuousButton.Invalidate();
        overlayButton.Text=T("오버레이 표시/숨김","Show/hide overlay");shortcutsButton.Text=T("단축키 설정","Shortcut settings");voiceButton.Text=overlay==null?T("` 길게 눌러 말하기","` · hold to talk"):overlay.TalkLabel;voiceButton.Primary=overlay!=null&&overlay.Listening;voiceButton.Invalidate();}
    void SetLanguage(bool value){english=value;ApplyLanguage();if(!preview)try{Directory.CreateDirectory(Path.GetDirectoryName(languageSettings));File.WriteAllText(languageSettings,english?"en":"ko");}catch{}}
    internal bool CheckLanguages(){SetLanguage(true);bool ok=Text=="STAM Navigator"&&open.Text=="Open mission console  ↗"&&choose.Text=="Choose Game.log";SetLanguage(false);return ok&&Text=="STAM 네비게이터"&&open.Text=="미션콘솔 열기  ↗"&&choose.Text=="파일 직접 선택"&&shortcutsButton.Text=="단축키 설정"&&voiceButton.Text=="` 길게 눌러 말하기"&&continuousButton.Text=="연속 듣기 켜기";}
    internal static void CaptureDesign(string directory){
        Directory.CreateDirectory(directory);HoloFonts.CheckSelection(Path.Combine(directory,"font-selection.json"));
        foreach(bool en in new[]{false,true})using(var window=new BridgeWindow(en)){
            window.Show();Application.DoEvents();
            window.UpdatePortrait(en);
            window.state.Text=en?"Orison":"오리슨";
            window.detail.Text=en?"Deliver Titanium · 40 SCU":"티타늄 배송 · 40 SCU";
            foreach(bool compact in new[]{false,true}){
                if(compact)window.ClientSize=new Size(820,680);Application.DoEvents();
                using(var bitmap=new Bitmap(window.Width,window.Height)){window.DrawToBitmap(bitmap,new Rectangle(Point.Empty,window.Size));bitmap.Save(Path.Combine(directory,"companion-"+(en?"en":"ko")+(compact?"-compact":"-full")+".png"),System.Drawing.Imaging.ImageFormat.Png);}
            }
            var scroll=window.Controls[0].Controls[0] as ScrollableControl;if(scroll!=null){scroll.ScrollControlIntoView(window.footer);Application.DoEvents();}
            using(var bitmap=new Bitmap(window.Width,window.Height)){window.DrawToBitmap(bitmap,new Rectangle(Point.Empty,window.Size));bitmap.Save(Path.Combine(directory,"companion-"+(en?"en":"ko")+"-tools.png"),System.Drawing.Imaging.ImageFormat.Png);}
            window.Close();
        }
    }
    public BridgeWindow(bool? languageOverride=null,string testSettingsDirectory=null){
        string directory=testSettingsDirectory??Path.GetDirectoryName(languageFile);settings=Path.Combine(directory,"log-path.txt");languageSettings=Path.Combine(directory,"ui-language.txt");
        preview=languageOverride.HasValue&&testSettingsDirectory==null;english=languageOverride??ReadEnglish(languageSettings);
        HoloFonts.Load();AutoScaleDimensions=new SizeF(96,96);AutoScaleMode=AutoScaleMode.Dpi;Font=HoloFonts.At(11);
        var workArea=Screen.FromPoint(Cursor.Position).WorkingArea;
        MinimumSize=new Size(Math.Min(820,workArea.Width),Math.Min(600,workArea.Height));
        Size=new Size(Math.Min(1440,workArea.Width),Math.Min(960,workArea.Height));StartPosition=FormStartPosition.Manual;
        Location=new Point(workArea.Left+(workArea.Width-Width)/2,workArea.Top+(workArea.Height-Height)/2);BackColor=DeckTheme.Housing;ForeColor=Ink;DoubleBuffered=true;
        try{Icon=Icon.ExtractAssociatedIcon(Application.ExecutablePath);}catch{Icon=SystemIcons.Application;}
        var shell=new Panel{Dock=DockStyle.Fill,BackColor=DeckTheme.Housing,Padding=new Padding(10)};Controls.Add(shell);
        var scroll=new Panel{Dock=DockStyle.Fill,AutoScroll=true,BackColor=shell.BackColor,Margin=Padding.Empty};shell.Controls.Add(scroll);
        var layout=new TableLayoutPanel{Dock=DockStyle.Top,Height=785,Margin=Padding.Empty,Padding=new Padding(20,22,20,22),ColumnCount=1,RowCount=7,BackColor=shell.BackColor};
        foreach(int height in new[]{82,228,68,108,107,56})layout.RowStyles.Add(new RowStyle(SizeType.Absolute,height));layout.RowStyles.Add(new RowStyle(SizeType.Percent,100));scroll.Controls.Add(layout);
        var mast=new TableLayoutPanel{BackColor=Color.Transparent,Dock=DockStyle.Fill,ColumnCount=2,Padding=new Padding(12,0,6,0),Margin=new Padding(0,0,0,8)};mast.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));mast.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,170));layout.Controls.Add(mast);
        var brand=new TableLayoutPanel{Dock=DockStyle.Fill,RowCount=2,ColumnCount=2,Margin=Padding.Empty,BackColor=Color.Transparent};brand.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,70));brand.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));brand.RowStyles.Add(new RowStyle(SizeType.Absolute,43));brand.RowStyles.Add(new RowStyle(SizeType.Percent,100));
        var logo=new PictureBox{Dock=DockStyle.Fill,SizeMode=PictureBoxSizeMode.Zoom,Margin=new Padding(0,0,12,8),BackColor=Color.Transparent};
        try{using(var source=Image.FromFile(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"app","assets","stam-logo-transparent.png")))brandLogo=new Bitmap(source);logo.Image=brandLogo;}catch{}
        brand.Controls.Add(logo,0,0);brand.SetRowSpan(logo,2);brand.Controls.Add(Label("S T A M",32,Ink),1,0);brand.Controls.Add(Label("FREIGHT DIVISION / NAVIGATOR",11,Muted),1,1);mast.Controls.Add(brand);
        var languages=new FlowLayoutPanel{Dock=DockStyle.Fill,FlowDirection=FlowDirection.LeftToRight,Margin=new Padding(0,5,0,0),BackColor=Color.Transparent};korean.Text="한국어";englishButton.Text="English";
        foreach(var b in new[]{korean,englishButton}){b.Size=new Size(78,35);b.Margin=new Padding(3);languages.Controls.Add(b);}mast.Controls.Add(languages);
        var flightDeck=new LinkCard{Instrument=true,Dock=DockStyle.Fill,Padding=new Padding(24),ColumnCount=2,RowCount=3,Margin=new Padding(0,0,0,14)};
        portraitColumn=new ColumnStyle(SizeType.Absolute,0);flightDeck.ColumnStyles.Add(portraitColumn);flightDeck.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));
        flightDeck.RowStyles.Add(new RowStyle(SizeType.Absolute,30));flightDeck.RowStyles.Add(new RowStyle(SizeType.Absolute,58));flightDeck.RowStyles.Add(new RowStyle(SizeType.Percent,100));
        portrait.Margin=new Padding(0,0,24,0);
        flightDeck.Controls.Add(portrait,0,0);flightDeck.SetRowSpan(portrait,3);
        Setup(title,13,Muted);Setup(state,32,DeckTheme.Platinum);Setup(detail,18,Ink);
        flightDeck.Controls.Add(title,1,0);flightDeck.Controls.Add(state,1,1);flightDeck.Controls.Add(detail,1,2);layout.Controls.Add(flightDeck);
        var actions=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=3,Margin=Padding.Empty,BackColor=shell.BackColor};
        foreach(float width in new[]{40f,30f,30f})actions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,width));
        foreach(var button in new[]{open,choose,search,disconnect,korean,englishButton,narratorButton,overlayButton,shortcutsButton,voiceButton,continuousButton}){button.Font=HoloFonts.At(13);}
        foreach(var b in new[]{voiceButton,continuousButton,open}){b.Dock=DockStyle.Fill;b.Margin=new Padding(0,0,8,12);actions.Controls.Add(b);}open.Margin=new Padding(0,0,0,12);layout.Controls.Add(actions);
        var tools=new LinkCard{Dock=DockStyle.Fill,Padding=new Padding(16,10,16,12),ColumnCount=3,RowCount=2,Margin=new Padding(0,0,0,14)};
        tools.RowStyles.Add(new RowStyle(SizeType.Absolute,26));tools.RowStyles.Add(new RowStyle(SizeType.Percent,100));
        tools.Controls.Add(Label("OVERLAY & VOICE",11,DeckTheme.Platinum),0,0);Setup(voiceFeedback,11,DeckTheme.Platinum);tools.Controls.Add(voiceFeedback,1,0);tools.SetColumnSpan(voiceFeedback,2);
        int toolIndex=0;foreach(var b in new[]{narratorButton,overlayButton,shortcutsButton}){tools.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,1));b.Dock=DockStyle.Fill;b.Margin=new Padding(0,0,6,0);tools.Controls.Add(b,toolIndex++,1);}layout.Controls.Add(tools);
        var file=new LinkCard{Dock=DockStyle.Fill,Padding=new Padding(16,12,16,12),ColumnCount=3,RowCount=3,Margin=new Padding(0,0,0,12)};
        foreach(float width in new[]{50f,20f,30f})file.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,width));
        file.RowStyles.Add(new RowStyle(SizeType.Absolute,25));file.RowStyles.Add(new RowStyle(SizeType.Absolute,28));file.RowStyles.Add(new RowStyle(SizeType.Percent,100));
        Setup(fileLabel,13,Ink);Setup(filePath,11,Muted);Setup(bytes,12,Muted);Setup(updated,12,Muted);Setup(subtitle,12,DeckTheme.Platinum);
        file.Controls.Add(fileLabel,0,0);file.Controls.Add(bytes,1,0);file.Controls.Add(updated,2,0);
        file.Controls.Add(subtitle,0,1);file.SetColumnSpan(subtitle,3);file.Controls.Add(filePath,0,2);file.SetColumnSpan(filePath,3);layout.Controls.Add(file);
        var fileActions=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=3,Margin=Padding.Empty,BackColor=shell.BackColor};
        foreach(var b in new[]{search,choose,disconnect}){fileActions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,1));b.Dock=DockStyle.Fill;b.Margin=new Padding(0,0,6,12);fileActions.Controls.Add(b);}layout.Controls.Add(fileActions);
        narratorButton.Click+=(s,e)=>guidanceMenu.DropDown.Show(narratorButton,new Point(0,narratorButton.Height));
        overlayButton.Click+=(s,e)=>Overlay().Toggle();shortcutsButton.Click+=(s,e)=>Overlay().Configure();voiceButton.Click+=(s,e)=>Overlay().Configure();hints.SetToolTip(voiceButton,T("말하기 키를 누른 채 말하고 떼면 전송합니다. 클릭하면 키를 변경합니다.","Hold the talk key to speak, then release to send. Click to change the shortcut."));continuousButton.Click+=(s,e)=>Overlay().ToggleVoice();
        Setup(footer,12,Muted);layout.Controls.Add(footer);
        korean.Click+=(s,e)=>SetLanguage(false);englishButton.Click+=(s,e)=>SetLanguage(true);choose.Click+=(s,e)=>SelectLog();search.Click+=(s,e)=>Start("--auto");open.Click+=(s,e)=>Open();disconnect.Click+=(s,e)=>{if(manualStop)Start(selected);else{manualStop=true;StopChild();phase="stopped";ApplyLanguage();}};
        retry.Tick+=(s,e)=>{retry.Stop();if(!manualStop&&!quitting)Start(selected,false);};
        tray.Icon=Icon;tray.DoubleClick+=(s,e)=>Reveal();ApplyLanguage();
        Shown+=(s,e)=>{if(preview)return;Overlay();tray.Visible=true;try{string prior=File.ReadAllText(settings).Trim();if(Path.IsPathRooted(prior)&&prior.EndsWith(".log",StringComparison.OrdinalIgnoreCase))selected=prior;}catch{}Start(selected);};
        FormClosing+=(s,e)=>{if(Environment.GetEnvironmentVariable("STAM_WINDOW_QA")=="1")Console.Error.WriteLine("Closing: reason="+e.CloseReason+" preview="+preview+" quitting="+quitting);if(!preview&&!quitting&&e.CloseReason==CloseReason.UserClosing){e.Cancel=true;Hide();return;}quitting=true;StopChild();tray.Visible=false;};
    }
    static void Setup(HoloLabel label,float size,Color colour){label.Dock=DockStyle.Fill;label.Margin=Padding.Empty;label.Font=HoloFonts.At(size);label.ForeColor=colour;}
    ToolStripMenuItem guidanceMenu;
    void BuildTray(){var previous=tray.ContextMenuStrip;var menu=new ContextMenuStrip();menu.Items.Add(T("네비게이터 열기","Open STAM Navigator"),null,(s,e)=>Reveal());menu.Items.Add(T("미션콘솔 열기","Open mission console"),null,(s,e)=>Open());menu.Items.Add(T("오버레이 표시/숨김","Show/hide overlay"),null,(s,e)=>Overlay().Toggle());menu.Items.Add(T("오버레이 클릭 통과/조작 전환","Toggle overlay click-through/input"),null,(s,e)=>Overlay().ToggleInput());menu.Items.Add(T("단축키 설정","Shortcut settings"),null,(s,e)=>Overlay().Configure());var guidance=guidanceMenu=new ToolStripMenuItem(T("음성 안내","Spoken guidance"));menu.Items.Add(guidance);
        foreach(var style in new[]{"off","supertonic-female","supertonic-male","female","male"}){
            string choice=style;
            var item=new ToolStripMenuItem(style=="off"?T("끄기","Off"):style=="supertonic-female"?T("Supertonic 여성 · 애니풍","Supertonic female · upbeat"):style=="supertonic-male"?T("Supertonic 남성 · 정중한 다나까체","Supertonic male · formal"):style=="female"?T("Windows 여성 · 애니풍","Windows female · upbeat"):T("Windows 남성 · 다나까체","Windows male · formal"));
            item.Click+=(s,e)=>{var target=Overlay();target.SetNarrator(choice);if(choice!="off")target.PreviewNarrator();};
            guidance.DropDownItems.Add(item);
            guidance.DropDownOpening+=(s,e)=>item.Checked=(Overlay().Narrator==choice);
        }
        guidance.DropDownItems.Add(new ToolStripSeparator());
        guidance.DropDownItems.Add(T("예시 항로 미리 듣기","Preview a route announcement"),null,(s,e)=>Overlay().PreviewNarrator());
        guidance.DropDownItems.Add(T("Supertonic 사용 안내","Supertonic setup"),null,(s,e)=>MessageBox.Show(T(
            "Supertonic은 PC에서 실행하는 선택형 한국어 음성입니다. Python이 설치된 PC에서 다음 명령으로 준비한 뒤 미리 듣기를 누르세요.",
            "Supertonic is an optional local voice engine. With Python installed, run these commands and then choose Preview.")+
            "\n\npy -m pip install supertonic[serve]==1.3.1\nsupertonic serve","STAM · Supertonic"));
        var voiceItem=new ToolStripMenuItem(T("연속 듣기","Continuous listening"));menu.Opening+=(s,e)=>{voiceItem.Checked=overlay!=null&&overlay.VoiceEnabled;};voiceItem.Click+=(s,e)=>{Overlay().ToggleVoice();voiceItem.Checked=Overlay().VoiceEnabled;UpdateTools();};menu.Items.Add(voiceItem);menu.Items.Add(new ToolStripSeparator());menu.Items.Add(T("앱 종료 · 로그 연결 종료","Quit app · Disconnect"),null,(s,e)=>Quit());tray.ContextMenuStrip=menu;if(previous!=null)previous.Dispose();}
    internal void ShowFromLauncher(){UI(Reveal);}
    void Quit(){if(IsDisposed)return;quitting=true;Close();}
    void Reveal(){Show();WindowState=FormWindowState.Normal;Activate();}
    void SelectLog(){using(var dialog=new OpenFileDialog{Title=T("Game.log 선택 · 읽기 전용","Choose Game.log · Read only"),Filter="Game.log|Game.log|Log files (*.log)|*.log",CheckFileExists=true}){if(File.Exists(selected))dialog.FileName=selected;if(dialog.ShowDialog()==DialogResult.OK)Start(dialog.FileName);}}
    void Start(string file,bool reset=true){
        StopChild();selected=file;manualStop=false;if(reset)failures=0;phase="starting";ApplyLanguage();
        if(!preview)try{Directory.CreateDirectory(Path.GetDirectoryName(settings));File.WriteAllText(settings,file=="--auto"?"":file);}catch{}
        try{
            child=Launcher.StartBridge(file,false);var active=child;Overlay();
            child.OutputDataReceived+=(s,e)=>{if(e.Data!=null)UI(()=>{if(child==active)Receive(e.Data);});};child.ErrorDataReceived+=(s,e)=>{};
            child.EnableRaisingEvents=true;child.Exited+=(s,e)=>UI(()=>{if(child!=active||quitting)return;child=null;active.Dispose();if(phase=="port-busy")return;ScheduleRetry();});
            child.BeginOutputReadLine();child.BeginErrorReadLine();
        }catch{phase="missing-runtime";RenderStatus(null);}
    }
    void ScheduleRetry(){if(manualStop||quitting)return;phase="reconnecting";failures++;retry.Interval=Math.Min(30000,1000*(1<<Math.Min(failures,5)));retry.Start();RenderStatus(null);}
    void Receive(string line){
        try{
            var data=new JavaScriptSerializer().Deserialize<Dictionary<string,object>>(line);string type=Convert.ToString(data["type"]);
            if(type=="display"){
                if(overlay!=null||data["display"]!=null){
                    Overlay().UpdateDisplay(data["display"]);
                    RenderNavigation();
                }return;
            }
            if(type=="ready"){
                Launcher.ReadUrl(line);failures=0;selected=Convert.ToString(data["file"]);phase="starting";
                try{Directory.CreateDirectory(Path.GetDirectoryName(settings));File.WriteAllText(settings,selected);}catch{}
            }else if(type=="status")phase=Convert.ToString(data["phase"]);
            else if(type=="discovery")phase=Convert.ToString(data["phase"]);
            else if(type=="error"){phase=Convert.ToString(data["code"]);if(phase=="port-busy"){manualStop=true;retry.Stop();}}
            RenderStatus(data);
        }catch{phase="error";RenderStatus(null);}
    }
    void RenderNavigation(){
        UpdatePortrait(overlay!=null&&overlay.IsNavigator);
        string navigation=overlay==null?"":overlay.NavigationText;
        string destination=overlay==null?"":overlay.NavigationDestination;
        state.Text=!String.IsNullOrWhiteSpace(destination)?destination:!String.IsNullOrWhiteSpace(navigation)?T("운항 안내","Flight guidance"):T("운항 연결 대기","Waiting for flight");
        string[] lines=(navigation??"").Split(new[]{'\r','\n'},StringSplitOptions.RemoveEmptyEntries);
        detail.Text=lines.Length==0?T("웹 상단의 부조종사에서 네비게이터를 연결하세요.","Connect STAM Navigator from the web copilot."):String.Join(Environment.NewLine,lines,0,Math.Min(3,lines.Length));
        hints.SetToolTip(detail,lines.Length==0?detail.Text:navigation);
    }
    void RenderStatus(Dictionary<string,object> data){
        string name,description;
        switch(phase){
            case "watching":name=T("로그 수신 중","LOG CONNECTED");description=T("새 계약을 미션콘솔에서 확인하세요.","Review new contracts in your mission console.");break;
            case "catching-up":name=T("로그 읽는 중","READING LOG");description=T("기존 기록을 읽고 자동 수신을 이어갑니다.","Reading existing records before live updates.");break;
            case "waiting-file":name=T("게임 실행 대기","WAITING FOR GAME");description=T("Game.log가 생성되면 자동으로 이어집니다.","Resumes automatically when Game.log appears.");break;
            case "searching":name=T("로그 찾는 중","FINDING GAME.LOG");description=T("찾지 못하면 아래에서 파일을 선택하세요.","Choose the file below if it is not found.");break;
            case "choose-file":name=T("로그 선택 필요","CHOOSE A LOG");description=T("여러 설치 또는 테스트 채널이 발견됐습니다.","Multiple installs or test channels were found.");break;
            case "reconnecting":name=T("다시 연결 중","RECONNECTING");description=T("잠시 후 자동으로 재연결합니다.","The app will retry automatically shortly.");break;
            case "stopped":name=T("연결 중지됨","DISCONNECTED");description=T("수신한 계약과 진행 중 운항은 유지됩니다.","Your received contracts and flight are retained.");break;
            case "port-busy":name=T("다른 연결 실행 중","ANOTHER LINK IS OPEN");description=T("실행 중인 다른 네비게이터를 닫고 다시 연결하세요.","Close the other STAM Navigator window, then reconnect.");break;
            case "missing-runtime":name=T("앱 파일 확인 필요","CHECK APP FILES");description=T("설치 파일로 복구하거나 ZIP 전체를 풀어 주세요.","Repair the installation or extract the entire ZIP.");break;
            case "error":case "startup-failed":name=T("연결 확인 필요","CHECK CONNECTION");description=T("파일 위치와 읽기 권한을 확인하세요.","Check the file location and read access.");break;
            case "starting":name=T("연결 준비 중","CONNECTING");description=T("게임 로그를 확인하고 있습니다.","Checking your game log.");break;
            default:name=T("연결 대기","READY TO CONNECT");description=T("앱을 실행하면 로그를 자동으로 찾습니다.","Finds your game log automatically on launch.");break;
        }
        if(phase=="watching"&&data!=null&&data.ContainsKey("contractCount")){
            description=T("로그에서 확인한 운송 계약 ","Freight contracts identified: ")+Convert.ToString(data["contractCount"]);
            if(data.ContainsKey("lastSnapshotReadAt")&&data["lastSnapshotReadAt"]!=null){DateTime sent;if(DateTime.TryParse(Convert.ToString(data["lastSnapshotReadAt"]),out sent))description+=T(" · 웹 조회 "," · Web read ")+sent.ToLocalTime().ToString("HH:mm:ss");}
        }
        RenderNavigation();
        subtitle.Text=name+" · "+description;
        if(data!=null&&data.ContainsKey("bytesRead"))bytes.Text=(Convert.ToDouble(data["bytesRead"])/1048576d).ToString("0.0",System.Globalization.CultureInfo.InvariantCulture)+" MB";
        else if(bytes.Text=="")bytes.Text="— MB";
        if(data!=null&&data.ContainsKey("lastReadAt")&&data["lastReadAt"]!=null){DateTime stamp;if(DateTime.TryParse(Convert.ToString(data["lastReadAt"]),out stamp))updated.Text=T("최근 확인  ","Last checked  ")+stamp.ToLocalTime().ToString("HH:mm:ss");}
        else if(updated.Text=="")updated.Text=T("로그 읽기 대기","Waiting to read");
        fileLabel.Text=selected=="--auto"?T("Star Citizen · 자동 탐색","Star Citizen · Auto discovery"):Path.GetFileName(Path.GetDirectoryName(selected))+"  /  Game.log";
        filePath.Text=selected=="--auto"?T("일반 설치 경로에서 LIVE 로그를 찾습니다.","Searches standard installation folders for LIVE."):selected;hints.SetToolTip(filePath,selected=="--auto"?filePath.Text:selected);
        tray.Text=Text+" · "+name;disconnect.Text=manualStop?T("다시 연결","Reconnect"):T("연결 중지","Disconnect");
    }
    static void Until(Func<bool> ready){var deadline=DateTime.UtcNow.AddSeconds(15);while(!ready()){if(DateTime.UtcNow>deadline)throw new Exception("window-timeout");Application.DoEvents();Thread.Sleep(25);}Application.DoEvents();}
    internal static bool CheckLifecycle(){
        string directory=Path.Combine(Path.GetTempPath(),"stam-window-"+Guid.NewGuid());BridgeWindow first=null,second=null;
        try{
            Directory.CreateDirectory(directory);string file=Path.Combine(directory,"테스트 Game.log"),fixture="<2026-11-14T10:00:00.000Z> [Notice] Synthetic lifecycle check\n";File.WriteAllText(file,fixture);File.WriteAllText(Path.Combine(directory,"log-path.txt"),file);
            first=new BridgeWindow(false,directory);first.Show();Until(()=>first.phase=="watching");var process=first.child;int id=process.Id;
            if(first.selected!=file)throw new Exception("remembered-path");
            first.Close();Application.DoEvents();if(first.IsDisposed||first.Visible||first.child.Id!=id||first.child.HasExited)throw new Exception("close-to-tray");
            first.ShowFromLauncher();Until(()=>first.Visible);if(first.child.Id!=id)throw new Exception("duplicate-watcher");
            first.SetLanguage(true);if(File.ReadAllText(Path.Combine(directory,"ui-language.txt"))!="en")throw new Exception("language-persistence");
            first.Quit();if(!first.IsDisposed)throw new Exception("quit-window");
            try{using(var old=Process.GetProcessById(id)){if(!old.HasExited)throw new Exception("orphan-watcher");}}catch(ArgumentException){}
            second=new BridgeWindow(null,directory);second.Show();Until(()=>second.phase=="watching");
            if(!second.english||second.selected!=file||second.child.Id==id||File.ReadAllText(file)!=fixture)throw new Exception("restart-preservation");
            second.Quit();return true;
        }catch(Exception error){Console.Error.WriteLine("STAM window check: "+error.GetType().Name+" / "+error.Message);return false;}
        finally{if(first!=null){first.Quit();first.Dispose();}if(second!=null){second.Quit();second.Dispose();}try{Directory.Delete(directory,true);}catch{}}
    }
    void StopChild(){retry.Stop();var old=child;child=null;Launcher.Stop(old);}
    void UI(Action action){if(IsDisposed||!IsHandleCreated)return;try{BeginInvoke(action);}catch(InvalidOperationException){}}
    internal static string SiteAddress(string ignored,bool english){return "https://limmin3-sudo.github.io/stam-freight-control/#/mission?lang="+(english?"en":"ko");}
    void Open(){try{Process.Start(new ProcessStartInfo(SiteAddress(null,english)){UseShellExecute=true});}catch{MessageBox.Show(T("Windows 기본 브라우저 설정을 확인하세요.","Check your Windows default browser settings."),"STAM");}}
    [System.Runtime.InteropServices.DllImport("user32.dll")] static extern bool DestroyIcon(IntPtr handle);
    [System.Runtime.InteropServices.DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr window,int attribute,ref int value,int size);
    protected override void OnHandleCreated(EventArgs e){base.OnHandleCreated(e);try{int dark=1;DwmSetWindowAttribute(Handle,20,ref dark,4);}catch{}}
    protected override void Dispose(bool disposing){if(disposing){StopChild();if(overlay!=null)overlay.Dispose();retry.Dispose();tray.Dispose();hints.Dispose();if(brandLogo!=null)brandLogo.Dispose();}base.Dispose(disposing);}
}

internal static class HoloFonts {
    static readonly System.Drawing.Text.PrivateFontCollection fonts=new System.Drawing.Text.PrivateFontCollection();
    static readonly List<IntPtr> fontMemory=new List<IntPtr>();
    static readonly List<IntPtr> gdiFonts=new List<IntPtr>();
    [System.Runtime.InteropServices.DllImport("gdi32.dll")] static extern IntPtr AddFontMemResourceEx(IntPtr memory,uint length,IntPtr reserved,ref uint count);
    [System.Runtime.InteropServices.DllImport("gdi32.dll")] static extern bool RemoveFontMemResourceEx(IntPtr handle);
    [System.Runtime.InteropServices.DllImport("gdi32.dll")] static extern IntPtr SelectObject(IntPtr dc,IntPtr value);
    [System.Runtime.InteropServices.DllImport("gdi32.dll")] static extern bool DeleteObject(IntPtr value);
    [System.Runtime.InteropServices.DllImport("gdi32.dll",CharSet=System.Runtime.InteropServices.CharSet.Unicode)] static extern int GetTextFace(IntPtr dc,int count,System.Text.StringBuilder face);
    [System.Runtime.InteropServices.DllImport("gdi32.dll",CharSet=System.Runtime.InteropServices.CharSet.Unicode)] static extern bool GetTextMetrics(IntPtr dc,out Metrics metrics);
    [System.Runtime.InteropServices.StructLayout(System.Runtime.InteropServices.LayoutKind.Sequential,CharSet=System.Runtime.InteropServices.CharSet.Unicode)] struct Metrics {
        public int height,ascent,descent,internalLeading,externalLeading,aveWidth,maxWidth,weight,overhang,aspectX,aspectY;
        public char first,last,def,brk;public byte italic,underline,strike,pitch,charset;
    }
    static bool loaded;
    // Keep private GDI+ fonts in memory. File-backed GDI registration can leave
    // Windows holding the installed TTF after exit and block packaging/updates.
    internal static void Load(){
        if(loaded)return;loaded=true;
        AppDomain.CurrentDomain.ProcessExit+=(s,e)=>{fonts.Dispose();foreach(var handle in gdiFonts)RemoveFontMemResourceEx(handle);gdiFonts.Clear();foreach(var memory in fontMemory)System.Runtime.InteropServices.Marshal.FreeCoTaskMem(memory);fontMemory.Clear();};
        foreach(string name in new[]{"fonts/Barlow-Medium.ttf","fonts/SUIT-Medium.ttf","theme/optics/Michroma-Regular.ttf"}){
            IntPtr memory=IntPtr.Zero;
            try{var bytes=File.ReadAllBytes(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"app","desktop",name));memory=System.Runtime.InteropServices.Marshal.AllocCoTaskMem(bytes.Length);System.Runtime.InteropServices.Marshal.Copy(bytes,0,memory,bytes.Length);fonts.AddMemoryFont(memory,bytes.Length);uint count=0;var handle=AddFontMemResourceEx(memory,(uint)bytes.Length,IntPtr.Zero,ref count);if(handle!=IntPtr.Zero)gdiFonts.Add(handle);fontMemory.Add(memory);memory=IntPtr.Zero;}
            catch{}finally{if(memory!=IntPtr.Zero)System.Runtime.InteropServices.Marshal.FreeCoTaskMem(memory);}
        }
    }
    internal static Font At(float size,bool latin=false,bool display=false){Load();string target=display?"Michroma":latin?"Barlow":"SUIT";foreach(var family in fonts.Families)if(family.Name.StartsWith(target,StringComparison.OrdinalIgnoreCase))return Environment.OSVersion.Platform==PlatformID.Win32NT?new Font(family,size,FontStyle.Regular):new Font(family.Name,size,FontStyle.Regular);return new Font(latin?"Segoe UI":"Malgun Gothic",size,FontStyle.Regular);}
    internal static void Draw(Graphics g,string text,Font font,Color colour,RectangleF bounds,bool center=false){
        bool korean=false;foreach(char c in text)if(c>=0xAC00&&c<=0xD7AF){korean=true;break;}
        using(var actual=At(font.Size,!korean,!korean&&font.Size>=18)){
            g.TextRenderingHint=System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;
            var flags=TextFormatFlags.NoPrefix|TextFormatFlags.WordBreak|TextFormatFlags.EndEllipsis|TextFormatFlags.NoPadding|TextFormatFlags.PreserveGraphicsClipping|TextFormatFlags.PreserveGraphicsTranslateTransform;
            if(center){flags&=~TextFormatFlags.WordBreak;flags|=TextFormatFlags.SingleLine|TextFormatFlags.HorizontalCenter|TextFormatFlags.VerticalCenter;}
            TextRenderer.DrawText(g,text,actual,Rectangle.Round(bounds),colour,flags);
        }
    }
    internal static void CheckSelection(string file){
        var result=new List<object>();
        using(var bitmap=new Bitmap(200,80))using(var graphics=Graphics.FromImage(bitmap)){
            foreach(bool latin in new[]{true,false})using(var font=At(12,latin)){
                var dc=graphics.GetHdc();var handle=font.ToHfont();var old=SelectObject(dc,handle);
                try{var face=new System.Text.StringBuilder(128);GetTextFace(dc,128,face);Metrics metrics;
                    if(!GetTextMetrics(dc,out metrics))throw new InvalidOperationException("font-metrics");
                    string expected=latin?"Barlow":"SUIT";
                    if(!face.ToString().StartsWith(expected,StringComparison.OrdinalIgnoreCase)||metrics.weight!=500)throw new InvalidOperationException("Incorrect font: "+face+" / "+metrics.weight);
                    result.Add(new{expected,selected=face.ToString(),weight=metrics.weight,family=font.FontFamily.Name});
                }finally{SelectObject(dc,old);DeleteObject(handle);graphics.ReleaseHdc(dc);}
            }
        }
        File.WriteAllText(file,new JavaScriptSerializer().Serialize(new{passed=true,renderer="Windows GDI TextRenderer",fonts=result}));
    }

}
internal sealed class HoloLabel : Label {
    public HoloLabel(){SetStyle(ControlStyles.UserPaint|ControlStyles.SupportsTransparentBackColor|ControlStyles.OptimizedDoubleBuffer,true);BackColor=Color.Transparent;}
    protected override void OnPaint(PaintEventArgs e){HoloFonts.Draw(e.Graphics,Text,Font,ForeColor,ClientRectangle);}
}
internal sealed class DeckButton : Button {
    public bool Primary {get;set;}bool hover,pressed;
    public DeckButton(){SetStyle(ControlStyles.UserPaint|ControlStyles.AllPaintingInWmPaint|ControlStyles.OptimizedDoubleBuffer|ControlStyles.SupportsTransparentBackColor,true);FlatStyle=FlatStyle.Flat;BackColor=Color.Transparent;UseVisualStyleBackColor=false;FlatAppearance.BorderSize=0;Font=HoloFonts.At(11);Cursor=Cursors.Hand;AccessibleRole=AccessibleRole.PushButton;}
    protected override void OnMouseEnter(EventArgs e){hover=true;Invalidate();base.OnMouseEnter(e);}protected override void OnMouseLeave(EventArgs e){hover=false;pressed=false;Invalidate();base.OnMouseLeave(e);}protected override void OnMouseDown(MouseEventArgs e){pressed=true;Invalidate();base.OnMouseDown(e);}protected override void OnMouseUp(MouseEventArgs e){pressed=false;Invalidate();base.OnMouseUp(e);}
    internal static GraphicsPath Shape(Rectangle r){var shape=new GraphicsPath();int cut=Math.Min(11,r.Height/4);shape.AddPolygon(new[]{new Point(r.Left+cut,r.Top),new Point(r.Right-cut,r.Top),new Point(r.Right,r.Top+cut),new Point(r.Right,r.Bottom-cut),new Point(r.Right-cut,r.Bottom),new Point(r.Left+cut,r.Bottom),new Point(r.Left,r.Bottom-cut),new Point(r.Left,r.Top+cut)});return shape;}
    protected override void OnPaint(PaintEventArgs e){
        if(Width<10||Height<10)return;var g=e.Graphics;
        var r=new Rectangle(1,1,Width-2,Height-2);if(pressed)r.Offset(0,1);
        bool bright=Primary&&Enabled;
        var ink=!Enabled?Color.FromArgb(145,147,149):bright?DeckTheme.Housing:DeckTheme.Ink;
        g.SmoothingMode=SmoothingMode.AntiAlias;
        using(var shape=Shape(r))
        using(var metal=DeckTheme.Key(r,bright)){
            g.FillPath(metal,shape);
            if(hover&&Enabled)using(var light=new SolidBrush(Color.FromArgb(18,255,255,255)))g.FillPath(light,shape);
            using(var edge=new Pen(bright?DeckTheme.Platinum:Color.FromArgb(76,78,80)))g.DrawPath(edge,shape);
        }
        HoloFonts.Draw(g,Text,Font,ink,Rectangle.Inflate(r,-8,-2),true);
        if(Focused&&ShowFocusCues)ControlPaint.DrawFocusRectangle(g,Rectangle.Inflate(r,-6,-5),ink,bright?DeckTheme.Platinum:DeckTheme.Housing);
    }
}

internal sealed class LinkCard : TableLayoutPanel {
    public bool Instrument {get;set;}
    public LinkCard(){BackColor=DeckTheme.Housing;SetStyle(ControlStyles.OptimizedDoubleBuffer|ControlStyles.ResizeRedraw,true);}
    protected override void OnPaintBackground(PaintEventArgs e){base.OnPaintBackground(e);
        if(Width<2||Height<2)return;
        DeckTheme.Panel(e.Graphics,ClientRectangle);
        if(Instrument)DeckTheme.Emblem(e.Graphics,ClientRectangle);
    }
}
