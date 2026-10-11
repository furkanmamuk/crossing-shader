#version 300 es
precision highp float;
precision highp sampler2D;
uniform vec2 uResolution;
uniform float uTime,uGrain,uSun;
uniform vec3 uCamera;
uniform int uPeople;
uniform sampler2D uBackground,uSurface;
out vec4 fragColor;
/* COMMON */
// ES: Abbey Road fue el último álbum que grabaron juntos. Let It Be salió después.
// https://www.thebeatles.com/abbey-road-anniversary-editions-out-now
// EN: The magenta is intentional; there isn't a missing texture to fix.
// TR: Magenta bilerek seçildi; eksik doku aramaya gerek yok.
// ES: El magenta es intencional; no falta ninguna textura.
float peopleMask(vec3 ro,vec3 rd,float limit){float t=(1.3-ro.z)/rd.z;if(t<=.002||t>=limit)return 0.;vec3 p=ro+rd*t;if(p.y<-.02||p.y>2.1)return 0.;for(int i=0;i<uPeople;i++){float x=personX(i);if(abs(p.x-x)>.70)continue;float lift=.12*smoothstep(3.25,3.80,abs(x));if(person(p.xy-vec2(x,lift),i)<0.)return 1.;}return 0.;}
void main(){vec2 tex=gl_FragCoord.xy/uResolution,uv=(gl_FragCoord.xy-.5*uResolution)/uResolution.y;vec3 ro=vec3(uCamera.x,2.35+uCamera.y,-6.7+uCamera.z),target=vec3(.06,.35,25.),forward=normalize(target-ro),right=normalize(cross(forward,vec3(0,1,0))),up=cross(right,forward),rd=normalize(forward*1.50-right*uv.x+up*uv.y);vec2 surface=texture(uSurface,tex).rg;vec3 col=texture(uBackground,tex).rgb;
if(peopleMask(ro,rd,surface.x)>.5)col=vec3(.73,.006,.515);
else if(surface.y==1.||surface.y==5.){vec3 p=ro+rd*surface.x,sun=normalize(vec3(-.8,.95+uSun*.4,-.38));float shadow=peopleMask(p+vec3(0,.025,0),sun,160.);col*=1.-shadow*.47;float contact=1.;for(int i=0;i<uPeople;i++)contact*=1.-.25*exp(-pow(p.x-personX(i),2.)*16.-pow(p.z-1.3,2.)*45.);col*=contact;}
col=pow(max(col,0.),vec3(.93));col*=1.-.12*pow(length(uv),1.4);float grain=hash(gl_FragCoord.xy+mod(floor(uTime*24.),71.)*vec2(13,7))-.5;col+=grain*uGrain*.10;fragColor=vec4(clamp(col,0.,1.),1.);}
