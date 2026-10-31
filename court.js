import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';

const COLORS = {
  '硬地 hard': '#176b9b',
  '紅土 clay': '#d96d2b',
  '草地 grass': '#0f7a4f',
};
const STOPS = ['OPEN', 'T1', 'T2', 'T3', '新聞'];
const POSITIONS = [
  [-3.9, -1.45],
  [-2, 1.3],
  [0, -1.25],
  [2, 1.3],
  [3.9, -1.45],
];

export function createCourt(container, onStop) {
  // Scene and camera
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#061522');
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.minDistance = 5;
  controls.maxDistance = 32;
  controls.maxPolarAngle = Math.PI / 2.1;
  const phone = matchMedia('(max-width: 650px)');
  let defaultDistance = 8;
  function reset() {
    const above = phone.matches ? 0.54 : 0.47;
    const toward = phone.matches ? 0.84 : 0.88;
    camera.position.set(0, defaultDistance * above, defaultDistance * toward);
    controls.target.set(0, 0, 0);
    controls.update();
  }

  scene.add(new THREE.HemisphereLight(0xffffff, 0x16364b, 2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
  keyLight.position.set(-3, 9, 6);
  scene.add(keyLight);

  // Court surface, lines, net, route and ball
  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 6),
    new THREE.MeshStandardMaterial({ color: COLORS['硬地 hard'], roughness: 0.85 }),
  );
  surface.rotation.x = -Math.PI / 2;
  scene.add(surface);

  const lineMaterial = new THREE.LineBasicMaterial({ color: '#effff7' });
  const segments = [
    [[-4.5, -2.5], [4.5, -2.5]],
    [[-4.5, 2.5], [4.5, 2.5]],
    [[-4.5, -2.5], [-4.5, 2.5]],
    [[4.5, -2.5], [4.5, 2.5]],
    [[0, -2.5], [0, 2.5]],
    [[-2.5, 0], [2.5, 0]],
    [[-2.5, -2.5], [-2.5, 2.5]],
    [[2.5, -2.5], [2.5, 2.5]],
  ];
  for (const segment of segments) {
    const points = segment.map(([x, z]) => new THREE.Vector3(x, 0.025, z));
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial));
  }
  const net = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.58, 5.8),
    new THREE.MeshBasicMaterial({ color: '#e9fff4', transparent: true, opacity: 0.38 }),
  );
  net.position.set(0, 0.3, 0);
  scene.add(net);

  function labelTexture(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const context = canvas.getContext('2d');
    context.fillStyle = '#061522';
    context.fillRect(1, 1, 254, 94);
    context.strokeStyle = '#d7ff43';
    context.lineWidth = 5;
    context.strokeRect(3, 3, 250, 90);
    context.fillStyle = '#e9fff4';
    context.font = 'bold 48px system-ui';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 128, 48);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  const markers = POSITIONS.map(([x, z], index) => {
    const marker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.06, 32),
      new THREE.MeshStandardMaterial({ color: '#e9fff4', emissive: '#12314c' }),
    );
    marker.position.set(x, 0.07, z);
    marker.userData.index = index;
    scene.add(marker);
    const label = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: labelTexture(STOPS[index]), transparent: true }),
    );
    label.position.set(x, 0.72, z);
    label.scale.set(1.25, 0.47, 1);
    label.userData.index = index;
    scene.add(label);
    return { marker, label };
  });

  const route = new THREE.CatmullRomCurve3(
    POSITIONS.map(([x, z]) => new THREE.Vector3(x, 0.25, z)),
  );
  const routeLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(route.getPoints(100)),
    new THREE.LineDashedMaterial({ color: '#d7ff43', dashSize: 0.23, gapSize: 0.14 }),
  );
  routeLine.computeLineDistances();
  scene.add(routeLine);
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.23, 24, 16),
    new THREE.MeshStandardMaterial({
      color: '#d7ff43',
      emissive: '#526509',
      emissiveIntensity: 0.35,
    }),
  );
  scene.add(ball);

  // The mascot follows completion state independently of the story ball.
  function stickerSprite(name) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ transparent: true, depthTest: false }),
    );
    sprite.center.set(0.5, 0);
    scene.add(sprite);
    new THREE.TextureLoader().load('./assets/stickers/' + name + '.webp', texture => {
      texture.colorSpace = THREE.SRGBColorSpace;
      sprite.material.map = texture;
      sprite.material.needsUpdate = true;
      sprite.userData.aspect = texture.image.width / texture.image.height;
      scaleMascot(sprite);
    });
    return sprite;
  }
  const runner = stickerSprite('run');
  const champion = stickerSprite('cool');
  function scaleMascot(sprite) {
    const height = phone.matches ? 1.9 : 1.0;
    sprite.scale.set(height * sprite.userData.aspect, height, 1);
  }
  champion.visible = false;
  let guideIndex = 0;
  let guideKind = 'run';
  let moveFrom = 0;
  let moveTo = 0;
  let moveStart = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function setProgress(done) {
    markers.forEach(({ marker }, index) => {
      marker.material.color.set(done[index] ? '#0f7a4f' : '#e9fff4');
      marker.material.emissive.set(done[index] ? '#0f7a4f' : '#12314c');
    });
    const next = done.findIndex(value => !value);
    const destination = next === -1 ? 4 : next;
    if (destination !== guideIndex) {
      moveFrom = guideIndex;
      moveTo = destination;
      moveStart = performance.now();
      guideIndex = destination;
    }
    guideKind = next === -1 ? 'cool' : 'run';
    runner.visible = guideKind === 'run';
    champion.visible = guideKind === 'cool';
  }

  // Input, controls and frame updates
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  renderer.domElement.addEventListener('click', event => {
    const box = renderer.domElement.getBoundingClientRect();
    pointer.set(
      (event.clientX - box.left) / box.width * 2 - 1,
      -(event.clientY - box.top) / box.height * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(
      markers.flatMap(({ marker, label }) => [marker, label]),
    )[0];
    if (hit) onStop(hit.object.userData.index);
  });

  let options = { surface: '硬地 hard', speed: 1, showRoute: true, rotate: false };
  function update(next) {
    options = { ...options, ...next };
    surface.material.color.set(COLORS[options.surface] || COLORS['硬地 hard']);
    routeLine.visible = options.showRoute;
    controls.autoRotate = Boolean(options.rotate) && !reduced.matches;
  }

  // Fit the court's actual half-width in the horizontal field of view on phones.
  function fitDistance(halfWidth, fill = 0.92) {
    const vertical = THREE.MathUtils.degToRad(camera.fov);
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
    return halfWidth / fill / Math.tan(horizontal / 2);
  }

  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    defaultDistance = phone.matches
      ? fitDistance(5)
      : (camera.aspect > 1.7 ? 24.5 : 20) / camera.aspect;
    const labelScale = phone.matches
      ? THREE.MathUtils.clamp(640 / width, 1.25, 2.2)
      : 1.25;
    markers.forEach(({ label }) => {
      const height = phone.matches ? 0.78 * labelScale / 1.25 : 0.47;
      label.scale.set(labelScale, height, 1);
    });
    for (const sprite of [runner, champion]) {
      if (sprite.userData.aspect) scaleMascot(sprite);
    }
    reset();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  let ballProgress = 0;
  let lastFrame = 0;
  function frame(now) {
    const delta = Math.min((now - lastFrame) / 1000, 0.1);
    lastFrame = now;
    if (!reduced.matches) {
      ballProgress = (ballProgress + delta * 0.075 * Number(options.speed)) % 1;
    }
    const ballPoint = route.getPoint(ballProgress);
    ball.position.set(
      ballPoint.x,
      0.3 + Math.abs(Math.sin(ballProgress * Math.PI * 4)) * 0.85,
      ballPoint.z,
    );

    let guidePosition = guideIndex;
    if (!reduced.matches && moveFrom !== moveTo) {
      const fraction = Math.min((now - moveStart) / 800, 1);
      guidePosition = moveFrom + (moveTo - moveFrom) * fraction;
      if (fraction === 1) moveFrom = moveTo;
    }
    const guidePoint = route.getPoint(guidePosition / 4);
    const guideOffset = phone.matches
      ? (guidePoint.x > 1 ? -2.15 : 2.15)
      : 0.45;
    runner.position.set(guidePoint.x + guideOffset, 0.14, guidePoint.z + 0.2);
    champion.position.set(guidePoint.x + guideOffset, 0.14, guidePoint.z + 0.2);
    controls.autoRotate = Boolean(options.rotate) && !reduced.matches;
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  reduced.addEventListener('change', () => update(options));
  requestAnimationFrame(frame);

  function projectedHeight(bottom, worldHeight) {
    const low = bottom.clone().project(camera);
    const high = bottom.clone().add(new THREE.Vector3(0, worldHeight, 0))
      .project(camera);
    return Math.abs(high.y - low.y) * container.clientHeight / 2;
  }

  return {
    update,
    setProgress,
    reset,
    get guideIndex() { return guideIndex; },
    get guideKind() { return guideKind; },
    get guideMoving() { return moveFrom !== moveTo && !reduced.matches; },
    get reducedMotion() { return reduced.matches; },
    get autoRotate() { return controls.autoRotate; },
    get ballPositioned() { return ball.position.y > 0; },
    get frameMetrics() {
      const label = markers[0].label;
      const mascot = guideKind === 'cool' ? champion : runner;
      return {
        frameWidth: container.clientWidth,
        frameHeight: container.clientHeight,
        openTextPx: projectedHeight(
          label.position.clone().add(new THREE.Vector3(0, -label.scale.y / 2, 0)),
          label.scale.y * 0.5,
        ),
        mascotPx: projectedHeight(mascot.position, mascot.scale.y),
      };
    },
  };
}

