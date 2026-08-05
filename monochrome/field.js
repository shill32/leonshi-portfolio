(() => {
  "use strict";

  const STATES = [
    { name: "Operating range", equation: "Ω(r,θ) = sin(3θ + sin 5θ)" },
    { name: "Allocation surface", equation: "(a,b,c) ∈ Δ² · z = Pareto(a,b,c)" },
    { name: "Synthetic cohort", equation: "pᵢ = cₖ(t) + W(φᵢ,rᵢ)" },
    { name: "Contract manifold", equation: "M(θ,s) · σ = sin(θ/2 + 3s)" },
    { name: "Constrained search", equation: "T₂,₃(θ) + εN(θ,φ)" }
  ];

  const TAU = Math.PI * 2;
  const REDUCED_TIME = 7.125;
  const MOBILE_QUERY = window.matchMedia("(max-width: 760px), (pointer: coarse)");
  const MOTION_QUERY = window.matchMedia("(prefers-reduced-motion: reduce)");

  function start() {
    let canvas = document.querySelector("#math-field");
    if (!canvas) return;

    const nameNode = document.querySelector("[data-field-name]");
    const equationNode = document.querySelector("[data-field-equation]");
    const counterNode = document.querySelector(".field-stage__header span:last-child");
    const sections = Array.from(document.querySelectorAll("[data-field-state]"));
    const reducedMotion = MOTION_QUERY.matches;
    let targetState = 0;
    let displayState = 0;
    let frame = 0;
    let pageVisible = !document.hidden;
    let canvasVisible = true;
    let pointerX = 0;
    let pointerY = 0;
    let pointerStrength = 0;
    let pointerTargetX = 0;
    let pointerTargetY = 0;
    let pointerTargetStrength = 0;
    let lastTime = performance.now();
    let resizeRenderer = () => {};
    let renderRenderer = () => {};
    let disposeRenderer = () => {};

    const setReadout = (state) => {
      const item = STATES[state];
      if (nameNode) nameNode.textContent = item.name;
      if (equationNode) equationNode.textContent = item.equation;
      if (counterNode) counterNode.textContent = `Scroll state / ${String(state).padStart(2, "0")}/04`;
    };

    const requestRender = () => {
      if (frame || !pageVisible || !canvasVisible) return;
      frame = requestAnimationFrame(tick);
    };

    const setState = (state) => {
      const next = Math.max(0, Math.min(STATES.length - 1, state));
      if (next === targetState) return;
      targetState = next;
      setReadout(next);
      if (reducedMotion) displayState = next;
      requestRender();
    };

    function tick(now) {
      frame = 0;
      if (!pageVisible || !canvasVisible) return;
      const elapsed = Math.min(50, now - lastTime);
      lastTime = now;

      if (reducedMotion) {
        displayState = targetState;
        pointerX = 0;
        pointerY = 0;
        pointerStrength = 0;
      } else {
        const stateEase = 1 - Math.exp(-elapsed / 680);
        const pointerEase = 1 - Math.exp(-elapsed / 150);
        const strengthEase = 1 - Math.exp(-elapsed / (pointerTargetStrength > pointerStrength ? 110 : 420));
        displayState += (targetState - displayState) * stateEase;
        pointerX += (pointerTargetX - pointerX) * pointerEase;
        pointerY += (pointerTargetY - pointerY) * pointerEase;
        pointerStrength += (pointerTargetStrength - pointerStrength) * strengthEase;
      }

      renderRenderer(
        reducedMotion ? REDUCED_TIME : now * 0.001,
        displayState,
        pointerX,
        pointerY,
        pointerStrength
      );

      const morphing = Math.abs(displayState - targetState) > 0.001;
      const pointerSettling = Math.abs(pointerStrength - pointerTargetStrength) > 0.001;
      if (!reducedMotion || morphing || pointerSettling) requestRender();
    }

    function observeStates() {
      if (!("IntersectionObserver" in window) || !sections.length) return;
      const visible = new Map();
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.set(entry.target, entry.intersectionRatio);
          else visible.delete(entry.target);
        });
        if (!visible.size) return;
        const viewportCenter = window.innerHeight * 0.5;
        let chosen = null;
        let best = Infinity;
        visible.forEach((ratio, section) => {
          const rect = section.getBoundingClientRect();
          const centerDistance = Math.abs(rect.top + rect.height * 0.5 - viewportCenter);
          const score = centerDistance / Math.max(0.15, ratio);
          if (score < best) {
            best = score;
            chosen = section;
          }
        });
        if (chosen) setState(Number.parseInt(chosen.dataset.fieldState, 10) || 0);
      }, { rootMargin: "-18% 0px -18% 0px", threshold: [0, 0.15, 0.35, 0.6, 0.85] });
      sections.forEach((section) => observer.observe(section));
    }

    function observeCanvas() {
      if (!("IntersectionObserver" in window)) return;
      const observer = new IntersectionObserver(([entry]) => {
        canvasVisible = Boolean(entry && entry.isIntersecting);
        if (canvasVisible) {
          lastTime = performance.now();
          requestRender();
        } else if (frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      }, { threshold: 0 });
      observer.observe(canvas.closest(".profile") || canvas);
    }

    const glAttempt = createWebGLRenderer(canvas, MOBILE_QUERY.matches);
    if (glAttempt && glAttempt.fallbackCanvas) canvas = glAttempt.fallbackCanvas;
    const renderer = glAttempt && !glAttempt.fallbackCanvas
      ? glAttempt
      : create2DRenderer(canvas, MOBILE_QUERY.matches);
    resizeRenderer = renderer.resize;
    renderRenderer = renderer.render;
    disposeRenderer = renderer.dispose;

    const resizeObserver = "ResizeObserver" in window
      ? new ResizeObserver(() => {
          resizeRenderer();
          requestRender();
        })
      : null;
    if (resizeObserver) resizeObserver.observe(canvas);
    else window.addEventListener("resize", () => {
      resizeRenderer();
      requestRender();
    }, { passive: true });

    if (!reducedMotion) {
      const updatePointer = (event) => {
        const rect = canvas.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return;
        pointerTargetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        pointerTargetY = (0.5 - (event.clientY - rect.top) / rect.height) * 2;
        pointerTargetStrength = 1;
        requestRender();
      };
      const releasePointer = () => {
        pointerTargetStrength = 0;
        requestRender();
      };
      canvas.addEventListener("pointermove", updatePointer, { passive: true });
      canvas.addEventListener("pointerleave", releasePointer, { passive: true });
      canvas.addEventListener("pointercancel", releasePointer, { passive: true });
    }

    document.addEventListener("visibilitychange", () => {
      pageVisible = !document.hidden;
      if (pageVisible) {
        lastTime = performance.now();
        requestRender();
      } else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });

    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }, false);

    canvas.addEventListener("webglcontextrestored", () => {
      disposeRenderer();
      console.warn("Math field WebGL context restored; reload to rebuild the particle field.");
    }, false);

    observeStates();
    observeCanvas();
    setReadout(0);
    resizeRenderer();
    requestRender();
  }

  function createWebGLRenderer(canvas, mobile) {
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: "high-performance"
    }) || canvas.getContext("experimental-webgl", { alpha: true });
    if (!gl) return null;

    const vertexSource = `
      precision highp float;
      attribute float aIndex;
      uniform float uCount;
      uniform float uTime;
      uniform float uState;
      uniform vec2 uViewport;
      uniform vec3 uPointer;
      varying float vEnergy;
      varying float vDepth;
      const float PI = 3.141592653589793;
      const float TAU = 6.283185307179586;

      float hash(float n) { return fract(sin(n * 127.1 + 311.7) * 43758.5453123); }
      float signedHash(float n) { return hash(n) * 2.0 - 1.0; }

      vec3 organism(float n, float t) {
        float q = (n + 0.5) / uCount;
        float theta = TAU * fract(n * 0.61803398875);
        float z = q * 2.0 - 1.0;
        float radial = sqrt(max(0.0, 1.0 - z * z));
        float fold = sin(3.0 * theta + 1.35 * sin(5.0 * theta + z * 4.0 + t * 0.12));
        float membrane = 0.74 + 0.16 * fold + 0.08 * sin(11.0 * theta - z * 7.0);
        float breath = 1.0 + 0.035 * sin(t * 0.43 + z * 3.0);
        float profile = 0.16 * sin(z * 5.0 + sin(theta * 2.0)) + 0.1 * z * z;
        return vec3(
          (radial * membrane * cos(theta) + profile) * 1.05 * breath,
          z * 1.22 + 0.12 * sin(theta * 2.0 + z * 3.0),
          radial * (0.58 + 0.13 * sin(4.0 * theta + z * 5.0)) * sin(theta) + 0.08 * fold
        );
      }

      vec3 simplex(float n, float t) {
        const float contours = 42.0;
        float mapped = (n + 0.5) * contours / uCount;
        float sheet = floor(mapped);
        float u = fract(mapped) * 2.0 - 1.0;
        float v = ((sheet + 0.5) / contours) * 2.0 - 1.0;
        float pulse = 0.025 * sin(t * 0.18 + v * 4.0);
        float fold = u * u * u - 1.35 * u * v;
        float ridge = 0.1 * sin(PI * (3.0 * u - 1.25 * v) + t * 0.11);
        float x = 0.88 * u + 0.16 * v + 0.05 * sin(PI * (2.0 * u + v));
        float y = 0.76 * v + 0.1 * sin(PI * (u + 1.5 * v));
        float z = 0.52 * fold + 0.22 * v * v + ridge + pulse * (1.0 - u * u);
        return vec3(x * 1.12, y - 0.04, z);
      }

      vec3 swarm(float n, float t) {
        const float rings = 34.0;
        float mapped = (n + 0.5) * rings / uCount;
        float ring = floor(mapped);
        float theta = fract(mapped) * TAU;
        float q = (ring + 0.5) / rings;
        float radial = 0.055 + 0.94 * q;
        float petals = 0.12 * sin(6.0 * theta + 2.4 * q) * (0.35 + 0.65 * q);
        float interference = sin(5.0 * theta - 7.0 * q + t * 0.16)
          + 0.55 * sin(3.0 * theta + 11.0 * q - t * 0.12);
        float radius = radial * (0.82 + petals);
        float phase = theta + 0.075 * sin(4.0 * theta - 5.0 * q + t * 0.1);
        float z = 0.19 * interference * (0.25 + 0.75 * (1.0 - q))
          + 0.075 * sin(14.0 * q - 2.0 * theta);
        return vec3(radius * cos(phase) * 1.24, radius * sin(phase) * 0.9, z);
      }

      vec3 mobius(float n, float t) {
        const float linesPerRibbon = 18.0;
        const float lineCount = 36.0;
        float mapped = (n + 0.5) * lineCount / uCount;
        float line = floor(mapped);
        float theta = fract(mapped) * TAU;
        float ribbon = floor(line / linesPerRibbon);
        float lane = mod(line, linesPerRibbon);
        float widthCoord = ((lane + 0.5) / linesPerRibbon) * 2.0 - 1.0;
        float outer = 1.0 - ribbon;
        float major = mix(0.48, 0.79, outer);
        float halfWidth = mix(0.13, 0.23, outer);
        float offset = widthCoord * halfWidth;
        float twist = 0.5 * theta + ribbon * PI;
        float breathing = 0.018 * sin(5.0 * theta - t * (0.12 + 0.03 * ribbon));
        float centerLift = mix(-0.035, 0.045, outer) + 0.09 * sin(2.0 * theta + ribbon * PI);
        float radius = major + (offset + breathing) * cos(twist);
        return vec3(
          radius * cos(theta) * 1.22,
          radius * sin(theta) * 0.78 + centerLift,
          (offset + breathing) * sin(twist) + 0.055 * sin(2.0 * theta + ribbon * PI)
        );
      }

      vec3 knot(float n, float t) {
        const float fieldLines = 24.0;
        float mapped = (n + 0.5) * fieldLines / uCount;
        float line = floor(mapped);
        float u = fract(mapped) * TAU;
        float phase = TAU * (line + 0.5) / fieldLines;
        float polarity = mod(line, 2.0) * 2.0 - 1.0;
        float toroidal = phase + 2.0 * u + 0.08 * sin(3.0 * u + polarity * t * 0.13);
        float tube = 0.15 + 0.018 * sin(phase * 3.0);
        float core = 0.7 + 0.13 * cos(3.0 * toroidal + t * 0.06);
        float braid = 0.025 * sin(5.0 * u + phase * 2.0 - polarity * t * 0.17);
        float radial = core + (tube + braid) * cos(u);
        float lift = 0.11 * sin(3.0 * toroidal - t * 0.08);
        return vec3(
          radial * cos(toroidal) * 1.18,
          radial * sin(toroidal) * 0.92,
          lift + (tube + braid) * sin(u)
        );
      }

      vec3 fieldAt(float state, float n, float t) {
        if (state < 0.5) return organism(n, t);
        if (state < 1.5) return simplex(n, t);
        if (state < 2.5) return swarm(n, t);
        if (state < 3.5) return mobius(n, t);
        return knot(n, t);
      }

      vec2 viewFor(float state) {
        if (state < 0.5) return vec2(0.0);
        if (state < 1.5) return vec2(-0.46, 0.34);
        if (state < 2.5) return vec2(0.22, 0.47);
        if (state < 3.5) return vec2(-0.28, 0.41);
        return vec2(-0.48, 0.18);
      }

      void main() {
        float lower = floor(uState);
        float upper = min(4.0, lower + 1.0);
        float blend = smoothstep(0.0, 1.0, fract(uState));
        vec3 from = fieldAt(lower, aIndex, uTime);
        vec3 to = fieldAt(upper, aIndex, uTime);
        vec3 p = mix(from, to, blend);

        float transition = sin(PI * blend);
        float curlAngle = transition * (0.42 * signedHash(aIndex * 0.017) + 0.2);
        mat2 curl = mat2(cos(curlAngle), -sin(curlAngle), sin(curlAngle), cos(curlAngle));
        p.xy = curl * p.xy;
        p *= 1.0 + transition * (0.12 + 0.035 * sin(aIndex * 0.031));
        p.z += transition * 0.1 * sin(aIndex * 0.013 + uTime * 0.3);

        vec2 fromView = viewFor(lower);
        vec2 toView = viewFor(upper);
        vec2 view = mix(fromView, toView, blend);
        float camera = uTime * 0.105 + 0.12 * sin(uTime * 0.17) + view.x;
        float tilt = -0.1 + 0.09 * cos(uTime * 0.09) + view.y;
        mat2 yaw = mat2(cos(camera), -sin(camera), sin(camera), cos(camera));
        mat2 pitch = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt));
        p.xz = yaw * p.xz;
        p.yz = pitch * p.yz;

        float perspective = 2.85 / (3.15 - p.z * 0.34);
        vec2 aspect = uViewport.x > uViewport.y
          ? vec2(uViewport.y / uViewport.x, 1.0)
          : vec2(1.0, uViewport.x / uViewport.y);
        vec2 projected = p.xy * perspective * aspect * 0.76;

        vec2 delta = projected - uPointer.xy;
        float distanceSq = dot(delta, delta);
        float influence = uPointer.z * exp(-distanceSq * 11.0);
        vec2 direction = delta * inversesqrt(max(distanceSq, 0.0018));
        vec2 tangent = vec2(-direction.y, direction.x);
        projected += direction * influence * 0.13 + tangent * influence * 0.038;
        gl_Position = vec4(projected, 0.0, 1.0);

        float depth = clamp(0.65 + p.z * 0.22, 0.2, 1.0);
        gl_PointSize = (1.25 + 1.35 * depth) * min(1.8, max(1.0, uViewport.y / 720.0));
        vDepth = depth;
        vEnergy = step(0.938, hash(aIndex * 9.73 + 101.0)) * (0.55 + 0.45 * hash(aIndex + 61.0));
      }
    `;

    const fragmentSource = `
      precision mediump float;
      uniform vec3 uInk;
      uniform vec3 uAccent;
      varying float vEnergy;
      varying float vDepth;
      void main() {
        vec2 point = gl_PointCoord - 0.5;
        float radius = length(point) * 2.0;
        float alpha = (1.0 - smoothstep(0.15, 1.0, radius)) * (0.24 + 0.58 * vDepth);
        if (alpha < 0.012) discard;
        vec3 color = mix(uInk, uAccent, vEnergy);
        gl_FragColor = vec4(color, alpha);
      }
    `;

    let program;
    try {
      const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource, "vertex");
      const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource, "fragment");
      program = linkProgram(gl, vertex, fragment);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    } catch (error) {
      console.error("Math field WebGL initialization failed; using the 2D fallback.", error);
      const fallbackCanvas = canvas.cloneNode(false);
      canvas.replaceWith(fallbackCanvas);
      return { fallbackCanvas };
    }

    const count = mobile ? 22000 : 56000;
    const indices = new Float32Array(count);
    for (let i = 0; i < count; i += 1) indices[i] = i;
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.useProgram(program);
    const locations = {
      index: gl.getAttribLocation(program, "aIndex"),
      count: gl.getUniformLocation(program, "uCount"),
      time: gl.getUniformLocation(program, "uTime"),
      state: gl.getUniformLocation(program, "uState"),
      viewport: gl.getUniformLocation(program, "uViewport"),
      pointer: gl.getUniformLocation(program, "uPointer"),
      ink: gl.getUniformLocation(program, "uInk"),
      accent: gl.getUniformLocation(program, "uAccent")
    };
    gl.enableVertexAttribArray(locations.index);
    gl.vertexAttribPointer(locations.index, 1, gl.FLOAT, false, 0, 0);
    gl.uniform1f(locations.count, count);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);

    let width = 1;
    let height = 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.8);
      width = Math.max(1, Math.round(rect.width * dpr));
      height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.uniform2f(locations.viewport, width, height);
      const styles = getComputedStyle(canvas);
      const ink = parseColor(styles.getPropertyValue("--ink"), [17, 19, 16]);
      const accent = parseColor(styles.getPropertyValue("--energy") || styles.getPropertyValue("--accent"), [64, 87, 214]);
      gl.uniform3f(locations.ink, ink[0] / 255, ink[1] / 255, ink[2] / 255);
      gl.uniform3f(locations.accent, accent[0] / 255, accent[1] / 255, accent[2] / 255);
    };

    const render = (time, state, pointerX, pointerY, pointerStrength) => {
      gl.useProgram(program);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(locations.time, time);
      gl.uniform1f(locations.state, state);
      gl.uniform3f(locations.pointer, pointerX, pointerY, pointerStrength);
      gl.drawArrays(gl.POINTS, 0, count);
    };

    const dispose = () => {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };

    return { resize, render, dispose };
  }

  function compileShader(gl, type, source, label) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) || "Unknown shader compiler error";
      console.error(`Math field ${label} shader failed to compile:\n${log}`);
      gl.deleteShader(shader);
      throw new Error(`${label} shader compilation failed: ${log}`);
    }
    return shader;
  }

  function linkProgram(gl, vertex, fragment) {
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) || "Unknown shader linker error";
      console.error(`Math field shader program failed to link:\n${log}`);
      gl.deleteProgram(program);
      throw new Error(`Shader program link failed: ${log}`);
    }
    return program;
  }

  function parseColor(value, fallback) {
    const color = value.trim();
    const hex = color.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
    if (hex) {
      const full = hex[1].length === 3
        ? hex[1].split("").map((part) => part + part).join("")
        : hex[1];
      return [0, 2, 4].map((offset) => Number.parseInt(full.slice(offset, offset + 2), 16));
    }
    const rgb = color.match(/rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)/i);
    return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : fallback;
  }

  function create2DRenderer(canvas, mobile) {
    const context = canvas.getContext("2d", { alpha: true });
    const count = mobile ? 4200 : 7600;
    let width = 1;
    let height = 1;
    let dpr = 1;

    const hash = (n) => {
      const value = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
      return value - Math.floor(value);
    };

    const pointAt = (state, n, time) => {
      if (state === 0) {
        const q = (n + 0.5) / count;
        const theta = TAU * ((n * 0.61803398875) % 1);
        const z = q * 2 - 1;
        const radial = Math.sqrt(Math.max(0, 1 - z * z));
        const fold = Math.sin(3 * theta + 1.35 * Math.sin(5 * theta + z * 4 + time * 0.12));
        const membrane = 0.74 + 0.16 * fold + 0.08 * Math.sin(11 * theta - z * 7);
        const breath = 1 + 0.035 * Math.sin(time * 0.43 + z * 3);
        return [
          (radial * membrane * Math.cos(theta) + 0.16 * Math.sin(z * 5 + Math.sin(theta * 2))) * 1.05 * breath,
          z * 1.22 + 0.12 * Math.sin(theta * 2 + z * 3),
          radial * (0.58 + 0.13 * Math.sin(4 * theta + z * 5)) * Math.sin(theta) + 0.08 * fold
        ];
      }
      if (state === 1) {
        const contours = 42;
        const mapped = (n + 0.5) * contours / count;
        const sheet = Math.floor(mapped);
        const u = mapped % 1 * 2 - 1;
        const v = (sheet + 0.5) / contours * 2 - 1;
        const pulse = 0.025 * Math.sin(time * 0.18 + v * 4);
        const fold = u * u * u - 1.35 * u * v;
        const ridge = 0.1 * Math.sin(Math.PI * (3 * u - 1.25 * v) + time * 0.11);
        return [
          (0.88 * u + 0.16 * v + 0.05 * Math.sin(Math.PI * (2 * u + v))) * 1.12,
          0.76 * v + 0.1 * Math.sin(Math.PI * (u + 1.5 * v)) - 0.04,
          0.52 * fold + 0.22 * v * v + ridge + pulse * (1 - u * u)
        ];
      }
      if (state === 2) {
        const rings = 34;
        const mapped = (n + 0.5) * rings / count;
        const ring = Math.floor(mapped);
        const theta = (mapped % 1) * TAU;
        const q = (ring + 0.5) / rings;
        const radial = 0.055 + 0.94 * q;
        const petals = 0.12 * Math.sin(6 * theta + 2.4 * q) * (0.35 + 0.65 * q);
        const interference = Math.sin(5 * theta - 7 * q + time * 0.16)
          + 0.55 * Math.sin(3 * theta + 11 * q - time * 0.12);
        const radius = radial * (0.82 + petals);
        const phase = theta + 0.075 * Math.sin(4 * theta - 5 * q + time * 0.1);
        const z = 0.19 * interference * (0.25 + 0.75 * (1 - q))
          + 0.075 * Math.sin(14 * q - 2 * theta);
        return [radius * Math.cos(phase) * 1.24, radius * Math.sin(phase) * 0.9, z];
      }
      if (state === 3) {
        const linesPerRibbon = 18;
        const lineCount = 36;
        const mapped = (n + 0.5) * lineCount / count;
        const line = Math.floor(mapped);
        const theta = (mapped % 1) * TAU;
        const ribbon = Math.floor(line / linesPerRibbon);
        const lane = line % linesPerRibbon;
        const widthCoord = (lane + 0.5) / linesPerRibbon * 2 - 1;
        const outer = 1 - ribbon;
        const major = 0.48 + 0.31 * outer;
        const halfWidth = 0.13 + 0.1 * outer;
        const offset = widthCoord * halfWidth;
        const twist = 0.5 * theta + ribbon * Math.PI;
        const breathing = 0.018 * Math.sin(5 * theta - time * (0.12 + 0.03 * ribbon));
        const centerLift = -0.035 + 0.08 * outer + 0.09 * Math.sin(2 * theta + ribbon * Math.PI);
        const radius = major + (offset + breathing) * Math.cos(twist);
        return [
          radius * Math.cos(theta) * 1.22,
          radius * Math.sin(theta) * 0.78 + centerLift,
          (offset + breathing) * Math.sin(twist) + 0.055 * Math.sin(2 * theta + ribbon * Math.PI)
        ];
      }
      const fieldLines = 24;
      const mapped = (n + 0.5) * fieldLines / count;
      const line = Math.floor(mapped);
      const u = (mapped % 1) * TAU;
      const phase = TAU * (line + 0.5) / fieldLines;
      const polarity = line % 2 * 2 - 1;
      const toroidal = phase + 2 * u + 0.08 * Math.sin(3 * u + polarity * time * 0.13);
      const tube = 0.15 + 0.018 * Math.sin(phase * 3);
      const core = 0.7 + 0.13 * Math.cos(3 * toroidal + time * 0.06);
      const braid = 0.025 * Math.sin(5 * u + phase * 2 - polarity * time * 0.17);
      const radial = core + (tube + braid) * Math.cos(u);
      const lift = 0.11 * Math.sin(3 * toroidal - time * 0.08);
      return [
        radial * Math.cos(toroidal) * 1.18,
        radial * Math.sin(toroidal) * 0.92,
        lift + (tube + braid) * Math.sin(u)
      ];
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.8);
      width = Math.max(1, Math.round(rect.width * dpr));
      height = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = width;
      canvas.height = height;
    };

    const render = (time, state, pointerX, pointerY, pointerStrength) => {
      const lower = Math.max(0, Math.min(4, Math.floor(state)));
      const upper = Math.min(4, lower + 1);
      const fraction = state - lower;
      const blend = fraction * fraction * (3 - 2 * fraction);
      const transition = Math.sin(Math.PI * fraction);
      const styles = getComputedStyle(canvas);
      const ink = parseColor(styles.getPropertyValue("--ink"), [17, 19, 16]);
      const accent = parseColor(styles.getPropertyValue("--energy") || styles.getPropertyValue("--accent"), [64, 87, 214]);
      context.clearRect(0, 0, width, height);
      const scale = Math.min(width, height) * 0.36;
      const views = [[0, 0], [-0.46, 0.34], [0.22, 0.47], [-0.28, 0.41], [-0.48, 0.18]];
      const viewX = views[lower][0] + (views[upper][0] - views[lower][0]) * blend;
      const viewY = views[lower][1] + (views[upper][1] - views[lower][1]) * blend;
      const camera = time * 0.105 + 0.12 * Math.sin(time * 0.17) + viewX;
      const tilt = -0.1 + 0.09 * Math.cos(time * 0.09) + viewY;
      const cosCamera = Math.cos(camera);
      const sinCamera = Math.sin(camera);
      const cosTilt = Math.cos(tilt);
      const sinTilt = Math.sin(tilt);

      const draw = (energyPoints) => {
        context.beginPath();
        for (let i = 0; i < count; i += 1) {
          const energy = hash(i * 9.73 + 101) > 0.938;
          if (energy !== energyPoints) continue;
          const from = pointAt(lower, i, time);
          const to = pointAt(upper, i, time);
          const curlAngle = transition * (0.42 * (hash(i * 0.017) * 2 - 1) + 0.2);
          const cosCurl = Math.cos(curlAngle);
          const sinCurl = Math.sin(curlAngle);
          const expansion = 1 + transition * (0.12 + 0.035 * Math.sin(i * 0.031));
          const mixedX = (from[0] + (to[0] - from[0]) * blend) * expansion;
          const mixedY = (from[1] + (to[1] - from[1]) * blend) * expansion;
          const mixedZ = (from[2] + (to[2] - from[2]) * blend) * expansion + transition * 0.1 * Math.sin(i * 0.013 + time * 0.3);
          const curledX = mixedX * cosCurl - mixedY * sinCurl;
          const curledY = mixedX * sinCurl + mixedY * cosCurl;
          const yawX = curledX * cosCamera - mixedZ * sinCamera;
          const yawZ = curledX * sinCamera + mixedZ * cosCamera;
          const pitchY = curledY * cosTilt - yawZ * sinTilt;
          const depth = curledY * sinTilt + yawZ * cosTilt;
          const perspective = 2.85 / (3.15 - depth * 0.34);
          let x = width * 0.5 + yawX * perspective * scale;
          let y = height * 0.5 - pitchY * perspective * scale;

          if (pointerStrength > 0.001) {
            const dx = x / width * 2 - 1 - pointerX;
            const dy = 1 - y / height * 2 - pointerY;
            const distanceSquared = dx * dx + dy * dy;
            const inverseDistance = 1 / Math.sqrt(Math.max(distanceSquared, 0.0018));
            const influence = pointerStrength * Math.exp(-distanceSquared * 11);
            const directionX = dx * inverseDistance;
            const directionY = dy * inverseDistance;
            x += (directionX * 0.13 - directionY * 0.038) * influence * width * 0.5;
            y -= (directionY * 0.13 + directionX * 0.038) * influence * height * 0.5;
          }
          const radius = (energyPoints ? 1 : 0.72) * dpr;
          context.moveTo(x + radius, y);
          context.arc(x, y, radius, 0, TAU);
        }
        context.fill();
      };

      context.fillStyle = `rgba(${ink.join(",")},0.48)`;
      draw(false);
      context.fillStyle = `rgba(${accent.join(",")},0.62)`;
      draw(true);
    };

    return { resize, render, dispose: () => {} };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
