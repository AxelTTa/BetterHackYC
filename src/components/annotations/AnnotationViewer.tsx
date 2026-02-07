"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface Annotation {
  id: string;
  title: string;
  content: string;
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
  editMode?: boolean;
  activeAnnotationId?: string | null;
  onClose?: () => void;
}

export default function AnnotationViewer({
  world,
  annotations,
  onAnnotationClick,
  onAddAnnotation,
  editMode = false,
  activeAnnotationId,
  onClose,
}: AnnotationViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0, z: 5 });
  const [iframeReady, setIframeReady] = useState(false);

  // Send annotations to iframe when they change or iframe becomes ready
  useEffect(() => {
    if (iframeReady && iframeRef.current?.contentWindow && annotations.length > 0) {
      console.log('Sending annotations to iframe:', annotations.length);
      // Small delay to ensure iframe script is fully initialized
      const timer = setTimeout(() => {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            { type: "updateAnnotations", annotations, activeAnnotationId },
            "*"
          );
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [annotations, activeAnnotationId, iframeReady]);

  useEffect(() => {
    if (!world || !iframeRef.current) return;

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
      border-radius: 2px;
      margin-top: 10px;
      overflow: hidden;
    }
    #progress-bar {
      height: 100%;
      background: #3b82f6;
      width: 0%;
      transition: width 0.3s;
    }
    .annotation-marker {
      position: absolute;
      width: 32px;
      height: 32px;
      background: #3b82f6;
      border: 2px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
      cursor: pointer;
      transform: translate(-50%, -50%);
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      z-index: 100;
    }
    .annotation-marker:hover {
      transform: translate(-50%, -50%) scale(1.2);
      background: #2563eb;
    }
    .annotation-marker.active {
      background: #10b981;
      transform: translate(-50%, -50%) scale(1.3);
    }
    .annotation-label {
      position: absolute;
      left: 40px;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .annotation-marker:hover .annotation-label {
      opacity: 1;
    }
    #click-hint {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(59, 130, 246, 0.9);
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      display: none;
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
  <div id="click-hint">Click anywhere in the 3D scene to place an annotation</div>
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
      
      annotations.forEach((ann, index) => {
        const pos = new THREE.Vector3(ann.x, ann.y, ann.z);
        pos.project(camera);
        
        // Check if in front of camera
        if (pos.z > 1) return;
        
        const x = (pos.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
        const y = (-pos.y * 0.5 + 0.5) * renderer.domElement.clientHeight;
        
        const marker = document.createElement('div');
        marker.className = 'annotation-marker' + (ann.id === activeAnnotationId ? ' active' : '');
        marker.style.left = x + 'px';
        marker.style.top = y + 'px';
        marker.innerHTML = '<span>' + (ann.order || index + 1) + '</span><div class="annotation-label">' + ann.title + '</div>';
        marker.onclick = () => {
          window.parent.postMessage({ type: 'annotationClick', annotation: ann }, '*');
        };
        annotationsContainer.appendChild(marker);
      });
    }

    // Listen for messages from parent
    window.addEventListener('message', (event) => {
      console.log('Iframe received message:', event.data.type, event.data.annotations?.length);
      if (event.data.type === 'updateAnnotations') {
        annotations = event.data.annotations || [];
        activeAnnotationId = event.data.activeAnnotationId;
        console.log('Updated annotations:', annotations.length);
        updateAnnotationPositions();
      } else if (event.data.type === 'setEditMode') {
        editMode = event.data.editMode;
        clickHint.style.display = editMode ? 'block' : 'none';
      }
    });

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

      // Raycaster for click detection
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      renderer.domElement.addEventListener('dblclick', (event) => {
        if (!editMode) return;
        
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        
        // Cast ray and find intersection point at a reasonable distance
        const direction = raycaster.ray.direction.clone();
        const origin = raycaster.ray.origin.clone();
        const distance = 3; // Default distance from camera
        const point = origin.add(direction.multiplyScalar(distance));
        
        window.parent.postMessage({ 
          type: 'addAnnotation', 
          position: { x: point.x, y: point.y, z: point.z }
        }, '*');
      });

      function animate() {
        requestAnimationFrame(animate);
        controls.update(camera);
        renderer.render(scene, camera);
        updateAnnotationPositions();
        
        // Send camera position to parent
        window.parent.postMessage({ 
          type: 'cameraUpdate', 
          position: { x: camera.position.x, y: camera.position.y, z: camera.position.z }
        }, '*');
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
      } else if (event.data.type === "error") {
        setError(event.data.message);
        setLoading(false);
      } else if (event.data.type === "annotationClick" && onAnnotationClick) {
        onAnnotationClick(event.data.annotation);
      } else if (event.data.type === "addAnnotation" && onAddAnnotation) {
        onAddAnnotation(event.data.position);
      } else if (event.data.type === "cameraUpdate") {
        setCameraPosition(event.data.position);
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
                <p className="text-blue-400 text-sm mt-1">
                  Edit Mode: Double-click to add annotations
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 p-2 rounded-full hover:bg-white/10 transition-colors"
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
