import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

const PART_KEYS: Record<string, string> = { SKIN: 'skin', Tops: 'tops', Bottoms: 'bottoms', Shoes: 'shoes' };
function getKey(name: string) { return Object.entries(PART_KEYS).find(([k]) => name.includes(k))?.[1] ?? null; }

export interface VRMHandle {
  setPartVisible: (part: string, visible: boolean) => void;
  setShader: (s: 'toon' | 'glow' | 'normal') => void;
  setOutline: (t: number, c: string) => void;
  resetCam: () => void;
  camPreset: (p: 'full' | 'upper' | 'face') => void;
  toggleAutoRot: () => boolean;
}

interface Props {
  vrmUrl: string;
  animation?: 'idle' | 'jump' | 'shake' | 'tilt';
  onLoaded?: () => void;
  onError?: (msg: string) => void;
  handle?: React.MutableRefObject<VRMHandle | null>;
  mode?: 'mini' | 'room' | 'full';  // mini=홈탭, room=방뷰어, full=3D탭
}

// ── 파사드 가구 생성 ──
function createRoomProps(scene: THREE.Scene) {
  const items: THREE.Object3D[] = [];

  // 바닥
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.MeshToonMaterial({ color: 0xf0e6d3 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor); items.push(floor);

  // 벽 (뒤)
  const wallBack = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 3),
    new THREE.MeshToonMaterial({ color: 0xd4c5e8 })
  );
  wallBack.position.set(0, 1.5, -3);
  scene.add(wallBack); items.push(wallBack);

  // 벽 (왼쪽)
  const wallLeft = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 3),
    new THREE.MeshToonMaterial({ color: 0xcbbfe0 })
  );
  wallLeft.rotation.y = Math.PI / 2;
  wallLeft.position.set(-3, 1.5, 0);
  scene.add(wallLeft); items.push(wallLeft);

  // 침대
  const bedBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.3, 2.0),
    new THREE.MeshToonMaterial({ color: 0x8b6f9e })
  );
  bedBase.position.set(-1.8, 0.15, -1.5);
  scene.add(bedBase); items.push(bedBase);

  const bedMattress = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.2, 1.8),
    new THREE.MeshToonMaterial({ color: 0xf5f0ff })
  );
  bedMattress.position.set(-1.8, 0.4, -1.5);
  scene.add(bedMattress); items.push(bedMattress);

  const bedPillow = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.15, 0.4),
    new THREE.MeshToonMaterial({ color: 0xffd6e8 })
  );
  bedPillow.position.set(-1.8, 0.58, -2.3);
  scene.add(bedPillow); items.push(bedPillow);

  // 책상
  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.06, 0.7),
    new THREE.MeshToonMaterial({ color: 0xd4a96a })
  );
  desk.position.set(1.8, 0.7, -2.5);
  scene.add(desk); items.push(desk);

  // 책상 다리
  [[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]].forEach(([dx, dz]) => {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.7, 0.06),
      new THREE.MeshToonMaterial({ color: 0xb8864e })
    );
    leg.position.set(1.8 + dx, 0.35, -2.5 + dz);
    scene.add(leg); items.push(leg);
  });

  // 모니터
  const monitor = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.5, 0.05),
    new THREE.MeshToonMaterial({ color: 0x1a1a2e })
  );
  monitor.position.set(1.8, 1.05, -2.78);
  scene.add(monitor); items.push(monitor);

  // 모니터 화면 (발광)
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.4),
    new THREE.MeshBasicMaterial({ color: 0x4040ff })
  );
  screen.position.set(1.8, 1.05, -2.75);
  scene.add(screen); items.push(screen);

  // 책장
  const bookshelf = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 1.4, 0.3),
    new THREE.MeshToonMaterial({ color: 0xc8986a })
  );
  bookshelf.position.set(-2.7, 0.7, -2.5);
  scene.add(bookshelf); items.push(bookshelf);

  // 책들
  const bookColors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0xa29bfe, 0xfd79a8];
  bookColors.forEach((c, i) => {
    const book = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.28, 0.22),
      new THREE.MeshToonMaterial({ color: c })
    );
    book.position.set(-2.72 + (i - 2) * 0.09, 1.15, -2.5);
    scene.add(book); items.push(book);
  });

  // 작은 식물 화분
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.08, 0.15, 8),
    new THREE.MeshToonMaterial({ color: 0xe07b39 })
  );
  pot.position.set(2.2, 0.78, -2.5);
  scene.add(pot); items.push(pot);

  const plant = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 6),
    new THREE.MeshToonMaterial({ color: 0x27ae60 })
  );
  plant.position.set(2.2, 1.02, -2.5);
  scene.add(plant); items.push(plant);

  // 러그
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(2.0, 1.4),
    new THREE.MeshToonMaterial({ color: 0x9b59b6 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.3, 0.001, -0.5);
  scene.add(rug); items.push(rug);

  // 조명 — 포인트 라이트 (천장 전구 느낌)
  const roomLight = new THREE.PointLight(0xfff5e0, 1.5, 8);
  roomLight.position.set(0, 2.8, -1);
  scene.add(roomLight); items.push(roomLight);

  // 천장 전구
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xfff9c4 })
  );
  bulb.position.set(0, 2.8, -1);
  scene.add(bulb); items.push(bulb);

  // 창문 빛 (왼쪽 벽)
  const windowLight = new THREE.SpotLight(0xc8e6ff, 1.0, 6, Math.PI / 6);
  windowLight.position.set(-2.8, 2.0, 0);
  windowLight.target.position.set(0, 0, 0);
  scene.add(windowLight); scene.add(windowLight.target);
  items.push(windowLight);

  // 창문 사각형
  const window1 = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.9),
    new THREE.MeshBasicMaterial({ color: 0xc8e6ff, transparent: true, opacity: 0.6 })
  );
  window1.rotation.y = Math.PI / 2;
  window1.position.set(-2.98, 1.6, 0.2);
  scene.add(window1); items.push(window1);

  return items;
}

export default function VRMViewer({ vrmUrl, animation = 'idle', onLoaded, onError, handle, mode = 'full' }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const vrmRef   = useRef<VRM | null>(null);
  const rendRef  = useRef<THREE.WebGLRenderer | null>(null);
  const camRef   = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const clock    = useRef(new THREE.Clock());
  const raf      = useRef(0);
  const olThick  = useRef(3);
  const olColor  = useRef(new THREE.Color(0x000000));
  const dragging = useRef(false);
  const prevM    = useRef({ x: 0, y: 0 });
  const prevT    = useRef<{ x: number; y: number } | null>(null);
  const prevD    = useRef<number | null>(null);
  const prevMid  = useRef<{ x: number; y: number } | null>(null);

  // 카메라 설정 — mode별
  const sph = useRef(
    mode === 'room'
      ? { theta: -0.3, phi: 0.95, r: 4.5 }   // 탑다운+사이드 혼합
      : mode === 'mini'
      ? { theta: -0.2, phi: 1.0,  r: 3.8 }
      : { theta: 0,    phi: Math.PI / 2, r: 1.5 }
  );
  const tgt = useRef(
    mode === 'room' || mode === 'mini'
      ? new THREE.Vector3(0, 0.8, -1.0)
      : new THREE.Vector3(0, 1.0, 0)
  );
  const pan  = useRef(new THREE.Vector2(0, 0));
  const autoRot = useRef(false); // 방 뷰는 자동회전 끔

  const updCam = useCallback(() => {
    const cam = camRef.current; if (!cam) return;
    const { theta, phi, r } = sph.current;
    const t = tgt.current; const p = pan.current;
    cam.position.set(
      r * Math.sin(phi) * Math.sin(theta) + p.x + t.x,
      r * Math.cos(phi) + p.y + t.y,
      r * Math.sin(phi) * Math.cos(theta) + t.z
    );
    cam.lookAt(t.x + p.x, t.y + p.y, t.z);
  }, []);

  // ── Outline: Edge 기반 (후처리 없이 BackSide 개선판) ──
  // three.js r128에서 진짜 엣지 라인은 EdgesGeometry + LineSegments 로 구현
  const edgeLinesRef = useRef<THREE.LineSegments[]>([]);

  const buildEdgeOutline = useCallback(() => {
    const scene = sceneRef.current; const vrm = vrmRef.current;
    if (!scene || !vrm) return;

    // 기존 엣지 라인 제거
    edgeLinesRef.current.forEach(l => { scene.remove(l); l.geometry.dispose(); (l.material as THREE.Material).dispose(); });
    edgeLinesRef.current = [];
    if (olThick.current <= 0) return;

    const mat = new THREE.LineBasicMaterial({
      color: olColor.current,
      linewidth: olThick.current,  // WebGL에서는 1로 고정되지만 유지
    });

    vrm.scene.traverse(obj => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const mesh = obj as THREE.Mesh;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      if (mats.every(m => (m as any).opacity === 0)) return;

      // EdgesGeometry: 날카로운 엣지만 추출
      const edges = new THREE.EdgesGeometry(mesh.geometry, 30); // 30° 이상 각도만
      const line = new THREE.LineSegments(edges, mat.clone());

      // mesh의 월드 변환 복사
      line.position.copy(mesh.getWorldPosition(new THREE.Vector3()));
      line.quaternion.copy(mesh.getWorldQuaternion(new THREE.Quaternion()));
      line.scale.copy(mesh.getWorldScale(new THREE.Vector3()));

      scene.add(line);
      edgeLinesRef.current.push(line);
    });
  }, []);

  const syncEdgeOutlines = useCallback(() => {
    const vrm = vrmRef.current; if (!vrm) return;
    let i = 0;
    vrm.scene.traverse(obj => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const mesh = obj as THREE.Mesh;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      if (mats.every(m => (m as any).opacity === 0)) return;
      const line = edgeLinesRef.current[i++]; if (!line) return;
      line.position.copy(mesh.getWorldPosition(new THREE.Vector3()));
      line.quaternion.copy(mesh.getWorldQuaternion(new THREE.Quaternion()));
      line.scale.copy(mesh.getWorldScale(new THREE.Vector3()));
    });
  }, []);

  const applyToon = useCallback((vrm: VRM) => {
    vrm.scene.traverse(obj => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const mesh = obj as THREE.Mesh;
      const process = (mat: THREE.Material): THREE.Material => {
        if (getKey(mat.name) === 'skin') return mat;
        const tm = new THREE.MeshToonMaterial({
          color: (mat as any).color ?? new THREE.Color(0xffffff),
          map: (mat as any).map ?? null,
          transparent: mat.transparent,
          opacity: (mat as any).opacity ?? 1,
        });
        tm.name = mat.name; return tm;
      };
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(process)
        : process(mesh.material);
    });
  }, []);

  // handle 등록
  useEffect(() => {
    if (!handle) return;
    handle.current = {
      setPartVisible: (part, visible) => {
        const vrm = vrmRef.current; if (!vrm) return;
        vrm.scene.traverse(obj => {
          if (!(obj as THREE.Mesh).isMesh) return;
          const mesh = obj as THREE.Mesh;
          const process = (mat: THREE.Material) => {
            if (getKey(mat.name) === part) {
              mat.transparent = !visible;
              (mat as any).opacity = visible ? 1 : 0;
              mat.depthWrite = visible;
              mat.needsUpdate = true;
            }
          };
          if (Array.isArray(mesh.material)) mesh.material.forEach(process);
          else process(mesh.material);
        });
        setTimeout(buildEdgeOutline, 50);
      },
      setShader: (shader) => {
        const vrm = vrmRef.current; if (!vrm) return;
        if (shader === 'toon') applyToon(vrm);
        vrm.scene.traverse(obj => {
          if (!(obj as THREE.Mesh).isMesh) return;
          const mesh = obj as THREE.Mesh;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach(mat => {
            if (getKey(mat.name) === 'skin') return;
            if (shader === 'glow') {
              try { (mat as any).emissive = new THREE.Color(0x4020aa); (mat as any).emissiveIntensity = 0.8; } catch {}
            }
            if (shader === 'normal') {
              try { (mat as any).emissiveIntensity = 0; } catch {}
            }
          });
        });
        buildEdgeOutline();
      },
      setOutline: (t, c) => {
        olThick.current = t; olColor.current = new THREE.Color(c); buildEdgeOutline();
      },
      resetCam: () => {
        sph.current = { theta: 0, phi: Math.PI / 2, r: 1.5 };
        pan.current.set(0, 0);
        tgt.current.set(0, 1.0, 0);
        autoRot.current = false;
      },
      camPreset: (p) => {
        pan.current.set(0, 0); sph.current.theta = 0; sph.current.phi = Math.PI / 2;
        const vrm = vrmRef.current; if (!vrm) return;
        const box = new THREE.Box3().setFromObject(vrm.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        if (p === 'full')  { tgt.current.copy(center); sph.current.r = size.y * 1.2; }
        if (p === 'upper') { tgt.current.set(center.x, center.y + size.y * 0.15, center.z); sph.current.r = size.y * 0.6; }
        if (p === 'face')  { tgt.current.set(center.x, center.y + size.y * 0.35, center.z); sph.current.r = size.y * 0.25; }
      },
      toggleAutoRot: () => { autoRot.current = !autoRot.current; return autoRot.current; },
    };
  }, [applyToon, buildEdgeOutline]);

  useEffect(() => {
    const el = mountRef.current; if (!el) return;
    const scene = new THREE.Scene(); sceneRef.current = scene;

    // 배경색 — 방 모드는 하늘색 그라디언트 느낌
    if (mode === 'room' || mode === 'mini') {
      scene.background = new THREE.Color(0x1a1030);
      scene.fog = new THREE.Fog(0x1a1030, 8, 15);
    }

    // FOV — 방 뷰는 낮게 (탑다운+사이드 느낌)
    const fov = mode === 'room' ? 45 : mode === 'mini' ? 42 : 30;
    const camera = new THREE.PerspectiveCamera(fov, el.clientWidth / el.clientHeight, 0.01, 30);
    camRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: mode === 'full' });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement); rendRef.current = renderer;

    // 조명
    scene.add(new THREE.AmbientLight(0xffffff, mode === 'full' ? 0.8 : 0.4));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(1, 2, 2);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    scene.add(dir);
    scene.add(new THREE.DirectionalLight(0xc084fc, 0.3).position.set(-2, 1, -2) && new THREE.DirectionalLight(0xc084fc, 0.3));

    // 방 가구 배치 (room/mini 모드)
    if (mode === 'room' || mode === 'mini') {
      createRoomProps(scene);
    }

    // VRM 로드
    const loader = new GLTFLoader();
    loader.register(p => new VRMLoaderPlugin(p));
    loader.load(vrmUrl, gltf => {
      const vrm = gltf.userData.vrm as VRM;
      vrmRef.current = vrm;
      VRMUtils.rotateVRM0(vrm);

      // 방 모드에서 캐릭터 위치
      if (mode === 'room' || mode === 'mini') {
        vrm.scene.position.set(0.3, 0, -0.5);
      }

      scene.add(vrm.scene);

      // 카메라 자동 맞춤
      const box = new THREE.Box3().setFromObject(vrm.scene);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      if (mode === 'full') {
        tgt.current.copy(center);
        sph.current.r = Math.max(size.x, size.y, size.z) * 1.6;
      }
      updCam();

      // 피부 투명화
      vrm.scene.traverse(obj => {
        if (!(obj as THREE.Mesh).isMesh) return;
        const mesh = obj as THREE.Mesh;
        const process = (mat: THREE.Material) => {
          if (getKey(mat.name) === 'skin') {
            mat.transparent = true; (mat as any).opacity = 0; mat.depthWrite = false; mat.needsUpdate = true;
          }
        };
        if (Array.isArray(mesh.material)) mesh.material.forEach(process);
        else process(mesh.material);
      });

      applyToon(vrm);
      buildEdgeOutline();
      onLoaded?.();
    }, undefined, err => { onError?.((err as Error).message ?? 'VRM 로드 실패'); });

    // 애니메이션 루프
    const animate = () => {
      raf.current = requestAnimationFrame(animate);
      const delta = clock.current.getDelta();
      const vrm = vrmRef.current;
      if (vrm) {
        vrm.update(delta);
        if (autoRot.current) sph.current.theta += delta * 0.3;
        if (animation === 'idle') {
          const chest = vrm.humanoid?.getRawBoneNode('chest');
          if (chest) chest.rotation.x = Math.sin(Date.now() * 0.001) * 0.015;
        }
        updCam();
        syncEdgeOutlines();
      }
      renderer.render(scene, camera);
    };
    animate();

    // 리사이즈
    const onResize = () => {
      if (!el) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // 카메라 조작 (full 모드만)
    if (mode === 'full') {
      const dom = renderer.domElement;
      dom.addEventListener('mousedown', e => { dragging.current = true; prevM.current = { x: e.clientX, y: e.clientY }; });
      window.addEventListener('mousemove', e => {
        if (!dragging.current) return;
        sph.current.theta -= (e.clientX - prevM.current.x) * 0.005;
        sph.current.phi = Math.max(0.05, Math.min(Math.PI - 0.05, sph.current.phi + (e.clientY - prevM.current.y) * 0.005));
        prevM.current = { x: e.clientX, y: e.clientY }; autoRot.current = false;
      });
      window.addEventListener('mouseup', () => { dragging.current = false; });
      dom.addEventListener('wheel', e => { e.preventDefault(); sph.current.r = Math.max(0.1, Math.min(8, sph.current.r + e.deltaY * 0.004)); }, { passive: false });
      dom.addEventListener('touchstart', e => {
        e.preventDefault();
        if (e.touches.length === 1) prevT.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY;
          prevD.current = Math.sqrt(dx * dx + dy * dy);
          prevMid.current = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 };
        }
      }, { passive: false });
      dom.addEventListener('touchmove', e => {
        e.preventDefault();
        if (e.touches.length === 1 && prevT.current) {
          sph.current.theta -= (e.touches[0].clientX - prevT.current.x) * 0.005;
          sph.current.phi = Math.max(0.05, Math.min(Math.PI - 0.05, sph.current.phi + (e.touches[0].clientY - prevT.current.y) * 0.005));
          prevT.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; autoRot.current = false;
        } else if (e.touches.length === 2 && prevD.current) {
          const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY;
          const d = Math.sqrt(dx * dx + dy * dy);
          sph.current.r = Math.max(0.1, Math.min(8, sph.current.r * (prevD.current / d))); prevD.current = d;
          const mid = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 };
          if (prevMid.current) { pan.current.x += (prevMid.current.x - mid.x) * 0.002; pan.current.y += (mid.y - prevMid.current.y) * 0.002; }
          prevMid.current = mid;
        }
      }, { passive: false });
      dom.addEventListener('touchend', () => { prevT.current = null; prevD.current = null; });
    }

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener('resize', onResize);
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [vrmUrl, mode, animation, applyToon, buildEdgeOutline, syncEdgeOutlines, updCam, onLoaded, onError]);

  return <div ref={mountRef} className="w-full h-full" style={{ touchAction: 'none' }} />;
}
