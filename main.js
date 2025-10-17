// main.js - Three.js シーンと簡易物理
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

let ball, field, camera, scene, renderer, clock;
let velocity = new THREE.Vector3(0, 0, 0);

const PARAMS = {
  gravity: -9.8,
  friction: 0.98,
  airDrag: 0.995,
  floorY: 0,
  runAccel: 2.0, // RUN 強度に比例して前進加速
  runMaxSpeed: 6.0,
  kickUp: 6.0,   // KICK の上方向係数
  kickForward: 8.0, // KICK の前方向係数
  restitution: 0.5, // 反発係数
};

export function setupThree(canvas) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 3, 8);
  camera.lookAt(0, 1, 0);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
  hemi.position.set(0, 20, 0);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 10, 5);
  scene.add(dir);

  // フィールド平面
  const fieldGeo = new THREE.PlaneGeometry(20, 40);
  const fieldMat = new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 1.0, metalness: 0.0 });
  field = new THREE.Mesh(fieldGeo, fieldMat);
  field.rotation.x = -Math.PI / 2;
  field.position.y = PARAMS.floorY - 0.001;
  scene.add(field);

  // ボール
  const ballGeo = new THREE.SphereGeometry(0.3, 32, 16);
  const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.1 });
  ball = new THREE.Mesh(ballGeo, ballMat);
  ball.position.set(0, 0.3, 0);
  scene.add(ball);

  clock = new THREE.Clock();

  window.addEventListener('resize', () => resizeRendererToDisplaySize(renderer, camera));

  return { scene, camera, renderer, clock };
}

export function resizeRendererToDisplaySize(renderer, camera) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const needResize = renderer.domElement.width !== w || renderer.domElement.height !== h;
  if (needResize) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}

export function updatePhysics(dt) {
  if (!dt) return;

  // 重力
  velocity.y += PARAMS.gravity * dt;

  // 空気抵抗
  velocity.multiplyScalar(PARAMS.airDrag);

  // 位置更新
  ball.position.addScaledVector(velocity, dt);

  // 床衝突
  const radius = 0.3;
  if (ball.position.y - radius < PARAMS.floorY) {
    ball.position.y = PARAMS.floorY + radius;
    if (velocity.y < 0) velocity.y = -velocity.y * PARAMS.restitution;
    // 接地摩擦
    velocity.x *= PARAMS.friction;
    velocity.z *= PARAMS.friction;
  }

  // 前進方向を -Z とする
  // 制限
  const horizontalSpeed = Math.hypot(velocity.x, velocity.z);
  if (horizontalSpeed > PARAMS.runMaxSpeed) {
    const scale = PARAMS.runMaxSpeed / horizontalSpeed;
    velocity.x *= scale;
    velocity.z *= scale;
  }
}

export function setRunBoost(conf) {
  // conf(0-1) に比例した前進加速度を与える（基礎加速は無し）
  const accel = PARAMS.runAccel * conf;
  velocity.z -= accel * (1 / 60); // フレーム単位で弱く積む（updatePhysics 内で dt で積むので微調整）
}

export function kickImpulse(conf) {
  // 瞬間インパルス
  const up = PARAMS.kickUp * (0.5 + 0.5 * conf);
  const forward = PARAMS.kickForward * (0.5 + 0.5 * conf);
  velocity.y += up;
  velocity.z -= forward;
}

export { ball, scene, camera, renderer, clock };
