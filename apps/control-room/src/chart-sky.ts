// Direction-space dust: evaluated at display resolution, with no panorama seams
// or magnified low-resolution sky pixels. Coordinates remain infinitely distant.
export const skyFragment=`
varying vec3 vRay;
uniform vec3 uTint;uniform float uSeed,uHologram;
float hash3(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float dust(vec3 p){float n=0.,a=.5;for(int i=0;i<5;i++){n+=a*noise3(p);p=p*2.07+vec3(13.1,7.7,19.3);a*=.49;}return n;}
void main(){
 vec3 d=normalize(vRay);d.yz=mat2(.94,.342,-.342,.94)*d.yz;
 vec3 q=d*vec3(1.,1.35,1.)+vec3(uSeed,0.,uSeed*.37);
 float broad=dust(q*3.4),filaments=dust(q*46.+vec3(broad*7.));
 float band=exp(-pow((d.y+(broad-.5)*.55)*3.8,2.));
 float veil=smoothstep(.27,.76,broad)*band;
 float lanes=smoothstep(.3,.66,filaments);
 float grains=noise3(q*280.);
 float distant=pow(max(0.,filaments),3.)*band*(.72+grains*.56);
 vec3 color=vec3(.0005,.0009,.0017)+uTint*(veil*.038+ distant*.026);
 color*=mix(.22,1.,lanes);
 // A little neutral starlight keeps the coloured dust photographic rather than neon.
 color+=vec3(.014,.016,.019)*distant;
 color=mix(color,vec3(.0007,.0012,.0017)+uTint*.004,uHologram);
 gl_FragColor=vec4(color,1.);
 #include <colorspace_fragment>
}`;
