// Mathematical SVG paths are rasterized once, in the final camera coordinates.
// Completed ink subpaths are combined; travel between unrelated subpaths never paints a connecting line.
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)};
const geometry=d=>{const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',d);return p;};
function pointOn(points,cumulative,amount){const distance=cumulative.at(-1)*clamp(amount);let k=0;while(k<cumulative.length-2&&cumulative[k+1]<distance)k++;const f=(distance-cumulative[k])/Math.max(.00001,cumulative[k+1]-cumulative[k]);return points[k].map((x,i)=>x+(points[k+1][i]-x)*f);}
function revealClip(points,width){const path=new Path2D(),r=width/2;for(let i=0;i<points.length;i++){const[x,y]=points[i];path.moveTo(x+r,y);path.arc(x,y,r,0,Math.PI*2);if(!i)continue;const[a,b]=points[i-1],length=Math.hypot(x-a,y-b);if(!length)continue;const nx=-(y-b)/length*r,ny=(x-a)/length*r;path.moveTo(a+nx,b+ny);path.lineTo(x+nx,y+ny);path.lineTo(x-nx,y-ny);path.lineTo(a-nx,b-ny);path.closePath();}return path;}
export class VectorPainting{
 constructor(marks,spec){
  this.marks=marks;this.spec=spec;this.items=spec.geometries.map((raw,index)=>{
   if(!raw)return null;const g={...raw,fillPath:raw.fill?new Path2D(raw.fill):null,fullStroke:new Path2D(),route:[],total:0};let previous=null;const motion=[];
   for(const rawPart of raw.paths){const svg=geometry(rawPart.d),length=svg.getTotalLength(),part={path:new Path2D(rawPart.d),svg,length};g.fullStroke.addPath(part.path);const first=svg.getPointAtLength(0),last=svg.getPointAtLength(length),a=[first.x,first.y],b=[last.x,last.y];
    if(previous){const gap=Math.hypot(a[0]-previous[0],a[1]-previous[1]);if(gap>.001){g.route.push({kind:'travel',start:g.total,end:g.total+gap,a:previous,b:a});g.total+=gap;}}
    g.route.push({kind:'ink',start:g.total,end:g.total+length,part});g.total+=length;const count=Math.max(1,Math.ceil(length/2));for(let i=0;i<=count;i++){const p=svg.getPointAtLength(length*i/count);motion.push([p.x,p.y]);}previous=b;
   }
   if(g.kind==='stroke'&&motion.length>1)marks[index].points=motion;
   return g;
  });
  this.distances=marks.map(m=>{const c=[0];for(let i=1;i<m.points.length;i++)c.push(c.at(-1)+Math.hypot(m.points[i][0]-m.points[i-1][0],m.points[i][1]-m.points[i-1][1]));return c;});
 }
 visible(m,s){return m.element==='sketch'?s.showGuides:m.phase==='wash'?s.showWash:s.showInk;}
 stateAt(at){
  let index=this.marks.findIndex(m=>m.end>at+1e-8);if(index<0)index=this.marks.length;this.current={at,index};let tip=null,penup=false;
  if(index<this.marks.length){const m=this.marks[index],g=this.items[index];if(at>=m.start){const u=clamp((at-m.start)/(m.end-m.start));if(g?.kind==='stroke'&&g.route.length){const distance=g.total*u,span=g.route.find(p=>distance<=p.end)||g.route.at(-1),f=clamp((distance-span.start)/Math.max(.00001,span.end-span.start));if(span.kind==='travel'){tip=span.a.map((x,i)=>x+(span.b[i]-x)*f);penup=true;}else{const p=span.part.svg.getPointAtLength(span.part.length*f);tip=[p.x,p.y];}}else tip=pointOn(m.points,this.distances[index],u);}else{penup=true;const first=m.points[0];if(index){const previous=this.marks[index-1],last=previous.points.at(-1),u=ease((at-previous.end)/Math.max(.01,m.start-previous.end));tip=last.map((x,i)=>x+(first[i]-x)*u);}else tip=first;}}
  return{tip,penup,index};
 }
 paint(ctx,index,progress,age,s,viewScale){
  const m=this.marks[index],g=this.items[index];if(!g||!this.visible(m,s)||progress<=0)return;
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.fillStyle=ctx.strokeStyle=g.color;const wet=ease(age/.9);ctx.globalAlpha*=g.alpha*(1-.05*s.inkBleed*(1-wet));
  if(g.kind==='fill'){
   if(progress<1){const c=this.distances[index],distance=c.at(-1)*progress;let k=0;while(k<c.length-2&&c[k+1]<distance)k++;const tip=pointOn(m.points,c,progress);ctx.clip(revealClip([...m.points.slice(0,k+1),tip],m.width+1));}
   if(g.fillPath){if(s.inkBleed){ctx.save();ctx.globalAlpha*=s.inkBleed*.12*(.25+.75*wet);ctx.lineWidth=.7*s.inkBleed;ctx.stroke(g.fillPath);ctx.restore();}ctx.lineWidth=this.spec.fill_coverage_overlap??1.3;ctx.stroke(g.fillPath);ctx.fill(g.fillPath,'evenodd');}
  }else{
   // A small output-pixel floor keeps subpixel strokes visible at the full composition.
   const width=Math.max(g.width,this.spec.minimum_screen_stroke/Math.max(.01,viewScale));ctx.lineWidth=width;
   const ink=path=>{if(s.inkBleed){ctx.save();ctx.globalAlpha*=s.inkBleed*.15*(.25+.75*wet);ctx.lineWidth=width+.65*s.inkBleed;ctx.stroke(path);ctx.restore();}ctx.stroke(path);};
   if(progress>=1){ink(g.fullStroke);if(g.fillPath)ctx.fill(g.fillPath,'evenodd');}
   else{const distance=g.total*progress;for(const span of g.route){if(span.kind!=='ink'||distance<=span.start)continue;if(distance>=span.end){ink(span.part.path);continue;}const u=clamp((distance-span.start)/(span.end-span.start));ctx.setLineDash([span.part.length*u,span.part.length+1]);ink(span.part.path);ctx.setLineDash([]);break;}}
  }
  ctx.restore();
 }
 draw(ctx,at,s,viewScale){const index=this.current?.at===at?this.current.index:this.stateAt(at).index;for(let i=0;i<index;i++)this.paint(ctx,i,1,at-this.marks[i].end,s,viewScale);if(index<this.marks.length){const m=this.marks[index];if(at>=m.start)this.paint(ctx,index,clamp((at-m.start)/(m.end-m.start)),0,s,viewScale);}}
}
