#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime,uGrain,uSun;
uniform vec3 uCamera;
uniform ivec2 uTrees;
uniform ivec4 uCounts;
uniform int uPeople,uBranches;
layout(location=0) out vec4 fragColor;
#ifdef ENVIRONMENT_PASS
layout(location=1) out vec4 surfaceData;
#endif
/* COMMON */
struct Hit{float t;vec3 n;float mat;};
bool boundsRay(vec3 ro,vec3 rd,vec3 lo,vec3 hi,float limit){vec3 a=(lo-ro)/rd,b=(hi-ro)/rd,n=min(a,b),f=max(a,b);float near=max(max(n.x,n.y),n.z),far=min(min(f.x,f.y),f.z);return far>max(.002,near)&&near<limit;}
void boxHit(vec3 ro,vec3 rd,vec3 lo,vec3 hi,float mat,inout Hit h){vec3 a=(lo-ro)/rd,b=(hi-ro)/rd,near=min(a,b),far=max(a,b);float t=max(max(near.x,near.y),near.z),end=min(min(far.x,far.y),far.z);if(t>.002&&t<end&&t<h.t){h=Hit(t,-sign(rd)*step(near.yzx,near.xyz)*step(near.zxy,near.xyz),mat);}}
void ellipsoid(vec3 ro,vec3 rd,vec3 c,vec3 r,float mat,inout Hit h){vec3 q=(ro-c)/r,v=rd/r;float a=dot(v,v),b=dot(q,v),disc=b*b-a*(dot(q,q)-1.);if(disc<0.)return;float t=(-b-sqrt(disc))/a;if(t>.002&&t<h.t)h=Hit(t,normalize((ro+rd*t-c)/(r*r)),mat);}
void capsule(vec3 ro,vec3 rd,vec3 a,vec3 b,float r,float mat,inout Hit hit){vec3 ba=b-a,oa=ro-a;float baba=dot(ba,ba),bard=dot(ba,rd),baoa=dot(ba,oa);float A=baba-bard*bard,B=baba*dot(rd,oa)-baoa*bard,C=baba*dot(oa,oa)-baoa*baoa-r*r*baba,H=B*B-A*C;if(H<0.)return;float t=(-B-sqrt(H))/A,y=baoa+t*bard;if(y>0.&&y<baba&&t>.002&&t<hit.t){hit=Hit(t,normalize(oa+t*rd-ba*y/baba),mat);}else{ellipsoid(ro,rd,y<=0.?a:b,vec3(r),mat,hit);}}
// TR: 8 Ağustos 1969'da Iain Macmillan fotoğrafları bir merdivenden çekti.
// Bir polis de trafiği durdurdu. Burada kamera birkaç vektörden ibaret.
// https://www.thebeatles.com/abbey-road-anniversary-editions-out-now
// Curbs, road markings and roadside objects all use this centre line.
float roadCurve(float z){return -3.1*smoothstep(12.,105.,z)+.65*sin(max(0.,z-16.)*.025)*smoothstep(12.,55.,z);}
float roadSlope(float z){return (roadCurve(z+.15)-roadCurve(z-.15))/.30;}
void yawBox(vec3 ro,vec3 rd,vec3 c,vec3 size,float yaw,float mat,inout Hit h){float cs=cos(yaw),sn=sin(yaw);mat2 rot=mat2(cs,-sn,sn,cs);vec3 q=ro-c,v=rd;q.xz=rot*q.xz;v.xz=rot*v.xz;Hit local=Hit(h.t,h.n,h.mat);boxHit(q,v,-size,size,mat,local);if(local.t<h.t){local.n.xz=transpose(rot)*local.n.xz;h=local;}}
void street(vec3 ro,vec3 rd,inout Hit h){
 // Keep the raised pavement outside the curved road edge.
 if(rd.y<-.0001){float t=(.12-ro.y)/rd.y;vec3 p=ro+rd*t;if(t>.002&&t<h.t&&abs(p.x-roadCurve(p.z))>3.50)h=Hit(t,vec3(0,1,0),5.);}
 for(int i=0;i<uCounts.x;i++){float z=-6.+float(i)*10.,mid=z+5.,bend=roadCurve(mid),yaw=-atan(roadSlope(mid));for(int side=-1;side<=1;side+=2){float x=float(side);yawBox(ro,rd,vec3(bend+x*3.55,.045,mid),vec3(.075,.075,5.12),yaw,2.,h);yawBox(ro,rd,vec3(bend+x*5.04,.46,mid),vec3(.12,.34,5.13),yaw,3.,h);float height=x<0.?1.40:.96;boxHit(ro,rd,vec3(bend+x*5.04-.20,.12,z+1.),vec3(bend+x*5.04+.20,height,z+1.34),x<0.?2.:3.,h);}}
 for(int i=0;i<uCounts.y;i++){float f=float(i),z=18.5+f*13.2,seed=hash(vec2(f,18)),bend=roadCurve(z+6.),setback=6.65+.9*seed,height=6.6+1.8*hash(vec2(f,51));boxHit(ro,rd,vec3(bend+setback,.12,z),vec3(bend+12.,height,z+11.6),11.,h);boxHit(ro,rd,vec3(bend+setback-.10,height-.13,z-.08),vec3(bend+12.,height+.12,z+11.7),2.,h);if(i>1)boxHit(ro,rd,vec3(bend-12.,.12,z+5.),vec3(bend-7.3,5.1+.6*seed,z+16.5),12.,h);}
 // Hedges hide the lower parts of the buildings, as in the photograph.
 for(int i=0;i<uCounts.y;i++){float z=6.+float(i)*14.,bend=roadCurve(z);for(int side=-1;side<=1;side+=2){float v=float(side);ellipsoid(ro,rd,vec3(bend+v*(5.4+.5*hash(vec2(i,side))),1.32,z),vec3(.92,1.06,6.4),6.,h);}}
 // Approximate the curved road edge when finding hits on the railings.
 for(int side=-1;side<=1;side+=2){float x=float(side)*4.93,t=(x-ro.x)/rd.x;for(int k=0;k<3;k++){float z=ro.z+rd.z*t;t=(x+roadCurve(z)-ro.x)/rd.x;}vec3 p=ro+rd*t;if(t>.002&&t<h.t&&p.z>3.&&p.y>.67&&p.y<1.40){if(abs(mod(p.z,.24)-.12)<.014||abs(p.y-1.29)<.018)h=Hit(t,vec3(-sign(rd.x),0,0),8.);}}
 // A few building shapes fill the far end of the street.
 float far=156.,bend=roadCurve(far);boxHit(ro,rd,vec3(bend-4.8,0,far),vec3(bend+3.7,3.8,far+8.),12.,h);boxHit(ro,rd,vec3(bend-1.9,3.8,far+1.),vec3(bend+.8,4.5,far+8.),11.,h);
}
vec3 treeCenter(int i){int halfCount=uTrees.x/2;float side=i<halfCount?-1.:1.,row=float(i%halfCount),seed=hash(vec2(row,side*7.));float z=3.5+row*9.6+2.8*seed+(side>0.?2.6+(row>.5?6.:0.):0.);float y=4.55+1.15*hash(vec2(row+3.,side));float edge=side>0.&&row<.5?7.35:5.15+.65*(seed-.5);return vec3(roadCurve(z)+side*edge,y,z);}
void trees(vec3 ro,vec3 rd,inout Hit h){for(int i=0;i<uTrees.x;i++){vec3 c=treeCenter(i);if(!boundsRay(ro,rd,c+vec3(-4.5,-6.3,-4.6),c+vec3(4.5,4.7,4.6),h.t))continue;vec3 bounds=vec3(4.45,4.65,4.55),q=(ro-c)/bounds,v=rd/bounds;float row=float(i%(uTrees.x/2)),growth=i<uTrees.x/2?1.02:row<.5?1.08:.78+.14*hash(vec2(row,39)),a=dot(v,v),b=dot(q,v),disc=b*b-a*(dot(q,q)-1.);
 {capsule(ro,rd,vec3(c.x,.12,c.z),c+vec3(.25,-.35,.1),.16,7.,h);for(int branch=0;branch<uBranches;branch++){float f=float(branch);capsule(ro,rd,c+vec3(.10,-2.5,.05),c+vec3(sin(f*2.2+row)*1.9,.4,cos(f*2.2+row)*1.6),.075,7.,h);}}
 if(disc<0.)continue;float root=sqrt(disc),t0=max(.002,(-b-root)/a),t1=min(h.t,(-b+root)/a);if(t0>=t1)continue;
 for(int j=0;j<uTrees.y;j++){float f=float(j);vec3 cc=c+vec3(sin(f*2.399+row)*2.20,cos(f*1.9+row)*1.65,cos(f*2.399+row*.7)*2.0)*growth,r=vec3(1.90,1.63,1.85)*(1.+.23*sin(f*3.7+row*2.1))*growth;vec3 qq=(ro-cc)/r,vv=rd/r;float aa=dot(vv,vv),bb=dot(qq,vv),dd=bb*bb-aa*(dot(qq,qq)-1.);if(dd<0.)continue;float rt=sqrt(dd),start=max(t0,(-bb-rt)/aa),end=min(h.t,(-bb+rt)/aa);if(start>=end)continue;
  // Sample each leaf cluster once to keep the per-fragment work down.
  // TR: Yapraklar kıpırdasın yeter; fırtınaya gerek yok.
  float t=mix(start,end,.18);vec3 p=ro+rd*t,wind=vec3(.065*sin(uTime*.65+p.z*.28),0,.04*cos(uTime*.4+p.y));vec3 local=(p+wind-cc)/r;float leaf=noise((p+wind).xz*27.+p.y*vec2(17.,13.));if(length(local)+.42*(fbm(p.xy*2.2+p.z*vec2(.71,.83))-.5)<.90&&leaf>.09){t+=.07*(leaf-.5);p=ro+rd*t;h=Hit(t,normalize(local/r+vec3(noise(p.xy*11.)-.5,noise(p.yz*12.)-.5,leaf-.5)*1.4),6.);}
 }
}}
void wheel(vec3 ro,vec3 rd,vec3 c,inout Hit h){ellipsoid(ro,rd,c,vec3(.105,.27,.28),24.,h);}
// ES: Un Beetle junto a los Beatles. Este se queda aparcado.
void beetle(vec3 ro,vec3 rd,inout Hit h){vec3 c=vec3(-2.73,0,8.4);if(!boundsRay(ro,rd,c+vec3(-.80,.02,-1.6),c+vec3(.80,1.55,1.6),h.t))return;
 ellipsoid(ro,rd,c+vec3(0,.64,0),vec3(.70,.47,1.48),20.,h);ellipsoid(ro,rd,c+vec3(0,1.01,.20),vec3(.60,.49,.93),20.,h);
 for(int s=-1;s<=1;s+=2){float side=float(s);ellipsoid(ro,rd,c+vec3(side*.57,.53,-.48),vec3(.20,.29,.78),20.,h);wheel(ro,rd,c+vec3(side*.65,.30,-.80),h);wheel(ro,rd,c+vec3(side*.65,.30,.88),h);ellipsoid(ro,rd,c+vec3(side*.48,.58,-1.23),vec3(.09,.085,.065),25.,h);}
 boxHit(ro,rd,c+vec3(-.66,.35,-1.49),c+vec3(.66,.405,-1.42),23.,h);boxHit(ro,rd,c+vec3(-.125,.49,-1.49),c+vec3(.125,.65,-1.43),26.,h);
}
void car(vec3 ro,vec3 rd,vec3 c,float mat,inout Hit h){if(!boundsRay(ro,rd,c+vec3(-.80,.01,-1.6),c+vec3(.80,1.55,1.6),h.t))return;
 boxHit(ro,rd,c+vec3(-.67,.35,-1.50),c+vec3(.67,.84,1.5),mat,h);ellipsoid(ro,rd,c+vec3(0,1.0,.25),vec3(.63,.52,1.02),mat,h);boxHit(ro,rd,c+vec3(-.66,.32,-1.57),c+vec3(.66,.40,-1.5),23.,h);
 for(int s=-1;s<=1;s+=2){float side=float(s);wheel(ro,rd,c+vec3(side*.67,.28,-.90),h);wheel(ro,rd,c+vec3(side*.67,.28,.90),h);ellipsoid(ro,rd,c+vec3(side*.46,.65,-1.52),vec3(.11,.105,.035),27.,h);}
}
void cars(vec3 ro,vec3 rd,inout Hit h){beetle(ro,rd,h);car(ro,rd,vec3(roadCurve(16.2)+2.72,0,16.2),21.,h);for(int i=0;i<uCounts.z;i++){float side=i%2==0?-1.:1.,f=float(i),z=22.+float(i/2)*7.6+3.5*hash(vec2(f,4.))+(side<0.?-4.:0.),lane=side*(2.77+.14*hash(vec2(f,17.)));if(i>=20)lane=side*.68;car(ro,rd,vec3(roadCurve(z)+lane,0,z),i%4==0?22.:i%4==1?21.:i%4==2?28.:29.,h);}}
void lamps(vec3 ro,vec3 rd,inout Hit h){for(int i=0;i<uCounts.w;i++){float side=i%2==0?1.:-1.,z=9.+float(i/2)*16.+(side<0.?7.:0.);vec3 c=vec3(roadCurve(z)+side*3.96,.12,z);capsule(ro,rd,c,c+vec3(0,5.3,0),.038,8.,h);capsule(ro,rd,c+vec3(0,5.3,0),c+vec3(-side*.20,5.60,0),.037,8.,h);capsule(ro,rd,c+vec3(-side*.20,5.60,0),c+vec3(-side*.80,5.60,0),.037,8.,h);ellipsoid(ro,rd,c+vec3(-side*.84,5.55,0),vec3(.19,.08,.14),2.,h);}}
void people(vec3 ro,vec3 rd,inout Hit h){float t=(1.3-ro.z)/rd.z;if(t<=.002||t>=h.t)return;vec3 p=ro+t*rd;if(p.y<-.02||p.y>2.1)return;for(int i=0;i<uPeople;i++){float x=personX(i);if(abs(p.x-x)>.70)continue;float lift=.12*smoothstep(3.25,3.80,abs(x));if(person(p.xy-vec2(x,lift),i)<0.)h=Hit(t,vec3(0,0,-sign(rd.z)),10.);}}
Hit trace(vec3 ro,vec3 rd){Hit h=Hit(160.,vec3(0,1,0),0.);if(rd.y<-.0001){float t=-ro.y/rd.y;if(t>.002&&t<h.t)h=Hit(t,vec3(0,1,0),1.);}
#if DEBUG_STAGE >= 1
street(ro,rd,h);
#endif
#if DEBUG_STAGE >= 2
cars(ro,rd,h);lamps(ro,rd,h);
#endif
#if DEBUG_STAGE >= 3
 trees(ro,rd,h);
#endif
#if DEBUG_STAGE >= 4 && !defined(ENVIRONMENT_PASS)
 people(ro,rd,h);
#endif
return h;}
// Use simpler shapes for shadows so we don't repeat the full scene query.
Hit shadowTrace(vec3 ro,vec3 rd){Hit h=Hit(160.,vec3(0,1,0),0.);for(int side=-1;side<=1;side+=2){float x=float(side)*5.04,t=(x-ro.x)/rd.x;for(int k=0;k<3;k++)t=(x+roadCurve(ro.z+rd.z*t)-ro.x)/rd.x;vec3 p=ro+rd*t;if(t>.002&&t<h.t&&p.z>3.&&p.y>0.&&p.y<.80)h=Hit(t,vec3(-sign(rd.x),0,0),3.);}for(int i=0;i<uTrees.x;i++){vec3 c=treeCenter(i);ellipsoid(ro,rd,c,vec3(3.5,3.1,3.6),6.,h);}boxHit(ro,rd,vec3(-3.43,.12,6.9),vec3(-2.03,1.5,9.9),20.,h);boxHit(ro,rd,vec3(2.02,.12,14.7),vec3(3.42,1.5,17.7),21.,h);
#ifndef ENVIRONMENT_PASS
people(ro,rd,h);
#endif
return h;}
vec3 sky(vec3 rd){float clouds=fbm(rd.xz*4./max(.08,rd.y));return mix(vec3(.68,.86,.81),vec3(.27,.79,.86),clamp(rd.y*1.4+.45,0.,1.))+smoothstep(.65,.82,clouds)*.025;}
vec3 material(Hit h,vec3 p){float m=h.mat;vec3 base=vec3(.8,.8,.72);
 if(m==1.){base=vec3(.20,.23,.22);float stripe=1.-smoothstep(.34,.36,abs(mod(p.x+.625,1.25)-.625)),edge=3.10+.035*p.x,crossing=step(-2.8,p.z)*step(p.z,edge),wear=smoothstep(.20,.28,noise(p.xz*115.));base=mix(base,vec3(.88,.89,.76),stripe*crossing*(.90+.10*wear));float line=(1.-step(.041,abs(p.x-roadCurve(p.z)-.08)))*step(3.4,p.z)*step(.40,fract((p.z+.6)/3.3));base=mix(base,vec3(.86,.86,.72),line);base+=(noise(p.xz*210.)-.5)*.085+(hash(floor(p.xz*550.))-.5)*.10;}
 if(m==2.)base=vec3(.76,.76,.65)+(noise(p.xy*110.)-.5)*.04;
 if(m==3.||m==11.){base=m==3.?vec3(.34,.32,.23):vec3(.52,.43,.29);vec2 face=abs(h.n.x)>.5?p.zy:p.xy;float rows=floor(face.y*9.),mortar=step(.96,fract(face.y*9.))+step(.97,fract(face.x*5.+rows*.5));base*=.82+.25*hash(vec2(floor(face.x*5.+rows*.5),rows));base=mix(base,vec3(.54,.52,.41),clamp(mortar,0.,1.)*.40);
  if(m==11.){vec2 cell=vec2(mod(face.x,1.75),mod(face.y-.5,2.25));float window=step(.37,cell.x)*step(cell.x,1.18)*step(.42,cell.y)*step(cell.y,1.63),frame=step(.33,cell.x)*step(cell.x,1.22)*step(.38,cell.y)*step(cell.y,1.67);base=mix(base,vec3(.68,.68,.56),frame);base=mix(base,vec3(.13,.21,.22),window);if(window>.5&&(abs(cell.x-.775)<.025||abs(cell.y-1.02)<.024))base=vec3(.62,.62,.53);if(mod(p.y,2.25)<.065)base=vec3(.66,.63,.51);}}
 if(m==12.){base=vec3(.70,.71,.61);vec2 f=abs(h.n.x)>.5?p.zy:p.xy,cell=mod(f,vec2(1.7,2.15));if(cell.x>.38&&cell.x<1.13&&cell.y>.4&&cell.y<1.6)base=vec3(.13,.19,.19);}
 if(m==5.){base=vec3(.47,.49,.43)+(noise(p.xz*75.)-.5)*.08;float seam=1.-smoothstep(.008,.024,min(abs(mod(p.x,.9)-.45),abs(mod(p.z,1.4)-.7)));base*=1.-.22*seam;}
 if(m==6.){float leaf=hash(floor(p.xy*43.)+floor(p.z*31.)),cluster=fbm(p.xz*2.+p.y);base=mix(vec3(.032,.085,.049),vec3(.25,.39,.10),smoothstep(.15,.85,leaf)*(.50+.5*cluster));}
 if(m==7.)base=vec3(.18,.18,.13)+(noise(p.xy*23.)-.5)*.05;if(m==8.)base=vec3(.21,.26,.23);
 if(m==20.){vec3 q=p-vec3(-2.73,0,8.4);base=vec3(.83,.84,.69);float rear=ellipse(q.xy,vec2(0,1.18),vec2(.38,.18)),side=abs(q.x)>.49&&q.y>.94&&q.y<1.33&&q.z>-.32&&q.z<.82?1.:0.;if((q.z<-.35&&rear<0.)||side>.5)base=vec3(.08,.18,.20);if(abs(q.x)<.39&&q.y>.68&&q.y<.84&&q.z<-1.2)base*=.78;if(abs(q.x)<.017&&q.y>.43&&q.y<.98&&q.z<-1.0)base*=.80;}
 if(m==21.||m==22.||m==28.||m==29.){base=m==21.?vec3(.055,.075,.078):m==22.?vec3(.66,.69,.63):m==28.?vec3(.23,.34,.35):vec3(.36,.28,.20);if(p.y>.91&&p.y<1.38){base=vec3(.09,.19,.22);if(abs(h.n.x)>.4&&mod(p.z,.9)<.035)base=vec3(.57,.59,.52);}if(p.y>.42&&p.y<.47)base=vec3(.50,.52,.48);}
 if(m==23.)base=vec3(.60,.66,.66);if(m==24.)base=vec3(.018,.024,.024);if(m==25.)base=vec3(.35,.07,.035);if(m==26.){base=vec3(.12,.14,.12);if(hash(floor(p.xy*70.))>.55)base+=.38;}if(m==27.)base=vec3(.81,.82,.62);return base;
}
void main(){vec2 uv=(gl_FragCoord.xy-.5*uResolution)/uResolution.y;vec3 ro=vec3(uCamera.x,2.35+uCamera.y,-6.7+uCamera.z),target=vec3(.06,.35,25.),forward=normalize(target-ro),right=normalize(cross(forward,vec3(0,1,0))),up=cross(right,forward),rd=normalize(forward*1.50-right*uv.x+up*uv.y);
 Hit h=trace(ro,rd);vec3 col=sky(rd),sun=normalize(vec3(-.8,.95+uSun*.4,-.38));
 if(h.mat>0.){vec3 p=ro+rd*h.t,base=material(h,p);if(h.mat==10.)col=vec3(.73,.006,.515);
  else{float diffuse=max(0.,dot(h.n,sun)),shade=1.;if(h.mat==6.)shade=.45+.55*noise(p.xz*1.7);else{
#if DEBUG_STAGE >= 5
Hit sh=shadowTrace(p+h.n*.025,sun);shade=sh.mat>0.?0.:1.;if(sh.mat==6.)shade=.12+.68*smoothstep(.32,.72,fbm(p.xz*3.8+uTime*.015));
#endif
}
   float ambient=.37+.12*max(h.n.y,0.);col=base*(ambient+.83*diffuse*shade)*vec3(1.035,1.025,.95);
   if(h.mat>=20.&&h.mat!=24.){float spec=pow(max(0.,dot(reflect(-sun,h.n),-rd)),50.),fresnel=pow(1.-abs(dot(-rd,h.n)),3.);col+=spec*.33*shade+sky(reflect(rd,h.n))*fresnel*.16;}

#ifndef ENVIRONMENT_PASS
if(h.mat==1.||h.mat==5.){float contact=1.;for(int i=0;i<uPeople;i++)contact*=1.-.25*exp(-pow(p.x-personX(i),2.)*16.-pow(p.z-1.3,2.)*45.);col*=contact;}
#endif
col=mix(col,vec3(.68,.76,.71),1.-exp(-h.t*.0035));}}

#ifdef ENVIRONMENT_PASS
 fragColor=vec4(col,1.);surfaceData=vec4(h.t,h.mat,0,0);return;
#endif
 col=pow(max(col,0.),vec3(.93));col*=1.-.12*pow(length(uv),1.4);float grain=hash(gl_FragCoord.xy+mod(floor(uTime*24.),71.)*vec2(13,7))-.5;col+=grain*uGrain*.10;fragColor=vec4(clamp(col,0.,1.),1.);
}
