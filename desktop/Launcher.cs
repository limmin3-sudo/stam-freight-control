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
    readonly bool preview;
    bool english,quitting,manualStop;
    Process child;string selected="--auto",phase="idle";
    int failures;
    readonly System.Windows.Forms.Timer retry=new System.Windows.Forms.Timer();
    readonly NotifyIcon tray=new NotifyIcon();
    readonly ToolTip hints=new ToolTip();
    readonly HoloLabel title=new HoloLabel(),subtitle=new HoloLabel(),state=new HoloLabel(),detail=new HoloLabel(),fileLabel=new HoloLabel(),filePath=new HoloLabel(),bytes=new HoloLabel(),updated=new HoloLabel(),footer=new HoloLabel();
    readonly DeckButton choose=new DeckButton(),search=new DeckButton(),open=new DeckButton(),disconnect=new DeckButton(),korean=new DeckButton(),englishButton=new DeckButton();
    readonly string settings,languageSettings;
    static readonly string languageFile=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"STAM","ui-language.txt");
    static readonly Color Ink=Color.FromArgb(223,240,244),Muted=Color.FromArgb(144,177,188),Cyan=Color.FromArgb(129,224,234),Gold=Color.FromArgb(240,205,142);
    internal static bool ReadEnglish(string file=null){try{return File.ReadAllText(file??languageFile).Trim()=="en";}catch{return false;}}
    string T(string ko,string en){return english?en:ko;}
    static HoloLabel Label(string text,float size,Color colour){return new HoloLabel{Text=text,Font=HoloFonts.At(size),ForeColor=colour,Dock=DockStyle.Fill,Margin=Padding.Empty};}
    void ApplyLanguage(){
        Text="STAM · "+T("로그 연결","Log companion");
        title.Text=T("운항의 시작, 자동으로","Your flight, connected");subtitle.Text=T("게임에서 수주한 계약을 미션콘솔로 연결합니다.","Bring accepted game contracts into your mission console.");
        choose.Text=T("파일 직접 선택","Choose Game.log");search.Text=T("자동으로 찾기","Find automatically");open.Text=T("미션콘솔 열기  ↗","Open mission console  ↗");disconnect.Text=manualStop?T("다시 연결","Reconnect"):T("연결 중지","Disconnect");
        footer.Text=T("창을 닫아도 트레이에서 수신합니다. 종료는 트레이 메뉴를 이용하세요.\n게임 로그는 읽기만 하며, 원본 파일과 진행 중 운항은 변경하지 않습니다.","Closing this window keeps the app in your system tray. Quit from its menu.\nRead-only game log access. Your game files and current flight stay intact.");
        korean.Primary=!english;englishButton.Primary=english;korean.Invalidate();englishButton.Invalidate();updated.Text="";RenderStatus(null);BuildTray();
    }
    void SetLanguage(bool value){english=value;ApplyLanguage();if(!preview)try{Directory.CreateDirectory(Path.GetDirectoryName(languageSettings));File.WriteAllText(languageSettings,english?"en":"ko");}catch{}}
    internal bool CheckLanguages(){SetLanguage(true);bool ok=open.Text=="Open mission console  ↗"&&choose.Text=="Choose Game.log";SetLanguage(false);return ok&&open.Text=="미션콘솔 열기  ↗"&&choose.Text=="파일 직접 선택";}
    public BridgeWindow(bool? languageOverride=null,string testSettingsDirectory=null){
        string directory=testSettingsDirectory??Path.GetDirectoryName(languageFile);settings=Path.Combine(directory,"log-path.txt");languageSettings=Path.Combine(directory,"ui-language.txt");
        preview=languageOverride.HasValue&&testSettingsDirectory==null;english=languageOverride??ReadEnglish(languageSettings);
        HoloFonts.Load();AutoScaleDimensions=new SizeF(96,96);AutoScaleMode=AutoScaleMode.Dpi;Font=HoloFonts.At(11);
        ClientSize=new Size(920,710);MinimumSize=new Size(820,700);StartPosition=FormStartPosition.CenterScreen;BackColor=Color.FromArgb(7,17,25);ForeColor=Ink;DoubleBuffered=true;
        try{Icon=Icon.ExtractAssociatedIcon(Application.ExecutablePath);}catch{Icon=SystemIcons.Application;}
        var layout=new TableLayoutPanel{Dock=DockStyle.Fill,Padding=new Padding(36,24,36,22),ColumnCount=1,RowCount=7};
        foreach(int height in new[]{90,76,174,138,74,50})layout.RowStyles.Add(new RowStyle(SizeType.Absolute,height));layout.RowStyles.Add(new RowStyle(SizeType.Percent,100));Controls.Add(layout);
        var mast=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=2,Margin=Padding.Empty};mast.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));mast.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,170));layout.Controls.Add(mast);
        var brand=new TableLayoutPanel{Dock=DockStyle.Fill,RowCount=2,ColumnCount=1,Margin=Padding.Empty};brand.RowStyles.Add(new RowStyle(SizeType.Absolute,43));brand.RowStyles.Add(new RowStyle(SizeType.Percent,100));
        brand.Controls.Add(Label("S T A M",29,Ink));brand.Controls.Add(Label("F R E I G H T   D I V I S I O N   /   LOG LINK",9,Cyan));mast.Controls.Add(brand);
        var languages=new FlowLayoutPanel{Dock=DockStyle.Fill,FlowDirection=FlowDirection.LeftToRight,Margin=new Padding(0,5,0,0)};korean.Text="한국어";englishButton.Text="English";
        foreach(var b in new[]{korean,englishButton}){b.Size=new Size(78,35);b.Margin=new Padding(3);languages.Controls.Add(b);}mast.Controls.Add(languages);
        var intro=new TableLayoutPanel{Dock=DockStyle.Fill,RowCount=2,ColumnCount=1,Margin=Padding.Empty};intro.RowStyles.Add(new RowStyle(SizeType.Absolute,36));intro.RowStyles.Add(new RowStyle(SizeType.Percent,100));
        Setup(title,22,Ink);Setup(subtitle,11,Muted);intro.Controls.Add(title);intro.Controls.Add(subtitle);layout.Controls.Add(intro);
        var connection=new LinkCard{Dock=DockStyle.Fill,Padding=new Padding(24,18,24,18),ColumnCount=2,RowCount=3,Margin=new Padding(0,0,0,14)};
        connection.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,63));connection.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,37));
        connection.RowStyles.Add(new RowStyle(SizeType.Absolute,24));connection.RowStyles.Add(new RowStyle(SizeType.Absolute,43));connection.RowStyles.Add(new RowStyle(SizeType.Percent,100));
        connection.Controls.Add(Label("01  /  LIVE CONNECTION",9,Cyan),0,0);connection.SetColumnSpan(connection.GetControlFromPosition(0,0),2);
        Setup(state,24,Gold);Setup(detail,11,Muted);Setup(bytes,19,Ink);Setup(updated,10,Muted);
        connection.Controls.Add(state,0,1);connection.Controls.Add(detail,0,2);connection.Controls.Add(bytes,1,1);connection.Controls.Add(updated,1,2);layout.Controls.Add(connection);
        var file=new LinkCard{Dock=DockStyle.Fill,Padding=new Padding(24,16,24,15),ColumnCount=1,RowCount=3,Margin=new Padding(0,0,0,14)};file.RowStyles.Add(new RowStyle(SizeType.Absolute,22));file.RowStyles.Add(new RowStyle(SizeType.Absolute,31));file.RowStyles.Add(new RowStyle(SizeType.Percent,100));
        file.Controls.Add(Label("02  /  GAME LOG",9,Cyan));Setup(fileLabel,17,Ink);Setup(filePath,10,Muted);file.Controls.Add(fileLabel);file.Controls.Add(filePath);layout.Controls.Add(file);
        var actions=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=3,Margin=Padding.Empty};foreach(float width in new[]{50f,25f,25f})actions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,width));
        open.Warm=true;foreach(var b in new[]{open,search,choose}){b.Dock=DockStyle.Fill;b.Margin=new Padding(0,0,10,14);actions.Controls.Add(b);}choose.Margin=new Padding(0,0,0,14);layout.Controls.Add(actions);
        var utility=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=2,Margin=Padding.Empty};utility.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));utility.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,150));
        utility.Controls.Add(Label("COMPANION  1.4  /  READ ONLY",9,Muted));disconnect.Dock=DockStyle.Fill;disconnect.Margin=new Padding(0,0,0,12);utility.Controls.Add(disconnect);layout.Controls.Add(utility);
        Setup(footer,10,Muted);layout.Controls.Add(footer);
        korean.Click+=(s,e)=>SetLanguage(false);englishButton.Click+=(s,e)=>SetLanguage(true);choose.Click+=(s,e)=>SelectLog();search.Click+=(s,e)=>Start("--auto");open.Click+=(s,e)=>Open();disconnect.Click+=(s,e)=>{if(manualStop)Start(selected);else{manualStop=true;StopChild();phase="stopped";ApplyLanguage();}};
        retry.Tick+=(s,e)=>{retry.Stop();if(!manualStop&&!quitting)Start(selected,false);};
        tray.Icon=Icon;tray.DoubleClick+=(s,e)=>Reveal();ApplyLanguage();
        Shown+=(s,e)=>{if(preview)return;tray.Visible=true;try{string prior=File.ReadAllText(settings).Trim();if(Path.IsPathRooted(prior)&&prior.EndsWith(".log",StringComparison.OrdinalIgnoreCase))selected=prior;}catch{}Start(selected);};
        FormClosing+=(s,e)=>{if(!preview&&!quitting&&e.CloseReason==CloseReason.UserClosing){e.Cancel=true;Hide();return;}quitting=true;StopChild();tray.Visible=false;};
    }
    static void Setup(HoloLabel label,float size,Color colour){label.Dock=DockStyle.Fill;label.Margin=Padding.Empty;label.Font=HoloFonts.At(size);label.ForeColor=colour;}
    void BuildTray(){var previous=tray.ContextMenuStrip;var menu=new ContextMenuStrip();menu.Items.Add(T("연결 창 열기","Open companion"),null,(s,e)=>Reveal());menu.Items.Add(T("미션콘솔 열기","Open mission console"),null,(s,e)=>Open());menu.Items.Add(new ToolStripSeparator());menu.Items.Add(T("앱 종료 · 로그 연결 종료","Quit app · Disconnect"),null,(s,e)=>Quit());tray.ContextMenuStrip=menu;if(previous!=null)previous.Dispose();}
    internal void ShowFromLauncher(){UI(Reveal);}
    void Quit(){if(IsDisposed)return;quitting=true;Close();}
    void Reveal(){Show();WindowState=FormWindowState.Normal;Activate();}
    void SelectLog(){using(var dialog=new OpenFileDialog{Title=T("Game.log 선택 · 읽기 전용","Choose Game.log · Read only"),Filter="Game.log|Game.log|Log files (*.log)|*.log",CheckFileExists=true}){if(File.Exists(selected))dialog.FileName=selected;if(dialog.ShowDialog()==DialogResult.OK)Start(dialog.FileName);}}
    void Start(string file,bool reset=true){
        StopChild();selected=file;manualStop=false;if(reset)failures=0;phase="starting";ApplyLanguage();
        if(!preview)try{Directory.CreateDirectory(Path.GetDirectoryName(settings));File.WriteAllText(settings,file=="--auto"?"":file);}catch{}
        try{
            child=Launcher.StartBridge(file,false);var active=child;
            child.OutputDataReceived+=(s,e)=>{if(e.Data!=null)UI(()=>{if(child==active)Receive(e.Data);});};child.ErrorDataReceived+=(s,e)=>{};
            child.EnableRaisingEvents=true;child.Exited+=(s,e)=>UI(()=>{if(child!=active||quitting)return;child=null;active.Dispose();if(phase=="port-busy")return;ScheduleRetry();});
            child.BeginOutputReadLine();child.BeginErrorReadLine();
        }catch{phase="missing-runtime";RenderStatus(null);}
    }
    void ScheduleRetry(){if(manualStop||quitting)return;phase="reconnecting";failures++;retry.Interval=Math.Min(30000,1000*(1<<Math.Min(failures,5)));retry.Start();RenderStatus(null);}
    void Receive(string line){
        try{
            var data=new JavaScriptSerializer().Deserialize<Dictionary<string,object>>(line);string type=Convert.ToString(data["type"]);
            if(type=="ready"){
                Launcher.ReadUrl(line);failures=0;selected=Convert.ToString(data["file"]);phase="starting";
                try{Directory.CreateDirectory(Path.GetDirectoryName(settings));File.WriteAllText(settings,selected);}catch{}
            }else if(type=="status")phase=Convert.ToString(data["phase"]);
            else if(type=="discovery")phase=Convert.ToString(data["phase"]);
            else if(type=="error"){phase=Convert.ToString(data["code"]);if(phase=="port-busy"){manualStop=true;retry.Stop();}}
            RenderStatus(data);
        }catch{phase="error";RenderStatus(null);}
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
            case "port-busy":name=T("다른 연결 실행 중","ANOTHER LINK IS OPEN");description=T("다른 로그 연결 앱을 종료하고 다시 연결하세요.","Close the other log app, then reconnect.");break;
            case "missing-runtime":name=T("앱 파일 확인 필요","CHECK APP FILES");description=T("설치 파일로 복구하거나 ZIP 전체를 풀어 주세요.","Repair the installation or extract the entire ZIP.");break;
            case "error":case "startup-failed":name=T("연결 확인 필요","CHECK CONNECTION");description=T("파일 위치와 읽기 권한을 확인하세요.","Check the file location and read access.");break;
            case "starting":name=T("연결 준비 중","CONNECTING");description=T("게임 로그를 확인하고 있습니다.","Checking your game log.");break;
            default:name=T("연결 대기","READY TO CONNECT");description=T("앱을 실행하면 로그를 자동으로 찾습니다.","Finds your game log automatically on launch.");break;
        }
        state.Text=name;state.ForeColor=phase=="watching"?Cyan:Gold;detail.Text=description;
        if(data!=null&&data.ContainsKey("bytesRead"))bytes.Text=(Convert.ToDouble(data["bytesRead"])/1048576d).ToString("0.0",System.Globalization.CultureInfo.InvariantCulture)+" MB";
        else if(bytes.Text=="")bytes.Text="— MB";
        if(data!=null&&data.ContainsKey("lastReadAt")&&data["lastReadAt"]!=null){DateTime stamp;if(DateTime.TryParse(Convert.ToString(data["lastReadAt"]),out stamp))updated.Text=T("최근 확인  ","Last checked  ")+stamp.ToLocalTime().ToString("HH:mm:ss");}
        else if(updated.Text=="")updated.Text=T("로그 읽기 대기","Waiting to read");
        fileLabel.Text=selected=="--auto"?T("Star Citizen · 자동 탐색","Star Citizen · Auto discovery"):Path.GetFileName(Path.GetDirectoryName(selected))+"  /  Game.log";
        filePath.Text=selected=="--auto"?T("일반 설치 경로에서 LIVE 로그를 찾습니다.","Searches standard installation folders for LIVE."):selected;hints.SetToolTip(filePath,selected=="--auto"?filePath.Text:selected);
        tray.Text="STAM · "+name;disconnect.Text=manualStop?T("다시 연결","Reconnect"):T("연결 중지","Disconnect");
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
    protected override void Dispose(bool disposing){if(disposing){StopChild();retry.Dispose();tray.Dispose();hints.Dispose();}base.Dispose(disposing);}
}

internal static class HoloFonts {
    static readonly System.Drawing.Text.PrivateFontCollection fonts=new System.Drawing.Text.PrivateFontCollection();
    static readonly List<IntPtr> fontMemory=new List<IntPtr>();
    static bool loaded;
    // Keep private GDI+ fonts in memory. File-backed GDI registration can leave
    // Windows holding the installed TTF after exit and block packaging/updates.
    internal static void Load(){
        if(loaded)return;loaded=true;
        AppDomain.CurrentDomain.ProcessExit+=(s,e)=>{fonts.Dispose();foreach(var memory in fontMemory)System.Runtime.InteropServices.Marshal.FreeCoTaskMem(memory);fontMemory.Clear();};
        foreach(string name in new[]{"Barlow-Medium.ttf","SUIT-Medium.ttf"}){
            IntPtr memory=IntPtr.Zero;
            try{var bytes=File.ReadAllBytes(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"app","desktop","fonts",name));memory=System.Runtime.InteropServices.Marshal.AllocCoTaskMem(bytes.Length);System.Runtime.InteropServices.Marshal.Copy(bytes,0,memory,bytes.Length);fonts.AddMemoryFont(memory,bytes.Length);fontMemory.Add(memory);memory=IntPtr.Zero;}
            catch{}finally{if(memory!=IntPtr.Zero)System.Runtime.InteropServices.Marshal.FreeCoTaskMem(memory);}
        }
    }
    internal static Font At(float size,bool latin=false){Load();string target=latin?"Barlow":"SUIT";foreach(var family in fonts.Families)if(family.Name.StartsWith(target,StringComparison.OrdinalIgnoreCase))return Environment.OSVersion.Platform==PlatformID.Win32NT?new Font(family,size,FontStyle.Regular):new Font(family.Name,size,FontStyle.Regular);return new Font(latin?"Segoe UI":"Malgun Gothic",size,FontStyle.Regular);}
    internal static void Draw(Graphics g,string text,Font font,Color colour,RectangleF bounds,bool center=false){
        bool korean=false;foreach(char c in text)if(c>=0xAC00&&c<=0xD7AF){korean=true;break;}
        using(var actual=At(font.Size,!korean))using(var ink=new SolidBrush(colour))using(var format=new StringFormat{Trimming=StringTrimming.EllipsisCharacter,Alignment=center?StringAlignment.Center:StringAlignment.Near,LineAlignment=center?StringAlignment.Center:StringAlignment.Near}){
            g.TextRenderingHint=System.Drawing.Text.TextRenderingHint.AntiAliasGridFit;g.DrawString(text,actual,ink,bounds,format);
        }
    }
}
internal sealed class HoloLabel : Label {
    public HoloLabel(){SetStyle(ControlStyles.UserPaint|ControlStyles.SupportsTransparentBackColor|ControlStyles.OptimizedDoubleBuffer,true);BackColor=Color.Transparent;}
    protected override void OnPaint(PaintEventArgs e){HoloFonts.Draw(e.Graphics,Text,Font,ForeColor,ClientRectangle);}
}
internal sealed class DeckButton : Button {
    public bool Primary {get;set;}public bool Warm {get;set;}bool hover,pressed;
    public DeckButton(){SetStyle(ControlStyles.UserPaint|ControlStyles.AllPaintingInWmPaint|ControlStyles.OptimizedDoubleBuffer,true);FlatStyle=FlatStyle.Flat;FlatAppearance.BorderSize=0;Font=HoloFonts.At(11);Cursor=Cursors.Hand;AccessibleRole=AccessibleRole.PushButton;}
    protected override void OnMouseEnter(EventArgs e){hover=true;Invalidate();base.OnMouseEnter(e);}protected override void OnMouseLeave(EventArgs e){hover=false;pressed=false;Invalidate();base.OnMouseLeave(e);}protected override void OnMouseDown(MouseEventArgs e){pressed=true;Invalidate();base.OnMouseDown(e);}protected override void OnMouseUp(MouseEventArgs e){pressed=false;Invalidate();base.OnMouseUp(e);}
    internal static GraphicsPath Shape(Rectangle r){var shape=new GraphicsPath();int cut=Math.Min(11,r.Height/4);shape.AddPolygon(new[]{new Point(r.Left+cut,r.Top),new Point(r.Right-cut,r.Top),new Point(r.Right,r.Top+cut),new Point(r.Right,r.Bottom-cut),new Point(r.Right-cut,r.Bottom),new Point(r.Left+cut,r.Bottom),new Point(r.Left,r.Bottom-cut),new Point(r.Left,r.Top+cut)});return shape;}
    protected override void OnPaint(PaintEventArgs e){var g=e.Graphics;g.SmoothingMode=SmoothingMode.AntiAlias;g.Clear(Parent==null?Color.FromArgb(7,17,25):Parent.BackColor);if(Width<10||Height<10)return;
        var r=new Rectangle(3,2,Width-7,Height-8);Color glow=Warm?Color.FromArgb(239,201,133):Color.FromArgb(126,213,229);
        using(var shadow=Shape(new Rectangle(r.X,r.Y+4,r.Width,r.Height)))using(var fill=new SolidBrush(Color.FromArgb(2,9,15)))g.FillPath(fill,shadow);
        using(var shape=Shape(r)){
            using(var face=new LinearGradientBrush(r,pressed?Color.FromArgb(18,37,47):Color.FromArgb(hover||Primary?43:31,hover||Primary?76:58,hover||Primary?88:70),Color.FromArgb(9,24,34),90f))g.FillPath(face,shape);
            using(var halo=new Pen(Color.FromArgb(35,glow),5))g.DrawPath(halo,shape);using(var edge=new Pen(Color.FromArgb(Enabled?200:70,glow),1))g.DrawPath(edge,shape);
            using(var inner=Shape(Rectangle.Inflate(r,-3,-3)))using(var rim=new Pen(Color.FromArgb(40,220,245,250),1))g.DrawPath(rim,inner);
            using(var highlight=new Pen(Color.FromArgb(115,glow),1))g.DrawLine(highlight,r.Left+14,r.Top+2,r.Right-14,r.Top+2);
            if(Warm||Primary)using(var accent=new Pen(glow,2))g.DrawLine(accent,r.Left+18,r.Bottom-3,r.Right-18,r.Bottom-3);
            HoloFonts.Draw(g,Text.Replace(" ↗",""),Font,Enabled?(Warm?Color.FromArgb(249,226,185):Color.FromArgb(226,243,246)):Color.FromArgb(130,151,162),Rectangle.Inflate(r,-8,-3),true);
            if(Text.Contains("↗")){float x=r.Right-25,y=r.Top+r.Height/2f;using(var arrow=new Pen(glow,1.4f)){g.DrawLine(arrow,x-4,y+4,x+4,y-4);g.DrawLine(arrow,x-3,y-4,x+4,y-4);g.DrawLine(arrow,x+4,y-4,x+4,y+3);}}
            if(Focused&&ShowFocusCues)ControlPaint.DrawFocusRectangle(g,Rectangle.Inflate(r,-6,-6));
        }
    }
}
internal sealed class LinkCard : TableLayoutPanel {
    public LinkCard(){BackColor=Color.FromArgb(13,30,41);SetStyle(ControlStyles.OptimizedDoubleBuffer|ControlStyles.ResizeRedraw,true);}
    protected override void OnPaintBackground(PaintEventArgs e){if(Width<2||Height<2)return;using(var face=new LinearGradientBrush(ClientRectangle,Color.FromArgb(20,44,56),Color.FromArgb(8,24,35),100f))e.Graphics.FillRectangle(face,ClientRectangle);}
    protected override void OnPaint(PaintEventArgs e){base.OnPaint(e);var g=e.Graphics;g.SmoothingMode=SmoothingMode.AntiAlias;if(Width<8||Height<8)return;using(var shape=DeckButton.Shape(new Rectangle(2,2,Width-5,Height-5))){using(var glow=new Pen(Color.FromArgb(25,130,216,235),4))g.DrawPath(glow,shape);using(var border=new Pen(Color.FromArgb(125,139,207,220),1))g.DrawPath(border,shape);}using(var line=new Pen(Color.FromArgb(110,163,224,234)))g.DrawLine(line,20,5,Width-20,5);}
}
