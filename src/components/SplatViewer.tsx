"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface WorldAssets {
  splats: {
    spz_urls: {
      "100k": string;
      "500k": string;
      full_res: string;
    };
  };
  thumbnail_url: string;
  caption: string;
}

interface World {
  id: string;
  display_name: string;
  assets: WorldAssets;
  world_marble_url: string;
}

export interface TriggerZone {
  id: string;
  position: { x: number; y: number; z: number };
  radius: number;
  title: string;
  description: string;
}

interface ActivePopup {
  triggerId: string;
  title: string;
  description: string;
}

interface SplatViewerProps {
  world: World | null;
  onClose: () => void;
  triggerZones?: TriggerZone[];
}

export default function SplatViewer({ world, onClose, triggerZones = [] }: SplatViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePopup, setActivePopup] = useState<ActivePopup | null>(null);
  const [debugInfo, setDebugInfo] = useState<{ x: number; y: number; z: number } | null>(null);
  const [showDebug, setShowDebug] = useState(true);

  const dismissPopup = useCallback(() => {
    setActivePopup(null);
  }, []);

  useEffect(() => {
    if (!world || !iframeRef.current) return;

    const splatUrl = world.assets.splats.spz_urls.full_res;
    const triggersJson = JSON.stringify(triggerZones);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; overflow: hidden; }
    canvas { display: block; width: 100vw; height: 100vh; }
    #loading {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-family: system-ui, sans-serif;
      text-align: center;
    }
    #progress {
      width: 200px;
      height: 4px;
      background: #333;
      border-radius: 0;
      margin-top: 10px;
      overflow: hidden;
    }
    #progress-bar {
      height: 100%;
      background: #f0a500;
      width: 0%;
      transition: width 0.3s;
    }
    #debug-hud {
      position: fixed;
      top: 80px;
      right: 16px;
      background: rgba(0, 0, 0, 0.75);
      color: #22d3ee;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 10px 14px;
      border-radius: 0;
      border: 1px solid rgba(34, 211, 238, 0.3);
      pointer-events: none;
      z-index: 100;
      line-height: 1.6;
      min-width: 200px;
    }
    #debug-hud.hidden { display: none; }
    #debug-hud .label { color: #94a3b8; }
    #debug-hud .value { color: #22d3ee; font-weight: bold; }
    #debug-hud .title { color: #f8fafc; font-weight: bold; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  </style>
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.178.0/three.module.js",
      "@sparkjsdev/spark": "https://sparkjs.dev/releases/spark/0.1.10/spark.module.js"
    }
  }
  </script>
</head>
<body>
  <div id="loading">
    <div>Loading 3D scene...</div>
    <div id="progress"><div id="progress-bar"></div></div>
    <div id="percent">0%</div>
  </div>
  <div id="debug-hud">
    <div class="title">Camera Debug [D to toggle]</div>
    <div><span class="label">X:</span> <span class="value" id="cam-x">0.00</span></div>
    <div><span class="label">Y:</span> <span class="value" id="cam-y">0.00</span></div>
    <div><span class="label">Z:</span> <span class="value" id="cam-z">0.00</span></div>
    <div style="margin-top: 6px; border-top: 1px solid rgba(34,211,238,0.2); padding-top: 6px;">
      <span class="label">Triggers:</span> <span class="value" id="trigger-count">0</span>
    </div>
    <div><span class="label">Active:</span> <span class="value" id="active-trigger">none</span></div>
  </div>
  <script type="module">
    import * as THREE from "three";
    import { SparkRenderer, SplatMesh, SplatLoader, SparkControls } from "@sparkjsdev/spark";

    const loadingEl = document.getElementById('loading');
    const progressBar = document.getElementById('progress-bar');
    const percentEl = document.getElementById('percent');
    const debugHud = document.getElementById('debug-hud');
    const camX = document.getElementById('cam-x');
    const camY = document.getElementById('cam-y');
    const camZ = document.getElementById('cam-z');
    const triggerCountEl = document.getElementById('trigger-count');
    const activeTriggerEl = document.getElementById('active-trigger');

    // Parse trigger zones passed from parent
    const triggerZones = ${triggersJson};
    triggerCountEl.textContent = triggerZones.length.toString();

    // Track which triggers are currently active (camera inside radius)
    const activeTriggers = new Set();

    // Throttle postMessage for debug info (every 10 frames)
    let frameCount = 0;

    // Toggle debug HUD with 'D' key
    let debugVisible = true;
    window.addEventListener('keydown', (e) => {
      if (e.key === 'd' || e.key === 'D') {
        debugVisible = !debugVisible;
        debugHud.classList.toggle('hidden', !debugVisible);
        window.parent.postMessage({ type: 'debug-toggle', visible: debugVisible }, '*');
      }
    });

    // Listen for trigger zone updates from parent
    window.addEventListener('message', (e) => {
      if (e.data.type === 'update-triggers') {
        triggerZones.length = 0;
        triggerZones.push(...e.data.triggers);
        triggerCountEl.textContent = triggerZones.length.toString();
      }
    });

    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.01, 1000);
      scene.add(camera);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      document.body.appendChild(renderer.domElement);

      const spark = new SparkRenderer({ renderer, view: { sort32: true } });
      scene.add(spark);

      const controls = new SparkControls({ canvas: renderer.domElement });

      const loader = new SplatLoader();
      const packedSplats = await loader.loadAsync("${splatUrl}", (e) => {
        const pct = Math.round((e.loaded / e.total) * 100);
        progressBar.style.width = pct + '%';
        percentEl.textContent = pct + '%';
        window.parent.postMessage({ type: 'progress', percent: pct }, '*');
      });

      const splatMesh = new SplatMesh({ packedSplats });
      splatMesh.quaternion.set(1, 0, 0, 0);
      scene.add(splatMesh);

      loadingEl.style.display = 'none';
      window.parent.postMessage({ type: 'loaded' }, '*');

      function checkTriggers() {
        const camPos = camera.position;

        for (const trigger of triggerZones) {
          const dx = camPos.x - trigger.position.x;
          const dy = camPos.y - trigger.position.y;
          const dz = camPos.z - trigger.position.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < trigger.radius) {
            if (!activeTriggers.has(trigger.id)) {
              activeTriggers.add(trigger.id);
              activeTriggerEl.textContent = trigger.id;
              window.parent.postMessage({
                type: 'trigger-enter',
                triggerId: trigger.id,
                title: trigger.title,
                description: trigger.description,
              }, '*');
            }
          } else {
            if (activeTriggers.has(trigger.id)) {
              activeTriggers.delete(trigger.id);
              activeTriggerEl.textContent = activeTriggers.size > 0
                ? Array.from(activeTriggers)[0]
                : 'none';
              window.parent.postMessage({
                type: 'trigger-leave',
                triggerId: trigger.id,
              }, '*');
            }
          }
        }
      }

      function animate() {
        requestAnimationFrame(animate);
        controls.update(camera);
        renderer.render(scene, camera);

        // Update debug HUD
        if (debugVisible) {
          camX.textContent = camera.position.x.toFixed(2);
          camY.textContent = camera.position.y.toFixed(2);
          camZ.textContent = camera.position.z.toFixed(2);
        }

        // Send camera position to parent (throttled)
        frameCount++;
        if (frameCount % 10 === 0) {
          window.parent.postMessage({
            type: 'camera-position',
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
          }, '*');
        }

        // Check trigger zones every frame
        checkTriggers();
      }
      animate();

      window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });

    } catch (err) {
      console.error('Failed to load:', err);
      loadingEl.innerHTML = '<div style="color: #f87171;">Failed to load 3D scene</div><div style="color: #888; font-size: 12px; margin-top: 8px;">' + err.message + '</div>';
      window.parent.postMessage({ type: 'error', message: err.message }, '*');
    }
  </script>
</body>
</html>`;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    }

    const handleMessage = (event: MessageEvent) => {
      const { data } = event;
      switch (data.type) {
        case 'loaded':
          setLoading(false);
          break;
        case 'error':
          setError(data.message);
          setLoading(false);
          break;
        case 'camera-position':
          setDebugInfo({ x: data.x, y: data.y, z: data.z });
          break;
        case 'debug-toggle':
          setShowDebug(data.visible);
          break;
        case 'trigger-enter':
          setActivePopup({
            triggerId: data.triggerId,
            title: data.title,
            description: data.description,
          });
          break;
        case 'trigger-leave':
          setActivePopup((prev) =>
            prev?.triggerId === data.triggerId ? null : prev
          );
          break;
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [world, triggerZones]);

  if (!world) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white text-xl font-semibold">
              {world.display_name || "Generated World"}
            </h2>
            <p className="text-gray-300 text-sm mt-1 max-w-2xl line-clamp-2">
              {world.assets.caption}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 p-2 rounded-none hover:bg-white/10 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
          <div className="text-center text-red-400 p-8">
            <p className="text-lg">Failed to load 3D scene</p>
            <p className="text-sm text-gray-400 mt-2">{error}</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-none hover:bg-red-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Iframe for 3D viewer */}
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0"
        title="3D Viewer"
        sandbox="allow-scripts allow-same-origin"
      />

      {/* Trigger popup overlay */}
      {activePopup && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 animate-in fade-in">
          <div className="bg-gray-900/95 backdrop-blur-lg border border-amber-500/40 rounded-none p-6 max-w-md shadow-2xl shadow-amber-500/15">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-white text-lg font-semibold pr-4">
                {activePopup.title}
              </h3>
              <button
                onClick={dismissPopup}
                className="text-gray-400 hover:text-white p-1 rounded-none hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              {activePopup.description}
            </p>
            <div className="mt-4 pt-3 border-t border-gray-700/50">
              <p className="text-amber-400/70 text-xs font-mono">
                Zone: {activePopup.triggerId}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 text-white/60 text-sm">
        <p>Drag to rotate / Scroll to zoom / Right-click to pan / D to toggle debug</p>
      </div>

      {/* Open in Marble link */}
      <a
        href={world.world_marble_url}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-4 right-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-none transition-colors"
      >
        Open in Marble
      </a>
    </div>
  );
}
