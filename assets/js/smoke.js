/* ============================================================
   STILL / FORM — smoke
   Dependency-free WebGL "ink dissolve": an image hands over to
   another by breaking up through a domain-warped noise field, so
   it reads as smoke rather than a fade. If WebGL is missing the
   caller simply keeps its CSS transition — nothing breaks.

     Smoke.dissolve(host, imgEl, { duration, tint })
   ============================================================ */
(() => {
  "use strict";

  const VERT = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  const FRAG = `
    precision highp float;
    uniform sampler2D uTex;
    uniform vec2 uRes;
    uniform vec2 uTexSize;
    uniform float uTime;
    uniform float uProgress;
    uniform vec3 uTint;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float vnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 5; i++) {
        v += a * vnoise(p);
        p *= 2.02;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      // cover-fit the texture to the canvas, exactly like object-fit: cover
      vec2 frag = gl_FragCoord.xy;
      vec2 tex = max(uTexSize, vec2(1.0));
      float s = max(uRes.x / tex.x, uRes.y / tex.y);
      vec2 scaled = tex * s;
      vec2 uv = (frag + (scaled - uRes) * 0.5) / scaled;

      vec2 n = frag / uRes;
      // drifting, horizontally stretched smoke
      float ink = fbm(vec2(n.x * 1.9, n.y * 1.0) * 2.6 + vec2(uTime * 0.04, uTime * 0.012));

      // stretch the field around its mean: fbm alone clusters too tightly
      ink = clamp((ink - 0.5) * 2.6 + 0.5, 0.0, 1.0);

      float cut = smoothstep(0.0, 0.5, ink - (1.0 - uProgress));
      float alpha = 1.0 - cut;

      // a warm rim where the ink is peeling away
      float rim = smoothstep(0.0, 0.22, cut) * (1.0 - smoothstep(0.22, 0.62, cut));
      vec4 colour = texture2D(uTex, uv);
      vec3 rgb = mix(colour.rgb, uTint, rim * 0.42);

      gl_FragColor = vec4(rgb, colour.a * alpha);
    }
  `;

  const glFor = (canvas) => {
    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      depth: false,
      powerPreference: "default",
    });
    return gl && !gl.isContextLost() ? gl : null;
  };

  const compile = (gl, type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  };

  const state = new WeakMap();

  const build = (host) => {
    let canvas = host.querySelector(":scope > .smoke-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "smoke-canvas";
      canvas.setAttribute("aria-hidden", "true");
      host.appendChild(canvas);
    }

    const gl = glFor(canvas);
    if (!gl) {
      canvas.classList.add("is-dead");
      return null;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      canvas.classList.add("is-dead");
      return null;
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.classList.add("is-dead");
      return null;
    }

    gl.useProgram(prog);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));

    const uniforms = {
      uTex: gl.getUniformLocation(prog, "uTex"),
      uRes: gl.getUniformLocation(prog, "uRes"),
      uTexSize: gl.getUniformLocation(prog, "uTexSize"),
      uTime: gl.getUniformLocation(prog, "uTime"),
      uProgress: gl.getUniformLocation(prog, "uProgress"),
      uTint: gl.getUniformLocation(prog, "uTint"),
    };

    const entry = { gl, canvas, prog, texture, uniforms, sizing: false };
    state.set(host, entry);
    return entry;
  };

  const resize = (entry) => {
    const { canvas, gl, uniforms } = entry;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width === w && canvas.height === h && entry.sizing) return;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uniforms.uRes, w, h);
    entry.sizing = true;
  };

  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  const supported = (() => {
    try {
      const c = document.createElement("canvas");
      return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
    } catch {
      return false;
    }
  })();

  /**
   * Dissolves `img` into its container: 1 → 0 progress means the image
   * assembles out of smoke. Resolves when the canvas has been cleared.
   */
  const dissolve = (host, img, options = {}) => {
    if (!host || !img || !supported) return Promise.resolve(false);

    const previous = state.get(host);
    if (previous && previous.cancel) previous.cancel();

    const entry = previous && !previous.canvas.classList.contains("is-dead") ? previous : build(host);
    if (!entry) return Promise.resolve(false);

    const { gl, canvas, texture, uniforms } = entry;
    const duration = options.duration ?? 900;
    const from = options.from ?? 1;
    const to = options.to ?? 0;
    const tint = options.tint ?? [0.95, 0.92, 0.86];

    entry.sizing = false;
    canvas.style.opacity = "1";
    resize(entry);

    gl.useProgram(entry.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uniforms.uTex, 0);
    gl.uniform3f(uniforms.uTint, tint[0], tint[1], tint[2]);
    gl.uniform2f(uniforms.uTexSize, img.naturalWidth || 1, img.naturalHeight || 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    const wasHidden = img.style.visibility;
    img.style.visibility = "hidden";

    return new Promise((resolve) => {
      let raf = 0;
      let start = 0;
      let done = false;

      const finish = (ok) => {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf);
        img.style.visibility = wasHidden;
        canvas.style.opacity = "0";
        entry.cancel = null;
        resolve(ok);
      };

      const frame = (now) => {
        if (!start) start = now;
        const t = Math.min(1, (now - start) / duration);
        const p = from + (to - from) * easeOut(t);

        gl.uniform1f(uniforms.uProgress, p);
        gl.uniform1f(uniforms.uTime, now * 0.001);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        if (t < 1) raf = requestAnimationFrame(frame);
        else finish(true);
      };

      entry.cancel = () => finish(false);
      raf = requestAnimationFrame(frame);
    });
  };

  window.Smoke = { supported, dissolve };
})();
