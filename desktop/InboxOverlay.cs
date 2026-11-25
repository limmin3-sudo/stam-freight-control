using System;
using System.Collections;
using System.Collections.Generic;
using System.Drawing;
using System.Threading;
using System.Windows.Forms;

internal sealed partial class CompanionOverlay {
    readonly RowStyle intakeRow=new RowStyle(SizeType.Absolute,0);
    readonly HoloLabel intakeStatus=new HoloLabel();
    readonly DeckButton intakeButton=new DeckButton();
    Dictionary<string,object> inbox;
    string pickerId,heldPicker,heardPicker;
    string[] pickerLabels=new string[0];
    DateTime pickerUntil;
    string CurrentPicker {get{return DateTime.UtcNow<pickerUntil?pickerId:null;}}
    void BuildIntake(TableLayoutPanel layout){
        layout.RowStyles.Add(intakeRow);
        var bar=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=2,Margin=Padding.Empty,Padding=new Padding(12,2,12,3),BackColor=DeckTheme.Housing};
        bar.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));bar.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,112));
        intakeStatus.Dock=DockStyle.Fill;intakeStatus.Font=HoloFonts.At(10);intakeStatus.ForeColor=DeckTheme.Ink;
        intakeButton.Dock=DockStyle.Fill;intakeButton.Font=HoloFonts.At(10);intakeButton.Click+=(s,e)=>OpenIntake();
        bar.Controls.Add(intakeStatus,0,0);bar.Controls.Add(intakeButton,1,0);layout.Controls.Add(bar,0,4);
    }
    void DrawIntake(){
        bool choosing=CurrentPicker!=null;
        string op=inbox==null?"":Convert.ToString(inbox["action"]);
        float wanted=choosing||inbox!=null?46:0;
        if(intakeRow.Height!=wanted){
            int delta=(int)(wanted-intakeRow.Height);intakeRow.Height=wanted;
            Height=Math.Max(MinimumSize.Height,Math.Min(Screen.FromControl(this).WorkingArea.Height,Height+delta));Clamp();
        }
        intakeStatus.Text=choosing?T("어느 계약인가요?","Which contract?"):inbox!=null?Convert.ToString(inbox["label"]):"";
        intakeButton.Text=choosing?T("계약 선택","Choose receipt"):op=="plan"?T("경로 계산","Plan route"):op=="start"?T("운송 시작","Start haul"):T("이번 운송에 추가","Add to haul");
        intakeButton.Visible=choosing||op!="";intakeButton.Enabled=choosing||proposalId==null&&(DateTime.UtcNow-received).TotalSeconds<10;
        if(choosing){body.Text=String.Join("\n",pickerLabels,0,Math.Min(2,pickerLabels.Length));}
    }
    void PickerNotice(Dictionary<string,object> notice){
        string id=Convert.ToString(notice["id"]);
        if(Object.Equals(notice["code"],"picker-close")){
            if(pickerId!=id)return;
            pickerId=null;pickerLabels=new string[0];Interlocked.Increment(ref contextVersion);
        }else{
            bool fresh=CurrentPicker!=id;
            var labels=new List<string>();foreach(var s in (IEnumerable)notice["labels"])labels.Add(Convert.ToString(s));
            pickerLabels=labels.ToArray();pickerId=id;pickerUntil=DateTime.UtcNow.AddSeconds(6);
            string retry=Convert.ToString(notice["retry"]);
            if(fresh){Interlocked.Increment(ref contextVersion);Answer(T("어느 계약인가요? 번호나 픽업지를 말씀해 주세요.","Which contract? Say its number or pickup."),true);}
            else if(retry!="")Answer(retry,true);
        }
        RenderDeck();
    }
    bool ReplyToPicker(string stamp,string phrase,float confidence){
        if(stamp==null&&CurrentPicker==null)return false;
        if(stamp==null||stamp!=CurrentPicker||confidence<.72f||phrase.Length>160){
            ReportTalk(T("현재 계약의 번호나 거점을 다시 말해 주세요.","Repeat a number or stop from the current choices."));return true;
        }
        send("screen-reply:"+stamp+":"+phrase);return true;
    }
    void OpenIntake(){
        string prompt=CurrentPicker;
        if(prompt==null&&(inbox==null||proposalId!=null||(DateTime.UtcNow-received).TotalSeconds>=10))return;
        string stamp=prompt==null?Convert.ToString(inbox["id"]):prompt,op=prompt==null?Convert.ToString(inbox["action"]):"pick";
        quoteRequested=DateTime.UtcNow;readQuote=true;
        if(op=="plan"||op=="start"){send("inbox:"+stamp+":"+op);return;}
        if(op!="pick"&&op!="add")return;
        var options=prompt==null?(IList)inbox["options"]:pickerLabels;
        var menu=new ContextMenuStrip();
        for(int i=0;i<options.Count;i++){
            int index=i;
            menu.Items.Add(Convert.ToString(options[i]),null,(s,e)=>{
                if(op=="pick"){if(CurrentPicker==stamp)send("screen-reply:"+stamp+":"+(index+1));}
                else if(inbox!=null&&Object.Equals(inbox["id"],stamp))send("inbox:"+stamp+":add:"+index);
            });
        }
        menu.Closed+=(s,e)=>menu.Dispose();menu.Show(intakeButton,new Point(0,intakeButton.Height));
    }
}
