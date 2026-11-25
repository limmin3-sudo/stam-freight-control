using System;
using System.Collections;
using System.Collections.Generic;
using System.Drawing;
using System.Globalization;
using System.Windows.Forms;

internal sealed partial class CompanionOverlay {
    readonly DeckButton compareBuyer=new DeckButton();
    readonly DeckButton freightMode=new DeckButton(),tradeMode=new DeckButton();
    Dictionary<string,object> tradeAction;
    bool switchable;
    internal bool CanSwitchMode {get{return switchable&&displayedMode!=null;}}
    internal void SelectMode(bool trade){if(CanSwitchMode)send(trade?"mode-trade":"mode-flight");}
    string TradeVerb {get{return tradeAction==null?"":Convert.ToString(tradeAction["action"]);}}
    bool TradeReady {get{return tradeAction!=null&&displayedMode=="personal"&&proposalId==null&&(DateTime.UtcNow-received).TotalSeconds<10;}}
    string TradeLabel(string verb){
        switch(verb){
            case "start":return T("무역 시작","Start trade");
            case "buy":return T("매입 기록","Record buy");
            case "sell":return T("판매 기록","Record sale");
            case "depart":return T("출발","Depart");
            case "arrive":return T("도착","Arrive");
            case "buyer":return T("판매처 선택","Select buyer");
            case "compare":return T("판매처 비교","Compare buyers");
            default:return "";
        }
    }
    void UpdateTrade(Dictionary<string,object> display){
        object value;
        switchable=display!=null&&display.TryGetValue("switchable",out value)&&Object.Equals(value,true);
        tradeAction=display!=null&&display.TryGetValue("tradeAction",out value)?value as Dictionary<string,object>:null;
    }
    void TradeCommand(string stamp,string operation){
        if(!TradeReady||stamp!=Convert.ToString(tradeAction["id"])){Answer(T("무역 상태가 바뀌었습니다. 다시 확인하세요.","Trade state changed. Check again."),false);return;}
        quoteRequested=DateTime.UtcNow;readQuote=false;
        send("trade-action:"+stamp+":"+operation);
    }
    IList TradeList(string key){return tradeAction==null?null:tradeAction[key] as IList;}
    void TradeInput(string verb){
        if(!TradeReady||tradeFormOpen)return;
        var stamp=Convert.ToString(tradeAction["id"]);
        if(verb=="start"||verb=="depart"||verb=="arrive"){TradeCommand(stamp,verb);return;}
        bool buying=verb=="buy",offer=verb=="buyer",entry=buying||verb=="sell";
        var rows=TradeList(offer?"buyers":buying?"buy":"sell");
        if(rows==null||rows.Count==0)return;
        tradeFormOpen=true;
        try{using(var form=new Form{Text=TradeLabel(verb),Width=520,Height=entry?320:185,TopMost=true,StartPosition=FormStartPosition.CenterScreen,FormBorderStyle=FormBorderStyle.FixedDialog,MaximizeBox=false,MinimizeBox=false,BackColor=DeckTheme.Housing,ForeColor=DeckTheme.Ink}){
            var panel=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=2,Padding=new Padding(14),AutoScroll=true};
            panel.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,140));panel.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));form.Controls.Add(panel);
            var choice=new ComboBox{DropDownStyle=ComboBoxStyle.DropDownList,Dock=DockStyle.Fill,DropDownWidth=660};
            foreach(object item in rows){
                var row=item as Dictionary<string,object>;
                choice.Items.Add(row==null?Convert.ToString(item):row["label"]+" · "+row["qty"]+" SCU ("+row["box"]+" SCU/"+T("상자","box")+")");
            }
            AddTradeField(panel,offer?T("판매처","Buyer"):T("품목","Commodity"),choice);
            var quantity=new NumericUpDown{Minimum=1,Dock=DockStyle.Fill};
            var unit=new NumericUpDown{Maximum=100000000000M,DecimalPlaces=2,ThousandsSeparator=true,Dock=DockStyle.Fill};
            var size=new ComboBox{DropDownStyle=ComboBoxStyle.DropDownList,Dock=DockStyle.Fill,Enabled=buying};
            if(entry){
                foreach(int n in new[]{1,2,4,8,16,24,32})size.Items.Add(n);
                AddTradeField(panel,T("실제 수량 · SCU","Actual SCU"),quantity);
                AddTradeField(panel,T("상자 · SCU","Box size · SCU"),size);
                AddTradeField(panel,T("실제 단가 · aUEC","Actual unit price"),unit);
                choice.SelectedIndexChanged+=(s,e)=>{
                    var row=(Dictionary<string,object>)rows[choice.SelectedIndex];
                    quantity.Maximum=Convert.ToDecimal(row["qty"]);quantity.Value=row.ContainsKey("suggested")?Convert.ToDecimal(row["suggested"]):quantity.Maximum;
                    size.SelectedItem=Convert.ToInt32(row["box"]);unit.Value=0;
                };
            }
            choice.SelectedIndex=0;
            var ok=new DeckButton{Text=entry?T("거래 기록","Record trade"):offer?T("목표로 지정","Set target"):T("비교","Compare"),Primary=true,Dock=DockStyle.Fill,Height=34};
            ok.Click+=(s,e)=>{if(entry&&(unit.Value<=0||quantity.Value%Convert.ToDecimal(size.SelectedItem)!=0)){MessageBox.Show(form,T("실제 단가와 상자 단위에 맞는 수량을 입력하세요.","Enter the actual price and a whole-box quantity."));return;}form.DialogResult=DialogResult.OK;};
            AddTradeField(panel,"",ok);form.AcceptButton=ok;
            if(form.ShowDialog()!=DialogResult.OK)return;
            string op=verb+":"+choice.SelectedIndex;
            if(entry)op+=":"+quantity.Value.ToString("0",CultureInfo.InvariantCulture)+":"+unit.Value.ToString("0.##",CultureInfo.InvariantCulture)+":"+size.SelectedItem;
            TradeCommand(stamp,op);
        }}finally{tradeFormOpen=false;}
    }
    bool tradeFormOpen;
    static void AddTradeField(TableLayoutPanel panel,string text,Control field){
        int i=panel.RowCount++;panel.RowStyles.Add(new RowStyle(SizeType.Absolute,42));
        panel.Controls.Add(new Label{Text=text,Dock=DockStyle.Fill,TextAlign=ContentAlignment.MiddleLeft},0,i);panel.Controls.Add(field,1,i);
    }
}
