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
        if (args.Length == 2 && args[0] == "--capture-ui") {
            Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
            using(var window=new BridgeWindow()) {window.Show();Application.DoEvents();using(var bitmap=new Bitmap(window.Width,window.Height)){window.DrawToBitmap(bitmap,new Rectangle(Point.Empty,window.Size));bitmap.Save(args[1],System.Drawing.Imaging.ImageFormat.Png);}window.Close();}return 0;
        }
        bool created;
        using (var mutex = new Mutex(true, "Local\\STAM-Freight-Control", out created)) {
            if (!created) { MessageBox.Show("STAM이 이미 실행 중입니다. 작업 표시줄에서 관제 연결 창을 열어 주세요.", "STAM"); return 0; }
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
            File.WriteAllText(file,"");child=StartBridge(file,true);
            var read=child.StandardOutput.ReadLineAsync();if(!read.Wait(15000))throw new Exception("startup-timeout");
            string url=ReadUrl(read.Result);var uri=new Uri(url);
            using(var client=new WebClient()) {
                client.Headers["Authorization"]="Bearer "+uri.Fragment.Substring(7);
                if(!client.DownloadString(new Uri(uri,"/api/status")).Contains("\"protocol\":1"))throw new Exception("protocol");
                if(!client.DownloadString(new Uri(uri,"/guide.html")).Contains("STAM"))throw new Exception("guide");
            }
            return 0;
        } catch { return 1; } finally { Stop(child);File.Delete(file); }
    }
}
internal sealed class BridgeWindow : Form {
    Process child;string url;bool stopping;readonly System.Windows.Forms.Timer startup=new System.Windows.Forms.Timer{Interval=15000};
    readonly Label status=new Label(),path=new Label(),stateName=new Label();
    readonly DeckButton choose=new DeckButton(),open=new DeckButton(),stop=new DeckButton(),guide=new DeckButton();
    readonly ToolTip hints=new ToolTip();readonly PictureBox logo=new PictureBox();
    readonly string settings=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"STAM","log-path.txt");
    static readonly Color Ink=Color.FromArgb(230,242,248),Muted=Color.FromArgb(169,191,205),Cyan=Color.FromArgb(98,222,228);
    public BridgeWindow(){
        Text="STAM FREIGHT CONTROL · 관제 연결";ClientSize=new Size(780,610);MinimumSize=new Size(720,650);StartPosition=FormStartPosition.CenterScreen;
        BackColor=Color.FromArgb(8,17,25);ForeColor=Ink;Font=new Font("Malgun Gothic",10);AutoScaleDimensions=new SizeF(96,96);AutoScaleMode=AutoScaleMode.Dpi;
        var layout=new TableLayoutPanel{Dock=DockStyle.Fill,Padding=new Padding(30,24,30,22),ColumnCount=1,RowCount=7};
        foreach(int height in new[]{82,62,116,108,62,52})layout.RowStyles.Add(new RowStyle(SizeType.Absolute,height));layout.RowStyles.Add(new RowStyle(SizeType.Percent,100));Controls.Add(layout);
        var heading=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=2,RowCount=1,Margin=Padding.Empty};heading.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,70));heading.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));
        logo.SizeMode=PictureBoxSizeMode.Zoom;logo.Dock=DockStyle.Fill;logo.Margin=new Padding(0,0,14,14);
        try{using(var original=Image.FromFile(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"app","assets","stam-logo.png")))logo.Image=new Bitmap(original);}catch{}
        heading.Controls.Add(logo,0,0);
        var brand=new TableLayoutPanel{Dock=DockStyle.Fill,RowCount=2,ColumnCount=1,Margin=Padding.Empty};brand.RowStyles.Add(new RowStyle(SizeType.Absolute,37));brand.RowStyles.Add(new RowStyle(SizeType.Percent,100));
        brand.Controls.Add(new Label{Text="STAM FREIGHT CONTROL",Dock=DockStyle.Fill,Font=new Font("Segoe UI",20,FontStyle.Bold),ForeColor=Ink,Margin=Padding.Empty});
        brand.Controls.Add(new Label{Text="LOCAL LINK  /  게임 로그 연결",Dock=DockStyle.Fill,Font=new Font("Malgun Gothic",9),ForeColor=Cyan,Margin=Padding.Empty});heading.Controls.Add(brand,1,0);layout.Controls.Add(heading);
        layout.Controls.Add(new Label{Text="함장님, Game.log를 연결해 주세요.\n계약 수신과 운송 준비는 관제 화면에서 이어갈게요.",Dock=DockStyle.Fill,ForeColor=Ink,Margin=new Padding(0,0,0,12)});
        var filePanel=new TableLayoutPanel{Dock=DockStyle.Fill,Padding=new Padding(17,13,17,12),BackColor=Color.FromArgb(15,32,44),ColumnCount=1,RowCount=3,Margin=new Padding(0,0,0,14)};
        filePanel.RowStyles.Add(new RowStyle(SizeType.Absolute,23));filePanel.RowStyles.Add(new RowStyle(SizeType.Absolute,27));filePanel.RowStyles.Add(new RowStyle(SizeType.Percent,100));
        filePanel.Controls.Add(new Label{Text="01 / 게임 로그",Dock=DockStyle.Fill,ForeColor=Cyan,Font=new Font("Malgun Gothic",9),Margin=Padding.Empty});
        filePanel.Controls.Add(new Label{Text="StarCitizen  ›  LIVE  ›  Game.log",Dock=DockStyle.Fill,ForeColor=Ink,Font=new Font("Segoe UI",12,FontStyle.Bold),Margin=Padding.Empty});
        path.Text="파일을 선택해 주세요. 확장자가 숨겨져 있으면 Game으로 보여요.";path.Dock=DockStyle.Fill;path.AutoEllipsis=true;path.ForeColor=Muted;path.Font=new Font("Malgun Gothic",9);path.Margin=Padding.Empty;filePanel.Controls.Add(path);layout.Controls.Add(filePanel);
        var connection=new TableLayoutPanel{Dock=DockStyle.Fill,Padding=new Padding(17,12,17,12),BackColor=Color.FromArgb(13,28,38),ColumnCount=1,RowCount=2,Margin=new Padding(0,0,0,16)};connection.RowStyles.Add(new RowStyle(SizeType.Absolute,29));connection.RowStyles.Add(new RowStyle(SizeType.Percent,100));
        stateName.Dock=DockStyle.Fill;stateName.Text="● 연결 대기";stateName.ForeColor=Color.FromArgb(240,190,116);stateName.Font=new Font("Malgun Gothic",12,FontStyle.Bold);stateName.Margin=Padding.Empty;connection.Controls.Add(stateName);
        status.Text="Game.log를 선택하면 관제 화면이 열립니다.";status.Dock=DockStyle.Fill;status.ForeColor=Muted;status.Margin=Padding.Empty;status.Font=new Font("Malgun Gothic",9);connection.Controls.Add(status);layout.Controls.Add(connection);
        var buttons=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=3,RowCount=1,Margin=Padding.Empty};buttons.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,42));buttons.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,36));buttons.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,22));layout.Controls.Add(buttons);
        choose.Text="Game.log 선택";choose.Primary=true;open.Text="관제 열기 ↗";stop.Text="연결 종료";
        foreach(var button in new[]{choose,open,stop}){button.Dock=DockStyle.Fill;button.Margin=new Padding(0,0,10,10);buttons.Controls.Add(button);}stop.Margin=new Padding(0,0,0,10);
        open.Enabled=stop.Enabled=false;guide.Text="로그 선택이 처음이라면 · 오퍼레이터 안내 ↗";guide.Dock=DockStyle.Fill;guide.Margin=new Padding(0,0,0,12);layout.Controls.Add(guide);
        layout.Controls.Add(new Label{Text="이 창은 최소화해 두세요. 닫으면 로그 연결이 종료됩니다.\n선택한 로그만 읽으며, 게임을 조작하거나 파일을 수정하지 않습니다.",Dock=DockStyle.Fill,ForeColor=Muted,Font=new Font("Malgun Gothic",9),Margin=new Padding(0,5,0,0)});
        choose.Click+=(sender,e)=>SelectLog();open.Click+=(sender,e)=>Open(url);guide.Click+=(sender,e)=>Open(url==null?"https://limmin3-sudo.github.io/stam-freight-control/guide.html#connect":new Uri(new Uri(url),"/guide.html#connect").ToString());stop.Click+=(sender,e)=>Disconnect();
        startup.Tick+=(sender,e)=>{startup.Stop();status.Text="연결 준비가 지연됐습니다. 이전 실행 창을 확인한 뒤 다시 시도해 주세요.";Disconnect(false);};
        FormClosing+=(sender,e)=>{if(child!=null&&MessageBox.Show("로그 연결을 종료할까요? 관제 화면의 저장된 설정은 유지됩니다.","STAM",MessageBoxButtons.YesNo)!=DialogResult.Yes){e.Cancel=true;return;}Disconnect();};
    }
    protected override void Dispose(bool disposing){if(disposing){startup.Dispose();hints.Dispose();if(logo.Image!=null){logo.Image.Dispose();logo.Image=null;}}base.Dispose(disposing);}
    void SelectLog(){using(var dialog=new OpenFileDialog{Title="Star Citizen Game.log 선택 · 읽기 전용",Filter="게임 로그 (Game.log)|Game.log|로그 파일 (*.log)|*.log",CheckFileExists=true}){
        try{if(File.Exists(settings)){string prior=File.ReadAllText(settings);if(File.Exists(prior))dialog.FileName=prior;}}catch{}
        if(dialog.ShowDialog()!=DialogResult.OK)return;
        Disconnect();path.Text=dialog.FileName;hints.SetToolTip(path,dialog.FileName);choose.Enabled=false;stateName.Text="● 연결 준비 중";status.Text="관제 연결을 준비하고 있습니다…";
        try{
            child=Launcher.StartBridge(dialog.FileName,false);var active=child;startup.Start();
            child.OutputDataReceived+=(s,e)=>{if(e.Data==null)return;string line=e.Data;UI(()=>{
                if(child!=active||stopping)return;
                try{url=Launcher.ReadUrl(line);startup.Stop();status.Text="로그 연결 중 · 계약 수신 상태는 관제 화면에서 확인해 주세요.";open.Enabled=stop.Enabled=true;choose.Enabled=true;stateName.Text="● 관제 연결됨";stateName.ForeColor=Color.FromArgb(130,235,190);Open(url);}
                catch(Exception error){status.Text=error.Message=="port-busy"?"이전 STAM 연결을 종료한 뒤 다시 선택해 주세요.":"연결하지 못했습니다. 압축을 모두 풀었는지 확인해 주세요.";Disconnect(false);}
            });};
            child.ErrorDataReceived+=(s,e)=>{};child.EnableRaisingEvents=true;child.Exited+=(s,e)=>UI(()=>{if(child==active&&!stopping){status.Text="로그 연결이 종료됐습니다. 다시 연결할 로그를 선택해 주세요.";Disconnect(false);}});
            child.BeginOutputReadLine();child.BeginErrorReadLine();
            try{Directory.CreateDirectory(Path.GetDirectoryName(settings));File.WriteAllText(settings,dialog.FileName);}catch{}
        }catch{status.Text="실행 파일을 찾지 못했습니다. ZIP 전체를 새 폴더에 풀어 주세요.";Disconnect(false);}
    }}
    void UI(Action action){if(IsDisposed||!IsHandleCreated)return;try{BeginInvoke(action);}catch(InvalidOperationException){}}
    void Open(string address){try{Process.Start(new ProcessStartInfo(address){UseShellExecute=true});}catch{MessageBox.Show("기본 브라우저를 열지 못했습니다. Windows 기본 앱에서 브라우저를 설정해 주세요.","STAM");}}
    void Disconnect(bool update=true){startup.Stop();stopping=true;var old=child;child=null;Launcher.Stop(old);url=null;open.Enabled=stop.Enabled=false;choose.Enabled=true;stateName.Text=update?"● 연결 대기":"● 연결 확인 필요";stateName.ForeColor=Color.FromArgb(240,190,116);if(update)status.Text="연결 종료 · 저장된 설정은 유지됩니다.";stopping=false;}
}

// Owner-drawn buttons keep readable text in every state; Windows' disabled
// FlatStyle text renderer otherwise falls back to low-contrast system colours.
internal sealed class DeckButton : Button {
    public bool Primary {get;set;}
    public DeckButton(){SetStyle(ControlStyles.UserPaint|ControlStyles.AllPaintingInWmPaint|ControlStyles.OptimizedDoubleBuffer,true);FlatStyle=FlatStyle.Flat;FlatAppearance.BorderSize=0;Font=new Font("Malgun Gothic",10,FontStyle.Bold);Cursor=Cursors.Hand;AccessibleRole=AccessibleRole.PushButton;}
    protected override void OnEnabledChanged(EventArgs e){base.OnEnabledChanged(e);Cursor=Enabled?Cursors.Hand:Cursors.Default;Invalidate();}
    protected override void OnPaint(PaintEventArgs e){
        var g=e.Graphics;g.SmoothingMode=SmoothingMode.AntiAlias;g.Clear(Parent==null?Color.FromArgb(8,17,25):Parent.BackColor);
        var rect=new Rectangle(1,1,Math.Max(1,Width-3),Math.Max(1,Height-3));int radius=7;
        using(var shape=new GraphicsPath()){
            shape.AddArc(rect.X,rect.Y,radius*2,radius*2,180,90);shape.AddArc(rect.Right-radius*2,rect.Y,radius*2,radius*2,270,90);shape.AddArc(rect.Right-radius*2,rect.Bottom-radius*2,radius*2,radius*2,0,90);shape.AddArc(rect.X,rect.Bottom-radius*2,radius*2,radius*2,90,90);shape.CloseFigure();
            Color fill=!Enabled?Color.FromArgb(24,37,48):Primary?Color.FromArgb(86,212,222):Color.FromArgb(22,47,62);
            Color ink=!Enabled?Color.FromArgb(162,183,198):Primary?Color.FromArgb(6,37,48):Color.FromArgb(231,245,250);
            using(var brush=new SolidBrush(fill))g.FillPath(brush,shape);using(var pen=new Pen(Enabled?Color.FromArgb(95,156,171):Color.FromArgb(61,82,97),1))g.DrawPath(pen,shape);
            TextRenderer.DrawText(g,Text,Font,rect,ink,TextFormatFlags.HorizontalCenter|TextFormatFlags.VerticalCenter|TextFormatFlags.SingleLine|TextFormatFlags.EndEllipsis);
            if(Focused&&ShowFocusCues)ControlPaint.DrawFocusRectangle(g,Rectangle.Inflate(rect,-5,-5),ink,fill);
        }
    }
}
