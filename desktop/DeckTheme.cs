using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
using System.IO;
using System.Windows.Forms;

internal static class DeckTheme {
    internal static readonly Color Housing=Color.FromArgb(32,35,32);
    internal static readonly Color Ink=Color.FromArgb(233,234,233);
    internal static readonly Color Muted=Color.FromArgb(173,177,180);
    internal static readonly Color Platinum=Color.FromArgb(231,201,143);
    internal static readonly Color Gilt=Color.FromArgb(176,148,92);
    internal static readonly Color OperatorInk=Color.FromArgb(244,207,133);
    internal static readonly Color NavigatorInk=Color.FromArgb(161,206,246);
    static Image emblem;

    static DeckTheme(){AppDomain.CurrentDomain.ProcessExit+=(s,e)=>{if(emblem!=null)emblem.Dispose();};}

    internal static LinearGradientBrush Key(Rectangle bounds,bool active){
        return new LinearGradientBrush(bounds,active?Color.FromArgb(238,215,163):Color.FromArgb(53,57,50),
            active?Color.FromArgb(218,184,119):Color.FromArgb(47,50,45),90f);
    }
    internal static void Emblem(Graphics g,Rectangle bounds){
        try{
            if(emblem==null){
                var path=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"app","assets","stam-logo-transparent.png");
                using(var source=Image.FromFile(path))emblem=new Bitmap(source);
            }
            var image=emblem;
            int size=Math.Min(bounds.Width/2,bounds.Height)-12;
            if(size<1)return;
            using(var attributes=new ImageAttributes()){
                var matrix=new ColorMatrix();matrix.Matrix33=.12f;attributes.SetColorMatrix(matrix);
                g.DrawImage(image,new Rectangle(bounds.Right-size-12,bounds.Y+(bounds.Height-size)/2,size,size),0,0,image.Width,image.Height,GraphicsUnit.Pixel,attributes);
            }
        }catch(IOException){}catch(ArgumentException){}
    }
    internal static void Panel(Graphics g,Rectangle r){
        if(r.Width<2||r.Height<2)return;
        using(var fill=new SolidBrush(Color.FromArgb(40,43,39)))g.FillRectangle(fill,r);
        using(var edge=new Pen(Color.FromArgb(76,78,67)))g.DrawRectangle(edge,r.X,r.Y,r.Width-1,r.Height-1);
    }
}
internal sealed class DeckSurface : TableLayoutPanel {
    public bool ShowEmblem {get;set;}
    public DeckSurface(){BackColor=DeckTheme.Housing;SetStyle(ControlStyles.OptimizedDoubleBuffer|ControlStyles.ResizeRedraw,true);}
    protected override void OnPaintBackground(PaintEventArgs e){
        DeckTheme.Panel(e.Graphics,ClientRectangle);
        if(ShowEmblem)DeckTheme.Emblem(e.Graphics,ClientRectangle);
    }
}

internal sealed class PartnerPortrait : PictureBox {
    readonly bool compact;
    bool? current;
    internal PartnerPortrait(bool compact){
        this.compact=compact;
        SizeMode=PictureBoxSizeMode.Zoom;
        BackColor=Color.Transparent;
        Dock=DockStyle.Fill;
    }
    internal static string Title(bool navigator,bool english){
        if(navigator)return english?"Senior Navigator":"수석항해사";
        return english?"Bridge Operator":"브리지 오퍼레이터";
    }
    internal void SelectPartner(bool navigator,bool english){
        AccessibleName=Title(navigator,english);
        if(current==navigator)return;
        current=navigator;
        var old=Image;Image=null;if(old!=null)old.Dispose();
        var path=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"app","desktop","portraits",navigator?"male.png":"female.png");
        try{
            using(var source=new Bitmap(path)){
                if(compact){
                    // Keep the face legible in the overlay's short identification row.
                    int side=Math.Min(source.Width,source.Height)*3/4;
                    Image=source.Clone(new Rectangle((source.Width-side)/2,0,side,side),PixelFormat.Format32bppArgb);
                }else Image=new Bitmap(source);
            }
        }catch(IOException){}catch(ArgumentException){}
        Visible=Image!=null;
    }
    protected override void Dispose(bool disposing){
        if(disposing){var old=Image;Image=null;if(old!=null)old.Dispose();}
        base.Dispose(disposing);
    }
}
