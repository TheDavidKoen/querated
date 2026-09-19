// The transmission beam: a burst of particles that travels along a cubic curve from the query to
// the gallery. Positions are computed on the GPU from one time uniform, so the CPU only advances a
// clock, and the render loop stops as soon as the burst has landed.

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  OrthographicCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from "three";

export type BeamPoint = { x: number; y: number };

const PARTICLES = 900;
const MAX_DELAY_SECONDS = 0.55;
const MIN_SPEED = 0.85;
const PALETTE = ["#ff5cc8", "#5cd6ff", "#ffb454", "#b69cff", "#7cf29c", "#ffe066"];

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec2 uStart;
  uniform vec2 uControlA;
  uniform vec2 uControlB;
  uniform vec2 uEnd;
  attribute float aDelay;
  attribute float aSpeed;
  attribute float aOffset;
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;

  vec2 curve(float t) {
    float u = 1.0 - t;
    return u * u * u * uStart + 3.0 * u * u * t * uControlA + 3.0 * u * t * t * uControlB + t * t * t * uEnd;
  }

  vec2 tangent(float t) {
    float u = 1.0 - t;
    return 3.0 * u * u * (uControlA - uStart) + 6.0 * u * t * (uControlB - uControlA) + 3.0 * t * t * (uEnd - uControlB);
  }

  void main() {
    float t = clamp((uTime - aDelay) * aSpeed, 0.0, 1.0);
    float life = sin(t * 3.14159265);
    vec2 direction = normalize(tangent(t) + vec2(0.0001));
    vec2 normal = vec2(-direction.y, direction.x);
    vec2 point = curve(t) + normal * aOffset * life;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(point, 0.0, 1.0);
    gl_PointSize = aSize * uPixelRatio * (0.35 + 0.65 * life);
    vColor = aColor;
    vAlpha = t > 0.0 && t < 1.0 ? life : 0.0;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float glow = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
    gl_FragColor = vec4(vColor, glow * vAlpha);
  }
`;

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

function randomValues(min: number, spread: number): Float32Array {
  return Float32Array.from({ length: PARTICLES }, () => min + Math.random() * spread);
}

function particleAttributes(geometry: BufferGeometry) {
  const palette = PALETTE.map(hexToRgb);
  const colours = Float32Array.from(
    { length: PARTICLES * 3 },
    (_, index) => palette[Math.floor(index / 3) % palette.length]?.[index % 3] ?? 1,
  );

  geometry.setAttribute("position", new BufferAttribute(new Float32Array(PARTICLES * 3), 3));
  geometry.setAttribute("aDelay", new BufferAttribute(randomValues(0, MAX_DELAY_SECONDS), 1));
  geometry.setAttribute("aSpeed", new BufferAttribute(randomValues(MIN_SPEED, 0.6), 1));
  geometry.setAttribute("aOffset", new BufferAttribute(randomValues(-45, 90), 1));
  geometry.setAttribute("aSize", new BufferAttribute(randomValues(3, 7), 1));
  geometry.setAttribute("aColor", new BufferAttribute(colours, 3));
}

export class Beam {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(0, 1, 0, -1, -1, 1);
  private readonly geometry = new BufferGeometry();
  private readonly material: ShaderMaterial;
  private frame = 0;
  private startedAt = 0;
  private readonly lifetime = MAX_DELAY_SECONDS + 1 / MIN_SPEED;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false });
    this.renderer.setClearColor(0x000000, 0);
    particleAttributes(this.geometry);
    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uStart: { value: new Vector2() },
        uControlA: { value: new Vector2() },
        uControlB: { value: new Vector2() },
        uEnd: { value: new Vector2() },
      },
    });
    const points = new Points(this.geometry, this.material);
    points.frustumCulled = false;
    this.scene.add(points);
    this.resize();
  }

  resize(): void {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.camera.right = width;
    this.camera.bottom = -height;
    this.camera.updateProjectionMatrix();
    this.setUniform("uPixelRatio", pixelRatio);
  }

  fire(from: BeamPoint, to: BeamPoint): void {
    const start = new Vector2(from.x, -from.y);
    const end = new Vector2(to.x, -to.y);
    const rise = Math.max(120, Math.abs(end.x - start.x) * 0.35);
    this.setUniform("uStart", start);
    this.setUniform("uControlA", new Vector2(start.x + (end.x - start.x) * 0.3, start.y + rise));
    this.setUniform("uControlB", new Vector2(start.x + (end.x - start.x) * 0.7, end.y + rise));
    this.setUniform("uEnd", end);
    this.startedAt = performance.now();
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(this.tick);
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
  }

  private setUniform(name: string, value: number | Vector2): void {
    const uniform = this.material.uniforms[name];
    if (uniform) uniform.value = value;
  }

  private readonly tick = (now: number) => {
    const elapsed = (now - this.startedAt) / 1000;
    this.setUniform("uTime", elapsed);
    this.renderer.render(this.scene, this.camera);
    if (elapsed < this.lifetime) {
      this.frame = requestAnimationFrame(this.tick);
    } else {
      this.renderer.clear();
    }
  };
}

export function createBeam(canvas: HTMLCanvasElement): Beam | null {
  try {
    return new Beam(canvas);
  } catch {
    return null;
  }
}
