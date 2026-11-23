import { useEffect, useMemo, useRef } from 'react';

export interface WaterButtonProps {
  label: string;
  doneLabel?: string;
  matchLabel?: string;
  active?: boolean;
  filled?: boolean;
  shape?: 'puddle' | 'pill' | 'circle';
  theme?: 'dark' | 'light';
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
  scale?: number;
}

const FONT_SIZE = 54;
const EQUAL_PAD = 72;
const MARGIN = 22;
const CSS_SCALE = 0.381;

const LOOP = 8;
const WAKE = 14;
const WAKE_STEP = 0.075;
const WAKE_LIFE = 1.1;
const WAKE_GAP = 4;
const CLICK_LEN = 4.4;
const HOVER_RATE = 6;
const FOLLOW_RATE = 7;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const eOut = (u: number) => 1 - Math.pow(1 - clamp(u), 5);
const eIO = (u: number) => {
  u = clamp(u);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
};

function clickState(a: number) {
  if (a < 0 || a > CLICK_LEN) return { pz: -1, glob: 0, la: 1, lb: 0 };
  const glob = a < 0.18 ? eOut(a / 0.18) : 1 - eIO((a - 0.18) / 0.55);
  const la = 1 - eOut((a - 0.3) / 0.35);
  const lb = eIO((a - 0.75) / 0.6) * (1 - eIO((a - 3.3) / 0.5));
  const la2 = eIO((a - 3.6) / 0.6);
  return { pz: a, glob, la: Math.max(la, la2), lb };
}

function measureLabelWidth(text: string): number {
  if (typeof document === 'undefined') return text.length * 26;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  if (!ctx) return text.length * 26;
  ctx.font = `400 ${FONT_SIZE}px "Instrument Serif", Georgia, serif`;
  return Math.ceil(ctx.measureText(text).width);
}

const VS = `#version 300 es
in vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;

// Exact coastal-drive full-pill black water/ferrofluid shader: rich obsidian liquid capsule,
// studio Fresnel rim reflections, specular glints, magnetic hover bulge, 14-ring wake,
// 3-ring click ripples, and normal-refracted crisp pure-white Instrument Serif label.
const FS = `#version 300 es
precision highp float;
uniform vec2 uRes,uStage;uniform float uT,uLoop,uActive,uFilled;uniform vec4 uBtn;uniform float uRad;
uniform vec3 uCur;uniform vec3 uTr[14];
uniform vec4 uPulse;
uniform vec2 uLab;
uniform sampler2D uTex;
out vec4 o;
const float TAU=6.2831853;
float sq(float x){return x*x;}
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float sdBox(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float H(vec2 p){
 vec2 c=uBtn.xy,hb=uBtn.zw*.5;
 float d=sdBox(p-c,hb,uRad);
 float m=max(-d,0.);
 float h=7.*(1.-exp(-m/9.));
 float ph=TAU*uT/uLoop;
 float inner=smoothstep(2.,24.,m);
 h+=.45*sin(p.x*.03+ph)*sin(p.y*.05-ph*2.)*inner;
 vec2 b=p-uCur.xy;
 h+=uCur.z*7.*exp(-dot(b,b)/(2.*40.*40.))*inner;
 for(int i=0;i<14;i++){vec3 w=uTr[i];if(w.z<0.)continue;
  float r=length(p-w.xy),fr=r-150.*w.z;
  h+=1.5*exp(-w.z*2.6)*exp(-fr*fr/(2.*26.*26.))*cos(fr*.13)*inner;}
 vec2 k=p-uPulse.xy;float rc=length(k);
 h+=uPulse.w*16.*exp(-rc*rc/(2.*46.*46.))*inner;
 float a=uPulse.z-.25;
 if(a>0.){for(int j=0;j<3;j++){float aj=a-float(j)*.16;if(aj<0.)break;float rr=230.*aj;
  h+=(4.2-float(j)*1.1)*exp(-aj*1.3)*exp(-sq((rc-rr)/48.))*cos((rc-rr)*.1)*inner;}}
 return h;}
vec3 env(vec3 r){
 float a=length(r.xy);
 float room=mix(.012,1.,pow(smoothstep(.28,1.,a),1.55))*(.62+.38*clamp(-r.y/max(a,1e-3),-1.,1.));
 float sb=smoothstep(.05,0.,sdBox(r.xy-vec2(-.18,-.4),vec2(.3,.07),.05))*1.45;
 float st=smoothstep(.035,0.,sdBox(r.xy-vec2(.44,.06),vec2(.015,.22),.01))*.88;
 return vec3(room+sb+st)*vec3(1.,.99,.97);}
void main(){
 vec2 uv=vec2(gl_FragCoord.x/uRes.x,1.-gl_FragCoord.y/uRes.y);
 vec2 p=uv*uStage;
 vec2 c=uBtn.xy,hb=uBtn.zw*.5;
 vec4 outCol=vec4(0.);
 if(sdBox(p-c+vec2(0.,22.),hb+vec2(0.,22.),uRad)<2.){
  float e=.8;
  vec2 q=p;float zh=80.,zl=0.;bool hit=false;
  for(int i=1;i<=22;i++){float z=80.*(1.-float(i)/22.);vec2 qq=p+vec2(0.,z*.7);if(H(qq)>=z){zl=z;hit=true;break;}zh=z;}
  if(hit){for(int j=0;j<5;j++){float zm=.5*(zh+zl);if(H(p+vec2(0.,zm*.7))>=zm)zl=zm;else zh=zm;}}
  q=p+vec2(0.,zl*.7);
  float dq=sdBox(q-c,hb,uRad);
  float h0=H(q),hx=H(q+vec2(e,0.)),hy=H(q+vec2(0.,e));
  vec3 n=normalize(vec3(-(hx-h0)/e,-(hy-h0)/e,1.));
  vec3 r=reflect(vec3(0.,0.,-1.),n);r.z=-r.z;
  float F=.05+.95*pow(1.-n.z,4.);
  vec3 refl=env(vec3(r.x,r.y,r.z))*mix(.24,1.,F);
  vec3 L=normalize(vec3(-.35,-.6,.7));
  float spec=pow(max(dot(reflect(-L,n),vec3(0.,.42,.9)),0.),60.)*.92;
  vec2 texUv=(q+n.xy*16.)/uStage;
  vec4 tx=textureLod(uTex,texUv,0.);
  float rawT=clamp(tx.r*uLab.x+tx.g*uLab.y,0.,1.);
  float ta=smoothstep(.08,.70,rawT)*(1.-smoothstep(18.,34.,h0-7.));
  float mask=smoothstep(1.2,-1.2,dq);
  float baseAlpha=mix(.06,.16,uActive);
  float rimAlpha=clamp(F*.62+length(refl)*.36+spec*.85,0.,1.);
  float liqAlpha=mix(clamp(max(baseAlpha,rimAlpha),0.,.88),1.,uFilled);
  vec3 clearLiq=vec3(.96,.95,.93)*(baseAlpha*.35)+refl+vec3(spec);
  vec3 darkLiq=vec3(.02,.02,.024)+refl+vec3(spec);
  vec3 liqRgb=mix(clearLiq,darkLiq,uFilled);
  vec3 liqPremul=liqRgb*liqAlpha;
  vec3 txtCol=vec3(1.,.99,.98);
  vec3 outRgb=txtCol*ta+liqPremul*(1.-ta);
  float outA=ta+liqAlpha*(1.-ta);
  outRgb+=(h21(p+fract(uT*7.))-.5)/255.*outA;
  outCol=vec4(outRgb*mask,outA*mask);
 }
 o=outCol;}`;

const UNIFORMS = [
  'uRes',
  'uStage',
  'uT',
  'uLoop',
  'uActive',
  'uFilled',
  'uBtn',
  'uRad',
  'uCur',
  'uTr',
  'uPulse',
  'uLab',
  'uTex',
] as const;
type Uniform = (typeof UNIFORMS)[number];

export function WaterButton({
  label,
  doneLabel,
  matchLabel,
  active = false,
  filled = true,
  shape = 'pill',
  theme: _theme,
  onClick,
  disabled = false,
  title,
  className = '',
  scale = 1,
}: WaterButtonProps) {
  void _theme;
  void shape;
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const onClickRef = useRef(onClick);
  const activeRef = useRef(active);
  const filledRef = useRef(filled);
  onClickRef.current = onClick;
  activeRef.current = active;
  filledRef.current = filled;

  const secondaryLabel = doneLabel ?? label;

  const dims = useMemo(() => {
    const cssScale = CSS_SCALE * scale;
    const textW = Math.max(
      measureLabelWidth(label),
      measureLabelWidth(secondaryLabel),
      matchLabel ? measureLabelWidth(matchLabel) : 0,
    );
    // Full-pill capsule geometry: height * 0.5 corner radius (matches CSS rounded-full)
    const bh = 148;
    const bw = Math.max(366, textW + EQUAL_PAD * 2);
    const br = bh * 0.5;
    const stageW = bw + MARGIN * 2;
    const stageH = bh + MARGIN * 2;
    const bx = stageW * 0.5;
    const by = stageH * 0.5;
    // Cancel raymarch dome lift (~4.9 stage units) + optical -2px CSS down (~5.1 stage units)
    const labelY = by + 10;
    const snapEven = (v: number) => Math.max(2, Math.round(v / 2) * 2);
    return {
      bw,
      bh,
      br,
      stageW,
      stageH,
      bx,
      by,
      labelY,
      cssW: snapEven(stageW * cssScale),
      cssH: snapEven(stageH * cssScale),
      insetX: Math.round(MARGIN * cssScale),
      insetY: Math.round(MARGIN * cssScale),
    };
  }, [label, secondaryLabel, matchLabel, scale]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const cv = canvasRef.current;
    const btn = buttonRef.current;
    if (!wrap || !cv || !btn) return;

    const gl = cv.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type);
      if (!s) throw new Error('createShader failed');
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const vs = compile(gl.VERTEX_SHADER, VS);
    const fs = compile(gl.FRAGMENT_SHADER, FS);
    const pr = gl.createProgram();
    if (!pr) return;
    gl.attachShader(pr, vs);
    gl.attachShader(pr, fs);
    gl.linkProgram(pr);
    gl.useProgram(pr);

    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const al = gl.getAttribLocation(pr, 'a');
    gl.enableVertexAttribArray(al);
    gl.vertexAttribPointer(al, 2, gl.FLOAT, false, 0, 0);

    const U = {} as Record<Uniform, WebGLUniformLocation | null>;
    for (const n of UNIFORMS) U[n] = gl.getUniformLocation(pr, n);

    const buildLabelTex = (existingTex?: WebGLTexture | null) => {
      const c = document.createElement('canvas');
      c.width = Math.round(dims.stageW * 3);
      c.height = Math.round(dims.stageH * 3);
      const ctx = c.getContext('2d');
      if (!ctx) return existingTex ?? null;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.scale(3, 3);
      ctx.font = `400 ${FONT_SIZE}px "Instrument Serif", Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#f00';
      ctx.fillText(label, dims.bx, dims.labelY);
      ctx.fillStyle = '#0f0';
      ctx.fillText(secondaryLabel, dims.bx, dims.labelY);

      const tex = existingTex ?? gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tex;
    };

    const tex = buildLabelTex();
    let disposed = false;
    if (typeof document !== 'undefined' && 'fonts' in document) {
      void document.fonts
        .load(`400 ${FONT_SIZE}px "Instrument Serif"`, label)
        .then(() => {
          if (!disposed && tex) {
            buildLabelTex(tex);
          }
        })
        .catch(() => {});
    }
    const isMobile = window.innerWidth < 768;
    const dpr = Math.min(isMobile ? 1.5 : 2, window.devicePixelRatio || 1);

    const syncSize = () => {
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (cv.width !== w || cv.height !== h) {
        cv.width = w;
        cv.height = h;
      }
    };
    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(wrap);

    let isIntersecting = true;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.length > 0) {
          isIntersecting = entries[0].isIntersecting;
        }
      },
      { rootMargin: '20px' },
    );
    io.observe(wrap);

    const inPill = (x: number, y: number) => {
      const dx = Math.max(Math.abs(x - dims.bx) - (dims.bw / 2 - dims.br), 0);
      const dy = Math.max(Math.abs(y - dims.by) - (dims.bh / 2 - dims.br), 0);
      return Math.hypot(dx, dy) <= dims.br + 16;
    };

    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    let lp = { x: dims.bx, y: dims.stageH + 80 };
    let ls = { x: dims.bx, y: dims.stageH + 80 };
    let lhv = 0;
    let clickT: number | null = null;
    let cpos = { x: dims.bx, y: dims.by };
    const trail: { x: number; y: number; t: number }[] = [];
    let lastTr = 0;
    let lastNow: number | null = null;
    const t0 = performance.now() / 1000;
    const trBuf = new Float32Array(WAKE * 3);
    let raf = 0;

    const toStage = (e: PointerEvent | MouseEvent) => {
      const r = wrap.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) * dims.stageW) / Math.max(1, r.width),
        y: ((e.clientY - r.top) * dims.stageH) / Math.max(1, r.height),
      };
    };

    const onMove = (e: PointerEvent) => {
      lp = toStage(e);
    };

    const onLeave = () => {
      lp = { x: dims.bx, y: dims.stageH + 80 };
    };

    const handleBtnClick = (e: MouseEvent) => {
      clickT = performance.now() / 1000;
      cpos = e.detail === 0 ? { x: dims.bx, y: dims.by } : toStage(e);
      onClickRef.current();
    };

    wrap.addEventListener('pointermove', onMove, { passive: true });
    wrap.addEventListener('pointerleave', onLeave, { passive: true });
    btn.addEventListener('click', handleBtnClick);

    const drawNow = () => {
      const now = performance.now() / 1000;
      const dt = lastNow === null ? 1 / 60 : clamp(now - lastNow, 0, 0.05);
      lastNow = now;
      const t = reduce ? 0 : (((now - t0) % LOOP) + LOOP) % LOOP;

      const over = inPill(lp.x, lp.y);
      lhv += ((over ? 1 : 0) - lhv) * (1 - Math.exp(-dt * HOVER_RATE));
      ls.x += (lp.x - ls.x) * (1 - Math.exp(-dt * FOLLOW_RATE));
      ls.y += (lp.y - ls.y) * (1 - Math.exp(-dt * FOLLOW_RATE));

      const a = clickT === null ? -1 : now - clickT;
      if (a > CLICK_LEN) clickT = null;

      if (!reduce && now - lastTr > WAKE_STEP) {
        lastTr = now;
        if (
          over &&
          (!trail.length ||
            Math.hypot(lp.x - trail[0].x, lp.y - trail[0].y) > WAKE_GAP)
        ) {
          trail.unshift({ x: lp.x, y: lp.y, t: now });
        }
        if (trail.length > WAKE) trail.pop();
      }

      trBuf.fill(-1);
      for (let k = 0; k < trail.length; k++) {
        const q = trail[k];
        trBuf[k * 3] = q.x;
        trBuf[k * 3 + 1] = q.y;
        trBuf[k * 3 + 2] = now - q.t < WAKE_LIFE ? now - q.t : -1;
      }

      const cs = clickState(a);
      gl.viewport(0, 0, cv.width, cv.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.uRes, cv.width, cv.height);
      gl.uniform2f(U.uStage, dims.stageW, dims.stageH);
      gl.uniform1f(U.uT, t);
      gl.uniform1f(U.uLoop, LOOP);
      gl.uniform1f(U.uActive, activeRef.current ? 1 : 0);
      gl.uniform1f(U.uFilled, filledRef.current ? 1 : 0);
      gl.uniform4f(U.uBtn, dims.bx, dims.by, dims.bw, dims.bh);
      gl.uniform1f(U.uRad, dims.br);
      gl.uniform3f(U.uCur, ls.x, ls.y, lhv * (1 - cs.glob));
      gl.uniform3fv(U.uTr, trBuf);
      gl.uniform4f(U.uPulse, cpos.x, cpos.y, cs.pz, cs.glob);
      gl.uniform2f(U.uLab, cs.la, cs.lb);
      gl.uniform1i(U.uTex, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    let frameTick = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (document.hidden || btn.disabled || !isIntersecting) return;
      const sec = wrap.closest('.kp-section') as HTMLElement | null;
      if (
        sec &&
        (sec.style.visibility === 'hidden' ||
          parseFloat(sec.style.opacity || '1') < 0.02)
      ) {
        return;
      }
      // Throttle ambient 8s shimmer to 30fps when idle; snap to 60fps on hover/wake/click
      const isIdle =
        lhv < 0.005 && trail.length === 0 && clickT === null && !inPill(lp.x, lp.y);
      frameTick++;
      if (isIdle && (frameTick & 1) === 1) return;
      drawNow();
    };

    const onVisibility = () => {
      if (!document.hidden) {
        lastNow = null;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    drawNow();
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      io.disconnect();
      ro.disconnect();
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerleave', onLeave);
      btn.removeEventListener('click', handleBtnClick);
      if (tex) gl.deleteTexture(tex);
      gl.deleteBuffer(vb);
      gl.deleteProgram(pr);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [label, secondaryLabel, dims]);

  return (
    <div
      ref={wrapRef}
      style={{ width: `${dims.cssW}px`, height: `${dims.cssH}px` }}
      className={`relative shrink-0 select-none ${className}`}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none block h-full w-full"
      />
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-pressed={active}
        title={title}
        style={{
          top: `${dims.insetY}px`,
          bottom: `${dims.insetY}px`,
          left: `${dims.insetX}px`,
          right: `${dims.insetX}px`,
        }}
        className="absolute cursor-pointer rounded-full border-0 bg-transparent text-transparent outline-none focus-visible:ring-2 focus-visible:ring-[var(--fg)]/45"
      >
        {label}
      </button>
    </div>
  );
}
