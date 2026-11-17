using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Windows.Forms;

// Original approved PNG materials, nine-sliced at runtime. No website runtime
// or generated labels are embedded in the native companion.
internal static class DeckTheme {
    static readonly Dictionary<string,Image> images=new Dictionary<string,Image>();
    static DeckTheme(){AppDomain.CurrentDomain.ProcessExit+=(s,e)=>{foreach(var image in images.Values)image.Dispose();images.Clear();};}
    static Image Get(string name){
        Image result;if(images.TryGetValue(name,out result))return result;
        string file=name=="panorama"?"division-overview.png":name=="instrument"?"flight-console-a-frame.png":name=="button"?"hologram-button.png":"black-gold-d-frame.png";
        using(var source=Image.FromFile(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"app","desktop","theme",file)))result=new Bitmap(source);
        images[name]=result;return result;
    }
    internal static void Panorama(Graphics g,Rectangle bounds){
        try{var image=Get("panorama");float scale=Math.Max((float)bounds.Width/image.Width,(float)bounds.Height/image.Height);
            var state=g.Save();g.SetClip(bounds);g.DrawImage(image,bounds.X+(bounds.Width-image.Width*scale)/2,bounds.Y+(bounds.Height-image.Height*scale)/2,image.Width*scale,image.Height*scale);
            using(var shade=new SolidBrush(Color.FromArgb(135,3,12,19)))g.FillRectangle(shade,bounds);g.Restore(state);
        }catch(IOException){}catch(ArgumentException){}
    }
    internal static void Draw(Graphics g,string name,Rectangle target,float brightness){
        if(target.Width<4||target.Height<4)return;
        try{
            var image=Get(name);bool instrument=name=="instrument",button=name=="button";
            // Remove the transparent production-sheet margin when sampling.
            int left=(int)(image.Width*(instrument ? .008 : button ? .005 : .022));
            int top=(int)(image.Height*(instrument ? .02 : button ? .15 : .13));
            int width=(int)(image.Width*(instrument ? .984 : button ? .99 : .956));
            int height=(int)(image.Height*(instrument ? .96 : button ? .69 : .74));
            int sx=Math.Max(1,(int)(width*(instrument ? .12 : .13))),sy=Math.Max(1,(int)(height*(instrument ? .19 : .27)));
            int edge=Math.Max(2,(int)((instrument?20:button?10:13)*g.DpiX/96));
            int dx=Math.Min(edge,target.Width/3),dy=Math.Min(edge,target.Height/3);
            int[] xs={left,left+sx,left+width-sx,left+width},ys={top,top+sy,top+height-sy,top+height};
            int[] tx={target.Left,target.Left+dx,target.Right-dx,target.Right},ty={target.Top,target.Top+dy,target.Bottom-dy,target.Bottom};
            using(var attributes=new ImageAttributes()){
                attributes.SetWrapMode(System.Drawing.Drawing2D.WrapMode.TileFlipXY);
                var matrix=new ColorMatrix();matrix.Matrix00=matrix.Matrix11=matrix.Matrix22=brightness;attributes.SetColorMatrix(matrix);
                for(int y=0;y<3;y++)for(int x=0;x<3;x++)g.DrawImage(image,new Rectangle(tx[x],ty[y],tx[x+1]-tx[x],ty[y+1]-ty[y]),xs[x],ys[y],xs[x+1]-xs[x],ys[y+1]-ys[y],GraphicsUnit.Pixel,attributes);
            }
        }catch(IOException){g.Clear(Color.FromArgb(8,18,24));}catch(ArgumentException){g.Clear(Color.FromArgb(8,18,24));}
    }
}
internal sealed class DeckSurface : TableLayoutPanel {
    public bool ShowDivision {get;set;}
    public DeckSurface(){BackColor=Color.FromArgb(8,18,24);SetStyle(ControlStyles.OptimizedDoubleBuffer|ControlStyles.ResizeRedraw,true);}
    protected override void OnPaintBackground(PaintEventArgs e){e.Graphics.Clear(BackColor);DeckTheme.Draw(e.Graphics,"gold",ClientRectangle,1f);if(ShowDivision){int edge=(int)(14*e.Graphics.DpiX/96);DeckTheme.Panorama(e.Graphics,Rectangle.Inflate(ClientRectangle,-edge,-edge));}}
}
