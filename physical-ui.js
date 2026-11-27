/* The Power of the Pudú · physical-ui.js
 * Motor de Física de Resorte (Spring-Damper) + Giroscopio (deviceorientation) + Mouse
 * Sincroniza cámara off-axis, fondo (.bg-stage), God Ray y tarjetas 3D.
 */

const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

export class PhysicalUIEngine {
  constructor(options = {}) {
    this.maxEyeX = options.maxEyeX ?? 260;
    this.maxEyeY = options.maxEyeY ?? 190;
    this.stiffness = options.stiffness ?? 115;
    this.damping = options.damping ?? 15.5;

    // Estado del resorte 2D (posición y velocidad en unidades de ojo)
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;

    // Objetivos separados para fusionar mouse + giroscopio
    this.mouseNx = 0;
    this.mouseNy = 0;
    this.mouseWeight = 0;
    this.lastMouseTime = 0;

    this.gyroNx = 0;
    this.gyroNy = 0;
    this.hasGyro = false;
    this.gyroPermissionState = 'unknown'; // 'unknown' | 'granted' | 'denied' | 'not-needed'

    // Calibración relativa del giroscopio (para sostener el celular en cualquier ángulo)
    this._gyroBaseBeta = null;
    this._gyroBaseGamma = null;

    this._lastTime = performance.now();
    this._rafId = null;
    this._bound = false;

    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerLeave = this._onPointerLeave.bind(this);
    this._onDeviceOrientation = this._onDeviceOrientation.bind(this);
    this._onFirstGesture = this._onFirstGesture.bind(this);
    this._tick = this._tick.bind(this);
  }

  init() {
    if (this._bound) return this;
    this._bound = true;

    window.addEventListener('pointermove', this._onPointerMove, { passive: true });
    document.addEventListener('mouseleave', this._onPointerLeave, { passive: true });

    if (typeof DeviceOrientationEvent !== 'undefined') {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+: requiere gesto del usuario
        window.addEventListener('pointerdown', this._onFirstGesture, { once: true, passive: true });
        window.addEventListener('touchstart', this._onFirstGesture, { once: true, passive: true });
      } else {
        this.gyroPermissionState = 'not-needed';
        window.addEventListener('deviceorientation', this._onDeviceOrientation, { passive: true });
      }
    }

    this._lastTime = performance.now();
    this._tick(this._lastTime);
    return this;
  }

  async requestGyroPermission() {
    if (typeof DeviceOrientationEvent === 'undefined') return 'unsupported';
    if (typeof DeviceOrientationEvent.requestPermission !== 'function') {
      this.gyroPermissionState = 'not-needed';
      window.addEventListener('deviceorientation', this._onDeviceOrientation, { passive: true });
      return 'granted';
    }
    try {
      const res = await DeviceOrientationEvent.requestPermission();
      this.gyroPermissionState = res;
      if (res === 'granted') {
        window.addEventListener('deviceorientation', this._onDeviceOrientation, { passive: true });
      }
      return res;
    } catch (_) {
      this.gyroPermissionState = 'denied';
      return 'denied';
    }
  }

  _onFirstGesture() {
    if (this.gyroPermissionState === 'unknown') {
      this.requestGyroPermission();
    }
  }

  _onPointerMove(e) {
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    const nx = ((e.clientX / w) - 0.5) * 2;
    const ny = ((e.clientY / h) - 0.5) * 2;

    // Curva suave S-curve para precisión en el centro y respuesta en bordes
    this.mouseNx = clamp(nx, -1, 1);
    this.mouseNy = clamp(ny, -1, 1);
    this.mouseWeight = 1.0;
    this.lastMouseTime = performance.now();
  }

  _onPointerLeave() {
    this.mouseNx = 0;
    this.mouseNy = 0;
  }

  _onDeviceOrientation(e) {
    if (e.beta == null || e.gamma == null) return;
    this.hasGyro = true;

    // Compensar orientación de pantalla (portrait vs landscape)
    const angle = (window.screen && window.screen.orientation && typeof window.screen.orientation.angle === 'number')
      ? window.screen.orientation.angle
      : (typeof window.orientation === 'number' ? window.orientation : 0);

    let rawX = e.gamma;
    let rawY = e.beta;
    if (angle === 90) {
      rawX = e.beta;
      rawY = -e.gamma;
    } else if (angle === -90 || angle === 270) {
      rawX = -e.beta;
      rawY = e.gamma;
    } else if (angle === 180) {
      rawX = -e.gamma;
      rawY = -e.beta;
    }

    if (this._gyroBaseGamma === null || this._gyroBaseBeta === null) {
      this._gyroBaseGamma = rawX;
      this._gyroBaseBeta = rawY;
    }

    // Auto-recalibración lenta para evitar deriva cuando el usuario cambia de postura
    this._gyroBaseGamma += (rawX - this._gyroBaseGamma) * 0.008;
    this._gyroBaseBeta += (rawY - this._gyroBaseBeta) * 0.008;

    const deltaX = clamp(rawX - this._gyroBaseGamma, -35, 35);
    const deltaY = clamp(rawY - this._gyroBaseBeta, -30, 30);

    this.gyroNx = clamp(deltaX / 26, -1, 1);
    this.gyroNy = clamp(deltaY / 22, -1, 1);
  }

  recalibrateGyro() {
    this._gyroBaseBeta = null;
    this._gyroBaseGamma = null;
  }

  _tick(now) {
    this._rafId = requestAnimationFrame(this._tick);
    if (document.hidden) {
      this._lastTime = now;
      return;
    }

    const dt = Math.min((now - this._lastTime) * 0.001, 0.033);
    this._lastTime = now;

    // Decaimiento suave del peso del mouse si hay giroscopio activo y el mouse está quieto
    if (this.hasGyro && now - this.lastMouseTime > 2200) {
      this.mouseWeight = Math.max(0, this.mouseWeight - dt * 0.8);
    }

    // Fusión armónica de Giroscopio + Mouse + micro-respiración orgánica
    const t = now * 0.001;
    const idleX = Math.sin(t * 0.55) * 0.04;
    const idleY = Math.cos(t * 0.42) * 0.03;

    const targetNx = clamp(
      this.gyroNx * (this.hasGyro ? 1.0 : 0.0) + this.mouseNx * this.mouseWeight + idleX,
      -1.15,
      1.15
    );
    const targetNy = clamp(
      this.gyroNy * (this.hasGyro ? 1.0 : 0.0) + this.mouseNy * this.mouseWeight + idleY,
      -1.15,
      1.15
    );

    const targetX = targetNx * this.maxEyeX;
    const targetY = targetNy * this.maxEyeY;

    // Integración física de resorte sub-amortiguado (2 sub-steps para estabilidad)
    const steps = 2;
    const subDt = dt / steps;
    for (let i = 0; i < steps; i++) {
      const ax = (targetX - this.x) * this.stiffness - this.vx * this.damping;
      const ay = (targetY - this.y) * this.stiffness - this.vy * this.damping;
      this.vx += ax * subDt;
      this.vy += ay * subDt;
      this.x += this.vx * subDt;
      this.y += this.vy * subDt;
    }
  }

  eye() {
    return [this.x, this.y];
  }

  normalized() {
    return {
      nx: clamp(this.x / this.maxEyeX, -1, 1),
      ny: clamp(this.y / this.maxEyeY, -1, 1),
      vx: this.vx,
      vy: this.vy,
      hasGyro: this.hasGyro
    };
  }

  /**
   * Sincroniza el fondo (.bg-stage) con física de profundidad real sin mostrar bordes negros.
   */
  updateBackground(bgEl, strength = 1.0) {
    if (!bgEl) return;
    const { nx, ny } = this.normalized();
    const tx = (-nx * 26 * strength).toFixed(2);
    const ty = (-ny * 18 * strength).toFixed(2);
    const rx = (ny * 2.2 * strength).toFixed(3);
    const ry = (-nx * 2.6 * strength).toFixed(3);
    bgEl.style.transform = `perspective(1200px) translate3d(${tx}px, ${ty}px, 0) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.07)`;
  }

  destroy() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    window.removeEventListener('pointermove', this._onPointerMove);
    document.removeEventListener('mouseleave', this._onPointerLeave);
    window.removeEventListener('deviceorientation', this._onDeviceOrientation);
    this._bound = false;
  }
}

export const PhysicalUI = new PhysicalUIEngine().init();
if (typeof window !== 'undefined') {
  window.PhysicalUI = PhysicalUI;
}

export default PhysicalUI;
