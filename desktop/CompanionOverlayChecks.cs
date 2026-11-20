using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Speech.Recognition;
using System.Threading;
using System.Windows.Forms;
using System.Web.Script.Serialization;

// Explicit test mode only: isolated settings, synthetic display, no game process.
internal sealed partial class CompanionOverlay {
    [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h,int index);
    [DllImport("user32.dll")] static extern void keybd_event(byte key,byte scan,uint flags,UIntPtr extra);
    static void Pump(int milliseconds){var until=DateTime.UtcNow.AddMilliseconds(milliseconds);while(DateTime.UtcNow<until){Application.DoEvents();Thread.Sleep(15);}}
    static void Require(bool value,string reason){if(!value)throw new InvalidOperationException(reason);}
    static void PressShortcut(int key){try{keybd_event(0x11,0,0,UIntPtr.Zero);keybd_event(0x12,0,0,UIntPtr.Zero);keybd_event((byte)key,0,0,UIntPtr.Zero);}finally{keybd_event((byte)key,0,2,UIntPtr.Zero);keybd_event(0x12,0,2,UIntPtr.Zero);keybd_event(0x11,0,2,UIntPtr.Zero);}Pump(350);}
    static void CaptureEvidence(CompanionOverlay form,string file){using(var bitmap=new Bitmap(form.Width,form.Height)){form.DrawToBitmap(bitmap,new Rectangle(Point.Empty,form.Size));bitmap.Save(file,System.Drawing.Imaging.ImageFormat.Png);}}
    internal static int CheckNative(string evidence){
        string directory=Path.Combine(Path.GetTempPath(),"stam-overlay-qa-"+Guid.NewGuid());Directory.CreateDirectory(directory);
        var checks=new List<string>();var recognizers=new List<string>();var voiceChecks=new List<string>();string failure=null;
        try{
            var commands=new List<string>();
            using(var overlay=new CompanionOverlay(c=>commands.Add(c),false,directory)){
                overlay.Show();Pump(200);Require(!overlay.VoiceEnabled,"microphone-default");Require(overlay.registered.Count==4,"default-hotkeys-register");
                int style=GetWindowLong(overlay.Handle,-20);Require((style&0x20)!=0&&(style&0x8000000)!=0,"click-through-default");checks.Add("Native overlay starts click-through with microphone off and four registered shortcuts");
                PressShortcut(overlay.keyPrices);Require(commands.Count==1&&commands[0]=="show-prices","global-prices-key");PressShortcut(overlay.keyWork);Require(commands.Count==2&&commands[1]=="show-my-work","global-work-key");
                PressShortcut(overlay.keyOverlay);Require(!overlay.Visible,"global-hide-key");PressShortcut(overlay.keyOverlay);Require(overlay.Visible,"global-show-key");checks.Add("Windows global Ctrl+Alt shortcuts query prices/my work and toggle visibility");
                overlay.UpdateDisplay(new Dictionary<string,object>{{"title","STAM / 합성 교역 검증"},{"lines",new[]{"담당 화물 · 8 SCU","다음 목적지 · Orison","거래는 웹 화면에서 확인"}}});Pump(150);Require(overlay.body.Text.Contains("8 SCU"),"summary-render");CaptureEvidence(overlay,Path.Combine(Path.GetDirectoryName(evidence),"overlay-ko-windows.png"));
                overlay.ToggleInput();Pump(150);Require((GetWindowLong(overlay.Handle,-20)&0x20)==0&&overlay.registered.Count==4,"interactive-handle-keys");
                overlay.Location=new Point(-30000,-30000);overlay.Clamp();var area=Screen.FromPoint(overlay.Location).WorkingArea;Require(area.Contains(overlay.Bounds),"monitor-clamp");overlay.ToggleInput();Require((GetWindowLong(overlay.Handle,-20)&0x20)!=0,"return-click-through");checks.Add("Input/click-through switching recreates the handle without losing hotkeys; off-screen placement is clamped");
                overlay.Close();Pump(100);Require(!overlay.IsDisposed&&!overlay.Visible,"close-to-hide");overlay.Toggle();Require(overlay.Visible,"restore-after-close");
                overlay.received=DateTime.UtcNow.AddSeconds(-14);Pump(1300);Require(!overlay.body.Text.Contains("8 SCU")&&overlay.heading.Text=="STAM / FREIGHT DIVISION","private-summary-expiry");overlay.UpdateDisplay(null);checks.Add("Close hides instead of exiting; stale/disconnected private summaries are cleared");
                overlay.keyOverlay=(int)Keys.K;overlay.keyPrices=(int)Keys.J;overlay.keyWork=(int)Keys.L;overlay.Save();
            }
            using(var reopened=new CompanionOverlay(c=>commands.Add(c),true,directory)){
                Require(reopened.keyOverlay==(int)Keys.K&&reopened.keyPrices==(int)Keys.J&&reopened.keyWork==(int)Keys.L,"persist-shortcuts");Require(reopened.registered.Count==4,"reopen-releases-hotkeys");reopened.Show();reopened.UpdateDisplay(new Dictionary<string,object>{{"title","STAM / Synthetic operation"},{"lines",new[]{"My cargo: 8 SCU","Destination: Orison","Confirm transactions on the web"}}});Pump(150);CaptureEvidence(reopened,Path.Combine(Path.GetDirectoryName(evidence),"overlay-en-windows.png"));checks.Add("Restart restores configured shortcuts and releases previous registrations; Korean and English captures saved");
            }
            Require(VoiceCommand("STAM prices",.9f)=="show-prices"&&VoiceCommand("스탐 내 작업",.9f)=="show-my-work","voice-route");Require(VoiceCommand("STAM prices",.7f)==null&&VoiceCommand("confirm trade",1f)==null&&VoiceCommand("send game key",1f)==null,"voice-whitelist");
            Require(FlightCommand("적재 완료",.9f,"a","a","pickup")=="complete-flight:a"&&FlightCommand("delivery complete",.9f,"a","a","delivery")=="complete-flight:a","native-flight-complete");
            Require(FlightCommand("다음 단계",.9f,"a","b","pickup")==null&&FlightCommand("배송 완료",.9f,"a","a","pickup")==null&&FlightCommand("적재 완료",.6f,"a","a","pickup")==null,"reject-stale-mismatch-confidence");
            foreach(var engine in SpeechRecognitionEngine.InstalledRecognizers()){
                recognizers.Add(engine.Culture.Name);if(engine.Culture.TwoLetterISOLanguageName!="en"&&engine.Culture.TwoLetterISOLanguageName!="ko")continue;
                using(var speechTest=new SpeechRecognitionEngine(engine)){speechTest.LoadGrammar(CommandGrammar(engine));string phrase=engine.Culture.TwoLetterISOLanguageName=="en"?"STAM prices":"스탐 가격";var recognized=speechTest.EmulateRecognize(phrase);Require(recognized!=null&&recognized.Text==phrase,"installed-speech-grammar");voiceChecks.Add(engine.Culture.Name+": grammar emulation passed, microphone not used");}
            }
            checks.Add("Voice commands are allowlisted and low-confidence input is ignored; installed engines checked without microphone capture");
        }catch(Exception e){failure=e.GetType().Name+": "+e.Message;}
        finally{try{Directory.Delete(directory,true);}catch{}}
        File.WriteAllText(evidence,new JavaScriptSerializer().Serialize(new{passed=failure==null,checks,recognizers,voiceChecks,failure,actualWindows=Environment.OSVersion.Platform==PlatformID.Win32NT,microphoneCaptureTested=false,liveGame=false,syntheticInput=true}));return failure==null?0:1;
    }
}
