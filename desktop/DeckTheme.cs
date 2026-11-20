using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
using System.IO;
using System.Windows.Forms;

internal static class DeckTheme {
    internal static readonly Color Housing=Color.FromArgb(46,53,59);
    internal static readonly Color Ink=Color.FromArgb(233,234,233);
    internal static readonly Color Muted=Color.FromArgb(173,177,180);
    internal static readonly Color Platinum=Color.FromArgb(213,216,217);
    internal static readonly Color Gilt=Color.FromArgb(176,148,92);
    internal static readonly Color OperatorInk=Color.FromArgb(244,207,133);
    internal static readonly Color NavigatorInk=Color.FromArgb(161,206,246);
    static Image emblem;

    static DeckTheme(){AppDomain.CurrentDomain.ProcessExit+=(s,e)=>{if(emblem!=null)emblem.Dispose();};}

    internal static LinearGradientBrush Key(Rectangle bounds,bool active){
        if(!active)return new LinearGradientBrush(bounds,Color.FromArgb(52,54,57),Color.FromArgb(26,27,29),76f);
        var metal=new LinearGradientBrush(bounds,Platinum,Muted,16f);
        metal.InterpolationColors=new ColorBlend {
            Colors=new[]{Color.FromArgb(169,174,177),Color.FromArgb(235,236,234),Color.FromArgb(188,192,194),Color.FromArgb(215,218,219)},
            Positions=new[]{0f,.3f,.69f,1f}
        };
        return metal;
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
        using(var baseMetal=new LinearGradientBrush(r,Color.FromArgb(59,66,73),Color.FromArgb(42,48,54),25f)){
            g.FillRectangle(baseMetal,r);
        }
        // Short, low-contrast strokes give the surface a fixed-scale brushed finish.
        var state=g.Save();
        g.SetClip(r,CombineMode.Intersect);
        using(var grain=new Pen(Color.FromArgb(7,255,255,255))){
            for(int row=1;row<r.Height;row+=3){
                int offset=(row*47)%149;
                for(int x=r.Left-offset;x<r.Right;x+=149)
                    g.DrawLine(grain,x,r.Top+row,x+24+(row*11)%67,r.Top+row);
            }
        }
        g.Restore(state);
        using(var edge=new Pen(Gilt))g.DrawRectangle(edge,r.X,r.Y,r.Width-1,r.Height-1);
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
