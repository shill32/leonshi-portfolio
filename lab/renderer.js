(function (global) {
  "use strict";

  function createStudyRenderer(canvas, pointCount = 512 * 512, options = {}) {
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance"
    });
    if (!gl) return null;

    const vertexSource = `
      precision highp float;
      attribute float aIndex;
      uniform float uCount;
      uniform float uTime;
      uniform float uFromStudy;
      uniform float uStudy;
      uniform float uTransition;
      uniform vec2 uViewport;
      uniform vec3 uPointer;
      uniform float uDisplayScale;
      uniform float uDensityScale;
      uniform float uShockDensityScale;
      uniform float uShockDisplayScale;
      varying float vAlpha;
      varying float vTone;
      const float PI = 3.141592653589793;
      const float TAU = 6.283185307179586;

      float hash(float n) { return fract(sin(n * 0.019371 + 0.731) * 43758.5453); }
      float bell(float x, float width) { return exp(-(x * x) / width); }
      mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
      vec2 cell(float n) {
        float side = floor(sqrt(uCount) + 0.5);
        return (vec2(mod(n, side), floor(n / side)) + 0.5) / side;
      }
      vec4 rotate4(vec4 q, float t) {
        q.xy = rot(0.22 * t + 0.31) * q.xy;
        q.zw = rot(-0.17 * t + 0.53) * q.zw;
        q.xz = rot(0.13 * t - 0.28) * q.xz;
        q.yw = rot(-0.09 * t + 0.17) * q.yw;
        return q;
      }

      vec3 amorphous(float variant, float n, float t) {
        vec2 c = cell(n);
        float a = TAU * fract(c.x + c.y * 0.6180339);
        float r = sqrt(c.y);
        float pulse = 1.0 + 0.055 * sin(t * 0.75 + r * 4.0);
        if (variant < 2.5) {
          if (variant > 1.5) {
            float theta = TAU * c.x;
            float y = 1.0 - 2.0 * c.y;
            float sphere = sqrt(max(0.0, 1.0 - y * y));
            float radius = 0.78
              * (1.0 + 0.15 * sin(theta * 7.0 + t * 0.28) * sphere * sphere
                + 0.055 * sin(y * 9.0 - theta * 2.0 - t * 0.16));
            return vec3(
              radius * sphere * cos(theta),
              radius * y * 0.94,
              radius * sphere * sin(theta)
            ) * pulse;
          }
          float lobes = variant < 0.5 ? 2.0 : 4.0;
          float amp = variant < 0.5 ? 0.28 : 0.20;
          float edge = 1.0 + amp * sin(lobes * a + t * (0.22 + variant * 0.04))
            + 0.07 * sin((lobes + 3.0) * a - r * 5.0 - t * 0.16);
          vec3 p = vec3(r * edge * cos(a), r * edge * sin(a),
            0.18 * (1.0 - r) * sin(a * (lobes - 0.5) + t * 0.4) + 0.08 * sin(r * 12.0 - t));
          p.xy *= variant < 0.5 ? vec2(1.38, 0.88) : vec2(1.08, 1.0);
          return p * pulse;
        }
        float branch = floor(c.x * 9.0);
        float along = fract(c.x * 9.0);
        float angle = TAU * branch / 9.0 + 0.34 * sin(branch * 2.1);
        float split = step(0.54, along) * (mod(branch, 2.0) * 2.0 - 1.0) * 0.42;
        angle += split * smoothstep(0.54, 1.0, along);
        float width = (c.y - 0.5) * 0.24 * (1.0 - 0.72 * along);
        vec2 dir = vec2(cos(angle), sin(angle));
        vec2 normal = vec2(-dir.y, dir.x);
        vec2 xy = dir * (0.10 + 0.97 * along) + normal * width;
        return vec3(xy, 0.12 * sin(along * 9.0 + branch + t * 0.6)) * pulse;
      }

      vec3 molecular(float variant, float n, float t) {
        vec2 c = cell(n);
        float y = c.x * 2.2 - 1.1;
        float lane = c.y;
        float phase = y * 7.2 + t * 0.62;
        if (variant < 1.5) {
          float strands = variant < 0.5 ? 2.0 : 3.0;
          float strand = floor(lane * strands);
          float thickness = fract(lane * strands) - 0.5;
          float angle = phase + TAU * strand / strands;
          return vec3(0.53 * cos(angle) + thickness * 0.10, y, 0.53 * sin(angle) + thickness * 0.10);
        }
        if (variant < 2.5) {
          float section = floor(c.y * 3.0);
          float q = fract(c.y * 3.0);
          if (section < 2.0) {
            float angle = phase + PI * section;
            return vec3(0.58 * cos(angle), y, 0.58 * sin(angle));
          }
          float rung = floor(c.x * 18.0);
          float along = fract(c.x * 18.0);
          float yy = -1.05 + rung / 17.0 * 2.1;
          float aa = yy * 7.2 + t * 0.62;
          return vec3(mix(-0.58, 0.58, along) * cos(aa), yy, mix(-0.58, 0.58, along) * sin(aa));
        }
        float bead = floor(c.x * 15.0);
        float aa = bead * 0.92 + t * 0.48;
        float localA = TAU * c.y;
        float radius = 0.07 + 0.15 * sqrt(hash(bead + 4.0));
        vec3 center = vec3(0.48 * sin(aa), -1.08 + bead / 14.0 * 2.16, 0.32 * cos(aa * 1.37));
        return center + radius * vec3(cos(localA), sin(localA) * 0.7, sin(localA));
      }

      vec3 hyperform(float variant, float n, float t) {
        vec2 c = cell(n);
        float a = TAU * c.x;
        float b = TAU * c.y;
        vec4 q;
        if (variant < 0.5) {
          q = vec4(cos(a), sin(a), cos(b), sin(b));
        } else if (variant < 1.5) {
          float edge = floor(c.x * 32.0);
          float along = fract(c.x * 32.0) * 2.0 - 1.0;
          float axis = mod(edge, 4.0);
          float bits = floor(edge / 4.0);
          q = vec4(mod(bits, 2.0), mod(floor(bits / 2.0), 2.0), mod(floor(bits / 4.0), 2.0), mod(floor(bits / 8.0), 2.0)) * 2.0 - 1.0;
          if (axis < 0.5) q.x = along; else if (axis < 1.5) q.y = along; else if (axis < 2.5) q.z = along; else q.w = along;
        } else if (variant < 2.5) {
          float stringId = floor(c.x * 17.0);
          float along = c.y * 2.0 - 1.0;
          float aa = TAU * stringId / 17.0;
          q = vec4(0.62 * cos(aa) + 0.12 * sin(along * 8.0 + aa * 3.0 + t), along,
            0.62 * sin(aa) + 0.12 * cos(along * 6.0 - t), 0.34 * sin(along * 4.0 + aa));
        } else {
          float shell = floor(c.x * 5.0);
          float u = fract(c.x * 5.0);
          float z = u * 2.0 - 1.0;
          float radius = sqrt(max(0.0, 1.0 - z * z));
          float shellRadius = 0.32 + shell * 0.19;
          q = shellRadius * vec4(radius * cos(b), radius * sin(b), z, sin(a + b));
        }
        q = rotate4(q, t * 0.32);
        float perspective = 1.0 / max(1.45, 2.45 - q.w * 0.34);
        return q.xyz * perspective * (variant < 1.5 && variant > 0.5 ? 1.55 : 1.8);
      }

      vec3 bird(float variant, float n, float t) {
        vec2 c = cell(n);
        float side = c.x < 0.5 ? -1.0 : 1.0;
        float span = abs(c.x * 2.0 - 1.0);
        float chord = c.y * 2.0 - 1.0;
        float flap = sin(t * 1.1 + variant * 0.8);
        if (variant < 0.5) {
          float x = side * (0.10 + 1.18 * span);
          float y = 0.18 + 0.72 * span - 0.47 * span * span + chord * 0.18 * (1.0 - span);
          return vec3(x, y + flap * 0.16 * span, 0.18 * sin(span * PI) * chord);
        }
        if (variant < 1.5) {
          float x = side * (0.05 + span * 1.08);
          float y = 0.34 - 0.62 * span + 0.18 * sin(span * PI) + chord * 0.13 * (1.0 - span);
          if (span < 0.22) y -= (0.22 - span) * 2.2;
          return vec3(x, y + flap * 0.10 * span, chord * 0.16);
        }
        if (variant < 2.5) {
          float member = floor(c.x * 11.0);
          float local = fract(c.x * 11.0) * 2.0 - 1.0;
          float depth = member / 10.0;
          vec2 center = vec2((depth - 0.5) * 1.25, -0.64 + depth * 1.38);
          float wing = abs(local);
          return vec3(center.x + local * (0.18 + 0.20 * depth), center.y + wing * 0.16 + flap * 0.04, (c.y - 0.5) * 0.22 + sin(member) * 0.08);
        }
        float feather = floor(c.x * 17.0);
        float along = c.y;
        float aa = mix(-1.28, 1.28, feather / 16.0);
        float length = 0.42 + 0.75 * (1.0 - abs(aa) / 1.4);
        vec2 dir = vec2(sin(aa), cos(aa));
        vec2 normal = vec2(-dir.y, dir.x);
        vec2 xy = vec2(0.0, -0.58) + dir * along * length + normal * 0.06 * sin(along * 9.0 + feather);
        return vec3(xy, 0.16 * sin(aa * 3.0 + t * 0.7) * along);
      }

      float waveHeight(float variant, vec2 uv, float t) {
        if (variant < 0.5) {
          float a = length(uv - vec2(-0.32, 0.0)) * 18.0 - t * 1.1;
          float b = length(uv - vec2(0.34, 0.14)) * 15.0 - t * 0.86;
          return 0.13 * sin(a) + 0.11 * sin(b);
        }
        if (variant < 1.5) return 0.17 * sin(uv.x * 11.0 - t) + 0.13 * sin(uv.y * 14.0 + t * 0.72);
        if (variant < 2.5) {
          float r = length(uv);
          float a = atan(uv.y, uv.x);
          return 0.20 * sin(r * 21.0 - a * 5.0 - t * 1.15) * (1.0 - smoothstep(0.55, 1.35, r));
        }
        return 0.13 * sin((uv.x + 0.34 * sin(uv.y * 3.0)) * 15.0 - t * 0.9)
          + 0.07 * sin((uv.x - uv.y) * 23.0 + t * 0.55);
      }

      vec3 waves(float variant, float n, float t) {
        vec2 uv = cell(n) * 2.0 - 1.0;
        uv *= vec2(1.28, 0.92);
        return vec3(uv, waveHeight(variant, uv, t));
      }

      float terrainHeight(float variant, vec2 uv, float t) {
        float drift = t * 0.08;
        if (variant < 0.5) return 0.55 * uv.x * uv.x + 0.20 * cos(uv.y * 4.8 + drift) - 0.32;
        if (variant < 1.5) return 0.52 * uv.x * uv.y + 0.30 * uv.x + 0.13 * sin(uv.y * 7.0 - drift);
        if (variant < 2.5) {
          float p1 = 0.72 * bell(length(uv - vec2(-0.46, 0.25)), 0.12);
          float p2 = 0.54 * bell(length(uv - vec2(0.38, -0.24)), 0.08);
          float p3 = 0.38 * bell(length(uv - vec2(0.18, 0.50)), 0.06);
          return p1 + p2 + p3 - 0.32 + 0.08 * sin(uv.x * 8.0 + drift);
        }
        return 0.62 * clamp((uv.x + 0.32 * sin(uv.y * 3.0 + drift)) * 3.6, -1.0, 1.0)
          + 0.16 * sin(uv.y * 9.0 - drift);
      }

      vec3 terrain(float variant, float n, float t) {
        vec2 uv = cell(n) * 2.0 - 1.0;
        uv *= vec2(1.20, 0.88);
        return vec3(uv, terrainHeight(variant, uv, t) * 0.74);
      }

      float newFamily(float study) {
        if (study > 171.5) {
          float selectedGroup = floor((study - 172.0) / 10.0);
          if (selectedGroup < 0.5) return 5.0;
          if (selectedGroup < 5.5) return 2.0;
          return 0.0;
        }
        if (study > 71.5) return 2.0;
        return floor((study - 24.0) / 8.0);
      }

      vec3 amorphousNew(float variant, float n, float t) {
        vec2 c = cell(n);
        float a = TAU * c.x;
        float r = sqrt(c.y);
        float breathe = 1.0 + 0.035 * sin(t * 0.55 + variant);
        if (variant < 0.5) {
          float edge = 1.0 + 0.16 * sin(a * 3.0 + t * 0.23) + 0.07 * sin(a * 7.0 - t * 0.17);
          return vec3(1.34 * r * edge * cos(a), 0.68 * r * edge * sin(a), 0.10 * sin(a * 2.0) * (1.0 - r)) * breathe;
        }
        if (variant < 1.5) {
          float bud = step(0.68, c.x);
          float u = bud > 0.5 ? fract(c.x * 3.125) : c.x / 0.68;
          float aa = TAU * u;
          float rr = sqrt(c.y);
          vec2 center = mix(vec2(-0.20, -0.03), vec2(0.66, 0.28), bud);
          vec2 radius = mix(vec2(0.82, 0.68), vec2(0.40, 0.34), bud);
          return vec3(center + radius * rr * vec2(cos(aa), sin(aa)) * (1.0 + 0.09 * sin(aa * 5.0 + t * 0.3)), 0.08 * sin(aa * 3.0)) * breathe;
        }
        if (variant < 2.5) {
          float arm = floor(c.x * 13.0);
          float along = fract(c.x * 13.0);
          float aa = TAU * arm / 13.0 + 0.28 * sin(arm * 2.7);
          aa += (mod(arm, 3.0) - 1.0) * 0.34 * smoothstep(0.42, 1.0, along);
          vec2 dir = vec2(cos(aa), sin(aa));
          vec2 normal = vec2(-dir.y, dir.x);
          float width = (c.y - 0.5) * 0.12 * (1.0 - 0.76 * along);
          return vec3(dir * (0.10 + along) + normal * width, 0.10 * sin(along * 7.0 + arm + t * 0.3));
        }
        if (variant < 3.5) {
          float z = c.y * 2.0 - 1.0;
          float ring = sqrt(max(0.0, 1.0 - z * z));
          float latitude = 0.055 * sin(c.y * 24.0 - t * 0.24);
          float longitude = 0.045 * sin(a * 7.0 + z * 3.0 + t * 0.16);
          float membrane = ring * (1.0 + latitude + longitude);
          return vec3(
            membrane * cos(a),
            z * 0.88 + 0.045 * sin(a * 5.0 - t * 0.12) * ring,
            membrane * sin(a)
          ) * 0.92 * breathe;
        }
        if (variant < 4.5) {
          float side = c.x < 0.5 ? -1.0 : 1.0;
          float theta = TAU * fract(c.x * 2.0);
          float y = 1.0 - 2.0 * c.y;
          float sphere = sqrt(max(0.0, 1.0 - y * y));
          vec3 normal = vec3(sphere * cos(theta), y, sphere * sin(theta));
          float breathing = 1.0 + 0.045 * sin(theta * 4.0 + y * 7.0 - t * 0.22);
          float division = 0.34 + 0.055 * sin(t * 0.18);
          vec3 center = vec3(side * division, side * 0.045, 0.0);
          vec3 radius = vec3(0.54, 0.66, 0.54);
          vec3 p = center + normal * radius * breathing;
          p.x -= side * 0.10 * sphere * sphere;
          p.z += 0.045 * sin(theta * 5.0 - t * 0.15) * sphere;
          return p;
        }
        if (variant < 5.5) {
          float stem = floor(c.x * 9.0);
          float along = fract(c.x * 9.0);
          float aa = mix(-1.25, 1.25, stem / 8.0) + 0.20 * sin(stem * 4.1);
          vec2 root = vec2(0.0, -0.66);
          vec2 dir = vec2(sin(aa), cos(aa));
          vec2 normal = vec2(-dir.y, dir.x);
          return vec3(root + dir * along * (0.72 + 0.30 * hash(stem)) + normal * (c.y - 0.5) * 0.09, 0.08 * sin(along * 8.0 + stem));
        }
        if (variant < 6.5) {
          float tendril = floor(c.x * 15.0);
          float along = fract(c.x * 15.0);
          float aa = TAU * tendril / 15.0;
          float radius = 0.44 + along * (0.35 + 0.18 * hash(tendril));
          aa += 0.34 * sin(along * 4.0 + tendril + t * 0.2);
          return vec3(radius * cos(aa), radius * sin(aa), (c.y - 0.5) * 0.12 + 0.08 * sin(along * 6.0));
        }
        float lobe = floor(c.x * 7.0);
        float aa = TAU * fract(c.x * 7.0);
        float rr = sqrt(c.y) * (0.22 + 0.14 * hash(lobe + 9.0));
        float ca = TAU * lobe / 7.0 + 0.24 * sin(lobe * 3.3);
        vec2 center = (0.34 + 0.28 * hash(lobe)) * vec2(cos(ca), sin(ca));
        return vec3(center + rr * vec2(cos(aa), sin(aa)), 0.08 * sin(aa + lobe)) * breathe;
      }

      vec3 molecularNew(float variant, float n, float t) {
        vec2 c = cell(n);
        float along = c.x * 2.0 - 1.0;
        float lane = floor(c.y * 4.0);
        float width = fract(c.y * 4.0) - 0.5;
        float phase = along * 7.5 + t * 0.35;
        if (variant < 0.5) {
          float strand = mod(lane, 2.0);
          float aa = phase + PI * strand;
          return vec3(0.48 * cos(aa) + width * 0.035, along, 0.48 * sin(aa) + width * 0.035);
        }
        if (variant < 1.5) {
          float pair = floor(lane / 2.0);
          float strand = mod(lane, 2.0);
          float aa = phase * mix(0.82, -0.82, pair) + PI * strand;
          return vec3(mix(-0.38, 0.38, pair) + 0.24 * cos(aa), along, 0.24 * sin(aa));
        }
        if (variant < 2.5) {
          float section = floor(c.y * 3.0);
          if (section < 2.0) {
            float aa = phase + PI * section;
            return vec3(0.52 * cos(aa), along, 0.52 * sin(aa));
          }
          float rung = floor(c.x * 15.0);
          float u = fract(c.x * 15.0);
          float y = -0.94 + rung / 14.0 * 1.88;
          float aa = y * 7.5 + t * 0.35;
          return vec3(mix(-0.52, 0.52, u) * cos(aa), y, mix(-0.52, 0.52, u) * sin(aa));
        }
        if (variant < 3.5) {
          float bead = floor(c.x * 12.0);
          float aa = TAU * c.y;
          vec3 center = vec3(0.36 * sin(bead * 0.88), -1.0 + bead / 11.0 * 2.0, 0.25 * cos(bead * 0.71));
          return center + vec3(0.15 * cos(aa), 0.08 * sin(aa), 0.15 * sin(aa));
        }
        if (variant < 4.5) {
          float aa = TAU * c.x;
          float bb = TAU * c.y;
          float knot = 0.54 + 0.18 * cos(3.0 * aa);
          return vec3(knot * cos(2.0 * aa), knot * sin(2.0 * aa), 0.28 * sin(3.0 * aa)) + vec3(cos(bb), sin(bb), 0.0) * 0.025;
        }
        if (variant < 5.5) {
          float aa = along * 10.0 + t * 0.28;
          float taper = 0.26 + 0.18 * (1.0 - abs(along));
          return vec3(taper * cos(aa), along, taper * sin(aa)) + vec3(width * 0.03);
        }
        if (variant < 6.5) {
          float strand = floor(c.y * 3.0);
          float aa = along * 5.2 + strand * TAU / 3.0;
          return vec3(0.54 * sin(aa), along, 0.18 * cos(aa * 2.0 + strand));
        }
        float block = floor(c.x * 16.0);
        float u = fract(c.x * 16.0);
        float side = mod(block, 2.0) * 2.0 - 1.0;
        float y = -1.0 + block / 15.0 * 2.0;
        float aa = y * 6.0 + t * 0.25;
        return vec3(side * (0.18 + 0.34 * u) * cos(aa), y, side * (0.18 + 0.34 * u) * sin(aa));
      }

      vec3 hyperNew(float variant, float n, float t) {
        vec2 c = cell(n);
        float a = TAU * c.x;
        float b = TAU * c.y;
        vec4 q;
        if (variant < 0.5) {
          // 3-sphere foliation: points on Cl(1) rotated through 4D
          float psi = (c.x - 0.5) * PI;
          float theta = (c.y - 0.5) * PI;
          float cp = cos(psi), sp = sin(psi);
          q = vec4(cp * cos(theta), cp * sin(theta), sp * cos(theta + t * 0.15), sp * sin(theta + t * 0.15));
          q *= 0.92;
        } else if (variant < 1.5) {
          // Duocylinder: two orthogonal rotating circles in 4D
          float w1 = c.x * TAU + t * 0.31;
          float w2 = c.y * TAU - t * 0.22;
          q = vec4(cos(w1), sin(w1), cos(w2), sin(w2));
          q *= 0.88;
        } else if (variant < 2.5) {
          // Hopf fibration projection: fibers map to linked circles in 3D
          float phi = (c.x - 0.5) * PI;
          float eta = c.y * TAU;
          float r = 0.5 + 0.3 * cos(phi);
          q = vec4(r * cos(eta), r * sin(eta), 0.4 * sin(phi) * cos(eta + t * 0.21), 0.4 * sin(phi) * sin(eta + t * 0.21));
        } else if (variant < 3.5) {
          // Nested Clifford tori: multiple shells at different 4D radii
          float shell = floor(c.x * 5.0);
          float u = fract(c.x * 5.0) * TAU;
          float v = c.y * TAU;
          float r1 = 0.30 + shell * 0.14;
          float r2 = sqrt(max(0.0, 1.0 - r1 * r1));
          q = vec4(r1 * cos(u), r1 * sin(u), r2 * cos(v + t * 0.15), r2 * sin(v + t * 0.15));
        } else if (variant < 4.5) {
          // 5-cell (pentachoron): 10 edges sampled by direct vertex compute
          float edge = floor(c.x * 10.0);
          float along = fract(c.x * 10.0);
          float aIdx = mod(edge, 5.0);
          float bIdx = mod(edge + 1.0 + floor(edge / 5.0), 5.0);
          // Compute vertex positions directly without array indexing
          vec4 v0 = aIdx < 0.5 ? vec4(0.5, 0.0, 0.0, 0.0)
            : aIdx < 1.5 ? vec4(-0.125, 0.484, 0.0, 0.0)
            : aIdx < 2.5 ? vec4(-0.125, -0.125, 0.421, 0.0)
            : aIdx < 3.5 ? vec4(-0.125, -0.125, -0.140, 0.366)
            : vec4(-0.125, -0.125, -0.140, -0.366);
          vec4 v1 = bIdx < 0.5 ? vec4(0.5, 0.0, 0.0, 0.0)
            : bIdx < 1.5 ? vec4(-0.125, 0.484, 0.0, 0.0)
            : bIdx < 2.5 ? vec4(-0.125, -0.125, 0.421, 0.0)
            : bIdx < 3.5 ? vec4(-0.125, -0.125, -0.140, 0.366)
            : vec4(-0.125, -0.125, -0.140, -0.366);
          q = mix(v0, v1, along) * 1.6;
        } else if (variant < 5.5) {
          // 4D rotating lattice of linked rings (string loom with volume)
          float stringId = floor(c.x * 16.0);
          float along = c.y * 2.0 - 1.0;
          float aa = TAU * stringId / 16.0 + t * 0.13;
          float wave = 0.12 * sin(along * 6.0 + aa * 2.0 + t);
          q = vec4(0.56 * cos(aa) + wave * cos(aa), along, 0.56 * sin(aa) + wave * sin(aa), 0.32 * sin(along * 3.0 + aa));
        } else if (variant < 6.5) {
          // Klein bottle surface (non-orientable, volumetric)
          float u = c.x * TAU;
          float v = c.y * TAU;
          float cu = cos(u), su = sin(u);
          float cv = cos(v), sv = sin(v);
          float factor = 1.0 + 0.42 * cv;
          q = vec4(factor * cu, factor * su, 0.30 * su * sv, 0.30 * cu * sv + 0.18 * sin(u * 2.0 + t * 0.2));
          q *= 0.82;
        } else {
          // 24-cell projection: 4D hyperdiamond vertices with depth
          float bits = floor(c.x * 24.0);
          float along = c.y;
          vec4 base = vec4(0.0);
          int axis = int(mod(bits, 4.0));
          if (axis == 0) base.x = 1.0; else if (axis == 1) base.y = 1.0; else if (axis == 2) base.z = 1.0; else base.w = 1.0;
          float sign1 = mod(floor(bits / 4.0), 2.0) > 0.5 ? -1.0 : 1.0;
          base *= sign1;
          float r = 0.6 * along;
          q = base * r + vec4(0.15 * sin(along * 8.0 + bits), 0.15 * cos(along * 8.0 + bits * 1.3), 0.10 * sin(along * 5.0), 0.0);
        }
        q = rotate4(q, t * 0.22);
        float perspective = 1.0 / max(1.55, 2.5 - q.w * 0.28);
        return q.xyz * perspective * 1.85;
      }

      vec3 birdNew(float variant, float n, float t) {
        vec2 c = cell(n);
        float flap = sin(t * (0.7 + variant * 0.05) + c.x * 2.0);
        float cycle = 0.5 + 0.5 * sin(t * 0.4);
        // Reserve a small central body volume so wings read as a bird in flight.
        if (c.y < 0.10) {
          float bodyU = c.y / 0.10;
          return vec3((c.x - 0.5) * 0.18, 0.02 + bodyU * 0.26 + 0.03 * flap, 0.22 * sin(bodyU * PI));
        }
        if (variant < 1.5 || (variant > 4.5 && variant < 5.5)) {
          // Single soaring bird: wings with real 3D dihedral, banking through z
          float side = c.x < 0.5 ? -1.0 : 1.0;
          float span = abs(c.x * 2.0 - 1.0);
          float chord = c.y * 2.0 - 1.0;
          float bank = variant < 0.5 ? 0.35 : (variant < 1.5 ? 0.55 : 0.42);
          float x = side * (0.10 + span * 1.12);
          float y = 0.08 + 0.68 * span - 0.42 * span * span + chord * 0.15 * (1.0 - span);
          // Wing tip oscillates in z (toward/away viewer) and y (up/down)
          float dihedral = 0.22 + 0.30 * flap * span;
          float z = side * span * dihedral * bank + chord * 0.16 * (1.0 - span);
          if (variant > 4.5) { y = 0.32 - 0.58 * span + chord * 0.12; z = side * span * (0.18 - 0.44 * flap) * bank; }
          // Body pitch tilts with flap
          y += flap * 0.06 * span;
          return vec3(x, y, z);
        }
        if (variant < 2.5) {
          // Climbing murmuration: flock in 3D, each bird at its own depth layer
          float member = floor(c.x * 14.0);
          float local = fract(c.x * 14.0) * 2.0 - 1.0;
          float progress = member / 13.0;
          float depth = hash(member + 3.0) * 0.8 - 0.4;
          float flapPhase = t * 0.8 + member * 0.6;
          vec2 center = vec2((progress - 0.5) * 1.28 + 0.15 * sin(t * 0.3 + member), -0.66 + progress * 1.42 + 0.05 * sin(t * 0.25 + member * 1.7));
          float wing = abs(local);
          float wingZ = sin(flapPhase + wing * 2.0) * 0.10 * wing;
          return vec3(center.x + local * (0.10 + 0.12 * hash(member + 1.0)), center.y + wing * 0.09 + flapPhase * 0.002, depth + wingZ);
        }
        if (variant < 3.5) {
          // Dive and return: 3D arc trajectory with banking turns
          float member = floor(c.x * 12.0);
          float local = fract(c.x * 12.0) * 2.0 - 1.0;
          float progress = member / 11.0;
          float phase = t * 0.25 + progress * TAU;
          float x = 0.48 * sin(progress * TAU * 1.2 + t * 0.1);
          float y = 0.60 - 1.35 * abs(progress - 0.45) + 0.08 * sin(t * 0.4 + member);
          float depth = 0.30 * cos(progress * TAU * 1.2 + t * 0.1);
          float wing = abs(local);
          float bank = sin(phase) * 0.25;
          float wingZ = bank * local * wing;
          return vec3(x + local * 0.08 * (1.0 - wing), y + wing * 0.07 + 0.03 * sin(t * 0.6 + member), depth + wingZ);
        }
        if (variant < 4.5) {
          // Gliding flock: spiral ascent in 3D helix
          float member = floor(c.x * 16.0);
          float local = fract(c.x * 16.0) * 2.0 - 1.0;
          float progress = member / 15.0;
          float aa = progress * TAU * 2.3 + t * 0.18;
          float radius = 0.42 + 0.18 * hash(member);
          float x = radius * cos(aa);
          float y = -0.66 + progress * 1.36 + 0.04 * sin(t * 0.3 + member);
          float depth = radius * sin(aa) * 0.7;
          float wing = abs(local);
          float flap2 = sin(t * 0.7 + member * 0.4);
          float wingZ = 0.14 * flap2 * wing;
          return vec3(x + local * 0.06, y + wing * 0.08, depth + wingZ);
        }
        if (variant < 6.5) {
          // Thermal riders: circling 3D column, wings tilted with bank
          float member = floor(c.x * 13.0);
          float local = fract(c.x * 13.0) * 2.0 - 1.0;
          float progress = member / 12.0;
          float aa = progress * TAU * 3.0 + t * 0.22;
          float radius = 0.38 + 0.12 * sin(t * 0.15 + member);
          float x = radius * cos(aa);
          float y = -0.58 + progress * 1.28;
          float depth = radius * sin(aa);
          float wing = abs(local);
          float bank = cos(aa) * 0.30;
          return vec3(x + local * 0.07 * cos(aa), y + wing * 0.06, depth - local * 0.07 * sin(aa) + bank * wing);
        }
        // Dawn ascent: scattered flock rising with wind drift and 3D depth
        float member = floor(c.x * 14.0);
        float local = fract(c.x * 14.0) * 2.0 - 1.0;
        float progress = member / 13.0;
        float depth = (hash(member + 7.0) - 0.5) * 0.5;
        vec2 center = vec2(0.40 * sin(progress * 7.0 + t * 0.2) + 0.04 * sin(t * 0.18 + member), -0.70 + progress * 1.42);
        float wing = abs(local);
        float flap2 = sin(t * 0.6 + member * 0.5);
        float wingZ = 0.12 * flap2 * wing;
        return vec3(center.x + local * (0.08 + 0.04 * hash(member)), center.y + wing * 0.07, depth + wingZ);
      }

      vec3 wavesNew(float variant, float n, float t) {
        vec2 uv = (cell(n) * 2.0 - 1.0) * vec2(1.30, 0.92);
        float z;
        if (variant < 0.5) z = 0.055 * sin(uv.y * 15.0 + t * 0.34);
        else if (variant < 1.5) z = 0.048 * sin(length(uv - vec2(-0.34, 0.12)) * 22.0 - t * 0.55) + 0.035 * sin(length(uv - vec2(0.44, -0.18)) * 19.0 - t * 0.42);
        else if (variant < 2.5) z = 0.060 * sin(length(uv) * 18.0 - t * 0.42);
        else if (variant < 3.5) z = 0.042 * sin(uv.x * 15.0 + uv.y * 4.0 - t * 0.3) + 0.038 * sin(uv.y * 17.0 - uv.x * 3.0 + t * 0.26);
        else if (variant < 4.5) z = 0.045 * sin((uv.y + 0.12 * sin(uv.x * 3.0)) * 13.0 - t * 0.25);
        else if (variant < 5.5) z = 0.040 * sin(length(uv - vec2(0.25 * sin(t * 0.08), 0.0)) * 17.0 - t * 0.38);
        else if (variant < 6.5) z = 0.035 * sin(length(uv - vec2(-0.42, 0.0)) * 18.0 - t * 0.32) + 0.035 * sin(length(uv - vec2(0.40, 0.08)) * 18.0 - t * 0.29);
        else z = 0.050 * sin((uv.y + 0.08 * sin(uv.x * 2.0)) * 10.5 - t * 0.22);
        return vec3(uv, z);
      }

      vec3 terrainNew(float variant, float n, float t) {
        vec2 uv = (cell(n) * 2.0 - 1.0) * vec2(1.18, 0.86);
        float drift = t * 0.035;
        float h;
        if (variant < 0.5) h = 0.42 * uv.x * uv.x - 0.24 + 0.10 * cos(uv.y * 3.0 + drift);
        else if (variant < 1.5) h = 0.62 * bell(length(uv - vec2(-0.42, 0.05)), 0.16) + 0.56 * bell(length(uv - vec2(0.40, -0.08)), 0.14) - 0.30;
        else if (variant < 2.5) h = 0.48 * length(uv) * length(uv) - 0.38 + 0.06 * sin(uv.x * 4.0 + drift);
        else if (variant < 3.5) h = 0.26 * sin(uv.x * 3.2 + drift) + 0.18 * cos(uv.y * 3.6) + 0.08 * uv.x;
        else if (variant < 4.5) h = 0.38 * (uv.x + 0.30) * (uv.x + 0.30) - 0.28 + 0.16 * uv.y;
        else if (variant < 5.5) h = 0.46 * bell(length(uv - vec2(-0.48, 0.22)), 0.13) + 0.38 * bell(length(uv - vec2(0.12, -0.28)), 0.18) + 0.34 * bell(length(uv - vec2(0.52, 0.30)), 0.12) - 0.30;
        else if (variant < 6.5) h = 0.27 * sin((uv.x + 0.22 * sin(uv.y * 2.4)) * 3.4 + drift) - 0.10 * uv.y;
        else h = 0.22 * cos(uv.x * 2.8 + drift) + 0.16 * cos(uv.y * 3.1) - 0.06;
        return vec3(uv, h * 0.72);
      }

      vec3 newField(float family, float variant, float n, float t) {
        if (family < 0.5) return amorphousNew(variant, n, t);
        if (family < 1.5) return molecularNew(variant, n, t);
        if (family < 2.5) return hyperNew(variant, n, t);
        if (family < 3.5) return birdNew(variant, n, t);
        if (family < 4.5) return wavesNew(variant, n, t);
        return terrainNew(variant, n, t);
      }

      vec3 hyperArchive(float index, float n, float t) {
        vec2 c = cell(n);
        float kind = floor(index / 10.0);
        float variant = mod(index, 10.0);
        float amount = variant / 9.0;
        float u = TAU * c.x;
        float v = TAU * c.y;
        vec4 q;
        if (kind < 0.5) {
          float phi = (c.x - 0.5) * PI;
          float eta = v * (1.0 + mod(variant, 3.0));
          float radius = 0.44 + (0.20 + amount * 0.12) * cos(phi);
          q = vec4(radius * cos(eta), radius * sin(eta),
            (0.30 + amount * 0.16) * sin(phi) * cos(eta + t * 0.16),
            (0.30 + amount * 0.16) * sin(phi) * sin(eta + t * 0.16));
        } else if (kind < 1.5) {
          float r1 = 0.22 + amount * 0.50;
          float r2 = sqrt(max(0.0, 1.0 - r1 * r1));
          q = vec4(r1 * cos(u), r1 * sin(u),
            r2 * cos(v + amount * u), r2 * sin(v + amount * u));
        } else if (kind < 2.5) {
          // Twenty-four square faces of a 4D hypercube, not edge traces.
          float face = floor(c.x * 24.0);
          float pair = floor(face / 4.0);
          float signIndex = mod(face, 4.0);
          float signA = mod(signIndex, 2.0) < 1.0 ? -1.0 : 1.0;
          float signB = floor(signIndex / 2.0) < 1.0 ? -1.0 : 1.0;
          float faceU = fract(c.x * 24.0) * 2.0 - 1.0;
          float faceV = c.y * 2.0 - 1.0;
          float extent = 0.48 + amount * 0.18;
          if (pair < 0.5) q = vec4(signA, signB, faceU, faceV);
          else if (pair < 1.5) q = vec4(signA, faceU, signB, faceV);
          else if (pair < 2.5) q = vec4(signA, faceU, faceV, signB);
          else if (pair < 3.5) q = vec4(faceU, signA, signB, faceV);
          else if (pair < 4.5) q = vec4(faceU, signA, faceV, signB);
          else q = vec4(faceU, faceV, signA, signB);
          float section = 1.0 + 0.08 * sin((faceU + faceV) * (2.0 + variant) + t * 0.14);
          q *= extent * section;
          q *= 0.50;
        } else if (kind < 3.5) {
          float fold = 0.58 + 0.18 * cos(v * (2.0 + mod(variant, 4.0)) + u);
          q = vec4(fold * cos(u), fold * sin(u),
            0.38 * sin(v) + 0.12 * sin(u * (3.0 + amount * 4.0)),
            0.38 * cos(v) + 0.12 * cos(u * (2.0 + amount * 5.0)));
        } else if (kind < 4.5) {
          float theta = u * (1.0 + mod(variant, 4.0));
          float phi = (c.y - 0.5) * PI;
          q = vec4(cos(theta) * cos(phi), sin(theta) * cos(phi),
            cos(theta * (1.0 + amount)) * sin(phi),
            sin(theta * (1.0 + amount)) * sin(phi)) * 0.78;
        } else if (kind < 5.5) {
          // Layered two-dimensional branes folded through z and the fourth axis.
          float layerCount = 3.0 + mod(variant, 4.0);
          float layer = floor(c.x * layerCount);
          float braneU = fract(c.x * layerCount) * 2.0 - 1.0;
          float braneV = c.y * 2.0 - 1.0;
          float offset = (layer - 0.5 * (layerCount - 1.0)) * (0.10 + amount * 0.035);
          float frequency = 2.2 + amount * 4.8;
          float foldZ = 0.34 * sin(braneU * frequency + braneV * 1.4 + t * 0.13);
          float foldW = 0.34 * cos(braneV * frequency - braneU * 1.2 - t * 0.11);
          q = vec4(
            braneU * (0.72 + 0.08 * cos(braneV * PI)),
            braneV * 0.72,
            foldZ + offset,
            foldW - offset
          );
        } else if (kind < 6.5) {
          float factor = 0.82 + (0.28 + amount * 0.20) * cos(v);
          q = vec4(factor * cos(u), factor * sin(u),
            (0.22 + amount * 0.18) * sin(u) * sin(v),
            (0.22 + amount * 0.18) * cos(u) * sin(v)
              + 0.14 * sin(u * (2.0 + mod(variant, 3.0))));
          q *= 0.78;
        } else if (kind < 7.5) {
          vec2 plane = c * 2.0 - 1.0;
          float frequency = 2.0 + amount * 4.0;
          float gyroid = sin(plane.x * frequency) * cos(plane.y * frequency)
            + sin(plane.y * frequency) * cos((plane.x + plane.y) * frequency);
          q = vec4(plane.x, plane.y, gyroid * 0.34,
            sin((plane.x - plane.y) * frequency + t * 0.13) * 0.42);
          q *= 0.50;
        } else if (kind < 8.5) {
          float slice = -0.82 + amount * 1.64;
          float theta = u;
          float phi = (c.y - 0.5) * PI;
          float radius = sqrt(max(0.0, 1.0 - slice * slice));
          q = vec4(radius * cos(phi) * cos(theta), radius * sin(phi),
            radius * cos(phi) * sin(theta), slice + 0.10 * sin(theta * 3.0));
        } else {
          float p = 2.0 + mod(variant, 4.0);
          float knot = u;
          float tube = 0.18 + 0.08 * sin(v);
          float ring = 0.56 + tube * cos(p * knot + v);
          q = vec4(ring * cos(knot), ring * sin(knot),
            tube * sin(p * knot + v),
            0.28 * sin((p + 1.0) * knot - v + t * 0.12));
        }
        q = rotate4(q, t * (0.12 + amount * 0.12) + variant * 0.09);
        float perspective = 1.0 / max(1.48, 2.48 - q.w * 0.30);
        return q.xyz * perspective * 1.82;
      }

      vec4 pentachoronVertex(float index) {
        return index < 0.5 ? vec4(0.5, 0.0, 0.0, 0.0)
          : index < 1.5 ? vec4(-0.125, 0.484, 0.0, 0.0)
          : index < 2.5 ? vec4(-0.125, -0.125, 0.421, 0.0)
          : index < 3.5 ? vec4(-0.125, -0.125, -0.140, 0.366)
          : vec4(-0.125, -0.125, -0.140, -0.366);
      }

      vec3 selectedArchive(float index, float n, float t) {
        vec2 c = cell(n);
        float group = floor(index / 10.0);
        float variant = mod(index, 10.0);
        float amount = variant / 9.0;
        if (group < 0.5) {
          vec2 uv = rot((amount - 0.5) * 0.42) * ((c * 2.0 - 1.0) * vec2(1.20, 0.88));
          float ridge = uv.x + (0.20 + amount * 0.22) * sin(uv.y * (2.4 + amount * 2.4) + t * 0.08);
          float h = (0.48 + amount * 0.24) * clamp(ridge * (2.8 + amount * 2.0), -1.0, 1.0)
            + (0.10 + amount * 0.10) * sin(uv.y * (6.0 + amount * 6.0) - t * 0.08);
          return vec3(uv, h * 0.72);
        }
        vec4 q;
        if (group < 1.5) {
          float shellCount = 4.0 + floor(mod(variant, 4.0));
          float shell = floor(c.x * shellCount);
          float shellU = fract(c.x * shellCount);
          float z = shellU * 2.0 - 1.0;
          float angle = TAU * c.y + shell * (0.12 + amount * 0.22);
          float radius = sqrt(max(0.0, 1.0 - z * z));
          float shellRadius = 0.28 + shell * (0.54 / max(1.0, shellCount - 1.0));
          q = shellRadius * vec4(radius * cos(angle), radius * sin(angle), z,
            sin(angle * (1.0 + mod(variant, 3.0)) + z * PI));
        } else if (group < 2.5) {
          // Ten triangular faces of the five-cell, sampled as surfaces in 4D.
          float face = floor(c.x * 10.0);
          float triangleU = fract(c.x * 10.0);
          float triangleV = c.y;
          float rootU = sqrt(triangleU);
          float indexA = face < 6.0 ? 0.0 : (face < 9.0 ? 1.0 : 2.0);
          float indexB = face < 3.0 ? 1.0
            : face < 5.0 ? 2.0
            : face < 6.0 ? 3.0
            : face < 8.0 ? 2.0
            : face < 9.0 ? 3.0 : 3.0;
          float indexC = face < 1.0 ? 2.0
            : face < 2.0 ? 3.0
            : face < 3.0 ? 4.0
            : face < 4.0 ? 3.0
            : face < 5.0 ? 4.0
            : face < 6.0 ? 4.0
            : face < 7.0 ? 3.0
            : face < 8.0 ? 4.0
            : face < 9.0 ? 4.0 : 4.0;
          vec4 vertexA = pentachoronVertex(indexA);
          vec4 vertexB = pentachoronVertex(indexB);
          vec4 vertexC = pentachoronVertex(indexC);
          q = (1.0 - rootU) * vertexA
            + rootU * (1.0 - triangleV) * vertexB
            + rootU * triangleV * vertexC;
          float facePulse = 1.0 + (0.03 + amount * 0.08)
            * sin((triangleU + triangleV) * TAU + face + t * 0.12);
          q *= (2.05 + amount * 0.46) * facePulse;
          q.w += (amount - 0.5) * 0.16 * sin(triangleV * TAU + face);
        } else if (group < 3.5) {
          float phi = (c.x - 0.5) * PI;
          float eta = c.y * TAU * (1.0 + mod(variant, 3.0));
          float radius = 0.46 + (0.18 + amount * 0.18) * cos(phi);
          q = vec4(radius * cos(eta), radius * sin(eta),
            (0.30 + amount * 0.20) * sin(phi) * cos(eta + t * (0.12 + amount * 0.14)),
            (0.30 + amount * 0.20) * sin(phi) * sin(eta + t * (0.12 + amount * 0.14)));
        } else if (group < 4.5) {
          float shellCount = 4.0 + floor(mod(variant, 4.0));
          float shell = floor(c.x * shellCount);
          float nestU = fract(c.x * shellCount) * TAU;
          float nestV = c.y * TAU;
          float r1 = 0.24 + shell * (0.48 / max(1.0, shellCount - 1.0));
          float r2 = sqrt(max(0.0, 1.0 - r1 * r1));
          q = vec4(r1 * cos(nestU), r1 * sin(nestU),
            r2 * cos(nestV + t * (0.10 + amount * 0.12) + amount * nestU),
            r2 * sin(nestV + t * (0.10 + amount * 0.12) + amount * nestU));
        } else if (group < 5.5) {
          float kleinU = c.x * TAU;
          float kleinV = c.y * TAU;
          float cu = cos(kleinU), su = sin(kleinU), cv = cos(kleinV), sv = sin(kleinV);
          float factor = 0.82 + (0.28 + amount * 0.24) * cv;
          q = vec4(factor * cu, factor * su,
            (0.20 + amount * 0.20) * su * sv,
            (0.20 + amount * 0.20) * cu * sv
              + (0.10 + amount * 0.12) * sin(kleinU * (2.0 + mod(variant, 3.0)) + t * 0.16));
          q *= 0.80;
        }
        if (group < 5.5) {
          q = rotate4(q, t * (0.14 + amount * 0.14) + variant * 0.08);
          float perspective = 1.0 / max(1.46, 2.46 - q.w * 0.32);
          return q.xyz * perspective * 1.82;
        }
        float theta = TAU * c.x;
        float y = 1.0 - 2.0 * c.y;
        float sphere = sqrt(max(0.0, 1.0 - y * y));
        float radius = 0.74 * (1.0
          + (0.09 + amount * 0.10) * sin(theta * 7.0 + t * (0.18 + amount * 0.20)) * sphere * sphere
          + (0.025 + amount * 0.055) * sin(y * (6.0 + variant) - theta * 2.0));
        float archiveScale = group < 6.5 ? 0.50 : 1.0;
        return vec3(radius * sphere * cos(theta), radius * y * (0.88 + amount * 0.10),
          radius * sphere * sin(theta)) * archiveScale;
      }

      vec3 fieldAt(float study, float n, float t) {
        if (study > 171.5) return selectedArchive(study - 172.0, n, t);
        if (study > 71.5) return hyperArchive(study - 72.0, n, t);
        if (study > 23.5) {
          float family = newFamily(study);
          return newField(family, mod(study - 24.0, 8.0), n, t);
        }
        float family = floor(study / 4.0);
        float variant = mod(study, 4.0);
        if (family < 0.5) return amorphous(variant, n, t);
        if (family < 1.5) return molecular(variant, n, t);
        if (family < 2.5) return hyperform(variant, n, t);
        if (family < 3.5) return bird(variant, n, t);
        if (family < 4.5) return waves(variant, n, t);
        return terrain(variant, n, t);
      }

      float densityAt(float study, float n, float t) {
        vec2 c = cell(n);
        float grain = hash(n + study * 113.0);
        if (study > 23.5) {
          float family = newFamily(study);
          if (study > 26.5 && study < 27.5) {
            float contour = 1.0 - smoothstep(0.06, 0.23,
              abs(sin(c.y * 24.0 + c.x * TAU * 7.0 - t * 0.24)));
            return 0.04 + 0.80 * contour * smoothstep(0.46, 0.97, grain);
          }
          if (study > 27.5 && study < 28.5) {
            float local = fract(c.x * 2.0);
            float contour = 1.0 - smoothstep(0.06, 0.22,
              abs(sin(sqrt(c.y) * 20.0 + local * TAU * 4.0 - t * 0.22)));
            return 0.04 + 0.84 * contour * smoothstep(0.43, 0.97, grain);
          }
          float threshold = family > 3.5 ? 0.85 : 0.91;
          float constellation = smoothstep(threshold, 0.998, grain);
          float lattice = 0.72 + 0.28 * hash(floor(c.x * 64.0) + floor(c.y * 64.0) * 67.0 + study);
          return 0.06 + 0.94 * constellation * lattice;
        }
        float family = floor(study / 4.0);
        float variant = mod(study, 4.0);
        if (family < 0.5) {
          if (variant > 2.5) return 0.38 + 0.62 * smoothstep(0.34, 0.92, grain);
          float a = TAU * fract(c.x + c.y * 0.6180339);
          float r = sqrt(c.y);
          float lobes = variant < 0.5 ? 2.0 : (variant < 1.5 ? 4.0 : 7.0);
          float bands = 1.0 - smoothstep(0.07, 0.28, abs(sin(r * 17.0 + a * lobes - t * 0.45)));
          if (variant > 1.5) return 0.018 + 0.52 * bands * smoothstep(0.62, 0.985, grain);
          return 0.16 + 0.84 * bands * smoothstep(0.30, 0.92, grain);
        }
        if (family < 1.5) {
          if (variant > 2.5) return 0.48 + 0.52 * smoothstep(0.44, 0.94, grain);
          float thread = 1.0 - smoothstep(0.09, 0.30, abs(sin(c.y * 38.0 + c.x * 5.0)));
          return 0.22 + 0.78 * max(thread, smoothstep(0.70, 0.96, grain));
        }
        if (family < 2.5) return 0.18 + 0.82 * smoothstep(0.47, 0.95, grain);
        if (family < 3.5) {
          float feather = 1.0 - smoothstep(0.05, 0.25, abs(sin(c.y * (variant > 2.5 ? 34.0 : 22.0))));
          return 0.16 + 0.84 * max(feather, smoothstep(0.74, 0.96, grain));
        }
        if (family < 4.5) {
          vec2 uv = (c * 2.0 - 1.0) * vec2(1.28, 0.92);
          float h = waveHeight(variant, uv, t);
          float ridge = 1.0 - smoothstep(0.04, 0.18, abs(sin(h * 23.0 + variant)));
          return 0.08 + 0.92 * ridge * smoothstep(0.27, 0.90, grain);
        }
        vec2 uv = (c * 2.0 - 1.0) * vec2(1.20, 0.88);
        float h = terrainHeight(variant, uv, t);
        float contour = 1.0 - smoothstep(0.05, 0.22, abs(sin(h * 16.0 + variant * 0.7)));
        return 0.10 + 0.90 * max(contour * smoothstep(0.25, 0.90, grain), smoothstep(0.88, 0.98, grain));
      }

      void main() {
        float ease = uTransition * uTransition * (3.0 - 2.0 * uTransition);
        vec3 p = mix(fieldAt(uFromStudy, aIndex, uTime), fieldAt(uStudy, aIndex, uTime), ease);
        float family = (uFromStudy < 23.5 && uStudy < 23.5)
          ? floor(mix(uFromStudy, uStudy, ease) / 4.0)
          : mix(uFromStudy > 23.5 ? newFamily(uFromStudy) : floor(uFromStudy / 4.0),
              uStudy > 23.5 ? newFamily(uStudy) : floor(uStudy / 4.0), ease);
        float disperse = sin(PI * uTransition);
        vec3 dust = vec3(hash(aIndex + 7.0), hash(aIndex + 71.0), hash(aIndex + 311.0)) * 2.0 - 1.0;
        p += dust * disperse * 0.12;

        float yaw = family < 0.5 ? 0.18 : (family < 1.5 ? -0.20 : (family < 2.5 ? 0.22 : 0.0));
        float pitch = family > 4.5 ? 0.88 : (family > 3.5 ? 0.34 : (family < 2.5 && family > 1.5 ? 0.28 : 0.06));
        float newness = mix(step(23.5, uFromStudy), step(23.5, uStudy), ease);
        if (family > 3.5 && family < 4.5) pitch = mix(pitch, 0.035, newness);
        p.xz = rot(yaw + 0.035 * sin(uTime * 0.22)) * p.xz;
        p.yz = rot(pitch) * p.yz;
        float perspective = 2.7 / max(2.0, 3.0 - p.z * 0.42);
        vec2 projected = p.xy * perspective;
        float scale = family < 0.5 ? 0.88 : (family < 1.5 ? 0.92 : (family < 2.5 ? 0.94 : (family < 3.5 ? 0.90 : 0.86)));
        projected *= scale;
        projected *= uDisplayScale;
        float fromShockDisplay = step(171.5, uFromStudy) * (1.0 - step(181.5, uFromStudy));
        float toShockDisplay = step(171.5, uStudy) * (1.0 - step(181.5, uStudy));
        float shockDisplayWeight = mix(fromShockDisplay, toShockDisplay, ease);
        projected *= mix(1.0, uShockDisplayScale, shockDisplayWeight);
        if (uViewport.x > uViewport.y) projected.x *= uViewport.y / uViewport.x;
        else projected.y *= uViewport.x / uViewport.y;

        vec2 delta = projected - uPointer.xy;
        float d2 = dot(delta, delta);
        float influence = uPointer.z * exp(-d2 * 3.2);
        vec2 direction = delta * inversesqrt(max(d2, 0.0008));
        vec2 tangent = vec2(-direction.y, direction.x);
        projected += tangent * influence * (0.035 + 0.012 * sin(d2 * 26.0 - uTime * 1.4));
        projected += direction * influence * 0.006 * sin(d2 * 34.0 + uTime);

        float density = mix(densityAt(uFromStudy, aIndex, uTime), densityAt(uStudy, aIndex, uTime), ease);
        float fromShock = step(171.5, uFromStudy) * (1.0 - step(181.5, uFromStudy));
        float toShock = step(171.5, uStudy) * (1.0 - step(181.5, uStudy));
        float shockWeight = mix(fromShock, toShock, ease);
        density *= mix(1.0, uShockDensityScale, shockWeight);
        density = clamp(density * uDensityScale, 0.0, 1.0);
        float depth = clamp(0.58 + p.z * 0.28, 0.18, 1.0);
        float dpr = clamp(uViewport.y / 720.0, 1.0, 1.7);
        gl_Position = vec4(projected, 0.0, 1.0);
        gl_PointSize = (1.20 + depth * 1.20) * dpr * (0.72 + density * 0.38);
        vAlpha = density * (0.26 + depth * 0.52);
        vTone = clamp(0.26 + depth * 0.66 + hash(aIndex + 19.0) * 0.10, 0.0, 1.0);
      }
    `;

    const fragmentSource = `
      precision mediump float;
      varying float vAlpha;
      varying float vTone;
      void main() {
        vec2 point = gl_PointCoord - 0.5;
        float edge = 1.0 - smoothstep(0.24, 0.52, length(point));
        float alpha = vAlpha * edge;
        if (alpha < 0.012) discard;
        vec3 ink = vec3(0.090, 0.094, 0.082);
        gl_FragColor = vec4(mix(ink * 0.74, ink, vTone), alpha);
      }
    `;

    function compile(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(message);
      }
      return shader;
    }

    try {
      const vertex = compile(gl.VERTEX_SHADER, vertexSource);
      const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
      const program = gl.createProgram();
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.useProgram(program);

      const indices = new Float32Array(pointCount);
      for (let value = 0; value < pointCount; value += 1) indices[value] = value;
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, indices, gl.STATIC_DRAW);
      const locations = {
        index: gl.getAttribLocation(program, "aIndex"),
        count: gl.getUniformLocation(program, "uCount"),
        time: gl.getUniformLocation(program, "uTime"),
        from: gl.getUniformLocation(program, "uFromStudy"),
        study: gl.getUniformLocation(program, "uStudy"),
        transition: gl.getUniformLocation(program, "uTransition"),
        viewport: gl.getUniformLocation(program, "uViewport"),
        pointer: gl.getUniformLocation(program, "uPointer"),
        displayScale: gl.getUniformLocation(program, "uDisplayScale"),
        densityScale: gl.getUniformLocation(program, "uDensityScale"),
        shockDensityScale: gl.getUniformLocation(program, "uShockDensityScale"),
        shockDisplayScale: gl.getUniformLocation(program, "uShockDisplayScale")
      };
      gl.enableVertexAttribArray(locations.index);
      gl.vertexAttribPointer(locations.index, 1, gl.FLOAT, false, 0, 0);
      gl.uniform1f(locations.count, pointCount);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform1f(locations.displayScale, options.displayScale ?? 1);
      gl.uniform1f(locations.densityScale, options.densityScale ?? 1);
      gl.uniform1f(locations.shockDensityScale, options.shockDensityScale ?? 1);
      gl.disable(gl.DEPTH_TEST);
      gl.uniform1f(locations.shockDisplayScale, options.shockDisplayScale ?? 1);

      function resize() {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
        const width = Math.max(1, Math.round(rect.width * dpr));
        const height = Math.max(1, Math.round(rect.height * dpr));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          gl.viewport(0, 0, width, height);
          gl.uniform2f(locations.viewport, width, height);
        }
      }

      function render(time, from, study, transition, point) {
        resize();
        gl.clearColor(0.969, 0.969, 0.957, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1f(locations.time, time);
        gl.uniform1f(locations.from, from);
        gl.uniform1f(locations.study, study);
        gl.uniform1f(locations.transition, transition);
        gl.uniform3f(locations.pointer, point[0], point[1], point[2]);
        gl.drawArrays(gl.POINTS, 0, pointCount);
      }
      return { render };
    } catch (error) {
      console.error("Field lab WebGL initialization failed.", error);
      return null;
    }
  }


  global.createMuseumStudyRenderer = createStudyRenderer;
})(window);
