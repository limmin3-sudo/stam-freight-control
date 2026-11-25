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
    Process child;string pairedAddress;string selected="--auto",phase="idle";
    int failures;
    readonly System.Windows.Forms.Timer retry=new System.Windows.Forms.Timer();
    readonly NotifyIcon tray=new NotifyIcon();
    readonly ToolTip hints=new ToolTip();
    readonly HoloLabel title=new HoloLabel(),subtitle=new HoloLabel(),state=new HoloLabel(),detail=new HoloLabel(),fileLabel=new HoloLabel(),filePath=new HoloLabel(),bytes=new HoloLabel(),updated=new HoloLabel(),footer=new HoloLabel();
    readonly DeckButton readContract=new DeckButton();
    readonly DeckButton choose=new DeckButton(),search=new DeckButton(),open=new DeckButton(),disconnect=new DeckButton(),korean=new DeckButton(),englishButton=new DeckButton(),narratorButton=new DeckButton(),overlayButton=new DeckButton(),shortcutsButton=new DeckButton(),voiceButton=new DeckButton(),continuousButton=new DeckButton(),rideButton=new DeckButton();
    readonly string settings,languageSettings;
    CompanionOverlay overlay;
    readonly HoloLabel voiceFeedback=new HoloLabel();
    Image brandLogo;
    readonly PartnerPortrait portrait=new PartnerPortrait(false);
    Panel flightHome,settingsPage;
    readonly DeckButton haulTab=new DeckButton(),tradeTab=new DeckButton();
    readonly DeckButton homeLog=new DeckButton(),homeShare=new DeckButton(),homeMic=new DeckButton();
    readonly HoloLabel micResult=new HoloLabel();
    bool screenArmed;
    readonly DeckButton complete=new DeckButton(),settingsToggle=new DeckButton(),homeOpen=new DeckButton(),homeOverlay=new DeckButton();
    readonly HoloLabel routeLabel=new HoloLabel(),shipLabel=new HoloLabel(),flightSection=new HoloLabel();
    readonly ListBox manifest=new ListBox();
    readonly PictureBox shipImage=new PictureBox();
    string currentArt,lastRows;
    void UpdatePortrait(bool navigator){
        bool speaking=overlay!=null&&overlay.PartnerSpeaking;
        portrait.SelectPartner(navigator,english);portrait.Visible=speaking;
        title.Text=speaking?PartnerPortrait.Title(navigator,english):T("다음 목적지","Next destination");
        title.ForeColor=speaking?(navigator?DeckTheme.NavigatorInk:DeckTheme.OperatorInk):DeckTheme.Gilt;
    }
    void SelectShipArt(string file){
        if(file==currentArt)return;currentArt=file;
        var previous=shipImage.Image;shipImage.Image=null;if(previous!=null)previous.Dispose();
        if(!System.Text.RegularExpressions.Regex.IsMatch(file??"","^[a-z0-9-]+\\.jpg$"))return;
        string path=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"app","apps","control-room","src","assets","ships",file);
        if(File.Exists(path))try{using(var im=Image.FromFile(path))shipImage.Image=new Bitmap(im);}catch(IOException){}catch(ArgumentException){}
    }
    void ChoosePage(bool tools){
        settingsPage.Visible=tools;flightHome.Visible=!tools;
        if(tools)settingsPage.BringToFront();else flightHome.BringToFront();
        settingsToggle.Text=tools?T("운항으로","Back to flight"):T("설정","Settings");
    }
    CompanionOverlay Overlay(){if(overlay==null||overlay.IsDisposed){
        overlay=new CompanionOverlay(SendCommand,english,Path.GetDirectoryName(settings));
        overlay.TalkChanged+=()=>{UpdateTools();voiceFeedback.Text=overlay.TalkStatus;hints.SetToolTip(voiceFeedback,voiceFeedback.Text);RenderNavigation();};
        overlay.DeckChanged+=RenderNavigation;voiceFeedback.Text=overlay.TalkStatus;
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
        subtitle.Text="";ChoosePage(settingsPage.Visible&&settingsToggle.Tag!=null);homeOpen.Text=T("미션콘솔 열기","Mission console");homeOverlay.Text=T("게임 오버레이","Game overlay");
        readContract.Text=T("게임 계약 읽기","Read game contracts");choose.Text=T("파일 직접 선택","Choose Game.log");search.Text=T("자동으로 찾기","Find automatically");open.Text=T("미션콘솔 열기  ↗","Open mission console  ↗");disconnect.Text=manualStop?T("다시 연결","Reconnect"):T("연결 중지","Disconnect");
        footer.Text=T("창을 닫아도 트레이에서 수신합니다. 종료는 트레이 메뉴를 이용하세요.\n게임 로그는 읽기만 하며, 음성 완료는 연결한 STAM 운항에 반영됩니다.","Closing this window keeps the app in your system tray. Quit from its menu.\nRead-only game log access. Spoken confirmations update your linked STAM flight.");
        korean.Primary=!english;englishButton.Primary=english;korean.Invalidate();englishButton.Invalidate();updated.Text="";RenderStatus(null);UpdateTools();BuildTray();
    }
    void UpdateTools(){
        homeMic.Text=T("마이크 · ","Mic · ")+(overlay!=null&&overlay.TestingMic?T("점검 취소","Cancel check"):overlay!=null&&overlay.Listening?T("녹음 중","Recording"):overlay!=null&&overlay.VoiceEnabled?T("연속 듣기","Listening"):T("입력 점검","Test input"));
        micResult.Text=overlay!=null?(overlay.TestingMic?overlay.TalkStatus:overlay.MicCheckStatus)??"":"";
        hints.SetToolTip(micResult,micResult.Text);
        UpdatePortrait(overlay!=null&&overlay.IsNavigator);narratorButton.Text=overlay!=null&&overlay.Narrator=="off"?T("음성 답변 꺼짐","Replies muted"):T("답변 목소리","Reply voice");
        continuousButton.Text=overlay==null?T("연속 듣기 켜기","Listen continuously"):overlay.ContinuousLabel;
        rideButton.Text=T("동승 모드","Ride along");rideButton.Primary=overlay!=null&&overlay.RideAlong;rideButton.Invalidate();
        continuousButton.Primary=overlay!=null&&overlay.VoiceEnabled;continuousButton.Invalidate();
        overlayButton.Text=T("오버레이 표시/숨김","Show/hide overlay");shortcutsButton.Text=T("단축키 설정","Shortcut settings");voiceButton.Text=overlay==null?T("클릭해 말하기","Click to speak"):overlay.ButtonTalkLabel;voiceButton.Primary=overlay!=null&&overlay.Listening;voiceButton.Invalidate();}
    void SetLanguage(bool value){english=value;ApplyLanguage();if(!preview)try{Directory.CreateDirectory(Path.GetDirectoryName(languageSettings));File.WriteAllText(languageSettings,english?"en":"ko");}catch{}}
    internal bool CheckLanguages(){SetLanguage(true);bool ok=Text=="STAM Navigator"&&open.Text=="Open mission console  ↗"&&choose.Text=="Choose Game.log";SetLanguage(false);return ok&&Text=="STAM 네비게이터"&&open.Text=="미션콘솔 열기  ↗"&&choose.Text=="파일 직접 선택"&&shortcutsButton.Text=="단축키 설정"&&voiceButton.Text=="클릭해 말하기"&&continuousButton.Text=="연속 듣기 켜기";}
    internal static void CaptureDesign(string directory){
        Directory.CreateDirectory(directory);HoloFonts.CheckSelection(Path.Combine(directory,"font-selection.json"));
        foreach(bool en in new[]{false,true})using(var window=new BridgeWindow(en)){
            window.Show();Application.DoEvents();
            var previewOverlay=window.Overlay();
            string place=en?"Chawla Beach":"차울라 해변",next=en?"Sacren's Plot":"세이크런스 플롯";
            var cargo=new List<Dictionary<string,object>>();
            string[] names=en?new[]{"Waste","Hydrogen","Processed food"}:new[]{"폐기물","수소","가공 식품"};int[] units={22,11,9};
            for(int i=0;i<names.Length;i++)cargo.Add(new Dictionary<string,object>{{"item",names[i]},{"action","delivery"},{"scu",units[i]}});
            var flight=new Dictionary<string,object>{{"mode","flight"},{"partner","operator"},{"lines",new[]{place}},{"stepId",Guid.NewGuid().ToString()},{"step","delivery"},
                {"navigation",new Dictionary<string,object>{{"destination",place},{"ship","Drake Golem OX"},{"shipArt","drake-golem-ox.jpg"},{"route",new[]{place,next}},{"finished",false},{"extra",0},{"visitNumber",1},{"visitCount",3},{"cargo",cargo}}}};
            previewOverlay.UpdateDisplay(flight);window.RenderNavigation();previewOverlay.Show();Application.DoEvents();
            using(var picture=new Bitmap(previewOverlay.Width,previewOverlay.Height)){previewOverlay.DrawToBitmap(picture,new Rectangle(Point.Empty,previewOverlay.Size));picture.Save(Path.Combine(directory,"overlay-flight-"+(en?"en":"ko")+".png"));}
            previewOverlay.Hide();
            foreach(bool compact in new[]{false,true}){
                if(compact)window.ClientSize=new Size(820,680);Application.DoEvents();
                using(var bitmap=new Bitmap(window.Width,window.Height)){window.DrawToBitmap(bitmap,new Rectangle(Point.Empty,window.Size));bitmap.Save(Path.Combine(directory,"companion-"+(en?"en":"ko")+(compact?"-compact":"-full")+".png"),System.Drawing.Imaging.ImageFormat.Png);}
            }
            window.ChoosePage(true);Application.DoEvents();
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
        Size=new Size(Math.Min(1000,workArea.Width),Math.Min(780,workArea.Height));StartPosition=FormStartPosition.Manual;
        Location=new Point(workArea.Left+(workArea.Width-Width)/2,workArea.Top+(workArea.Height-Height)/2);BackColor=DeckTheme.Housing;ForeColor=Ink;DoubleBuffered=true;
        try{Icon=Icon.ExtractAssociatedIcon(Application.ExecutablePath);}catch{Icon=SystemIcons.Application;}
        var shell=new Panel{Dock=DockStyle.Fill,BackColor=DeckTheme.Housing,Padding=new Padding(1)};Controls.Add(shell);
        var frame=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=1,RowCount=2,Margin=Padding.Empty};
        frame.RowStyles.Add(new RowStyle(SizeType.Absolute,64));frame.RowStyles.Add(new RowStyle(SizeType.Percent,100));shell.Controls.Add(frame);
        var mast=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=6,RowCount=1,Padding=new Padding(12,1,6,1),Margin=Padding.Empty};
        mast.RowStyles.Add(new RowStyle(SizeType.Percent,100));mast.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,56));
        mast.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));mast.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,108));foreach(int width in new[]{34,34,34})mast.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,width));
        frame.Controls.Add(mast,0,0);
        var pages=new Panel{Dock=DockStyle.Fill};frame.Controls.Add(pages);
        settingsPage=new Panel{Dock=DockStyle.Fill,AutoScroll=true};flightHome=new Panel{Dock=DockStyle.Fill};
        pages.Controls.Add(settingsPage);pages.Controls.Add(flightHome);
        var layout=new TableLayoutPanel{Dock=DockStyle.Top,Height=520,Margin=Padding.Empty,Padding=new Padding(10),ColumnCount=1,RowCount=6};
        foreach(int h in new[]{48,64,100,96,52})layout.RowStyles.Add(new RowStyle(SizeType.Absolute,h));layout.RowStyles.Add(new RowStyle(SizeType.Percent,100));settingsPage.Controls.Add(layout);
        var logo=new PictureBox{Dock=DockStyle.Fill,SizeMode=PictureBoxSizeMode.Zoom,Margin=new Padding(0,6,8,6),BackColor=Color.Transparent};
        try{using(var source=Image.FromFile(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"app","assets","stam-logo-transparent.png")))brandLogo=new Bitmap(source);logo.Image=brandLogo;}catch{}
        mast.Controls.Add(logo,0,0);
        var wordmark=new Label{Text="STAM Navigator",AutoSize=false,Dock=DockStyle.Fill,Margin=Padding.Empty,TextAlign=ContentAlignment.MiddleLeft,Font=HoloFonts.At(16,true),ForeColor=Ink};
        mast.Controls.Add(wordmark,1,0);
        var windowControls=new List<Button>();
        foreach(string symbol in new[]{"−","□","×"}){
            var b=new Button{Text=symbol,Font=new Font("Segoe UI",12),FlatStyle=FlatStyle.Flat,BackColor=DeckTheme.Housing,ForeColor=Muted,Dock=DockStyle.Fill,Margin=new Padding(0,10,0,10),TabStop=true};b.FlatAppearance.BorderSize=0;windowControls.Add(b);mast.Controls.Add(b,2+windowControls.Count,0);
        }
        windowControls[0].AccessibleName=T("최소화","Minimize");windowControls[0].Click+=(a,e)=>WindowState=FormWindowState.Minimized;
        Action maximize=()=>{MaximizedBounds=Screen.FromControl(this).WorkingArea;WindowState=WindowState==FormWindowState.Maximized?FormWindowState.Normal:FormWindowState.Maximized;};
        windowControls[1].AccessibleName=T("최대화 또는 복원","Maximize or restore");windowControls[1].Click+=(a,e)=>maximize();
        windowControls[2].AccessibleName=T("트레이로 닫기","Close to tray");windowControls[2].Click+=(a,e)=>Close();
        FlightChrome.Attach(this,null,mast,logo,wordmark);

        var languages=new FlowLayoutPanel{Dock=DockStyle.Fill,FlowDirection=FlowDirection.LeftToRight,Margin=new Padding(0,5,0,0),BackColor=Color.Transparent};korean.Text="한국어";englishButton.Text="English";
        foreach(var b in new[]{korean,englishButton}){b.Size=new Size(78,35);b.Margin=new Padding(3);languages.Controls.Add(b);}layout.Controls.Add(languages);settingsToggle.Dock=DockStyle.Fill;settingsToggle.Margin=new Padding(4,9,2,9);mast.Controls.Add(settingsToggle,2,0);settingsToggle.Click+=(a,e)=>{settingsToggle.Tag=true;ChoosePage(!settingsPage.Visible);};
        var home=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=1,RowCount=7,Padding=new Padding(12)};
        foreach(int h in new[]{132,42,40,34})home.RowStyles.Add(new RowStyle(SizeType.Absolute,h));home.RowStyles.Add(new RowStyle(SizeType.Percent,100));home.RowStyles.Add(new RowStyle(SizeType.Absolute,54));home.RowStyles.Add(new RowStyle(SizeType.Absolute,58));flightHome.Controls.Add(home);
        var hero=new LinkCard{Instrument=false,Dock=DockStyle.Fill,ColumnCount=3,RowCount=3,Padding=new Padding(18,10,10,10)};
        hero.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,65));hero.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,65));hero.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,35));
        hero.RowStyles.Add(new RowStyle(SizeType.Absolute,26));hero.RowStyles.Add(new RowStyle(SizeType.Absolute,52));hero.RowStyles.Add(new RowStyle(SizeType.Percent,100));
        Setup(title,12,DeckTheme.Gilt);Setup(state,27,DeckTheme.Ink);Setup(detail,12,Muted);
        hero.Controls.Add(title,0,0);hero.Controls.Add(state,0,1);hero.Controls.Add(detail,0,2);hero.Controls.Add(portrait,1,0);hero.SetRowSpan(portrait,3);
        shipImage.Dock=DockStyle.Fill;shipImage.Margin=Padding.Empty;shipImage.SizeMode=PictureBoxSizeMode.Zoom;shipImage.BackColor=Color.Transparent;hero.Controls.Add(shipImage,2,0);hero.SetRowSpan(shipImage,3);home.Controls.Add(hero);
        var checks=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=3,Margin=Padding.Empty};
        foreach(var button in new[]{homeLog,homeShare,homeMic}){checks.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,1));button.Dock=DockStyle.Fill;checks.Controls.Add(button);}
        homeLog.Click+=(s,e)=>{settingsToggle.Tag=true;ChoosePage(true);};
        homeShare.Click+=(s,e)=>{if(screenArmed)SendCommand("read-contract");else Open(true);};homeMic.Click+=(s,e)=>Overlay().ToggleMicCheck();
        home.Controls.Add(checks);Setup(micResult,11,Ink);home.Controls.Add(micResult);
        var modes=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=3,Margin=Padding.Empty};modes.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));modes.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,74));modes.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,74));
        Setup(flightSection,14,Ink);modes.Controls.Add(flightSection);foreach(var tabButton in new[]{haulTab,tradeTab}){tabButton.Dock=DockStyle.Fill;modes.Controls.Add(tabButton);}home.Controls.Add(modes);
        haulTab.Click+=(a,e)=>{if(overlay!=null)overlay.SelectMode(false);};tradeTab.Click+=(a,e)=>{if(overlay!=null)overlay.SelectMode(true);};
        manifest.Dock=DockStyle.Fill;manifest.IntegralHeight=false;manifest.Font=HoloFonts.At(15);manifest.DrawMode=DrawMode.OwnerDrawFixed;manifest.ItemHeight=40;manifest.DrawItem+=DrawManifest;manifest.HorizontalScrollbar=true;manifest.BorderStyle=BorderStyle.None;manifest.BackColor=Color.FromArgb(40,43,39);manifest.ForeColor=Ink;home.Controls.Add(manifest);
        var bottom=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=2};bottom.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));bottom.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,160));Setup(shipLabel,12,Muted);bottom.Controls.Add(shipLabel);complete.Primary=true;complete.Dock=DockStyle.Fill;complete.Click+=(a,e)=>{if(overlay!=null)overlay.CompleteCurrent();};bottom.Controls.Add(complete);home.Controls.Add(bottom);
        var rail=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=3};rail.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));rail.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,140));rail.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,140));Setup(routeLabel,12,Muted);rail.Controls.Add(routeLabel);homeOverlay.Dock=homeOpen.Dock=DockStyle.Fill;rail.Controls.Add(homeOverlay);rail.Controls.Add(homeOpen);homeOpen.Click+=(a,e)=>Open();homeOverlay.Click+=(a,e)=>Overlay().ToggleFromNavigator();home.Controls.Add(rail);
        var actions=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=5,Margin=Padding.Empty,BackColor=shell.BackColor};
        foreach(float width in new[]{20f,20f,17f,20f,23f})actions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,width));
        foreach(var button in new[]{open,choose,search,disconnect,korean,englishButton,narratorButton,overlayButton,shortcutsButton,voiceButton,continuousButton,rideButton}){button.Font=HoloFonts.At(13);}
        foreach(var b in new[]{voiceButton,continuousButton,rideButton,readContract,open}){b.Dock=DockStyle.Fill;b.Margin=new Padding(0,0,8,12);actions.Controls.Add(b);}open.Margin=new Padding(0,0,0,12);layout.Controls.Add(actions);
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
        overlayButton.Click+=(s,e)=>Overlay().Toggle();shortcutsButton.Click+=(s,e)=>Overlay().Configure();voiceButton.Click+=(s,e)=>Overlay().ToggleButtonTalk();hints.SetToolTip(voiceButton,T("한 번 눌러 녹음을 시작하고 다시 눌러 전송하세요. 게임에서는 설정한 말하기 버튼을 누른 채 바로 질문하세요.","Click to record and click again to send. In game, hold the talk shortcut and ask directly."));continuousButton.Click+=(s,e)=>Overlay().ToggleVoice();rideButton.Click+=(s,e)=>Overlay().ToggleRideAlong();hints.SetToolTip(rideButton,T("호출 없이 질문하고 가벼운 잡담을 나눕니다. 다시 누르면 호출어 듣기로 돌아갑니다.","Ask directly and chat. Click again to return to wake-word listening."));
        Setup(footer,12,Muted);layout.Controls.Add(footer);
        korean.Click+=(s,e)=>SetLanguage(false);englishButton.Click+=(s,e)=>SetLanguage(true);choose.Click+=(s,e)=>SelectLog();search.Click+=(s,e)=>Start("--auto");open.Click+=(s,e)=>Open();readContract.Click+=(s,e)=>Open(true);disconnect.Click+=(s,e)=>{if(manualStop)Start(selected);else{manualStop=true;StopChild();phase="stopped";ApplyLanguage();}};
        retry.Tick+=(s,e)=>{retry.Stop();if(!manualStop&&!quitting)Start(selected,false);};
        tray.Icon=Icon;tray.DoubleClick+=(s,e)=>Reveal();ApplyLanguage();
        Shown+=(s,e)=>{if(preview)return;Overlay();tray.Visible=true;try{string prior=File.ReadAllText(settings).Trim();if(Path.IsPathRooted(prior)&&prior.EndsWith(".log",StringComparison.OrdinalIgnoreCase))selected=prior;}catch{}Start(selected);};
        FormClosing+=(s,e)=>{if(Environment.GetEnvironmentVariable("STAM_WINDOW_QA")=="1")Console.Error.WriteLine("Closing: reason="+e.CloseReason+" preview="+preview+" quitting="+quitting);if(!preview&&!quitting&&e.CloseReason==CloseReason.UserClosing){e.Cancel=true;Hide();return;}quitting=true;StopChild();tray.Visible=false;};
    }
    static void Setup(HoloLabel label,float size,Color colour){label.Dock=DockStyle.Fill;label.Margin=Padding.Empty;label.Font=HoloFonts.At(size);label.ForeColor=colour;}
    ToolStripMenuItem guidanceMenu;
    void BuildTray(){var previous=tray.ContextMenuStrip;var menu=new ContextMenuStrip();menu.Items.Add(T("네비게이터 열기","Open STAM Navigator"),null,(s,e)=>Reveal());menu.Items.Add(T("게임 계약 읽기","Read game contracts"),null,(s,e)=>Open(true));menu.Items.Add(T("미션콘솔 열기","Open mission console"),null,(s,e)=>Open());menu.Items.Add(T("오버레이 표시/숨김","Show/hide overlay"),null,(s,e)=>Overlay().Toggle());menu.Items.Add(T("오버레이 클릭 통과/조작 전환","Toggle overlay click-through/input"),null,(s,e)=>Overlay().ToggleInput());menu.Items.Add(T("단축키 설정","Shortcut settings"),null,(s,e)=>Overlay().Configure());var guidance=guidanceMenu=new ToolStripMenuItem(T("음성 안내","Spoken guidance"));menu.Items.Add(guidance);
        foreach(var style in new[]{"off","partner","supertonic-female","supertonic-male","female","male"}){
            string choice=style;
            var item=new ToolStripMenuItem(style=="off"?T("끄기","Off"):style=="partner"?T("파트너 음성 · 실시간 정보는 Supertonic","Partner voice · live details via Supertonic"):style=="supertonic-female"?T("Supertonic 여성 · 애니풍","Supertonic female · upbeat"):style=="supertonic-male"?T("Supertonic 남성 · 정중한 다나까체","Supertonic male · formal"):style=="female"?T("Windows 여성 · 애니풍","Windows female · upbeat"):T("Windows 남성 · 다나까체","Windows male · formal"));
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
            if(type=="contract-read"){Overlay().ContractNotice(data);return;}
            if(type=="display"){
                if(overlay!=null||data["display"]!=null){
                    Overlay().UpdateDisplay(data["display"]);
                    RenderNavigation();
                }return;
            }
            if(type=="ready"){
                pairedAddress=Launcher.ReadUrl(line);failures=0;selected=Convert.ToString(data["file"]);phase="starting";
                try{Directory.CreateDirectory(Path.GetDirectoryName(settings));File.WriteAllText(settings,selected);}catch{}
            }else if(type=="status")phase=Convert.ToString(data["phase"]);
            else if(type=="discovery")phase=Convert.ToString(data["phase"]);
            else if(type=="error"){phase=Convert.ToString(data["code"]);if(phase=="port-busy"){manualStop=true;retry.Stop();}}
            RenderStatus(data);
        }catch{phase="error";RenderStatus(null);}
    }
    void DrawManifest(object sender,DrawItemEventArgs e){
        if(e.Index<0||e.Index>=manifest.Items.Count)return;
        var g=e.Graphics;var row=e.Bounds;var text=Convert.ToString(manifest.Items[e.Index]);
        using(var brush=new SolidBrush(manifest.Focused&&(e.State&DrawItemState.Selected)!=0?Color.FromArgb(56,59,51):manifest.BackColor))g.FillRectangle(brush,row);
        var content=Rectangle.Inflate(row,-12,-1);
        const TextFormatFlags flags=TextFormatFlags.NoPrefix|TextFormatFlags.VerticalCenter|TextFormatFlags.SingleLine|TextFormatFlags.EndEllipsis;
        string item,quantity;
        if(overlay!=null&&overlay.ManifestLine(e.Index,out item,out quantity)){
            int w=Math.Min(content.Width/2,150);
            TextRenderer.DrawText(g,item,e.Font,new Rectangle(content.X,content.Y,content.Width-w,content.Height),Ink,flags);
            TextRenderer.DrawText(g,quantity,e.Font,new Rectangle(content.Right-w,content.Y,w,content.Height),DeckTheme.Platinum,flags|TextFormatFlags.Right);
        }else TextRenderer.DrawText(g,text,e.Font,content,Ink,flags);
        using(var pen=new Pen(Color.FromArgb(62,66,57)))g.DrawLine(pen,row.Left+9,row.Bottom-1,row.Right-9,row.Bottom-1);
        if((e.State&DrawItemState.Focus)!=0)e.DrawFocusRectangle();
    }
    void RenderNavigation(){
        UpdatePortrait(overlay!=null&&overlay.IsNavigator);
        string destination=overlay==null?"":overlay.Destination;
        bool live=overlay!=null&&overlay.HasDisplay;
        haulTab.Text=T("운송","Haul");tradeTab.Text=T("무역","Trade");haulTab.Enabled=tradeTab.Enabled=live&&overlay.CanSwitchMode;haulTab.Primary=live&&overlay.InFlight;tradeTab.Primary=live&&!overlay.InFlight;haulTab.Invalidate();tradeTab.Invalidate();
        state.Text=!String.IsNullOrWhiteSpace(destination)?destination:live?(overlay.InFlight?T("운송 안내","Flight guidance"):T("무역 안내","Trade guidance")):T("운항 대기","Waiting for flight");
        detail.Text=!live?T("웹 부조종사에서 네비게이터를 연결하세요.","Connect STAM Navigator from the web copilot."):overlay.PartnerSpeaking?overlay.NavigationText:"";
        hints.SetToolTip(detail,detail.Text);
        flightSection.Text=live&&overlay.InFlight?T("이번 거점 작업","Work at this stop")+overlay.LoadSummary:T("현재 작업","Current work");
        var rows=live?overlay.CargoRows():new List<string>();
        if(rows.Count==0&&live)rows.AddRange((overlay.NavigationText??"").Split(new[]{'\r','\n'},StringSplitOptions.RemoveEmptyEntries));
        if(rows.Count==0)rows.Add(T("미션콘솔에서 계약을 선택하고 운송을 시작하세요.","Select your contracts and start a haul in Mission Console."));
        string key=String.Join("\n",rows.ToArray());
        if(key!=lastRows){lastRows=key;manifest.BeginUpdate();manifest.Items.Clear();manifest.Items.AddRange(rows.ToArray());manifest.EndUpdate();}
        shipLabel.Text=live?overlay.DeckValue("ship"):"";if(shipLabel.Text.Length==0)shipLabel.Text=subtitle.Text;routeLabel.Text=live?overlay.Route:"";hints.SetToolTip(routeLabel,routeLabel.Text);
        complete.Visible=live&&overlay.HasStep;complete.Enabled=live&&overlay.CanComplete;complete.Text=live?overlay.StepLabel:"";
        SelectShipArt(live?overlay.DeckValue("shipArt"):"");
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
        if(data!=null&&data.ContainsKey("screenArmed"))screenArmed=Object.Equals(data["screenArmed"],true);
        if(String.IsNullOrEmpty(pairedAddress))screenArmed=false;
        homeLog.Text=T("로그 · ","Log · ")+name;
        homeShare.Text=screenArmed?T("게임 창 공유 중 · 계약 읽기","Sharing game · read contract"):T("게임 창 · 공유 설정","Game window · set up");
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
    void StopChild(){pairedAddress=null;retry.Stop();var old=child;child=null;Launcher.Stop(old);}
    void UI(Action action){if(IsDisposed||!IsHandleCreated)return;try{BeginInvoke(action);}catch(InvalidOperationException){}}
    internal static string SiteAddress(string ignored,bool english){return "https://limmin3-sudo.github.io/stam-freight-control/#/mission?lang="+(english?"en":"ko");}
    void Open(bool capture=false){try{
        string address=SiteAddress(null,english);
        bool preview=File.Exists(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"preview-console","index.html"));
        if(capture || preview){
            if(String.IsNullOrEmpty(pairedAddress)){MessageBox.Show(T("먼저 Game.log를 연결하세요.","Connect Game.log first."),"STAM");return;}
            var paired=new Uri(pairedAddress);
            address=capture ? new Uri(paired,"/contract-reader/?lang="+(english?"en":"ko")+paired.Fragment).AbsoluteUri
                            : new Uri(paired,"/console/#/mission?lang="+(english?"en":"ko")).AbsoluteUri;
        }
        Process.Start(new ProcessStartInfo(address){UseShellExecute=true});}catch{MessageBox.Show(T("Windows 기본 브라우저 설정을 확인하세요.","Check your Windows default browser settings."),"STAM");}}
    [System.Runtime.InteropServices.DllImport("user32.dll")] static extern bool DestroyIcon(IntPtr handle);
    [System.Runtime.InteropServices.DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr window,int attribute,ref int value,int size);
    protected override void OnHandleCreated(EventArgs e){base.OnHandleCreated(e);try{int dark=1;DwmSetWindowAttribute(Handle,20,ref dark,4);}catch{}}
    protected override void Dispose(bool disposing){if(disposing){if(shipImage.Image!=null)shipImage.Image.Dispose();StopChild();if(overlay!=null)overlay.Dispose();retry.Dispose();tray.Dispose();hints.Dispose();if(brandLogo!=null)brandLogo.Dispose();}base.Dispose(disposing);}
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
    internal static GraphicsPath Shape(Rectangle r){var shape=new GraphicsPath();int cut=3;shape.AddPolygon(new[]{new Point(r.Left+cut,r.Top),new Point(r.Right-cut,r.Top),new Point(r.Right,r.Top+cut),new Point(r.Right,r.Bottom-cut),new Point(r.Right-cut,r.Bottom),new Point(r.Left+cut,r.Bottom),new Point(r.Left,r.Bottom-cut),new Point(r.Left,r.Top+cut)});return shape;}
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
