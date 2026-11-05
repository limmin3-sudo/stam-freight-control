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
    [STAThread] static int Main(string[] args) {
        if (args.Length == 1 && args[0] == "--self-test") return SelfTest();
        if (args.Length == 1 && args[0] == "--self-test-language") {Application.EnableVisualStyles();using(var window=new BridgeWindow(false))return window.CheckLanguages()?0:1;}
        if (args.Length == 2 && (args[0] == "--capture-ui" || args[0] == "--capture-ui-en")) {
            Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
            using(var window=new BridgeWindow(args[0]=="--capture-ui-en")) {window.Show();Application.DoEvents();using(var bitmap=new Bitmap(window.Width,window.Height)){window.DrawToBitmap(bitmap,new Rectangle(Point.Empty,window.Size));bitmap.Save(args[1],System.Drawing.Imaging.ImageFormat.Png);}window.Close();}return 0;
        }
        bool created;
        using (var mutex = new Mutex(true, "Local\\STAM-Freight-Control", out created)) {
            if (!created) { MessageBox.Show(BridgeWindow.ReadEnglish()?"STAM is already running. Open its connection window from the taskbar.":"STAM이 이미 실행 중입니다. 작업 표시줄에서 관제 연결 창을 열어 주세요.", "STAM"); return 0; }
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new BridgeWindow());
        }
        return 0;
    }
    internal static Process StartBridge(string file, bool test) {
        string root = AppDomain.CurrentDomain.BaseDirectory;
        var info = new ProcessStartInfo(Path.Combine(root,"runtime","node.exe"), "\""+Path.Combine(root,"app","desktop","bridge.mjs")+"\" \""+file+"\""+(test?" --self-test":""));
        info.WorkingDirectory = Path.Combine(root,"app"); info.UseShellExecute=false; info.CreateNoWindow=true;
        info.RedirectStandardOutput=true; info.RedirectStandardError=true; info.RedirectStandardInput=true;
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
            string url=ReadUrl(read.Result);var uri=new Uri(url);var website=new Uri(BridgeWindow.SiteAddress(url,false));if(website.Scheme!="https"||website.Host!="limmin3-sudo.github.io"||website.AbsolutePath!="/stam-freight-control/"||website.Fragment!=uri.Fragment)throw new Exception("public-website-address");if(new Uri(BridgeWindow.SiteAddress(null,true)).Fragment!="")throw new Exception("unpaired-website-address");
            using(var client=new WebClient()) {
                client.Headers["Authorization"]="Bearer "+uri.Fragment.Substring(7);
                if(!client.DownloadString(new Uri(uri,"/api/status")).Contains("\"protocol\":1"))throw new Exception("protocol");
                try{client.DownloadString(new Uri(uri,"/index.html"));throw new Exception("unexpected-local-ui");}catch(WebException error){if(((HttpWebResponse)error.Response).StatusCode!=HttpStatusCode.NotFound)throw;}
                bool received=false;
                for(int i=0;i<50;i++){if(client.DownloadString(new Uri(uri,"/api/snapshot")).Contains(mission)){received=true;break;}Thread.Sleep(100);}
                if(!received||File.ReadAllText(file)!=fixture)throw new Exception("contract-read-only");
            }
            return 0;
        } catch { return 1; } finally { Stop(child);File.Delete(file); }
    }
}
internal sealed class BridgeWindow : Form {
    [System.Runtime.InteropServices.DllImport("user32.dll")] static extern bool DestroyIcon(IntPtr handle);
    Process child;string url;bool stopping;readonly System.Windows.Forms.Timer startup=new System.Windows.Forms.Timer{Interval=15000};
    readonly Label status=new Label(),path=new Label(),stateName=new Label();
    readonly DeckButton choose=new DeckButton(),open=new DeckButton(),stop=new DeckButton(),guide=new DeckButton();
    readonly ToolTip hints=new ToolTip();readonly PictureBox logo=new PictureBox();
    readonly string settings=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"STAM","log-path.txt");
    static readonly Color Ink=Color.FromArgb(230,242,248),Muted=Color.FromArgb(169,191,205),Cyan=Color.FromArgb(98,222,228);

    static readonly string languageFile=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"STAM","ui-language.txt");
    static readonly Dictionary<string,string> English=new Dictionary<string,string>{
        {"StarCitizen 폴더의 LIVE 안에서 Game.log를 선택해 주세요. 파일 확장명을 숨겼다면 Game으로 표시됩니다.","Choose Game.log inside StarCitizen / LIVE. Windows may display it as Game when file extensions are hidden."},
        {"STAM FREIGHT CONTROL · 관제 연결","STAM FREIGHT CONTROL · Companion"},
        {"LOCAL LINK  /  게임 로그 연결","LOCAL LINK  /  GAME LOG CONNECTION"},
        {"함장님, Game.log를 연결해 주세요.\nSTAM 사이트에서 로그인하고 받은 계약을 확인하세요.","Ready when you are, Captain. Connect Game.log.\nSign in and review received contracts on the STAM website."},
        {"01 / 게임 로그","01 / GAME LOG"},
        {"파일을 선택해 주세요. 확장자가 숨겨져 있으면 Game으로 보여요.","Choose the log file. Windows may display it as Game when extensions are hidden."},
        {"● 연결 대기","● STANDING BY"},
        {"Game.log를 선택한 뒤 STAM 사이트 열기를 눌러 주세요.","Select Game.log, then click Open STAM website."},
        {"Game.log 선택","Select Game.log"},
        {"STAM 사이트 열기 ↗","Open STAM website ↗"},
        {"연결 종료","Disconnect"},
        {"Game.log 위치 안내","Where to find Game.log"},
        {"이 창은 최소화해 두세요. 닫으면 로그 연결이 종료됩니다.\n선택한 로그만 읽으며, 게임을 조작하거나 파일을 수정하지 않습니다.","Keep this window open or minimised. Closing it ends the connection.\nRead-only log access. No game input or file modification."},
        {"연결 준비가 지연됐습니다. 이전 실행 창을 확인한 뒤 다시 시도해 주세요.","Connection is taking longer than expected. Check for an earlier STAM window and try again."},
        {"로그 연결을 종료할까요? 관제 화면의 저장된 설정은 유지됩니다.","Disconnect the game log? Your saved flight settings will remain."},
        {"Star Citizen Game.log 선택 · 읽기 전용","Select Star Citizen Game.log · Read only"},
        {"게임 로그 (Game.log)|Game.log|로그 파일 (*.log)|*.log","Game log (Game.log)|Game.log|Log files (*.log)|*.log"},
        {"● 연결 준비 중","● ESTABLISHING LINK"},
        {"관제 연결을 준비하고 있습니다…","Preparing your flight deck…"},
        {"로그가 연결됐습니다. STAM 사이트 열기를 눌러 주세요.","Log connected. Click Open STAM website to receive contracts."},
        {"● 관제 연결됨","● LINK ESTABLISHED"},
        {"이전 STAM 연결을 종료한 뒤 다시 선택해 주세요.","Close the previous STAM connection, then select the log again."},
        {"연결하지 못했습니다. 압축을 모두 풀었는지 확인해 주세요.","Could not connect. Check that the entire ZIP was extracted."},
        {"로그 연결이 종료됐습니다. 다시 연결할 로그를 선택해 주세요.","The log connection ended. Select a log to reconnect."},
        {"실행 파일을 찾지 못했습니다. ZIP 전체를 새 폴더에 풀어 주세요.","Required files were not found. Extract the entire ZIP to a new folder."},
        {"기본 브라우저를 열지 못했습니다. Windows 기본 앱에서 브라우저를 설정해 주세요.","Could not open your browser. Set a default browser in Windows Settings."},
        {"● 연결 확인 필요","● CHECK CONNECTION"},
        {"연결 종료 · 저장된 설정은 유지됩니다.","Disconnected. Your saved flight settings are intact."}
    };
    bool english;
    readonly DeckButton korean=new DeckButton(),englishButton=new DeckButton();
    internal static bool ReadEnglish(){try{return File.ReadAllText(languageFile).Trim()=="en";}catch{return false;}}
    string T(string text){string value;return english&&English.TryGetValue(text,out value)?value:text;}
    void TranslateTree(Control control){string source=control.Text;foreach(var item in English)if(source==item.Value){source=item.Key;break;}control.Text=T(source);foreach(Control childControl in control.Controls)TranslateTree(childControl);}
    void SetLanguage(bool value,bool persist=true){english=value;TranslateTree(this);korean.Primary=!english;englishButton.Primary=english;korean.Invalidate();englishButton.Invalidate();
        if(persist)try{Directory.CreateDirectory(Path.GetDirectoryName(languageFile));File.WriteAllText(languageFile,english?"en":"ko");}catch{}
    }

    internal bool CheckLanguages(){
        SetLanguage(true,false);bool valid=choose.Text=="Select Game.log"&&open.Text=="Open STAM website ↗"&&stateName.Text=="● STANDING BY"&&open.Enabled;
        SetLanguage(false,false);return valid&&choose.Text=="Game.log 선택"&&stateName.Text=="● 연결 대기"&&open.Enabled;
    }
    public BridgeWindow(bool? languageOverride=null){
        english=languageOverride??ReadEnglish();
        Text=T("STAM FREIGHT CONTROL · 관제 연결");ClientSize=new Size(1080,760);MinimumSize=new Size(960,720);StartPosition=FormStartPosition.CenterScreen;
        BackColor=Color.FromArgb(8,17,27);ForeColor=Ink;Font=new Font("Malgun Gothic",10);AutoScaleDimensions=new SizeF(96,96);AutoScaleMode=AutoScaleMode.Dpi;
        var layout=new TableLayoutPanel{Dock=DockStyle.Fill,Padding=new Padding(38,30,38,24),ColumnCount=1,RowCount=7,AutoScroll=true};
        foreach(int height in new[]{122,64,138,122,80,54})layout.RowStyles.Add(new RowStyle(SizeType.Absolute,height));layout.RowStyles.Add(new RowStyle(SizeType.Percent,100));Controls.Add(layout);
        var heading=new MastheadPanel{Dock=DockStyle.Fill,ColumnCount=3,RowCount=1,Margin=Padding.Empty};heading.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,108));heading.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));heading.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,154));
        logo.SizeMode=PictureBoxSizeMode.Zoom;logo.Dock=DockStyle.Fill;logo.Margin=new Padding(0,0,20,26);
        try{using(var original=Image.FromFile(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"app","assets","stam-logo-transparent.png")))logo.Image=new Bitmap(original);
            using(var iconBitmap=new Bitmap(logo.Image,32,32)){IntPtr handle=iconBitmap.GetHicon();try{using(var sourceIcon=System.Drawing.Icon.FromHandle(handle))Icon=(System.Drawing.Icon)sourceIcon.Clone();}finally{DestroyIcon(handle);}}
        }catch{}
        heading.Controls.Add(logo,0,0);
        var brand=new TableLayoutPanel{Dock=DockStyle.Fill,RowCount=2,ColumnCount=1,Margin=Padding.Empty};brand.RowStyles.Add(new RowStyle(SizeType.Absolute,48));brand.RowStyles.Add(new RowStyle(SizeType.Percent,100));
        brand.Controls.Add(new Label{Text="STAM FREIGHT CONTROL",Dock=DockStyle.Fill,Font=new Font("Segoe UI Semibold",25,FontStyle.Bold),ForeColor=Ink,Margin=Padding.Empty});
        brand.Controls.Add(new Label{Text=T("LOCAL LINK  /  게임 로그 연결"),Dock=DockStyle.Fill,Font=new Font("Malgun Gothic",9),ForeColor=Cyan,Margin=Padding.Empty});heading.Controls.Add(brand,1,0);
        var languageRow=new FlowLayoutPanel{Dock=DockStyle.Fill,Margin=new Padding(0,4,0,0),FlowDirection=FlowDirection.LeftToRight};
        korean.Text="한국어";englishButton.Text="English";korean.Primary=!english;englishButton.Primary=english;
        foreach(var b in new[]{korean,englishButton}){b.Size=new Size(71,38);b.Font=new Font("Segoe UI",9,FontStyle.Bold);b.Margin=new Padding(0,0,5,0);languageRow.Controls.Add(b);}
        korean.Click+=(sender,e)=>SetLanguage(false);englishButton.Click+=(sender,e)=>SetLanguage(true);heading.Controls.Add(languageRow,2,0);layout.Controls.Add(heading);
        layout.Controls.Add(new Label{Text=T("함장님, Game.log를 연결해 주세요.\nSTAM 사이트에서 로그인하고 받은 계약을 확인하세요."),Dock=DockStyle.Fill,ForeColor=Ink,Margin=new Padding(0,0,0,12)});
        var filePanel=new LinkCard{Dock=DockStyle.Fill,Padding=new Padding(24,20,24,18),BackColor=Color.FromArgb(18,40,55),ColumnCount=1,RowCount=3,Margin=new Padding(0,0,0,14)};
        filePanel.RowStyles.Add(new RowStyle(SizeType.Absolute,23));filePanel.RowStyles.Add(new RowStyle(SizeType.Absolute,27));filePanel.RowStyles.Add(new RowStyle(SizeType.Percent,100));
        filePanel.Controls.Add(new Label{Text=T("01 / 게임 로그"),Dock=DockStyle.Fill,ForeColor=Cyan,Font=new Font("Malgun Gothic",9),Margin=Padding.Empty});
        filePanel.Controls.Add(new Label{Text="StarCitizen  ›  LIVE  ›  Game.log",Dock=DockStyle.Fill,ForeColor=Ink,Font=new Font("Segoe UI",15,FontStyle.Bold),Margin=Padding.Empty});
        path.Text=T("파일을 선택해 주세요. 확장자가 숨겨져 있으면 Game으로 보여요.");path.Dock=DockStyle.Fill;path.AutoEllipsis=true;path.ForeColor=Muted;path.Font=new Font("Malgun Gothic",9);path.Margin=Padding.Empty;filePanel.Controls.Add(path);layout.Controls.Add(filePanel);
        var connection=new LinkCard{Stripe=Color.FromArgb(222,187,132),Dock=DockStyle.Fill,Padding=new Padding(24,18,24,18),BackColor=Color.FromArgb(14,31,45),ColumnCount=1,RowCount=2,Margin=new Padding(0,0,0,16)};connection.RowStyles.Add(new RowStyle(SizeType.Absolute,29));connection.RowStyles.Add(new RowStyle(SizeType.Percent,100));
        stateName.Dock=DockStyle.Fill;stateName.Text=T("● 연결 대기");stateName.ForeColor=Color.FromArgb(240,190,116);stateName.Font=new Font("Malgun Gothic",15,FontStyle.Bold);stateName.Margin=Padding.Empty;connection.Controls.Add(stateName);
        status.Text=T("Game.log를 선택한 뒤 STAM 사이트 열기를 눌러 주세요.");status.Dock=DockStyle.Fill;status.ForeColor=Muted;status.Margin=Padding.Empty;status.Font=new Font("Malgun Gothic",9);connection.Controls.Add(status);layout.Controls.Add(connection);
        var buttons=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=3,RowCount=1,Margin=Padding.Empty};buttons.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,39));buttons.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,43));buttons.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,18));layout.Controls.Add(buttons);
        choose.Text=T("Game.log 선택");choose.Primary=true;choose.Step="01";open.Warm=true;open.Step="02";open.Text=T("STAM 사이트 열기 ↗");stop.Text=T("연결 종료");
        foreach(var button in new[]{choose,open,stop}){button.Dock=DockStyle.Fill;button.Margin=new Padding(0,0,10,10);buttons.Controls.Add(button);}stop.Margin=new Padding(0,0,0,10);
        open.Enabled=true;stop.Enabled=false;guide.Text=T("Game.log 위치 안내");guide.Dock=DockStyle.Fill;guide.Margin=new Padding(0,0,0,12);layout.Controls.Add(guide);
        layout.Controls.Add(new Label{Text=T("이 창은 최소화해 두세요. 닫으면 로그 연결이 종료됩니다.\n선택한 로그만 읽으며, 게임을 조작하거나 파일을 수정하지 않습니다."),Dock=DockStyle.Fill,ForeColor=Muted,Font=new Font("Malgun Gothic",9),Margin=new Padding(0,5,0,0)});
        var edition=new Label{Text="STAM  /  COMPANION 1.3.0",ForeColor=Color.FromArgb(137,165,183),Font=new Font("Segoe UI",8,FontStyle.Bold),AutoSize=true,Anchor=AnchorStyles.Bottom|AnchorStyles.Right,Location=new Point(ClientSize.Width-225,ClientSize.Height-30),BackColor=Color.Transparent};Controls.Add(edition);edition.BringToFront();
        choose.Click+=(sender,e)=>SelectLog();open.Click+=(sender,e)=>Open(url);guide.Click+=(sender,e)=>MessageBox.Show(T("StarCitizen 폴더의 LIVE 안에서 Game.log를 선택해 주세요. 파일 확장명을 숨겼다면 Game으로 표시됩니다."),"STAM");stop.Click+=(sender,e)=>Disconnect();
        startup.Tick+=(sender,e)=>{startup.Stop();status.Text=T("연결 준비가 지연됐습니다. 이전 실행 창을 확인한 뒤 다시 시도해 주세요.");Disconnect(false);};
        FormClosing+=(sender,e)=>{if(child!=null&&MessageBox.Show(T("로그 연결을 종료할까요? 관제 화면의 저장된 설정은 유지됩니다."),"STAM",MessageBoxButtons.YesNo)!=DialogResult.Yes){e.Cancel=true;return;}Disconnect();};
    }
    [System.Runtime.InteropServices.DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr window,int attribute,ref int value,int size);
    protected override void OnHandleCreated(EventArgs e){base.OnHandleCreated(e);try{int dark=1;DwmSetWindowAttribute(Handle,20,ref dark,4);int caption=ColorTranslator.ToWin32(Color.FromArgb(16,35,49));DwmSetWindowAttribute(Handle,35,ref caption,4);int ink=ColorTranslator.ToWin32(Color.FromArgb(225,240,246));DwmSetWindowAttribute(Handle,36,ref ink,4);}catch{}}
    protected override void Dispose(bool disposing){if(disposing){startup.Dispose();hints.Dispose();if(logo.Image!=null){logo.Image.Dispose();logo.Image=null;}if(Icon!=null){Icon.Dispose();Icon=null;}}base.Dispose(disposing);}
    void SelectLog(){using(var dialog=new OpenFileDialog{Title=T("Star Citizen Game.log 선택 · 읽기 전용"),Filter=T("게임 로그 (Game.log)|Game.log|로그 파일 (*.log)|*.log"),CheckFileExists=true}){
        try{if(File.Exists(settings)){string prior=File.ReadAllText(settings);if(File.Exists(prior))dialog.FileName=prior;}}catch{}
        if(dialog.ShowDialog()!=DialogResult.OK)return;
        Disconnect();path.Text=dialog.FileName;hints.SetToolTip(path,dialog.FileName);choose.Enabled=false;stateName.Text=T("● 연결 준비 중");status.Text=T("관제 연결을 준비하고 있습니다…");
        try{
            child=Launcher.StartBridge(dialog.FileName,false);var active=child;startup.Start();
            child.OutputDataReceived+=(s,e)=>{if(e.Data==null)return;string line=e.Data;UI(()=>{
                if(child!=active||stopping)return;
                try{url=Launcher.ReadUrl(line);startup.Stop();status.Text=T("로그가 연결됐습니다. STAM 사이트 열기를 눌러 주세요.");open.Enabled=stop.Enabled=true;choose.Enabled=true;stateName.Text=T("● 관제 연결됨");stateName.ForeColor=Color.FromArgb(130,235,190);}
                catch(Exception error){status.Text=error.Message=="port-busy"?T("이전 STAM 연결을 종료한 뒤 다시 선택해 주세요."):T("연결하지 못했습니다. 압축을 모두 풀었는지 확인해 주세요.");Disconnect(false);}
            });};
            child.ErrorDataReceived+=(s,e)=>{};child.EnableRaisingEvents=true;child.Exited+=(s,e)=>UI(()=>{if(child==active&&!stopping){status.Text=T("로그 연결이 종료됐습니다. 다시 연결할 로그를 선택해 주세요.");Disconnect(false);}});
            child.BeginOutputReadLine();child.BeginErrorReadLine();
            try{Directory.CreateDirectory(Path.GetDirectoryName(settings));File.WriteAllText(settings,dialog.FileName);}catch{}
        }catch{status.Text=T("실행 파일을 찾지 못했습니다. ZIP 전체를 새 폴더에 풀어 주세요.");Disconnect(false);}
    }}
    void UI(Action action){if(IsDisposed||!IsHandleCreated)return;try{BeginInvoke(action);}catch(InvalidOperationException){}}
    internal static string SiteAddress(string address,bool english){var destination=new UriBuilder("https://limmin3-sudo.github.io/stam-freight-control/");if(!String.IsNullOrEmpty(address))destination.Fragment=new Uri(address).Fragment.TrimStart('#');destination.Query="lang="+(english?"en":"ko");return destination.Uri.ToString();}
    void Open(string address){try{Process.Start(new ProcessStartInfo(SiteAddress(address,english)){UseShellExecute=true});}catch{MessageBox.Show(T("기본 브라우저를 열지 못했습니다. Windows 기본 앱에서 브라우저를 설정해 주세요."),"STAM");}}
    void Disconnect(bool update=true){startup.Stop();stopping=true;var old=child;child=null;Launcher.Stop(old);url=null;open.Enabled=true;stop.Enabled=false;choose.Enabled=true;stateName.Text=update?T("● 연결 대기"):T("● 연결 확인 필요");stateName.ForeColor=Color.FromArgb(240,190,116);if(update)status.Text=T("연결 종료 · 저장된 설정은 유지됩니다.");stopping=false;}
}

// Owner-drawn buttons keep readable text in every state; Windows' disabled
// FlatStyle text renderer otherwise falls back to low-contrast system colours.
internal sealed class DeckButton : Button {
    public bool Primary {get;set;}
    public bool Warm {get;set;}
    public string Step {get;set;}
    public DeckButton(){SetStyle(ControlStyles.UserPaint|ControlStyles.AllPaintingInWmPaint|ControlStyles.OptimizedDoubleBuffer,true);FlatStyle=FlatStyle.Flat;FlatAppearance.BorderSize=0;Font=new Font("Malgun Gothic",10,FontStyle.Bold);Cursor=Cursors.Hand;AccessibleRole=AccessibleRole.PushButton;}
    protected override void OnEnabledChanged(EventArgs e){base.OnEnabledChanged(e);Cursor=Enabled?Cursors.Hand:Cursors.Default;Invalidate();}
    protected override void OnPaint(PaintEventArgs e){
        var g=e.Graphics;g.SmoothingMode=SmoothingMode.AntiAlias;g.Clear(Parent==null?Color.FromArgb(8,17,25):Parent.BackColor);
        var rect=new Rectangle(1,1,Math.Max(1,Width-3),Math.Max(1,Height-3));int radius=7;
        using(var shape=new GraphicsPath()){
            shape.AddArc(rect.X,rect.Y,radius*2,radius*2,180,90);shape.AddArc(rect.Right-radius*2,rect.Y,radius*2,radius*2,270,90);shape.AddArc(rect.Right-radius*2,rect.Bottom-radius*2,radius*2,radius*2,0,90);shape.AddArc(rect.X,rect.Bottom-radius*2,radius*2,radius*2,90,90);shape.CloseFigure();
            Color fill=!Enabled?Color.FromArgb(24,37,48):Warm?Color.FromArgb(225,193,145):Primary?Color.FromArgb(93,214,215):Color.FromArgb(20,43,59);
            Color ink=!Enabled?Color.FromArgb(162,183,198):(Primary||Warm)?Color.FromArgb(9,34,45):Color.FromArgb(218,235,245);
            using(var brush=new LinearGradientBrush(rect,fill,Enabled&&Warm?Color.FromArgb(196,157,103):Enabled&&Primary?Color.FromArgb(45,161,181):Color.FromArgb(13,29,43),40f))g.FillPath(brush,shape);using(var pen=new Pen(Enabled?(Warm?Color.FromArgb(246,218,174):Color.FromArgb(105,174,188)):Color.FromArgb(61,82,97),1))g.DrawPath(pen,shape);
            using(var line=new Pen(Color.FromArgb(Enabled?50:15,255,255,255)))g.DrawLine(line,9,3,Width-9,3);
            var textRect=rect;
            if(!String.IsNullOrEmpty(Step)){var badge=new Rectangle(13,(Height-24)/2,28,24);using(var pen=new Pen(Color.FromArgb(70,ink)))g.DrawRectangle(pen,badge);using(var badgeFont=new Font("Segoe UI",8,FontStyle.Bold))TextRenderer.DrawText(g,Step,badgeFont,badge,ink,TextFormatFlags.HorizontalCenter|TextFormatFlags.VerticalCenter);textRect=new Rectangle(46,rect.Y,rect.Width-53,rect.Height);}
            TextRenderer.DrawText(g,Text,Font,textRect,ink,TextFormatFlags.HorizontalCenter|TextFormatFlags.VerticalCenter|TextFormatFlags.SingleLine|TextFormatFlags.EndEllipsis);
            if(Focused&&ShowFocusCues)ControlPaint.DrawFocusRectangle(g,Rectangle.Inflate(rect,-5,-5),ink,fill);
        }
    }
}

// Native panels retain Windows accessibility and DPI layout, with a restrained flight-deck frame.
internal sealed class LinkCard : TableLayoutPanel {
    public Color Stripe {get;set;}
    public LinkCard(){Stripe=Color.FromArgb(112,211,214);SetStyle(ControlStyles.OptimizedDoubleBuffer|ControlStyles.ResizeRedraw,true);}
    protected override void OnPaintBackground(PaintEventArgs e){using(var brush=new LinearGradientBrush(ClientRectangle,BackColor,Color.FromArgb(11,27,40),18f))e.Graphics.FillRectangle(brush,ClientRectangle);}
    protected override void OnPaint(PaintEventArgs e){base.OnPaint(e);using(var pen=new Pen(Color.FromArgb(55,87,107)))e.Graphics.DrawRectangle(pen,0,0,Width-1,Height-1);using(var bar=new SolidBrush(Stripe))e.Graphics.FillRectangle(bar,0,20,3,Height-40);using(var pen=new Pen(Color.FromArgb(80,Stripe))){e.Graphics.DrawLine(pen,20,0,115,0);e.Graphics.DrawLine(pen,Width-45,Height-1,Width-1,Height-1);}}
}

internal sealed class MastheadPanel : TableLayoutPanel {
    protected override void OnPaint(PaintEventArgs e){base.OnPaint(e);using(var line=new Pen(Color.FromArgb(51,79,97)))e.Graphics.DrawLine(line,0,Height-9,Width,Height-9);using(var accent=new Pen(Color.FromArgb(220,185,130),2))e.Graphics.DrawLine(accent,0,Height-9,70,Height-9);using(var accent=new Pen(Color.FromArgb(106,204,207),2))e.Graphics.DrawLine(accent,76,Height-9,245,Height-9);}
}
