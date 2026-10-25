// Approved portrait Tj, shared by the animated player and image review.
export const SIGNATURE_WIDTH=1080,SIGNATURE_HEIGHT=1920,WRITE_START=1,WRITE_END=3.5;
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
const curves=[
 [[[100,350],[260,95],[710,105],[978,280]],.025,.035],
 [[[978,280],[840,237],[637,198],[553,244]],.018,.05],
 [[[553,244],[591,560],[333,1045],[395,1285]],.92,.70],
 [[[395,1285],[446,1507],[723,1098],[769,842]],.26,.02],
 [[[769,842],[815,558],[966,732],[828,850]],.025,.40],
 [[[828,850],[891,1146],[785,1502],[631,1657]],.82,.98],
 [[[631,1657],[376,1897],[216,1624],[446,1508]],.82,.025],
 [[[446,1508],[568,1469],[788,1633],[1008,1464]],.02,.004]
];
function bezier(c,t){const u=1-t;return[u*u*u*c[0][0]+3*u*u*t*c[1][0]+3*u*t*t*c[2][0]+t*t*t*c[3][0],u*u*u*c[0][1]+3*u*u*t*c[1][1]+3*u*t*t*c[2][1]+t*t*t*c[3][1]]}
export const signaturePoints=[];let distance=0;
for(let k=0;k<curves.length;k++){const[curve,p0,p1]=curves[k];for(let i=0;i<180;i++){const u=i/179,xy=bezier(curve,u),last=signaturePoints.at(-1),target=k===0?.02+.92*Math.sin(Math.PI*u)**1.2:p0+(p1-p0)*ease(u),pressure=last&&k>0?last.pressure+(target-last.pressure)*ease(u/.13):target;if(last)distance+=Math.hypot(xy[0]-last.x,xy[1]-last.y);signaturePoints.push({x:xy[0],y:xy[1],pressure,distance})}}
for(let i=0;i<signaturePoints.length;i++){const p=signaturePoints[i],lo=signaturePoints[Math.max(0,i-1)],hi=signaturePoints[Math.min(signaturePoints.length-1,i+1)],len=Math.max(.001,Math.hypot(hi.x-lo.x,hi.y-lo.y));p.nx=-(hi.y-lo.y)/len;p.ny=(hi.x-lo.x)/len;p.birth=WRITE_START+(WRITE_END-WRITE_START)*p.distance/distance;}
export function wetSpread(age){age=Math.max(0,age);return .42*(1-Math.exp(-age/.085))+.58*Math.sqrt(Math.min(1,age/2.4))}
function band(ctx,pts,time,bleed,expansion,opacity){if(pts.length<2)return;ctx.beginPath();for(const side of[1,-1]){const list=side===1?pts:[...pts].reverse();for(let i=0;i<list.length;i++){const p=list[i],rough=.7+.2*Math.sin(p.distance*.12+side)+.1*Math.sin(p.distance*.36+side*7),r=.8+p.pressure*65+expansion*bleed*wetSpread(time-p.birth)*rough,x=p.x+p.nx*r*side,y=p.y+p.ny*r*side;if(side===1&&i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}}ctx.closePath();ctx.fillStyle=`rgba(40,48,30,${opacity})`;ctx.fill()}
export function paintSignature(ink,born,time,bleed=1){
 const ctx=ink.getContext('2d'),scale=ink.width/SIGNATURE_WIDTH;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,ink.width,ink.height);ctx.scale(scale,scale);const pts=signaturePoints.filter(p=>p.birth<=Math.min(WRITE_END,time));
 for(let ring=10;ring>=1;ring--)band(ctx,pts,time,bleed,ring*1.65,.035+(10-ring)*.004);band(ctx,pts,time,0,0,1);
 ctx.lineCap='round';const bc=born.getContext('2d');bc.clearRect(0,0,born.width,born.height);bc.lineCap='round';
 for(let i=1;i<pts.length;i++){const p=pts[i],q=pts[i-1];bc.strokeStyle=`rgb(${Math.round(p.birth/5*255)},0,0)`;bc.lineWidth=1.6+p.pressure*130;bc.beginPath();bc.moveTo(q.x,q.y);bc.lineTo(p.x,p.y);bc.stroke();if(i%4===0){const grow=wetSpread(time-p.birth)*bleed;for(const side of[-1,1]){const r=.8+p.pressure*65,length=(3+5*Math.sin(i*1.39)**2)*grow;ctx.strokeStyle='rgba(45,54,35,.16)';ctx.lineWidth=.45;ctx.beginPath();ctx.moveTo(p.x+p.nx*r*side,p.y+p.ny*r*side);ctx.lineTo(p.x+p.nx*(r+length)*side,p.y+p.ny*(r+length)*side);ctx.stroke()}}}
 return pts;
}
