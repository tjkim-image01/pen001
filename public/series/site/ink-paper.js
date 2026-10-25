// A paper / wet-pigment material. Height-derived normals and age-dependent
// roughness are evaluated in a fragment shader; the authored path stays editable.
export class InkPaperMaterial {
 constructor(){
  this.canvas=document.createElement('canvas');this.canvas.width=1500;this.canvas.height=978;
  this.gl=this.canvas.getContext('webgl',{alpha:false,premultipliedAlpha:false,preserveDrawingBuffer:true});
  if(!this.gl)return;const g=this.gl;
  const compile=(kind,source)=>{const s=g.createShader(kind);g.shaderSource(s,source);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(s));return s};
  const p=g.createProgram();g.attachShader(p,compile(g.VERTEX_SHADER,'attribute vec2 pos;varying vec2 uv;void main(){uv=pos*.5+.5;gl_Position=vec4(pos,0.,1.);}'));
  g.attachShader(p,compile(g.FRAGMENT_SHADER,`precision highp float;
  varying vec2 uv;uniform sampler2D ink;uniform sampler2D born;uniform float clock;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
  float height(vec2 p){return .48*noise(p*vec2(115.,1850.))+.32*noise(p*vec2(2100.,170.))+.2*noise(p*1800.);}
  void main(){vec2 p=vec2(uv.x,1.-uv.y);float fiber=height(p),h=height(p+vec2(.00065,0.))-height(p-vec2(.00065,0.));
   vec4 pigment=texture2D(ink,p);float a=pigment.a;float birth=texture2D(born,p).r*5.;float wet=exp(-max(0.,clock-birth)*1.35);
   vec3 paper=vec3(.972549,.960784,.917647)+(fiber-.5)*.024+h*.008;
   vec3 dry=vec3(.125,.144,.108)+(fiber-.5)*.045;
   vec3 black=mix(dry,vec3(.060,.080,.060),wet*.72);
   float glint=pow(max(0.,.5+h*.8),9.)*wet*.075;black+=glint;
   // Paper pores remain visible inside pigment, avoiding a plastic solid fill.
   a*=.97+.03*noise(p*2200.);gl_FragColor=vec4(mix(paper,black,a),1.);
  }`));g.linkProgram(p);if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(p));this.program=p;g.useProgram(p);
  const b=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,b);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),g.STATIC_DRAW);const loc=g.getAttribLocation(p,'pos');g.enableVertexAttribArray(loc);g.vertexAttribPointer(loc,2,g.FLOAT,false,0,0);
  this.textures=[0,1].map(i=>{const t=g.createTexture();g.activeTexture(g.TEXTURE0+i);g.bindTexture(g.TEXTURE_2D,t);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);return t});g.uniform1i(g.getUniformLocation(p,'ink'),0);g.uniform1i(g.getUniformLocation(p,'born'),1);this.clock=g.getUniformLocation(p,'clock');
 }
 render(ink,born,time){if(!this.gl)return ink;const g=this.gl;g.useProgram(this.program);for(const [i,source]of [ink,born].entries()){g.activeTexture(g.TEXTURE0+i);g.bindTexture(g.TEXTURE_2D,this.textures[i]);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,source)}g.uniform1f(this.clock,time);g.viewport(0,0,this.canvas.width,this.canvas.height);g.drawArrays(g.TRIANGLE_STRIP,0,4);return this.canvas}
}
