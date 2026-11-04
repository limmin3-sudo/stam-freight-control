using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;
using System.Web.Script.Serialization;
using System.Collections.Generic;

internal static class Launcher {
    [STAThread] static int Main(string[] args) {
        if (args.Length == 1 && args[0] == "--self-test") return SelfTest();
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
    readonly Label status=new Label(),path=new Label();readonly Button choose=new Button(),open=new Button(),stop=new Button(),guide=new Button();
    readonly string settings=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"STAM","log-path.txt");
    public BridgeWindow(){
        startup.Tick+=(s,e)=>{startup.Stop();status.Text="연결 준비가 지연됐습니다. 이전 실행 창을 확인한 뒤 다시 시도해 주세요.";Disconnect(false);};
        Text="STAM · 관제 연결";ClientSize=new Size(580,350);MinimumSize=new Size(540,380);StartPosition=FormStartPosition.CenterScreen;
        BackColor=Color.FromArgb(8,20,29);ForeColor=Color.FromArgb(214,235,242);Font=new Font("Malgun Gothic",10);AutoScaleMode=AutoScaleMode.Dpi;
        var layout=new TableLayoutPanel{Dock=DockStyle.Fill,Padding=new Padding(24),ColumnCount=1,RowCount=7};Controls.Add(layout);
        layout.Controls.Add(new Label{Text="STAM  /  FREIGHT CONTROL",AutoSize=true,ForeColor=Color.Turquoise,Font=new Font("Segoe UI",17,FontStyle.Bold)});
        layout.Controls.Add(new Label{Text="함장님, 로그를 연결하고 출항을 준비해 주세요.",AutoSize=true,Margin=new Padding(0,12,0,12)});
        path.Text="Star Citizen의 LIVE 폴더에서 Game.log를 선택해 주세요.";path.AutoSize=true;path.MaximumSize=new Size(500,70);layout.Controls.Add(path);
        status.Text="연결 대기 · 게임 로그 읽기 전용";status.AutoSize=true;status.Margin=new Padding(0,14,0,14);layout.Controls.Add(status);
        var buttons=new FlowLayoutPanel{AutoSize=true,Dock=DockStyle.Fill};layout.Controls.Add(buttons);
        foreach(var button in new[]{choose,open,stop,guide}){button.AutoSize=true;button.FlatStyle=FlatStyle.Flat;button.Margin=new Padding(0,0,8,8);buttons.Controls.Add(button);}
        choose.Text="Game.log 선택";open.Text="관제 열기";stop.Text="연결 종료";guide.Text="이용 안내";open.Enabled=stop.Enabled=guide.Enabled=false;
        choose.Click+=(s,e)=>SelectLog();open.Click+=(s,e)=>Open(url);guide.Click+=(s,e)=>Open(new Uri(new Uri(url),"/guide.html").ToString());stop.Click+=(s,e)=>Disconnect();
        layout.Controls.Add(new Label{Text="이 창은 최소화해 두셔도 됩니다. 창을 닫으면 로그 연결이 종료됩니다.\n게임 입력·파일 수정 없이 선택한 로그만 읽습니다.",AutoSize=true,MaximumSize=new Size(500,60),ForeColor=Color.LightSlateGray});
        FormClosing+=(s,e)=>{if(child!=null&&MessageBox.Show("로그 연결을 종료할까요? 관제 화면의 저장된 설정은 유지됩니다.","STAM",MessageBoxButtons.YesNo)!=DialogResult.Yes){e.Cancel=true;return;}Disconnect();};
    }
    void SelectLog(){using(var dialog=new OpenFileDialog{Title="Star Citizen Game.log 선택 · 읽기 전용",Filter="게임 로그 (Game.log)|Game.log|로그 파일 (*.log)|*.log",CheckFileExists=true}){
        try{if(File.Exists(settings)){string prior=File.ReadAllText(settings);if(File.Exists(prior))dialog.FileName=prior;}}catch{}
        if(dialog.ShowDialog()!=DialogResult.OK)return;
        Disconnect();path.Text=dialog.FileName;choose.Enabled=false;status.Text="관제 연결을 준비하고 있습니다…";
        try{
            child=Launcher.StartBridge(dialog.FileName,false);var active=child;startup.Start();
            child.OutputDataReceived+=(s,e)=>{if(e.Data==null)return;string line=e.Data;UI(()=>{
                if(child!=active||stopping)return;
                try{url=Launcher.ReadUrl(line);startup.Stop();status.Text="로그 연결 중 · 계약 수신 상태는 관제 화면에서 확인해 주세요.";open.Enabled=stop.Enabled=guide.Enabled=true;choose.Enabled=true;Open(url);}
                catch(Exception error){status.Text=error.Message=="port-busy"?"이전 STAM 연결을 종료한 뒤 다시 선택해 주세요.":"연결하지 못했습니다. 압축을 모두 풀었는지 확인해 주세요.";Disconnect(false);}
            });};
            child.ErrorDataReceived+=(s,e)=>{};child.EnableRaisingEvents=true;child.Exited+=(s,e)=>UI(()=>{if(child==active&&!stopping){status.Text="로그 연결이 종료됐습니다. 다시 연결할 로그를 선택해 주세요.";Disconnect(false);}});
            child.BeginOutputReadLine();child.BeginErrorReadLine();
            try{Directory.CreateDirectory(Path.GetDirectoryName(settings));File.WriteAllText(settings,dialog.FileName);}catch{}
        }catch{status.Text="실행 파일을 찾지 못했습니다. ZIP 전체를 새 폴더에 풀어 주세요.";Disconnect(false);}
    }}
    void UI(Action action){if(IsDisposed||!IsHandleCreated)return;try{BeginInvoke(action);}catch(InvalidOperationException){}}
    void Open(string address){try{Process.Start(new ProcessStartInfo(address){UseShellExecute=true});}catch{MessageBox.Show("기본 브라우저를 열지 못했습니다. Windows 기본 앱에서 브라우저를 설정해 주세요.","STAM");}}
    void Disconnect(bool update=true){startup.Stop();stopping=true;var old=child;child=null;Launcher.Stop(old);url=null;open.Enabled=stop.Enabled=guide.Enabled=false;choose.Enabled=true;if(update)status.Text="연결 종료 · 저장된 설정은 유지됩니다.";stopping=false;}
}
