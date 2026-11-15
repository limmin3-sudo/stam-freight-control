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
 // An inclined dust lane with nested elongated filaments, not isotropic smoke blobs.
 vec3 q=d+vec3(uSeed,0.,uSeed*.37);
 float warp=noise3(q*3.2);
 float latitude=d.y+(warp-.5)*.23;
 float band=exp(-pow(latitude*6.,2.));
 float broad=dust(q*vec3(3.,7.,3.));
 float filament=dust(q*vec3(19.,64.,19.)+vec3(broad*3.));
 float extinction=smoothstep(.30,.63,filament);
 float veil=smoothstep(.28,.72,broad)*band;
 float core=pow(max(0.,filament),2.5)*band;
 // Fade subpixel grains; detail must not shimmer when orbiting or enlarge on zoom.
 float frequency=220.;
 float resolve=1.-smoothstep(.4,1.3,length(fwidth(q))*frequency);
 float grains=mix(.5,noise3(q*frequency),resolve);
 vec3 color=vec3(.00035,.0006,.0011);
 color+=uTint*(veil*.025+core*.026)*mix(.12,1.,extinction);
 color+=vec3(.018,.019,.021)*core*extinction*(.72+grains*.38);
 color=mix(color,vec3(.0006,.001,.0015)+color*.18,uHologram);
 gl_FragColor=vec4(color,1.);
 #include <colorspace_fragment>
}`;
