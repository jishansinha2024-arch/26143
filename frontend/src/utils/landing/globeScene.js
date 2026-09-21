import * as THREE from 'three';
import { DETECTIONS, ROUTES } from '../../data/landing/geo';

const TIDE = 0x1f7f93;
const FLARE = 0xc25a49;
const SIGNAL = 0xb8862a;

const SEVERITY_COLOR = {
  probable: FLARE,
  possible: SIGNAL,
  indeterminate: TIDE
};

function toVector({ lat, lon }, radius = 1) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function buildGraticule() {
  const points = [];
  const push = (a, b) => {
    points.push(a.x, a.y, a.z, b.x, b.y, b.z);
  };
  for (let lat = -75; lat <= 75; lat += 15) {
    for (let lon = -180; lon < 180; lon += 4) {
      push(toVector({ lat, lon }, 1.001), toVector({ lat, lon: lon + 4 }, 1.001));
    }
  }
  for (let lon = -180; lon < 180; lon += 15) {
    for (let lat = -88; lat < 88; lat += 4) {
      push(toVector({ lat, lon }, 1.001), toVector({ lat: lat + 4, lon }, 1.001));
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color: TIDE, transparent: true, opacity: 0.16 })
  );
}

function buildSurfacePoints(count = 2600) {
  const positions = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - i / (count - 1) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    positions[i * 3] = Math.cos(theta) * radius;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(theta) * radius;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: TIDE,
      size: 0.0075,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.32
    })
  );
}

/** Soft daylight halo — normal blending so it stays gentle against the paper background. */
function buildAtmosphere() {
  const material = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(0x8fc4d1) } },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.4);
        gl_FragColor = vec4(uColor, clamp(intensity, 0.0, 1.0) * 0.45);
      }
    `,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false
  });
  return new THREE.Mesh(new THREE.SphereGeometry(1.24, 64, 64), material);
}

function buildSweep() {
  const uniforms = {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x2f93a8) }
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec3 vObj;
      void main() {
        vObj = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec3 vObj;
      const float TAU = 6.2831853;
      void main() {
        float angle = atan(vObj.z, vObj.x);
        float d = abs(mod(angle - uTime + 3.14159265, TAU) - 3.14159265);
        float band = pow(max(0.0, 1.0 - d / 1.15), 3.2);
        float poleFade = 1.0 - pow(abs(vObj.y), 2.2);
        gl_FragColor = vec4(uColor, band * poleFade * 0.22);
      }
    `,
    transparent: true,
    depthWrite: false
  });
  return { mesh: new THREE.Mesh(new THREE.SphereGeometry(1.012, 64, 64), material), uniforms };
}

function buildArcs(parent) {
  const segments = 140;
  return ROUTES.map(([from, to], index) => {
    const a = toVector(from, 1.005);
    const b = toVector(to, 1.005);
    const lift = 1 + a.distanceTo(b) * 0.26;
    const mid = a.clone().add(b).normalize().multiplyScalar(lift);
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const points = curve.getPoints(segments);

    const baseGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const base = new THREE.Line(
      baseGeometry,
      new THREE.LineBasicMaterial({ color: TIDE, transparent: true, opacity: 0.22 })
    );
    parent.add(base);

    const tracerGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const tracer = new THREE.Line(
      tracerGeometry,
      new THREE.LineBasicMaterial({ color: 0x14606f, transparent: true, opacity: 0.9 })
    );
    tracer.geometry.setDrawRange(0, 0);
    parent.add(tracer);

    return {
      tracer,
      total: segments + 1,
      head: index / ROUTES.length * (segments + 1),
      speed: 0.35 + index % 3 * 0.12
    };
  });
}

function buildMarkers(parent) {
  return DETECTIONS.map((detection, index) => {
    const color = SEVERITY_COLOR[detection.severity];
    const position = toVector(detection, 1.008);

    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.011, 12, 12),
      new THREE.MeshBasicMaterial({ color })
    );
    dot.position.copy(position);
    parent.add(dot);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.022, 0.028, 40),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    ring.position.copy(position);
    ring.lookAt(position.clone().multiplyScalar(2));
    parent.add(ring);

    return { ring, offset: index * 0.42 };
  });
}

export function createGlobeScene(container, options) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 3.05);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  container.appendChild(renderer.domElement);

  const tilt = new THREE.Group();
  tilt.rotation.z = -0.36;
  tilt.rotation.x = 0.16;
  scene.add(tilt);

  const spinner = new THREE.Group();
  spinner.rotation.y = -1.1;
  tilt.add(spinner);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.995, 72, 72),
    new THREE.MeshStandardMaterial({ color: 0xe9eef0, roughness: 0.96, metalness: 0.02 })
  );
  spinner.add(core);
  spinner.add(buildGraticule());
  spinner.add(buildSurfacePoints());

  const atmosphere = buildAtmosphere();
  tilt.add(atmosphere);

  const sweep = buildSweep();
  spinner.add(sweep.mesh);

  const arcs = buildArcs(spinner);
  const markers = buildMarkers(spinner);

  scene.add(new THREE.AmbientLight(0xdfe9ec, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(-2.6, 1.8, 2.2);
  scene.add(key);
  const bounce = new THREE.DirectionalLight(0xbcd7de, 0.9);
  bounce.position.set(2.4, -1.4, -1.6);
  scene.add(bounce);

  const pointer = { x: 0, y: 0 };
  const eased = { x: 0, y: 0 };

  const resize = () => {
    const { clientWidth, clientHeight } = container;
    if (!clientWidth || !clientHeight) return;
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(clientWidth, clientHeight, false);
  };
  resize();

  const observer = new ResizeObserver(resize);
  observer.observe(container);

  const clock = new THREE.Clock();
  let frame = 0;

  const render = () => {
    const delta = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.getElapsedTime();

    if (!options.reducedMotion) {
      spinner.rotation.y += delta * options.spinSpeed;
      sweep.uniforms.uTime.value = -elapsed * 0.72;
    }

    eased.x += (pointer.x - eased.x) * 0.05;
    eased.y += (pointer.y - eased.y) * 0.05;
    tilt.rotation.y = eased.x * 0.28;
    tilt.rotation.x = 0.16 + eased.y * 0.16;
    camera.position.x = eased.x * -0.22;
    camera.position.y = eased.y * 0.16;
    camera.lookAt(0, 0, 0);

    arcs.forEach((arc) => {
      if (!options.reducedMotion) {
        arc.head = (arc.head + delta * arc.speed * 60) % (arc.total + 60);
      }
      const start = Math.max(0, Math.floor(arc.head) - 34);
      const count = Math.max(0, Math.min(34, arc.total - start));
      arc.tracer.geometry.setDrawRange(start, count);
    });

    markers.forEach((marker) => {
      const t = options.reducedMotion ? 0.35 : (elapsed * 0.55 + marker.offset) % 1;
      const scale = 1 + t * 1.9;
      marker.ring.scale.setScalar(scale);
      marker.ring.material.opacity = 0.75 * (1 - t);
    });

    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  };
  frame = requestAnimationFrame(render);

  return {
    setPointer(x, y) {
      pointer.x = x;
      pointer.y = y;
    },
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scene.traverse((object) => {
        const mesh = object;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = mesh.material;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());else
        if (material) material.dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    }
  };
}