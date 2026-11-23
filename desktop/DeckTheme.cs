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

internal static class FlightChrome {
    [System.Runtime.InteropServices.DllImport("user32.dll")] static extern bool ReleaseCapture();
    [System.Runtime.InteropServices.DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr h,int message,IntPtr w,IntPtr l);
    internal static GraphicsPath Rounded(Rectangle r,int radius){
        var path=new GraphicsPath();int d=Math.Min(2*radius,Math.Min(r.Width,r.Height));
        if(d<2){path.AddRectangle(r);return path;}
        path.AddArc(r.X,r.Y,d,d,180,90);path.AddArc(r.Right-d,r.Y,d,d,270,90);
        path.AddArc(r.Right-d,r.Bottom-d,d,d,0,90);path.AddArc(r.X,r.Bottom-d,d,d,90,90);path.CloseFigure();return path;
    }
    internal static void Attach(Form form,Action finished,params Control[] drag){
        form.FormBorderStyle=FormBorderStyle.None;
        foreach(var control in drag)control.MouseDown+=(s,e)=>{
            if(e.Button!=MouseButtons.Left||form.WindowState==FormWindowState.Maximized)return;
            ReleaseCapture();SendMessage(form.Handle,0x00a1,(IntPtr)2,IntPtr.Zero);
        };
        var grip=new FrameGrip{Anchor=AnchorStyles.Bottom|AnchorStyles.Right,Size=new Size(12,12),Cursor=Cursors.SizeNWSE,TabStop=false,AccessibleName="Resize"};
        form.Controls.Add(grip);grip.BringToFront();
        Point start=Point.Empty;Size original=Size.Empty;
        grip.MouseDown+=(s,e)=>{if(e.Button==MouseButtons.Left){start=Cursor.Position;original=form.Size;grip.Capture=true;}};
        grip.MouseMove+=(s,e)=>{if(grip.Capture&&!original.IsEmpty){var current=Cursor.Position;form.Size=new Size(Math.Max(form.MinimumSize.Width,original.Width+current.X-start.X),Math.Max(form.MinimumSize.Height,original.Height+current.Y-start.Y));}};
        grip.MouseUp+=(s,e)=>{if(grip.Capture){grip.Capture=false;original=Size.Empty;if(finished!=null)finished();}};
        Action fit=()=>{
            if(form.Width<2||form.Height<2)return;
            grip.Location=new Point(form.ClientSize.Width-15,form.ClientSize.Height-15);
            grip.Visible=form.WindowState!=FormWindowState.Maximized;
            var old=form.Region;
            using(var path=Rounded(form.ClientRectangle,8))form.Region=form.WindowState==FormWindowState.Maximized?null:new Region(path);
            if(old!=null)old.Dispose();
        };
        form.SizeChanged+=(s,e)=>fit();fit();
    }
    sealed class FrameGrip:Control {
        public FrameGrip(){SetStyle(ControlStyles.SupportsTransparentBackColor|ControlStyles.UserPaint,true);BackColor=DeckTheme.Housing;}
        protected override void OnPaint(PaintEventArgs e){using(var pen=new Pen(Color.FromArgb(108,100,82))){e.Graphics.DrawLine(pen,3,10,10,3);e.Graphics.DrawLine(pen,7,10,10,7);}}
    }
}
