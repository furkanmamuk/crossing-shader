const float PI=3.14159265;
// EN: Four walkers. The GPU fan doesn't count.
const int WALKERS=4;
float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return .53*noise(p)+.27*noise(p*2.03)+.13*noise(p*4.11)+.07*noise(p*8.17);}
float segment(vec2 p,vec2 a,vec2 b,float ra,float rb){vec2 q=p-a,v=b-a;float t=clamp(dot(q,v)/dot(v,v),0.,1.);return length(q-t*v)-mix(ra,rb,t);}
float ellipse(vec2 p,vec2 c,vec2 r){return (length((p-c)/r)-1.)*min(r.x,r.y);}
float cross2(vec2 a,vec2 b){return a.x*b.y-a.y*b.x;}
float edgeDistance(vec2 p,vec2 a,vec2 b,float winding){vec2 e=b-a;return -winding*cross2(e,p-a)/length(e);}
float quad(vec2 p,vec2 a,vec2 b,vec2 c,vec2 d){float w=sign(cross2(b-a,c-a));return max(max(edgeDistance(p,a,b,w),edgeDistance(p,b,c,w)),max(edgeDistance(p,c,d,w),edgeDistance(p,d,a,w)));}
vec2 foot(float phase){float s=fract(phase);if(s<.6)return vec2(mix(.39,-.39,s/.6),.035);s=(s-.6)/.4;return vec2(mix(-.39,.39,s),.035+.085*sin(s*PI));}
float leg(vec2 p,vec2 hip,vec2 ankle,float width,bool bare){vec2 v=ankle-hip;float l=length(v);vec2 knee=(hip+ankle)*.5+vec2(-v.y,v.x)/l*sqrt(max(0.,.505*.505-l*l*.25));float d=segment(p,hip,knee,width,.076);d=min(d,segment(p,knee,ankle,.077,width*.93));d=min(d,ellipse(p,ankle+vec2(.063,-.006),vec2(bare?.10:.128,bare?.027:.040)));return d;}
// TR: Paul burada da yalınayak, kapaktaki gibi. Ayakkabıyı unutmadık.
// Each of the four profiles is built from signed-distance shapes.
float person(vec2 p,int id){float height=id==0?.99:id==1?1.0:id==2?.98:1.035;p.y/=height;
 float ph=uTime*.72+(id==1?.52:.02+float(id)*.009),bob=.006*cos(ph*4.*PI);vec2 hip=vec2(-.038,.985+bob);float width=id==0?.086:.099;
 float d=leg(p,hip,foot(ph+.5),width,id==1);d=min(d,leg(p,hip,foot(ph),width,id==1));p.y-=bob;
 float coat=id==0?.94:id==1?.86:id==2?.79:.75;
 d=min(d,quad(p,vec2(-.185,coat),vec2(.135,coat+.035),vec2(.11,1.48),vec2(-.125,1.49)));
 d=min(d,ellipse(p,vec2(-.024,1.37),vec2(.141,.20)));
 d=min(d,segment(p,vec2(.018,1.49),vec2(.046,1.62),.058,.06));
 d=min(d,ellipse(p,vec2(.032,1.715),vec2(.108,.133)));
 d=min(d,ellipse(p,vec2(-.018,1.758),vec2(.112,.123)));
 float hair=id==0?1.52:id==1?1.67:id==2?1.62:1.50;
 d=min(d,quad(p,vec2(-.126,1.79),vec2(-.15,hair),vec2(-.025,hair+.015),vec2(.065,1.775)));
 d=min(d,quad(p,vec2(.104,1.753),vec2(.164,1.688),vec2(.11,1.672),vec2(.088,1.68)));
 d=min(d,ellipse(p,vec2(.077,1.654),vec2(.050,.064)));
 if(id==0||id==3)d=min(d,ellipse(p,vec2(.10,1.645),vec2(.065,.040)));
 float swing=sin(ph*2.*PI);vec2 shoulder=vec2(.005,1.42),elbow=vec2(.02+.10*swing,1.19),hand=vec2(.07+.18*swing,1.015);
 if(id==1){elbow=vec2(-.018-.07*swing,1.15);hand=vec2(-.03-.11*swing,.91);}
 d=min(d,segment(p,shoulder,elbow,.075,.052));d=min(d,segment(p,elbow,hand,.052,.040));d=min(d,ellipse(p,hand,vec2(.043,.062)));return d;}
// ES: Salen por un lado y vuelven por el otro. El paseo sigue.
float personX(int i){return mod(float(i)*1.27+uTime*.936+5.715,15.24)-7.62;}
