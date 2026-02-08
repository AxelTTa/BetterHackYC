"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface Annotation {
  id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  x: number;
  y: number;
  z: number;
  order: number;
}

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

interface AnnotationViewerProps {
  world: World;
  annotations: Annotation[];
  onAnnotationClick?: (annotation: Annotation) => void;
  onAddAnnotation?: (position: { x: number; y: number; z: number }) => void;
  onCameraMove?: (position: { x: number; y: number; z: number }) => void;
  editMode?: boolean;
  activeAnnotationId?: string | null;
  onClose?: () => void;
}

export default function AnnotationViewer({
  world,
  annotations,
  onAnnotationClick,
  onAddAnnotation,
  onCameraMove,
  editMode = false,
  activeAnnotationId,
  onClose,
}: AnnotationViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0, z: 5 });
  const [iframeReady, setIframeReady] = useState(false);
  
  // Use ref for callback to avoid stale closures
  const onCameraMoveRef = useRef(onCameraMove);
  onCameraMoveRef.current = onCameraMove;
  
  // Use ref for annotations to avoid stale closures in message handler
  const annotationsRef = useRef(annotations);
  annotationsRef.current = annotations;
  const activeAnnotationIdRef = useRef(activeAnnotationId);
  activeAnnotationIdRef.current = activeAnnotationId;

  // Send annotations to iframe when they change or iframe becomes ready
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      const sendAnnotations = () => {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            { type: "updateAnnotations", annotations, activeAnnotationId },
            "*"
          );
        }
      };
      
      // Send immediately
      sendAnnotations();
      
      // Also send after delays as backup in case iframe isn't ready
      const timer1 = setTimeout(sendAnnotations, 100);
      const timer2 = setTimeout(sendAnnotations, 300);
      const timer3 = setTimeout(sendAnnotations, 500);
      const timer4 = setTimeout(sendAnnotations, 1000);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    }
  }, [annotations, activeAnnotationId, iframeReady]);

  useEffect(() => {
    if (!world || !iframeRef.current) return;

    // Reset iframe ready state when world changes
    setIframeReady(false);

    const splatUrl = world.assets.splats.spz_urls.full_res;
    const annotationsJson = JSON.stringify(annotations);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; overflow: hidden; font-family: system-ui, sans-serif; }
    canvas { display: block; width: 100vw; height: 100vh; }
    #loading {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
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
    .annotation-marker {
      position: absolute;
      width: 32px;
      height: 32px;
      background: rgba(245, 158, 11, 0.9);
      border: 2px solid white;
      border-radius: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
      cursor: pointer;
      transform: translate(-50%, -50%);
      transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
      box-shadow: 0 0 15px rgba(245, 158, 11, 0.5);
      z-index: 100;
      backdrop-filter: blur(4px);
    }
    .annotation-marker:hover {
      transform: translate(-50%, -50%) scale(1.2);
      background: #f59e0b;
      box-shadow: 0 0 25px rgba(245, 158, 11, 0.6);
    }
    .annotation-marker.active {
      background: #10b981;
      box-shadow: 0 0 25px rgba(16, 185, 129, 0.6);
      transform: translate(-50%, -50%) scale(1.3);
    }
    .annotation-marker.has-image {
      background: #f59e0b;
      box-shadow: 0 0 15px rgba(245, 158, 11, 0.6);
    }
    .annotation-photo {
      position: absolute;
      bottom: -4px;
      right: -4px;
      width: 16px;
      height: 16px;
      border-radius: 0;
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
    }
    .annotation-label {
      position: absolute;
      left: 40px;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(15, 23, 42, 0.8);
      color: white;
      padding: 6px 12px;
      border-radius: 0;
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .annotation-marker:hover .annotation-label {
      opacity: 1;
    }
    #click-hint {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.8);
      color: #e2e8f0;
      padding: 10px 20px;
      border-radius: 0;
      font-size: 14px;
      display: none;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .offscreen-indicator {
      position: fixed;
      width: 40px;
      height: 40px;
      background: #3b82f6;
      border: 2px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      z-index: 101;
      animation: pulse 1.5s infinite;
    }
    .offscreen-indicator.active {
      background: #10b981;
    }
    .offscreen-indicator::after {
      content: '';
      position: absolute;
      width: 0;
      height: 0;
      border: 8px solid transparent;
    }
    .offscreen-indicator.left::after {
      left: -14px;
      border-right-color: white;
      border-left: none;
    }
    .offscreen-indicator.right::after {
      right: -14px;
      border-left-color: white;
      border-right: none;
    }
    .offscreen-indicator.top::after {
      top: -14px;
      border-bottom-color: white;
      border-top: none;
    }
    .offscreen-indicator.bottom::after {
      bottom: -14px;
      border-top-color: white;
      border-bottom: none;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.8; }
    }
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
  <div id="annotations-container"></div>
  <div id="click-hint">Double-click anywhere to place an annotation</div>
  <script type="module">
    import * as THREE from "three";
    import { SparkRenderer, SplatMesh, SplatLoader, SparkControls } from "@sparkjsdev/spark";

    const loadingEl = document.getElementById('loading');
    const progressBar = document.getElementById('progress-bar');
    const percentEl = document.getElementById('percent');
    const annotationsContainer = document.getElementById('annotations-container');
    const clickHint = document.getElementById('click-hint');

    let annotations = ${annotationsJson};
    let activeAnnotationId = null;
    let editMode = ${editMode};
    let camera, renderer, scene;

    // Show/hide click hint based on edit mode
    if (editMode) {
      clickHint.style.display = 'block';
    }

    function updateAnnotationPositions() {
      if (!camera || !renderer) return;
      
      annotationsContainer.innerHTML = '';
      
      const width = renderer.domElement.clientWidth;
      const height = renderer.domElement.clientHeight;
      const padding = 60;
      
      annotations.forEach((ann, index) => {
        const pos = new THREE.Vector3(ann.x, ann.y, ann.z);
        pos.project(camera);
        
        const isActive = ann.id === activeAnnotationId;
        const screenX = (pos.x * 0.5 + 0.5) * width;
        const screenY = (-pos.y * 0.5 + 0.5) * height;
        
        const isBehind = pos.z > 1;
        const margin = 20; // Small margin to prevent flickering at edges
        const isOffScreen = isBehind || screenX < -margin || screenX > width + margin || screenY < -margin || screenY > height + margin;
        
        if (!isOffScreen) {
          const marker = document.createElement('div');
          const hasImage = Boolean(ann.imageUrl);
          marker.className = 'annotation-marker' 
            + (ann.id === activeAnnotationId ? ' active' : '') 
            + (hasImage ? ' has-image' : '');
          marker.style.left = screenX + 'px';
          marker.style.top = screenY + 'px';
          marker.innerHTML = '<span>' + (ann.order || index + 1) + '</span>'
            + (hasImage ? '<span class="annotation-photo">📷</span>' : '')
            + '<div class="annotation-label">' + ann.title + '</div>';
          marker.onclick = () => {
            window.parent.postMessage({ type: 'annotationClick', annotation: ann }, '*');
          };
          annotationsContainer.appendChild(marker);
        } else {
          const indicator = document.createElement('div');
          indicator.className = 'offscreen-indicator' + (isActive ? ' active' : '');
          
          let edgeX, edgeY;
          let direction = '';
          
          if (isBehind) {
            const flippedX = -pos.x;
            const flippedY = -pos.y;
            edgeX = (flippedX * 0.5 + 0.5) * width;
            edgeY = (-flippedY * 0.5 + 0.5) * height;
          } else {
            edgeX = screenX;
            edgeY = screenY;
          }
          
          const clampedX = Math.max(padding, Math.min(width - padding, edgeX));
          const clampedY = Math.max(padding, Math.min(height - padding, edgeY));
          
          if (edgeX <= padding) {
            direction = 'left';
            indicator.style.left = padding + 'px';
            indicator.style.top = clampedY + 'px';
          } else if (edgeX >= width - padding) {
            direction = 'right';
            indicator.style.left = (width - padding) + 'px';
            indicator.style.top = clampedY + 'px';
          } else if (edgeY <= padding) {
            direction = 'top';
            indicator.style.left = clampedX + 'px';
            indicator.style.top = padding + 'px';
          } else if (edgeY >= height - padding) {
            direction = 'bottom';
            indicator.style.left = clampedX + 'px';
            indicator.style.top = (height - padding) + 'px';
          } else {
            indicator.style.left = clampedX + 'px';
            indicator.style.top = clampedY + 'px';
          }
          
          indicator.classList.add(direction);
          indicator.innerHTML = '<span>' + (ann.order || index + 1) + '</span>';
          indicator.onclick = () => {
            window.parent.postMessage({ type: 'annotationClick', annotation: ann }, '*');
          };
          annotationsContainer.appendChild(indicator);
        }
      });
    }

    // Listen for messages from parent
    window.addEventListener('message', (event) => {
      if (event.data.type === 'updateAnnotations') {
        annotations = event.data.annotations || [];
        activeAnnotationId = event.data.activeAnnotationId;
        updateAnnotationPositions();
        // Stop polling once we have annotations
        if (annotations.length > 0 && annotationPollInterval) {
          clearInterval(annotationPollInterval);
          annotationPollInterval = null;
        }
      } else if (event.data.type === 'setEditMode') {
        editMode = event.data.editMode;
        clickHint.style.display = editMode ? 'block' : 'none';
      }
    });

    // Poll for annotations until we get them
    let annotationPollInterval = null;

    try {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.01, 1000);
      scene.add(camera);

      renderer = new THREE.WebGLRenderer({ antialias: true });
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
      
      // Request annotations from parent after load, with retry polling
      window.parent.postMessage({ type: 'requestAnnotations' }, '*');
      annotationPollInterval = setInterval(() => {
        if (annotations.length === 0) {
          window.parent.postMessage({ type: 'requestAnnotations' }, '*');
        } else {
          clearInterval(annotationPollInterval);
          annotationPollInterval = null;
        }
      }, 500);

      // Raycaster for click detection
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      renderer.domElement.addEventListener('dblclick', (event) => {
        if (!editMode) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        
        let point;
        try {
          // Raycast only against the splatMesh to find the actual surface point
          const intersects = raycaster.intersectObject(splatMesh, false);
          
          if (intersects.length > 0) {
            point = intersects[0].point;
          } else {
            // Fallback: no intersection found, place along ray at a default distance
            const fallbackDistance = 3;
            point = raycaster.ray.origin.clone().add(
              raycaster.ray.direction.clone().multiplyScalar(fallbackDistance)
            );
          }
        } catch (err) {
          console.warn('Raycast failed, using fallback placement:', err);
          const fallbackDistance = 3;
          point = raycaster.ray.origin.clone().add(
            raycaster.ray.direction.clone().multiplyScalar(fallbackDistance)
          );
        }
        
        window.parent.postMessage({ 
          type: 'addAnnotation', 
          position: { x: point.x, y: point.y, z: point.z }
        }, '*');
      }, { capture: true });

      let lastCameraUpdate = 0;
      function animate() {
        requestAnimationFrame(animate);
        controls.update(camera);
        renderer.render(scene, camera);
        updateAnnotationPositions();
        
        // Throttle camera position updates to parent (every 100ms)
        const now = Date.now();
        if (now - lastCameraUpdate > 100) {
          lastCameraUpdate = now;
          window.parent.postMessage({ 
            type: 'cameraUpdate', 
            position: { x: camera.position.x, y: camera.position.y, z: camera.position.z }
          }, '*');
        }
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
      if (event.data.type === "loaded") {
        setLoading(false);
        setIframeReady(true);
      } else if (event.data.type === "requestAnnotations") {
        // Iframe is requesting annotations - send them
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            { type: "updateAnnotations", annotations: annotationsRef.current, activeAnnotationId: activeAnnotationIdRef.current },
            "*"
          );
        }
      } else if (event.data.type === "error") {
        setError(event.data.message);
        setLoading(false);
      } else if (event.data.type === "annotationClick" && onAnnotationClick) {
        onAnnotationClick(event.data.annotation);
      } else if (event.data.type === "addAnnotation" && onAddAnnotation) {
        onAddAnnotation(event.data.position);
      } else if (event.data.type === "cameraUpdate") {
        setCameraPosition(event.data.position);
        if (onCameraMoveRef.current) {
          onCameraMoveRef.current(event.data.position);
        }
      }
    };
    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [world]);

  // Update edit mode in iframe
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "setEditMode", editMode },
        "*"
      );
    }
  }, [editMode]);

  return (
    <div className="relative w-full h-full bg-black">
      {/* Header */}
      {onClose && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white text-xl font-semibold">
                {world.display_name || "3D Workspace"}
              </h2>
              {editMode && (
                <p className="text-amber-400 text-sm mt-1">
                  Edit Mode: Double-click to add annotations
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 p-2 rounded-none hover:bg-white/10 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
          <div className="text-center text-red-400 p-8">
            <p className="text-lg">Failed to load 3D scene</p>
            <p className="text-sm mt-2">{error}</p>
          </div>
        </div>
      )}

      {/* 3D Viewer iframe */}
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0"
        title="3D Annotation Viewer"
      />
    </div>
  );
}
