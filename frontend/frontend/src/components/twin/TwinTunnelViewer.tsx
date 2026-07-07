"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Activity, AlertTriangle, Crosshair, Database, Gauge, LocateFixed, MousePointer2, Rotate3D, ScanLine, ZoomIn } from "lucide-react";
import { twinRiskMarkers, twinSensorPoints, twinTunnelModel, type TwinMetricStatus, type TwinRiskMarker, type TwinSensorPoint } from "@/data/twinTunnelScene";
import { cn } from "@/lib/cn";

type ModelMetadata = {
  counts: {
    modelSpace: number;
    solids: number;
    annotations: number;
    layers: number;
    blocks: number;
  };
  conversion: string;
};

type MarkerProjection = {
  id: string;
  kind: "sensor" | "risk";
  left: number;
  top: number;
  visible: boolean;
};

const markerOffsets: Record<string, { x: number; y: number }> = {
  "ANCHOR-WF-UPPER-CORNER": { x: -60, y: -60 },
  "ANCHOR-WF-MID": { x: 0, y: -30 },
  "ANCHOR-RETURN-AIRWAY": { x: 80, y: -10 },
  "ANCHOR-INTAKE-SIDE": { x: -60, y: 50 },
  "ANCHOR-CUT-EYE": { x: 60, y: -30 },
  "ANCHOR-RETURN-BURIED-PIPE": { x: -80, y: -80 },
  "ANCHOR-RETURN-PIPE": { x: 80, y: -80 },
  "RISK-UPPER-CORNER": { x: 60, y: 60 },
  "RISK-GOAF": { x: -60, y: 20 },
  "RISK-UNMINED": { x: 80, y: 30 },
};

const sensorTone: Record<TwinSensorPoint["status"], string> = {
  online: "border-emerald-300/70 bg-emerald-400/20 text-emerald-100",
  warning: "border-amber-300/80 bg-amber-400/20 text-amber-100",
  maintenance: "border-sky-300/70 bg-sky-400/20 text-sky-100",
};

const pipeTone = "border-cyan-200/80 bg-violet-500/20 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.28)]";

const metricTone: Record<TwinMetricStatus, string> = {
  normal: "bg-emerald-300",
  warning: "bg-amber-300",
  danger: "bg-red-400",
  offline: "bg-slate-400",
};

const riskTone: Record<TwinRiskMarker["level"], string> = {
  一般: "border-yellow-300/80 bg-yellow-400/20 text-yellow-100",
  较大: "border-orange-300/80 bg-orange-500/20 text-orange-100",
  重大: "border-red-300/80 bg-red-500/25 text-red-100",
};

export function TwinTunnelViewer({ variant = "full" }: { variant?: "full" | "dashboard" }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const modelRef = useRef<Group | null>(null);
  const raycasterRef = useRef(new Raycaster());
  const pointerRef = useRef(new Vector2());
  const rotationRef = useRef({ x: -0.52, y: 0.72 });
  const zoomRef = useRef(1);
  const dragRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });
  const materialsRef = useRef(new Map<Mesh, MeshStandardMaterial>());
  const animationRef = useRef<number | null>(null);

  const [metadata, setMetadata] = useState<ModelMetadata | null>(null);
  const [selectedHandle, setSelectedHandle] = useState<string>("UPPER_CORNER");
  const [selectedMarker, setSelectedMarker] = useState<string>("RISK-UPPER-CORNER");
  const [loadingState, setLoadingState] = useState("加载三维底模");
  const [markerProjection, setMarkerProjection] = useState<MarkerProjection[]>([]);

  const tunnelSensorPoints = useMemo(
    () => twinSensorPoints.filter((item) => item.displayLayer === "ventilation_3d" || item.displayLayer === "pipe_3d"),
    [],
  );
  const selectedRisk = useMemo(() => twinRiskMarkers.find((item) => item.id === selectedMarker), [selectedMarker]);
  const selectedSensor = useMemo(() => twinSensorPoints.find((item) => item.id === selectedMarker), [selectedMarker]);

  const projectMarkers = useCallback(() => {
    const host = canvasHostRef.current;
    const camera = cameraRef.current;
    if (!host || !camera) return;
    const rect = host.getBoundingClientRect();
    const allMarkers = [
      ...tunnelSensorPoints.map((item) => ({ id: item.id, kind: "sensor" as const, anchor: item.anchor })),
      ...twinRiskMarkers.map((item) => ({ id: item.id, kind: "risk" as const, anchor: item.anchor })),
    ];
    setMarkerProjection(
      allMarkers.map((item) => {
        const point = new Vector3(...item.anchor).project(camera);
        const offset = markerOffsets[item.id] ?? { x: 0, y: 0 };
        return {
          id: item.id,
          kind: item.kind,
          left: ((point.x + 1) / 2) * rect.width + offset.x,
          top: ((-point.y + 1) / 2) * rect.height + offset.y,
          visible: point.z > -1 && point.z < 1,
        };
      }),
    );
  }, [tunnelSensorPoints]);

  const applySelectedHighlight = useCallback((handle: string) => {
    materialsRef.current.forEach((material, mesh) => {
      const active = mesh.name === `solid_${handle}` || 
        mesh.name.includes(handle);
      material.emissive = new Color(active ? "#f97316" : "#031827");
      material.emissiveIntensity = active ? 0.86 : 0.12;
      material.opacity = active ? 0.96 : 0.52;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(twinTunnelModel.metadataUrl)
      .then((response) => response.json())
      .then((payload: ModelMetadata) => {
        if (!cancelled) setMetadata(payload);
      })
      .catch(() => {
        if (!cancelled) setMetadata(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;
    let cancelled = false;
    const initialSelectedHandle = "UPPER_CORNER";
    const materialMap = new Map<Mesh, MeshStandardMaterial>();
    materialsRef.current = materialMap;

    const scene = new Scene();
    scene.background = new Color("#03101f");
    const camera = new PerspectiveCamera(42, host.clientWidth / Math.max(host.clientHeight, 1), 0.1, 1000);
    camera.position.set(0, 50, 120);
    const renderer = new WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    host.appendChild(renderer.domElement);

    const ambient = new AmbientLight("#8fdcff", 1.1);
    const keyLight = new DirectionalLight("#dff8ff", 2.2);
    keyLight.position.set(30, 40, 25);
    const rimLight = new DirectionalLight("#22d3ee", 1.4);
    rimLight.position.set(-25, 25, -30);
    scene.add(ambient, keyLight, rimLight);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    new GLTFLoader().load(
      twinTunnelModel.glbUrl,
      (gltf) => {
        if (cancelled) return;
        const model = gltf.scene;
        modelRef.current = model;
        const box = new Box3().setFromObject(model);
        const size = box.getSize(new Vector3());
        const center = box.getCenter(new Vector3());
        model.position.sub(center);
        const maxAxis = Math.max(size.x, size.y, size.z);
        camera.position.set(0, maxAxis * 0.6, maxAxis * 1.8);
        camera.lookAt(0, 0, 0);

        model.traverse((object) => {
          if (!(object instanceof Mesh)) return;
          object.castShadow = false;
          object.receiveShadow = true;
          const baseMaterial = object.material instanceof MeshStandardMaterial ? object.material : new MeshStandardMaterial();
          const material = baseMaterial.clone();
          material.transparent = true;
          const isSelected = object.name === `solid_${initialSelectedHandle}` || 
            object.name.includes(initialSelectedHandle);
          material.opacity = isSelected ? 0.96 : 0.52;
          material.roughness = 0.38;
          material.metalness = 0.18;
          material.emissive = new Color(isSelected ? "#f97316" : "#031827");
          material.emissiveIntensity = isSelected ? 0.86 : 0.12;
          object.material = material;
          materialMap.set(object, material);

          const edges = new LineSegments(new EdgesGeometry(object.geometry), new LineBasicMaterial({ color: "#7dd3fc", transparent: true, opacity: 0.36 }));
          object.add(edges);
        });

        scene.add(model);
        setLoadingState("综采工作面模型已加载");
      },
      undefined,
      () => setLoadingState("模型加载失败"),
    );

    const resize = () => {
      if (!canvasHostRef.current || !rendererRef.current || !cameraRef.current) return;
      const nextWidth = canvasHostRef.current.clientWidth;
      const nextHeight = Math.max(canvasHostRef.current.clientHeight, 1);
      cameraRef.current.aspect = nextWidth / nextHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(nextWidth, nextHeight);
      projectMarkers();
    };

    const animate = () => {
      const model = modelRef.current;
      if (model) {
        model.rotation.x = rotationRef.current.x;
        model.rotation.y = rotationRef.current.y;
        const zoom = zoomRef.current;
        model.scale.setScalar(zoom);
      }
      renderer.render(scene, camera);
      projectMarkers();
      animationRef.current = requestAnimationFrame(animate);
    };

    const handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    const nextZoom = zoomRef.current + (event.deltaY > 0 ? -0.08 : 0.08);
    zoomRef.current = Math.max(0.3, Math.min(5, nextZoom));
  };

    window.addEventListener("resize", resize);
    host.addEventListener("wheel", handleWheel, { passive: false });
    resize();
    animate();

    return () => {
      cancelled = true;
      window.removeEventListener("resize", resize);
      host.removeEventListener("wheel", handleWheel);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      materialMap.clear();
      host.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [projectMarkers]);

  useEffect(() => {
    applySelectedHighlight(selectedHandle);
  }, [applySelectedHighlight, selectedHandle]);

  const selectHandle = useCallback((handle: string, markerId?: string) => {
    setSelectedHandle(handle);
    if (markerId) setSelectedMarker(markerId);
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { active: true, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    rotationRef.current.y += dx * 0.006;
    rotationRef.current.x = Math.max(-1.2, Math.min(0.22, rotationRef.current.x + dy * 0.004));
    dragRef.current = { active: true, x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const movement = Math.abs(event.clientX - dragRef.current.x) + Math.abs(event.clientY - dragRef.current.y);
    dragRef.current.active = false;
    if (movement > 3) return;

    const host = canvasHostRef.current;
    const camera = cameraRef.current;
    const model = modelRef.current;
    if (!host || !camera || !model) return;
    const rect = host.getBoundingClientRect();
    pointerRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycasterRef.current.setFromCamera(pointerRef.current, camera);
    const hits = raycasterRef.current.intersectObjects(model.children, true);
    const mesh = hits.map((hit) => hit.object).find((object) => object instanceof Mesh && object.name.length > 0) as Mesh | undefined;
    if (!mesh) return;
    const meshName = mesh.name;
    let handle = meshName.replace("solid_", "");
    const knownHandles = [...twinRiskMarkers.map(m => m.relatedHandle), ...twinSensorPoints.flatMap(s => s.relatedHandles)];
    const matchedHandle = knownHandles.find(h => meshName.includes(h)) || handle;
    setSelectedHandle(matchedHandle);
    const linkedRisk = twinRiskMarkers.find((marker) => marker.relatedHandle === matchedHandle);
    if (linkedRisk) setSelectedMarker(linkedRisk.id);
  };

  const markerById = useMemo(() => {
    const map = new Map<string, TwinSensorPoint | TwinRiskMarker>();
    tunnelSensorPoints.forEach((item) => map.set(item.id, item));
    twinRiskMarkers.forEach((item) => map.set(item.id, item));
    return map;
  }, [tunnelSensorPoints]);

  const isDashboard = variant === "dashboard";

  return (
    <div ref={containerRef} className={cn("grid min-w-0 gap-5", isDashboard ? "xl:grid-cols-1" : "xl:grid-cols-[minmax(0,1fr)_22rem]")}>
      <section className="min-w-0 overflow-hidden rounded-card border border-cyan-300/25 bg-slate-950/70 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-300/20 bg-cyan-400/5 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink">{isDashboard ? "数字孪生建模总览" : "综采工作面数字孪生"}</h2>
            <p className="mt-1 text-xs leading-5 text-muted">{isDashboard ? "综采工作面 GLB 模型 + 风险锚点，用作综合驾驶舱空间态势主图。" : "综采工作面数字孪生模型，包含运输巷、回风巷、工作面、采空区、设备和监测点。"}</p>
          </div>
          <div className={cn("flex flex-wrap gap-2 text-xs text-cyan-100", isDashboard && "hidden 2xl:flex")}>
            <span className="inline-flex items-center gap-1 rounded-control border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1"><Rotate3D className="h-3.5 w-3.5" />拖拽旋转</span>
            <span className="inline-flex items-center gap-1 rounded-control border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1"><ZoomIn className="h-3.5 w-3.5" />滚轮缩放</span>
            <span className="inline-flex items-center gap-1 rounded-control border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1"><MousePointer2 className="h-3.5 w-3.5" />点击高亮</span>
          </div>
        </div>

        <div
          ref={canvasHostRef}
          className={cn(
            "relative cursor-grab touch-none overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.18),transparent_36rem),linear-gradient(180deg,#041225,#020815)] active:cursor-grabbing",
            isDashboard ? "h-[26rem] min-[1500px]:h-[30rem]" : "h-[34rem]",
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(125,211,252,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(125,211,252,0.06)_1px,transparent_1px)] bg-[length:44px_44px]" />
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 flex flex-wrap items-center justify-center gap-2 rounded-control border border-cyan-300/20 bg-slate-950/80 px-4 py-2 shadow-soft">
            {[...tunnelSensorPoints, ...twinRiskMarkers].map((item) => {
              const isRisk = "level" in item;
              const active = selectedMarker === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "flex h-6 min-w-12 items-center justify-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 text-xs font-semibold shadow-soft transition hover:scale-105",
                    isRisk ? riskTone[item.level] : item.displayLayer === "pipe_3d" ? pipeTone : sensorTone[item.status],
                    active && "ring-2 ring-white/70",
                  )}
                  onClick={() => {
                    setSelectedMarker(item.id);
                    if (isRisk) selectHandle(item.relatedHandle, item.id);
                    else selectHandle(item.relatedHandles[0], item.id);
                  }}
                >
                  {isRisk ? <AlertTriangle className="h-3 w-3" /> : item.displayLayer === "pipe_3d" ? <Gauge className="h-3 w-3" /> : <LocateFixed className="h-3 w-3" />}
                  {isRisk ? item.shortLabel : item.shortLabel}
                </button>
              );
            })}
          </div>
          <div className="pointer-events-none absolute right-4 top-4 rounded-control border border-cyan-300/25 bg-slate-950/70 px-4 py-2.5 text-sm text-cyan-100 shadow-soft">
            {loadingState}
          </div>
        </div>
      </section>

      <aside className={cn("grid min-w-0 gap-4", isDashboard && "hidden")}>
        <Panel title="模型来源" icon={<Database className="h-4 w-4" />}>
          <InfoRow label="源文件" value={twinTunnelModel.sourceFile} />
          <InfoRow label="模型说明" value="综采工作面数字孪生" />
          <p className="mt-3 rounded-control border border-amber-300/25 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">{metadata?.conversion ?? twinTunnelModel.conversionNote}</p>
          <p className="mt-3 rounded-control border border-cyan-300/25 bg-cyan-400/10 p-3 text-xs leading-5 text-cyan-100">模型包含：运输巷、回风巷、工作面、采空区、未采煤体、液压支架、采煤机、转载机、皮带运输机、瓦斯抽采钻孔、监测点等要素。</p>
        </Panel>

        <Panel title="当前选中" icon={<Crosshair className="h-4 w-4" />}>
          <InfoRow label="对象标识" value={selectedHandle} />
          <InfoRow label="联动对象" value={selectedRisk?.label ?? selectedSensor?.label ?? "手动选中实体"} />
          <InfoRow label="状态" value={selectedRisk ? `${selectedRisk.level}风险` : selectedSensor ? `${selectedSensor.metrics.length} 项监测指标` : "实体高亮"} />
          <p className="mt-3 text-xs leading-5 text-muted">{selectedRisk?.description ?? selectedSensor?.description ?? "点击三维实体或右侧列表可更新高亮状态。传感器与风险均为演示数据。"}</p>
          {selectedSensor ? (
            <div className="mt-3 grid gap-2">
              {selectedSensor.metrics.map((metric) => (
                <MetricMiniCard key={metric.sensorId} metric={metric} />
              ))}
            </div>
          ) : null}
        </Panel>

        <Panel title="风险标记" icon={<AlertTriangle className="h-4 w-4" />}>
          <div className="space-y-2">
            {twinRiskMarkers.map((risk) => (
              <button
                key={risk.id}
                type="button"
                className={cn("w-full rounded-control border p-3 text-left transition hover:border-cyan-200/70", riskTone[risk.level], selectedMarker === risk.id && "ring-2 ring-white/60")}
                onClick={() => selectHandle(risk.relatedHandle, risk.id)}
              >
                <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                  {risk.label}
                  <span className="text-xs">{risk.level}</span>
                </span>
                <span className="mt-1 block text-xs opacity-85">{risk.relatedHandle}</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="空间监测锚点" icon={<ScanLine className="h-4 w-4" />}>
          <div className="space-y-2">
            {tunnelSensorPoints.map((sensor) => (
              <button
                key={sensor.id}
                type="button"
                className={cn(
                  "w-full rounded-control border p-3 text-left transition hover:border-cyan-200/70",
                  sensor.displayLayer === "pipe_3d" ? pipeTone : sensorTone[sensor.status],
                  selectedMarker === sensor.id && "ring-2 ring-white/60",
                )}
                onClick={() => selectHandle(sensor.relatedHandles[0], sensor.id)}
              >
                <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                  {sensor.label}
                  <span className="inline-flex items-center gap-1 text-xs">
                    {sensor.displayLayer === "pipe_3d" ? <Activity className="h-3 w-3" /> : <LocateFixed className="h-3 w-3" />}
                    {sensor.type}
                  </span>
                </span>
                <span className="mt-1 block text-xs opacity-85">{sensor.metrics.map((metric) => metric.sensorId).join(" / ")}</span>
              </button>
            ))}
          </div>
        </Panel>
      </aside>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-card border border-cyan-300/20 bg-card p-4 shadow-soft">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="text-cyan-200">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-cyan-300/10 py-2 text-sm last:border-b-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-semibold text-ink">{value}</span>
    </div>
  );
}

function MetricMiniCard({ metric }: { metric: TwinSensorPoint["metrics"][number] }) {
  return (
    <div className="grid grid-cols-[4px_minmax(0,1fr)_auto] items-center gap-3 rounded-control border border-cyan-300/15 bg-slate-950/45 p-2.5">
      <span className={cn("h-full min-h-10 rounded-full", metricTone[metric.status])} />
      <span className="min-w-0">
        <span className="block truncate text-xs text-muted">{metric.label}</span>
        <span className="mt-1 block truncate text-[11px] text-cyan-100">{metric.sensorId}</span>
      </span>
      <span className="text-right">
        <span className="block text-sm font-semibold text-ink">{metric.value}</span>
        <span className="block text-[11px] text-muted">{metric.unit || "无量纲"}</span>
      </span>
    </div>
  );
}
