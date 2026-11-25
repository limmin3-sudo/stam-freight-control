using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using System.Runtime.InteropServices;
using System.Speech.Recognition;
using System.Threading;
using System.Windows.Forms;
using System.Web.Script.Serialization;

// Explicit test mode only: isolated settings, synthetic display, no game process.
internal sealed partial class CompanionOverlay {
    [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h,int index);
    [DllImport("user32.dll")] static extern void keybd_event(byte key,byte scan,uint flags,UIntPtr extra);
    [DllImport("user32.dll")] static extern void mouse_event(uint flags,uint dx,uint dy,uint data,UIntPtr extra);
    static void Pump(int milliseconds){var until=DateTime.UtcNow.AddMilliseconds(milliseconds);while(DateTime.UtcNow<until){Application.DoEvents();Thread.Sleep(15);}}
    static void Require(bool value,string reason){if(!value)throw new InvalidOperationException(reason);}
    static void PressShortcut(int key){try{keybd_event(0x11,0,0,UIntPtr.Zero);keybd_event(0x12,0,0,UIntPtr.Zero);keybd_event((byte)key,0,0,UIntPtr.Zero);}finally{keybd_event((byte)key,0,2,UIntPtr.Zero);keybd_event(0x12,0,2,UIntPtr.Zero);keybd_event(0x11,0,2,UIntPtr.Zero);}Pump(350);}
    static void CaptureEvidence(CompanionOverlay form,string file){using(var bitmap=new Bitmap(form.Width,form.Height)){form.DrawToBitmap(bitmap,new Rectangle(Point.Empty,form.Size));bitmap.Save(file,System.Drawing.Imaging.ImageFormat.Png);}}
    sealed class EmptyHoldCapture : IHoldCapture {
        internal int finished;internal bool disposed;
        public void Drain(){}
        public MemoryStream Finish(){finished++;Dispose();return new MemoryStream();}
        public void Dispose(){disposed=true;}
    }
    sealed class TestLocalVoice : HttpMessageHandler {
        internal byte[] wave;
        internal string payload;
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage message,CancellationToken token){
            payload=await message.Content.ReadAsStringAsync();
            return new HttpResponseMessage(System.Net.HttpStatusCode.OK){Content=new ByteArrayContent(wave)};
        }
    }
    internal static int CheckNative(string evidence){
        string directory=Path.Combine(Path.GetTempPath(),"stam-overlay-qa-"+Guid.NewGuid());Directory.CreateDirectory(directory);
        var checks=new List<string>();var recognizers=new List<string>();var voiceChecks=new List<string>();string failure=null;
        try{
            var commands=new List<string>();Size savedSize=Size.Empty;
            int starts=0;EmptyHoldCapture recorder=null;
            using(var overlay=new CompanionOverlay(c=>commands.Add(c),false,directory,()=>{starts++;return recorder=new EmptyHoldCapture();})){
                Require(overlay.Narrator=="partner","spoken-replies-default");
                overlay.SetNarrator("off");
                string fixtures=Environment.GetEnvironmentVariable("STAM_VOICE_QA_FIXTURES");
                if(!String.IsNullOrEmpty(fixtures)){
                    foreach(var file in new[]{"operator.pcm","navigator.pcm"}){
                        var voice=KoreanRecognition.FromRecording(File.ReadAllBytes(Path.Combine(fixtures,file)),CancellationToken.None);
                        Require(voice.text=="항해사"&&voice.Confidence>=.62f,"wake-recording-"+file);
                        overlay.DispatchSpeech(voice.text,voice.Confidence,null,null,true,false);
                        Require(overlay.NavigationText=="말씀해 주십시오."&&commands.Count==0,"offline-recorded-wake");
                    }
                    // 16 kHz mono: a clip of the packaged navigator saying "적재 완료",
                    // followed by independent synthesized affirmative and quantity-question samples.
                    var receipt=KoreanRecognition.FromRecording(File.ReadAllBytes(Path.Combine(fixtures,"receipt-ruin-edit.pcm")),CancellationToken.None,null,false,
                        new[]{"2|루인|티타늄","2|루인|수소","2|차울라|티타늄"});
                    Require(receipt.PartialReceiptPlace=="루인"||receipt.ReceiptPairHint=="루인|티타늄","held-game-place-acoustic-hint");
                    foreach(var sample in new[]{"fourteen","four"}){
                        var spoken=KoreanRecognition.FromRecording(File.ReadAllBytes(Path.Combine(fixtures,"quantity-"+sample+".pcm")),CancellationToken.None,null,false,null,true);
                        int expected=sample=="fourteen"?14:4;
                        Require(spoken.SuggestedQuantity==expected||spoken.Confidence>=.85f&&KoreanRecognition.RecognizedQuantity(spoken.text)==expected,"spoken-quantity-"+sample);
                    }
                    var stopReply=KoreanRecognition.FromRecording(File.ReadAllBytes(Path.Combine(fixtures,"receipt-stop-ruin.pcm")),CancellationToken.None,null,false,null,false,false,new[]{"루인","차울라"});
                    Require(stopReply.PlaceOption==1,"held-stop-reply-limited-to-current-menu");
                    var pickup=KoreanRecognition.FromRecording(File.ReadAllBytes(Path.Combine(fixtures,"cargo-load.pcm")),CancellationToken.None,"pickup");
                    Require(pickup.CargoReadback=="적재 완료"||FlightCommand(pickup.text,pickup.Confidence,"a","a","pickup")=="complete-flight:a","held-pickup-audio");
                    var answer=KoreanRecognition.FromRecording(File.ReadAllBytes(Path.Combine(fixtures,"cargo-yes.pcm")),CancellationToken.None,"pickup",true);
                    Require(KoreanRecognition.Affirmative(answer.text)&&(answer.ConfirmedAnswer||answer.Confidence>=.85f),"held-affirmative-audio");
                    var question=KoreanRecognition.FromRecording(File.ReadAllBytes(Path.Combine(fixtures,"cargo-quantity.pcm")),CancellationToken.None,"pickup");
                    Require(question.CargoReadback==null&&FlightCommand(question.text,question.Confidence,"a","a","pickup")==null,"quantity-question-does-not-advance");
                    Require(String.IsNullOrWhiteSpace(KoreanRecognition.FromRecording(new byte[32000],CancellationToken.None).text),"silent-input");
                }
                overlay.DispatchSpeech("항해사",1,null,null,true,false);
                Require(overlay.NavigationText=="말씀해 주십시오."&&commands.Count==0,"offline-wake-replies");
                overlay.DispatchSpeech("이건 무슨 소리",1,null,null,true,false);
                Require(overlay.NavigationText.Contains("다음 목적지"),"unknown-follow-up-feedback");
                overlay.DispatchSpeech("다음 목적지 알려줘",1,null,null,true,true);
                Require(overlay.NavigationText=="연결된 화면의 최신 정보가 없습니다.","held-direct-question-without-wake");
                overlay.DispatchSpeech("오퍼레이터",1,null,null,true,false);
                Require(overlay.NavigationText=="말씀해 주십시오.","operator-wake");
                overlay.ToggleButtonTalk();
                Require(overlay.Listening&&overlay.buttonRecording,"button-record-start");
                overlay.ToggleButtonTalk();
                Require(!overlay.Listening&&recorder.finished==1,"button-record-send");
                starts=0;
                overlay.Show();Pump(200);Require(!overlay.VoiceEnabled,"microphone-default");Require(overlay.KeysReady,"default-hotkeys-register");
                Require(overlay.FormBorderStyle==FormBorderStyle.None&&(GetWindowLong(overlay.Handle,-16)&0x00C00000)==0,"no-windows-caption");
                int style=GetWindowLong(overlay.Handle,-20);Require((style&0x20)!=0&&(style&0x8000000)!=0,"click-through-default");checks.Add("Native overlay starts click-through with microphone off, three keyboard shortcuts and a mouse talk binding");
                Require(overlay.keyTalk==Mouse4&&ReadTalkKey(new Dictionary<string,object>{{"holdKey",GraveKey}})==Mouse4&&ReadTalkKey(new Dictionary<string,object>{{"holdKey",GraveKey},{"holdBindingVersion",2}})==GraveKey&&ReadTalkKey(new Dictionary<string,object>{{"holdKey",Mouse5}})==Mouse5&&ReadTalkKey(new Dictionary<string,object>{{"talk",(int)Keys.M}})==Mouse4&&ReadTalkKey(new Dictionary<string,object>{{"talk",(int)Keys.J}})==(int)Keys.J,"hold-default-and-legacy-bindings");
                overlay.Hide();overlay.canReadGame=()=>true;
                mouse_event(0x0080,0,0,1,UIntPtr.Zero);Pump(90);
                mouse_event(0x0100,0,0,1,UIntPtr.Zero);Pump(90);
                Require(starts==0&&commands.Count==1&&commands[0]=="read-contract","short-tap-reads-without-microphone");
                commands.Clear();
                try{
                    mouse_event(0x0080,0,0,1,UIntPtr.Zero);Pump(500);
                    Require(starts==1&&overlay.Listening&&recorder.finished==0&&commands.Count==0,"hold-starts-hidden-without-sending");
                    Pump(180);
                    Require(starts==1&&recorder.finished==0,"repeat-does-not-start-or-send");
                }finally{mouse_event(0x0100,0,0,1,UIntPtr.Zero);Pump(180);}
                Require(!overlay.Listening&&recorder.disposed&&recorder.finished==1&&commands.Count==0,"release-once-empty-hold-sends-nothing");overlay.Show();
                overlay.ToggleMicCheck();
                mouse_event(0x0080,0,0,1,UIntPtr.Zero);Pump(90);mouse_event(0x0100,0,0,1,UIntPtr.Zero);Pump(90);
                Require(overlay.TestingMic&&starts==1&&commands.Count==0,"test-tap-does-not-trigger-ocr");
                Require(overlay.TestTranscript("하역 완료")&&!overlay.TestingMic&&overlay.MicCheckStatus.Contains("하역 완료")&&overlay.MicCheckStatus.Contains("잘 들려요")&&commands.Count==0,"test-transcript-never-executes-command");
                overlay.answerUntil=DateTime.MinValue;overlay.StopNarration();
                checks.Add("Holding Mouse 4 in the background captures once until release; a silent hold sends no commands");
                PressShortcut(overlay.keyPrices);Require(commands.Count==1&&commands[0]=="show-prices","global-prices-key");PressShortcut(overlay.keyWork);Require(commands.Count==2&&commands[1]=="show-my-work","global-work-key");
                PressShortcut(overlay.keyOverlay);Require(!overlay.Visible,"global-hide-key");PressShortcut(overlay.keyOverlay);Require(overlay.Visible,"global-show-key");checks.Add("Windows global Ctrl+Alt shortcuts query prices/my work and toggle visibility");
                overlay.UpdateDisplay(new Dictionary<string,object>{{"mode","fleet"},{"title","STAM / 합성 교역 검증"},{"partner","navigator"},{"lines",new[]{"담당 화물 · 8 SCU","다음 목적지 · Orison","거래는 웹 화면에서 확인"}}});Pump(150);Require(overlay.body.Text.Contains("8 SCU")&&overlay.heading.Text=="STAM NAV"&&overlay.portrait.AccessibleName=="수석항해사"&&!overlay.portrait.Visible,"summary-render");CaptureEvidence(overlay,Path.Combine(Path.GetDirectoryName(evidence),"overlay-ko-windows.png"));
                overlay.ToggleInput();Pump(150);Require((GetWindowLong(overlay.Handle,-20)&0x20)==0&&overlay.KeysReady,"interactive-handle-keys");
                overlay.Location=new Point(-30000,-30000);overlay.Clamp();var area=Screen.FromPoint(overlay.Location).WorkingArea;Require(area.Contains(overlay.Bounds),"monitor-clamp");overlay.ToggleInput();Require((GetWindowLong(overlay.Handle,-20)&0x20)!=0,"return-click-through");checks.Add("Input/click-through switching recreates the handle without losing hotkeys; off-screen placement is clamped");
                overlay.Close();Pump(100);Require(!overlay.IsDisposed&&!overlay.Visible,"close-to-hide");overlay.Toggle();Require(overlay.Visible,"restore-after-close");
                overlay.received=DateTime.UtcNow.AddSeconds(-14);Pump(1300);Require(!overlay.body.Text.Contains("8 SCU")&&overlay.heading.Text=="STAM NAV"&&overlay.portrait.AccessibleName=="브리지 오퍼레이터"&&!overlay.portrait.Visible,"private-summary-expiry");overlay.UpdateDisplay(null);checks.Add("Close hides instead of exiting; stale/disconnected private summaries are cleared");
                commands.Clear();
                var flight=new Dictionary<string,object>{{"mode","flight"},{"title","Freight"},{"step","delivery"},{"stepId","first"},{"lines",new[]{"Unload"}},
                    {"navigation",new Dictionary<string,object>{{"destination","Chawla Beach"},{"ship","Golem OX"},{"shipArt","drake-golem-ox.jpg"},{"finished",false},{"extra",0},{"route",new[]{"Chawla Beach","Gaslight"}},{"cargo",new[]{new Dictionary<string,object>{{"item","Waste"},{"action","delivery"},{"scu",22}}}}}}};
                overlay.UpdateDisplay(flight);Require(overlay.Destination=="Chawla Beach"&&overlay.CargoRows()[0].Contains("22 SCU")&&overlay.CanComplete,"live-navigation");
                overlay.CompleteCurrent();overlay.CompleteCurrent();Require(commands.Count==1&&commands[0]=="complete-flight:first","shared-button-bound-to-step");
                flight["stepId"]="second";flight["step"]="pickup";overlay.UpdateDisplay(flight);Require(overlay.CanComplete&&overlay.StepLabel=="적재 완료","advance-on-web-ack");
                overlay.UpdateDisplay(null);Require(!overlay.CanComplete&&overlay.Destination=="","disconnect-clears-navigation");commands.Clear();
                overlay.SetStep("a","pickup");overlay.received=DateTime.UtcNow;
                overlay.listeningUntil=DateTime.MinValue;
                overlay.DispatchSpeech("적재 완료",1,"a",null,true,false);
                Require(commands.Count==0,"wake-mode-ignores-unaddressed-flight-command");
                overlay.rideAlong=true;
                overlay.DispatchSpeech("저 사람 주차 진짜 뭐같게 했네",1,null,null,true,false);
                Require(overlay.body.Text.Contains("어떻게")&&commands.Count==0,"ride-along-parking-banter-only");
                overlay.ShowPartner("navigator");
                overlay.lastBanter=DateTime.MinValue;
                overlay.DispatchSpeech("주차를 왜 저렇게 했냐",1,null,null,true,false);
                Require(overlay.body.Text.Contains("만족")&&commands.Count==0,"navigator-banter-persona");
                overlay.lastBanter=DateTime.MinValue;
                overlay.DispatchSpeech("착륙 진짜 깔끔, 착륙 성공!",1,null,null,true,false);
                Require(overlay.body.Text.Contains("승객")&&commands.Count==0,"landing-comment-does-not-advance");
                overlay.DispatchSpeech("잡담, 오늘 뭐 했어",1,null,null,true,false);
                Require(overlay.body.Text.Contains("온라인 자유 대화")&&commands.Count==0,"offline-ride-chat-stays-local");
                overlay.rideChat=true;
                overlay.DispatchSpeech("이어서, 그건 어땠어",1,null,null,true,false);
                Require(commands.Count==1&&commands[0]=="copilot-say:이어서, 그건 어땠어","online-chat-explicit-prefix");
                commands.Clear();overlay.rideChat=false;
                overlay.DispatchSpeech("저거 버리고 싶네",1,null,null,true,false);
                Require(commands.Count==0,"venting-does-not-change-flight");
                overlay.DetectPhrase(TimeSpan.Zero);overlay.HandlePhrase("배송 완료",1);
                Require(commands.Count==0,"wrong-stage");
                overlay.DetectPhrase(TimeSpan.Zero);overlay.HandlePhrase("적재 완료",1);
                overlay.DetectPhrase(TimeSpan.Zero);overlay.HandlePhrase("다음 단계",1);
                Require(commands.Count==1&&commands[0]=="complete-flight:a","send-once-per-step");
                overlay.DetectPhrase(TimeSpan.Zero);overlay.SetStep("b","delivery");overlay.HandlePhrase("다음 단계",1);
                overlay.stepAudioStart=TimeSpan.FromSeconds(3);
                overlay.DetectPhrase(TimeSpan.FromSeconds(2));overlay.HandlePhrase("다음 단계",1);
                Require(commands.Count==1,"ignore-previous-utterance");
                overlay.DetectPhrase(TimeSpan.FromSeconds(4));overlay.HandlePhrase("배송 완료",1);
                Require(commands.Count==2&&commands[1]=="complete-flight:b","hands-free-next-step");
                checks.Add("Continuous listening accepts a fresh utterance per step and rejects stale, repeated or mismatched speech");
                overlay.UpdateDisplay(new Dictionary<string,object>{{"mode","flight"},{"title","운송"},{"lines",new[]{"8 SCU"}},{"guidance",new Dictionary<string,object>{{"load","금 8 SCU 적재해 주십시오."}}}});
                Require(overlay.Query("얼마나 실어야 해",1)&&overlay.body.Text.Contains("8 SCU")&&commands.Count==2,"read-only-cargo-query");
                Require(Friendly("다음 목적지는 로어빌입니다. 금 8 SCU 적재해 주십시오.",true)=="앗, 찾았다! 다음은 로어빌이에요. 금 8 SCU, 싣고 가요!","korean-character-opening");
                Require(Friendly("다음 목적지는 로어빌입니다.")=="다음은 로어빌이에요."&&Friendly("금 8 SCU 배송해 주십시오.")=="금 8 SCU, 여기서 내려요.","korean-short-replies");
                overlay.SetNarrator("partner");overlay.ShowPartner("navigator");
                var malePickup=overlay.PartnerRecording("pickup");
                overlay.ShowPartner("operator");var femalePickup=overlay.PartnerRecording("pickup");
                Require(malePickup!=null&&femalePickup!=null&&malePickup!=femalePickup,"linked-partner-recordings");
                Require(WaveMilliseconds(File.ReadAllBytes(malePickup))>300&&WaveMilliseconds(File.ReadAllBytes(femalePickup))>300,"partner-audio-packaged");
                Require(overlay.PartnerRecording("운송이 끝났습니다.")!=null&&overlay.PartnerRecording("로어빌, 티타늄 17 SCU")==null,"static-vs-live-detail");
                overlay.Say("운송이 끝났습니다.");
                Require(overlay.localSpeech!=null&&overlay.narrating,"fixed-line-plays-without-local-service");
                overlay.SetStep("new","departure");Pump(100);
                Require(overlay.localSpeech==null&&overlay.player==null&&!overlay.narrating,"new-step-cancels-partner-line");
                // Drive the real sequence with a local TTS response fixture, without needing a model or game.
                var detail=new TestLocalVoice{wave=File.ReadAllBytes(femalePickup)};
                using(var fake=new HttpClient(detail){BaseAddress=new Uri("http://127.0.0.1/")}){
                    overlay.localTts=fake;
                    overlay.ShowPartner("navigator");
                    overlay.Say("다음 목적지는 로어빌입니다. 티타늄 8 SCU 적재해 주십시오.",false,"pickup");
                    var introPlayer=overlay.player;
                    Require(introPlayer!=null&&detail.payload.Contains("티타늄 8 에스씨유")&&detail.payload.Contains("M1"),"live-cargo-in-local-request");
                    var deadline=DateTime.UtcNow.AddMilliseconds(WaveMilliseconds(File.ReadAllBytes(malePickup))+2000);
                    while(overlay.player==introPlayer&&DateTime.UtcNow<deadline)Pump(25);
                    Require(overlay.player!=null&&overlay.player!=introPlayer&&overlay.narrating,"detail-follows-partner-recording");
                    overlay.StopNarration();Pump(100);overlay.localTts=defaultLocalTts;
                }
                overlay.SetNarrator("off");overlay.ShowPartner(null);
                checks.Add("Both selected Korean partner recordings are packaged, static replies play offline, and new steps cancel stale audio");
                byte[] demo=File.ReadAllBytes(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"app","desktop","voices","partner-female-ko.wav"));
                Require(demo.Length>44,"female-preview-packaged");
                // A standard mono PCM header, with an empty optional chunk preceding fmt.
                byte[] header=new byte[44];
                System.Text.Encoding.ASCII.GetBytes("JUNK").CopyTo(header,12);
                System.Text.Encoding.ASCII.GetBytes("fmt ").CopyTo(header,20);
                BitConverter.GetBytes(16).CopyTo(header,24);header[28]=1;
                BitConverter.GetBytes(44100).CopyTo(header,32);header[40]=2;
                RaiseKoreanVoice(header);
                Require(BitConverter.ToInt32(header,32)==46722&&BitConverter.ToInt32(header,36)==93444,"female-character-pcm-rate");
                Require(overlay.Query("함장인데 계약을 열 개나 받았거든요 이거 한꺼번에 담을 수 있어요",.85f)&&overlay.body.Text.Contains("카드"),"paraphrased-guide");
                Require(overlay.Query("항로 어케 짜",.9f)&&overlay.body.Text.Contains("항로 지도"),"short-guide");
                Require(overlay.Query("적재 완료는 어떻게 해",1)&&commands.Count==2,"guide-never-advances");
                overlay.UpdateDisplay(new Dictionary<string,object>{{"mode","personal"},{"title","시세"},{"lines",new[]{"현재 시세"}}});
                Require(overlay.Query("금 어디서 팔아",1)&&commands.Count==3&&commands[2].StartsWith("quote-sell:"),"named-commodity-query");
                Require(overlay.LookupQuestion("티타늄 500scu 샀는데 어디서 팔지?")=="quote-sell:75:500","natural-quantity-sale");
                Require(overlay.LookupQuestion("다 실었는데 어디로가?")=="afterLoad","read-only-after-loading");
                Require(overlay.LookupQuestion("500 SCU 어디서 팔지?").StartsWith("ask:")&&overlay.LookupQuestion("티타늄이요")=="quote-sell:75:500","preserve-side-and-lot");
                Require(overlay.LookupQuestion("티타늄 오백 에스씨유 시세 알려줘").StartsWith("ask:")&&overlay.LookupQuestion("판매")=="quote-sell:75:500","preserve-commodity-and-lot");
                Require(overlay.LookupQuestion("지금 어디서 팔지?").StartsWith("ask:")&&overlay.LookupQuestion("질문 취소").StartsWith("ask:")&&overlay.clarifyUntil==DateTime.MinValue,"no-gold-substring-cancel");
                checks.Add("Read-only cargo and commodity questions preserve flight progress; female Korean phrasing retains destination and quantity");
                string offerId=Guid.NewGuid().ToString();
                overlay.UpdateDisplay(new Dictionary<string,object>{{"mode","flight"},{"title","부조종사"},{"lines",new[]{"로어빌"}},{"copilot",true},{"proposal",offerId},{"proposalText","오리슨 경유"}});
                Require(overlay.body.Text.Contains("오리슨")&&overlay.CopilotRequest("적용해",1,offerId)&&commands[commands.Count-1]=="copilot-apply:"+offerId,"copilot-confirms-visible-proposal");
                overlay.UpdateDisplay(new Dictionary<string,object>{{"mode","flight"},{"title","계약"},{"lines",new string[0]},{"copilot",true},{"receiptReadback",true},{"proposal",offerId},{"proposalText","2번 계약 40 SCU"}});
                Require(overlay.body.Text.Contains("맞습니까")&&overlay.CopilotRequest("맞아",1,offerId)&&commands[commands.Count-1]=="copilot-apply:"+offerId,"receipt-affirms-visible-readback");
                Require(overlay.CopilotRequest("아니 14야",1,offerId)&&commands[commands.Count-1]=="receipt-amend:"+offerId+":아니 14야","receipt-amend-scoped");
                int sent=commands.Count;
                Require(overlay.CopilotRequest("적용해",1,"expired")&&commands.Count==sent,"copilot-stale-voice-rejected");
                Require(overlay.CopilotRequest("오리슨 먼저 들러",1,null)&&commands[commands.Count-1]=="copilot-say:오리슨 먼저 들러","copilot-voice-route-request");
                Require(!overlay.CopilotRequest("로어빌에서",1,null),"no-free-dictation-outside-mission-entry");
                overlay.UpdateDisplay(new Dictionary<string,object>{{"mode","flight"},{"title","운항"},{"lines",new[]{"픽업지를 말해 주세요."}},{"copilot",true},{"awaitingDetails",true}});
                foreach(string reply in new[]{"허스턴에서 티타늄 40SCU 실어서 오리슨 가는 거야","로어빌에서","응","취소"})
                    Require(overlay.CopilotRequest(reply,1,null)&&commands[commands.Count-1]=="copilot-say:"+reply,"manual-mission-voice-followup");
                string receiptView=Guid.NewGuid().ToString();
                overlay.UpdateDisplay(new Dictionary<string,object>{{"mode","flight"},{"title","수신 계약"},{"lines",new[]{"2번 계약"}},{"copilot",true},{"receiptView",receiptView}});
                int beforeReceipt=commands.Count;
                Require(overlay.CopilotRequest("두 번째 미션은 수량이 마흔이야",1,null,"expired")&&commands.Count==beforeReceipt,"reject-reordered-voice-receipt");
                Require(overlay.CopilotRequest("두 번째 미션은 수량이 마흔이야",1,null,receiptView)&&commands[commands.Count-1]=="receipt-say:"+receiptView+":두 번째 미션은 수량이 마흔이야","numbered-receipt-dictation");
                var rows=new[]{"1|루인|티타늄","2|루인|티타늄"};
                overlay.UpdateDisplay(new Dictionary<string,object>{{"mode","flight"},{"title","계약"},{"lines",new string[0]},{"copilot",true},{"receiptView",receiptView},{"receiptHints",rows}});
                int beforeHint=commands.Count;
                var pair=new KoreanRecognition.Phrase{text="인식이 불분명",ReceiptPairHint="루인|티타늄"};
                Require(overlay.HandleReceiptPair(pair,receiptView,overlay.receiptHints)&&commands.Count==beforeHint,"ambiguous-pair-asks-card");
                var cardChoice=new KoreanRecognition.Phrase{text="두 번째 계약",result=new[]{new KoreanRecognition.Word{conf=1}}};
                Require(overlay.HandleReceiptPair(cardChoice,receiptView,overlay.receiptHints)&&commands[beforeHint]=="receipt-say:"+receiptView+":2번 계약 루인에 내릴 티타늄 수량 바꿔줘","confirmed-card-asks-quantity");
                Require(!overlay.HandleReceiptPair(cardChoice,receiptView,overlay.receiptHints)&&!overlay.HandleReceiptPair(pair,"stale",overlay.receiptHints),"expired-and-consumed-hints-no-edit");
                string cargoId=Guid.NewGuid().ToString();
                overlay.UpdateDisplay(new Dictionary<string,object>{{"mode","flight"},{"title","운항"},{"lines",new string[0]},{"step","pickup"},{"stepId",cargoId}});
                var hint=new KoreanRecognition.Phrase{text="첫째 관료",CargoReadback="적재 완료"};
                var yes=new KoreanRecognition.Phrase{text="예",ConfirmedAnswer=true};
                int beforeCargo=commands.Count;
                Require(overlay.HandleCargoReadback(hint,cargoId)&&commands.Count==beforeCargo,"cargo-hint-does-not-advance");
                Require(overlay.HandleCargoReadback(yes,cargoId)&&commands.Count==beforeCargo+1&&commands[beforeCargo]=="complete-flight:"+cargoId,"asked-cargo-affirmative");
                Require(!overlay.HandleCargoReadback(yes,cargoId)&&commands.Count==beforeCargo+1,"ignore-repeated-affirmative");
                overlay.SetStep(Guid.NewGuid().ToString(),"delivery");
                Require(overlay.HandleCargoReadback(hint,cargoId)&&!overlay.HandleCargoReadback(yes,cargoId)&&commands.Count==beforeCargo+1,"stale-cargo-readback");
                overlay.Size=new Size(660,480);overlay.Clamp();savedSize=overlay.Size;overlay.keyOverlay=(int)Keys.K;overlay.keyPrices=(int)Keys.J;overlay.keyWork=(int)Keys.L;overlay.keyTalk=(int)Keys.F8;overlay.Save();
            }
            using(var reopened=new CompanionOverlay(c=>commands.Add(c),true,directory)){
                Require(reopened.Narrator=="off","explicit-mute-survives-restart");Require(reopened.Size==savedSize,"persist-window-size");Require(reopened.keyOverlay==(int)Keys.K&&reopened.keyPrices==(int)Keys.J&&reopened.keyWork==(int)Keys.L&&reopened.keyTalk==(int)Keys.F8,"persist-shortcuts");Require(reopened.registered.Count==4,"reopen-releases-hotkeys");reopened.Show();reopened.UpdateDisplay(new Dictionary<string,object>{{"mode","fleet"},{"title","STAM / Synthetic operation"},{"lines",new[]{"My cargo: 8 SCU","Destination: Orison","Confirm transactions on the web"}}});Pump(150);CaptureEvidence(reopened,Path.Combine(Path.GetDirectoryName(evidence),"overlay-en-windows.png"));checks.Add("Restart restores configured shortcuts and releases previous registrations; Korean and English captures saved");
            }
            Require(VoiceCommand("STAM prices",.9f)=="show-prices"&&VoiceCommand("스탐 내 작업",.9f)=="show-my-work","voice-route");Require(VoiceCommand("STAM prices",.7f)==null&&VoiceCommand("confirm trade",1f)==null&&VoiceCommand("send game key",1f)==null,"voice-whitelist");
            Require(FlightCommand("적재 완료",.9f,"a","a","pickup")=="complete-flight:a"&&FlightCommand("delivery complete",.9f,"a","a","delivery")=="complete-flight:a","native-flight-complete");
            Require(FlightCommand("다음 단계",.9f,"a","b","pickup")==null&&FlightCommand("배송 완료",.9f,"a","a","pickup")==null&&FlightCommand("적재 완료",.6f,"a","a","pickup")==null,"reject-stale-mismatch-confidence");
            foreach(var engine in SpeechRecognitionEngine.InstalledRecognizers()){
                recognizers.Add(engine.Culture.Name);if(engine.Culture.TwoLetterISOLanguageName!="en"&&engine.Culture.TwoLetterISOLanguageName!="ko")continue;
                using(var vocabulary=new CompanionOverlay(c=>{},engine.Culture.TwoLetterISOLanguageName=="en",directory))using(var speechTest=new SpeechRecognitionEngine(engine)){speechTest.LoadGrammar(vocabulary.CommandGrammar(engine));string phrase=engine.Culture.TwoLetterISOLanguageName=="en"?"STAM prices":"스탐 가격";var recognized=speechTest.EmulateRecognize(phrase);Require(recognized!=null&&recognized.Text==phrase,"installed-speech-grammar");string flightPhrase=engine.Culture.TwoLetterISOLanguageName=="en"?"loading complete":"적재 완료";Require(speechTest.EmulateRecognize(flightPhrase)!=null,"continuous-flight-grammar");voiceChecks.Add(engine.Culture.Name+": grammar emulation passed, microphone not used");}
            }
            checks.Add("Voice commands are allowlisted and low-confidence input is ignored; installed engines checked without microphone capture");
        }catch(Exception e){failure=e.GetType().Name+": "+e.Message;}
        finally{try{Directory.Delete(directory,true);}catch{}}
        File.WriteAllText(evidence,new JavaScriptSerializer().Serialize(new{passed=failure==null,checks,recognizers,voiceChecks,failure,actualWindows=Environment.OSVersion.Platform==PlatformID.Win32NT,microphoneCaptureTested=false,liveGame=false,syntheticInput=true}));return failure==null?0:1;
    }
}
