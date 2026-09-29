'use strict';
/* ==========================================================================
   post.js — WebGL2 finishing pass.
   Bloom (5-level blur pyramid) → lens punch → glitch slices → spectral
   chromatic aberration → grade → vignette → grain + dither.
   The 2D canvas scene goes in; the finished frame comes out.
   ========================================================================== */
class Post {
  constructor(canvas, w, h) {
    const gl = this.gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: true, premultipliedAlpha: false });
    if (!gl) throw new Error('WebGL2 unavailable');
    gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('EXT_color_buffer_half_float');
    this.w = w; this.h = h;
    canvas.width = w; canvas.height = h;

    const VS = `#version 300 es
      out vec2 uv;
      void main(){ vec2 p = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2)); uv = p; gl_Position = vec4(p*2.-1.,0.,1.); }`;
    const mk = (fs) => {
      const p = gl.createProgram();
      const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o) + '\n' + s); return o; };
      gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
      return { p, u };
    };
    const HEAD = '#version 300 es\nprecision highp float;\nin vec2 uv;\nout vec4 o;\n';

    this.pPre = mk(HEAD + `
      uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uThr;
      void main(){
        vec3 c = texture(uSrc, uv + uTexel*vec2(-.5,-.5)).rgb + texture(uSrc, uv + uTexel*vec2(.5,-.5)).rgb
               + texture(uSrc, uv + uTexel*vec2(-.5,.5)).rgb + texture(uSrc, uv + uTexel*vec2(.5,.5)).rgb;
        c *= .25;
        float l = max(c.r, max(c.g, c.b));
        float k = smoothstep(uThr, uThr + .35, l);
        o = vec4(c * k, 1.);
      }`);
    this.pDown = mk(HEAD + `
      uniform sampler2D uSrc; uniform vec2 uTexel;
      void main(){
        vec3 c = texture(uSrc, uv).rgb * 4.;
        c += texture(uSrc, uv + uTexel*vec2(-1,-1)).rgb + texture(uSrc, uv + uTexel*vec2(1,-1)).rgb
           + texture(uSrc, uv + uTexel*vec2(-1,1)).rgb + texture(uSrc, uv + uTexel*vec2(1,1)).rgb;
        o = vec4(c / 8., 1.);
      }`);
    this.pBlur = mk(HEAD + `
      uniform sampler2D uSrc; uniform vec2 uDir;
      void main(){
        vec3 c = texture(uSrc, uv).rgb * .2270270270;
        c += (texture(uSrc, uv + uDir*1.3846153846).rgb + texture(uSrc, uv - uDir*1.3846153846).rgb) * .3162162162;
        c += (texture(uSrc, uv + uDir*3.2307692308).rgb + texture(uSrc, uv - uDir*3.2307692308).rgb) * .0702702703;
        o = vec4(c, 1.);
      }`);
    this.pFinal = mk(HEAD + `
      uniform sampler2D uBase, uB1, uB2, uB3, uB4, uB5;
      uniform vec2 uRes; uniform vec2 uShake;
      uniform float uSeed, uBloom, uCA, uKick, uGlitch, uVig, uGrain, uScan, uFlash, uInvert, uSat, uContrast, uPix, uWarp, uTime, uFade;
      uniform vec3 uFlashCol, uTint;
      float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
      void main(){
        vec2 q = uv + uShake;
        if (uPix > 1.) { vec2 g = uRes / uPix; q = (floor(q*g) + .5) / g; }
        vec2 c = q - .5;
        float r2 = dot(c, c);
        q = .5 + c * (1. - uKick * (.30 + r2*.9));
        q.y += sin(q.x*9. + uTime*7.) * uWarp * .01;
        q.x += sin(q.y*7. - uTime*5.) * uWarp * .008;
        if (uGlitch > 0.) {
          float bands = 26.;
          float sd = floor(uSeed);
          float by = floor(q.y*bands);
          float hs = hash(vec2(by, sd));
          float on = step(1. - uGlitch*.55, hs);
          q.x += on * (hash(vec2(by + 9., sd)) - .5) * .30 * uGlitch;
          float by2 = floor(q.y*7.);
          q.x += step(1. - uGlitch*.4, hash(vec2(by2, sd + 4.))) * (hash(vec2(by2, sd + 7.)) - .5) * .12 * uGlitch;
        }
        vec2 dir = q - .5;
        float ca = uCA * (.35 + length(dir)*1.8);
        vec3 col = vec3(0.), wsum = vec3(0.);
        for (int i = 0; i < 7; i++) {
          float f = float(i)/6.;
          vec3 w = vec3(clamp(1.-f*2., 0., 1.) + clamp(f*2.-1.6, 0., 1.)*.0, 1.-abs(f*2.-1.), clamp(f*2.-1., 0., 1.));
          w = vec3(1.-smoothstep(0., .6, f), 1.-abs(f-.5)*2., smoothstep(.4, 1., f));
          col += texture(uBase, q - dir*ca*(f*2.-1.)).rgb * w;
          wsum += w;
        }
        col /= wsum;
        vec3 bl = texture(uB1, q).rgb*.26 + texture(uB2, q).rgb*.26 + texture(uB3, q).rgb*.22 + texture(uB4, q).rgb*.16 + texture(uB5, q).rgb*.12;
        col += bl * uBloom;
        col *= uTint;
        col = (col - .5)*uContrast + .5;
        float l = dot(col, vec3(.299, .587, .114));
        col = mix(vec3(l), col, uSat);
        col = col / (1. + max(col - .85, 0.)*.55);
        col *= 1. - uVig * pow(length(c)*1.32, 2.4);
        col *= 1. - uScan * (.5 + .5*sin(uv.y*uRes.y*3.14159));
        col = mix(col, uFlashCol, uFlash);
        col = mix(col, vec3(1.) - col, uInvert);
        col *= uFade;
        float g = hash(uv*uRes + uSeed*17.13) - .5;
        col += g * uGrain + (hash(uv*uRes*1.37 + uSeed*3.1) - .5) / 255.;
        o = vec4(clamp(col, 0., 1.), 1.);
      }`);

    /* geometry-less draw */
    this.vao = gl.createVertexArray();

    /* source texture */
    this.tSrc = this._tex(w, h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
    /* bloom pyramid: level i has size >> (i+1); two targets each (ping/pong) */
    this.lv = [];
    for (let i = 0; i < 5; i++) {
      const lw = Math.max(2, w >> (i + 1)), lh = Math.max(2, h >> (i + 1));
      this.lv.push({ w: lw, h: lh, a: this._rt(lw, lh), b: this._rt(lw, lh) });
    }
  }

  _tex(w, h, ifmt, fmt, type, filt) {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  _rt(w, h) {
    const gl = this.gl;
    const tex = this._tex(w, h, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, gl.LINEAR);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fb };
  }
  _pass(prog, target, w, h, bind, uni) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null);
    gl.viewport(0, 0, w, h);
    gl.useProgram(prog.p);
    bind.forEach((t, i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); });
    uni(prog.u);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* src: a 2D canvas. p: parameters (see defaults). */
  render(src, p = {}) {
    const gl = this.gl, w = this.w, h = this.h;
    const P = Object.assign({
      bloom: .8, thr: .42, ca: .002, kick: 0, glitch: 0, vig: .35, grain: .045, scan: 0,
      flash: 0, flashCol: [1, 1, 1], invert: 0, sat: 1.08, contrast: 1.06, pix: 0, warp: 0,
      shake: [0, 0], seed: 0, time: 0, tint: [1, 1, 1], fade: 1,
    }, p);
    gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, this.tSrc);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, src);

    /* bloom pyramid */
    let prevTex = this.tSrc, pw = w, ph = h;
    this.lv.forEach((L, i) => {
      if (i === 0) this._pass(this.pPre, L.a, L.w, L.h, [prevTex], u => { gl.uniform1i(u.uSrc, 0); gl.uniform2f(u.uTexel, 1 / pw, 1 / ph); gl.uniform1f(u.uThr, P.thr); });
      else this._pass(this.pDown, L.a, L.w, L.h, [prevTex], u => { gl.uniform1i(u.uSrc, 0); gl.uniform2f(u.uTexel, 1 / pw, 1 / ph); });
      this._pass(this.pBlur, L.b, L.w, L.h, [L.a.tex], u => { gl.uniform1i(u.uSrc, 0); gl.uniform2f(u.uDir, 1 / L.w, 0); });
      this._pass(this.pBlur, L.a, L.w, L.h, [L.b.tex], u => { gl.uniform1i(u.uSrc, 0); gl.uniform2f(u.uDir, 0, 1 / L.h); });
      prevTex = L.a.tex; pw = L.w; ph = L.h;
    });

    this._pass(this.pFinal, null, w, h, [this.tSrc, ...this.lv.map(l => l.a.tex)], u => {
      ['uBase', 'uB1', 'uB2', 'uB3', 'uB4', 'uB5'].forEach((n, i) => gl.uniform1i(u[n], i));
      gl.uniform2f(u.uRes, w, h); gl.uniform2f(u.uShake, P.shake[0], P.shake[1]);
      const f = (n, v) => gl.uniform1f(u[n], v);
      f('uSeed', P.seed); f('uBloom', P.bloom); f('uCA', P.ca); f('uKick', P.kick); f('uGlitch', P.glitch);
      f('uVig', P.vig); f('uGrain', P.grain); f('uScan', P.scan); f('uFlash', P.flash); f('uInvert', P.invert);
      f('uSat', P.sat); f('uContrast', P.contrast); f('uPix', P.pix); f('uWarp', P.warp); f('uTime', P.time); f('uFade', P.fade);
      gl.uniform3f(u.uFlashCol, ...P.flashCol); gl.uniform3f(u.uTint, ...P.tint);
    });
  }
}
