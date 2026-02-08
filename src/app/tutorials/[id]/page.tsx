"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AnnotationViewer,
  AnnotationEditor,
  AnnotationList,
  type Annotation,
} from "@/components/annotations";

interface World {
  id: string;
  display_name: string;
  assets: {
    splats: {
      spz_urls: {
        "100k": string;
        "500k": string;
        full_res: string;
      };
    };
    thumbnail_url: string;
    caption: string;
  };
  world_marble_url: string;
}

interface Tutorial {
  id: string;
  title: string;
  workspaceId: string;
  shareLink: string;
  workspace?: {
    id: string;
    name: string;
    modelUuid: string;
  };
  annotations: Annotation[];
}

export default function TutorialEditorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tutorialId = params.id as string;
  const isNew = tutorialId === "new";

  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeAnnotation, setActiveAnnotation] = useState<Annotation | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<Partial<Annotation> | null>(null);
  const [isNewAnnotation, setIsNewAnnotation] = useState(false);
  const [editMode, setEditMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tutorialTitle, setTutorialTitle] = useState("New Tutorial");
  
  // Ref to track the real tutorial ID immediately (avoids async state issues)
  const tutorialIdRef = useRef<string | null>(null);

  // Track whether initial load has happened
  const initialLoadDone = useRef(false);

  // Load tutorial or create new one (runs once on mount)
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    async function loadData() {
      try {
        if (isNew) {
          // Creating new tutorial - set ref to "new"
          tutorialIdRef.current = "new";
          
          const workspaceId = searchParams.get("workspaceId");
          const worldId = searchParams.get("worldId");

          if (!workspaceId || !worldId) {
            setLoading(false);
            return;
          }

          // Fetch world data
          const worldRes = await fetch(`/api/world/${worldId}`);
          if (worldRes.ok) {
            const worldData = await worldRes.json();
            setWorld(worldData.world);
          }

          setTutorial({
            id: "new",
            title: "New Tutorial",
            workspaceId,
            shareLink: "",
            annotations: [],
          });
        } else {
          // Load existing tutorial - set ref immediately
          tutorialIdRef.current = tutorialId;
          
          const res = await fetch(`/api/tutorials/${tutorialId}`);
          if (!res.ok) {
            setLoading(false);
            return;
          }

          const data = await res.json();
          setTutorial(data.tutorial);
          setTutorialTitle(data.tutorial.title);
          setAnnotations(data.tutorial.annotations || []);

          // Fetch world data
          if (data.tutorial.workspace?.modelUuid) {
            const worldRes = await fetch(`/api/world/${data.tutorial.workspace.modelUuid}`);
            if (worldRes.ok) {
              const worldData = await worldRes.json();
              setWorld(worldData.world);
            }
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Failed to load:", err);
        setLoading(false);
      }
    }

    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveTutorial = async (skipRedirect = false) => {
    if (!tutorial) return null;

    // Use ref for immediate check (state updates are async)
    const currentId = tutorialIdRef.current;
    const isNewTutorial = !currentId || currentId === "new";
    
    console.log('[saveTutorial] called, currentId:', currentId, 'isNewTutorial:', isNewTutorial, 'skipRedirect:', skipRedirect);

    setSaving(true);
    try {
      if (isNewTutorial) {
        // Create new tutorial
        const res = await fetch("/api/tutorials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: tutorialTitle,
            workspaceId: tutorial.workspaceId,
          }),
        });

        if (!res.ok) throw new Error("Failed to create tutorial");

        const data = await res.json();
        
        // Update ref IMMEDIATELY (before async state update)
        tutorialIdRef.current = data.tutorial.id;
        
        if (skipRedirect) {
          // Update state without navigation (used when adding annotations to new tutorial)
          setTutorial({ ...tutorial, id: data.tutorial.id, ...data.tutorial });
          // Update URL without full navigation
          window.history.replaceState(null, '', `/tutorials/${data.tutorial.id}`);
        } else {
          // Full redirect to the new tutorial's edit page
          router.replace(`/tutorials/${data.tutorial.id}`);
        }
        return data.tutorial;
      } else {
        // Update existing tutorial
        const res = await fetch(`/api/tutorials/${currentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: tutorialTitle }),
        });

        if (!res.ok) throw new Error("Failed to update tutorial");

        const data = await res.json();
        setTutorial({ ...tutorial, ...data.tutorial });
        return data.tutorial;
      }
    } catch (err) {
      console.error("Save error:", err);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleAddAnnotation = async (position: { x: number; y: number; z: number }) => {
    // Use ref for immediate check (state updates are async)
    const currentId = tutorialIdRef.current;
    const needsCreate = !currentId || currentId === "new";
    let currentTutorialId = currentId;
    
    console.log('[handleAddAnnotation] called, ref:', currentId, 'needsCreate:', needsCreate);
    
    if (needsCreate) {
      // Save tutorial first (without redirect to preserve 3D scene)
      const saved = await saveTutorial(true); // skipRedirect = true
      if (!saved) return;
      currentTutorialId = saved.id;
    }

    const newAnnotation: Partial<Annotation> & { tutorialId?: string } = {
      ...position,
      title: "",
      content: "",
      order: annotations.length + 1,
      tutorialId: currentTutorialId!, // Store the tutorial ID with the annotation
    };
    setEditingAnnotation(newAnnotation);
    setIsNewAnnotation(true);
    setSidebarOpen(true);
  };

  const handleSaveAnnotation = async (data: Partial<Annotation>) => {
    // Use tutorialId from editingAnnotation if available (set during handleAddAnnotation)
    // Fall back to ref (immediate) then state
    const editingWithTutorialId = editingAnnotation as (Partial<Annotation> & { tutorialId?: string }) | null;
    let targetTutorialId = editingWithTutorialId?.tutorialId || tutorialIdRef.current;
    
    console.log('[handleSaveAnnotation] called, editingAnnotation.tutorialId:', editingWithTutorialId?.tutorialId, 'ref:', tutorialIdRef.current, 'resolved:', targetTutorialId);
    
    if (!targetTutorialId || targetTutorialId === "new") {
      // Save tutorial first if new, and capture the returned ID (without redirect)
      const saved = await saveTutorial(true); // skipRedirect = true
      if (!saved) return;
      targetTutorialId = saved.id;
    }

    if (!targetTutorialId || targetTutorialId === "new") return;

    setSaving(true);
    try {
      if (isNewAnnotation) {
        // Create new annotation
        const res = await fetch(`/api/tutorials/${targetTutorialId}/annotations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.title || "Untitled",
            content: data.content || "",
            imageUrl: data.imageUrl || null,
            x: data.x,
            y: data.y,
            z: data.z,
            order: data.order || annotations.length + 1,
          }),
        });

        if (!res.ok) throw new Error("Failed to create annotation");

        const result = await res.json();
        setAnnotations([...annotations, result.annotation]);
        setActiveAnnotation(result.annotation);
      } else if (editingAnnotation?.id) {
        // Update existing annotation
        const res = await fetch(`/api/tutorials/${targetTutorialId}/annotations`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            annotationId: editingAnnotation.id,
            ...data,
          }),
        });

        if (!res.ok) throw new Error("Failed to update annotation");

        const result = await res.json();
        setAnnotations(
          annotations.map((a) =>
            a.id === editingAnnotation.id ? result.annotation : a
          )
        );
      }
    } catch (err) {
      console.error("Save annotation error:", err);
    } finally {
      setSaving(false);
      setEditingAnnotation(null);
      setIsNewAnnotation(false);
    }
  };

  const handleDeleteAnnotation = async () => {
    if (!editingAnnotation?.id || !tutorial?.id || tutorial.id === "new") return;

    setSaving(true);
    try {
      const res = await fetch(
        `/api/tutorials/${tutorial.id}/annotations?annotationId=${editingAnnotation.id}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Failed to delete annotation");

      setAnnotations(annotations.filter((a) => a.id !== editingAnnotation.id));
      setActiveAnnotation(null);
    } catch (err) {
      console.error("Delete annotation error:", err);
    } finally {
      setSaving(false);
      setEditingAnnotation(null);
      setIsNewAnnotation(false);
    }
  };

  const handleAnnotationClick = (annotation: Annotation) => {
    setActiveAnnotation(annotation);
    if (editMode) {
      setEditingAnnotation(annotation);
      setIsNewAnnotation(false);
    }
    setSidebarOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!world || !tutorial) {
    return (
      <div className="min-h-screen text-white">
        <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <Link href="/dashboard" className="flex items-center gap-2 w-fit">
              <div className="w-8 h-8 bg-amber-600 rounded-none flex items-center justify-center font-bold shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                3D
              </div>
              <span className="text-xl font-bold tracking-tight">TrainSpace</span>
            </Link>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">No 3D Model Loaded</h1>
          <p className="text-[var(--text-secondary)] mb-8">
            To create a tutorial, you need a workspace with a 3D model first.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/workspaces/new"
              className="px-6 py-3 btn-primary font-medium transition-all"
            >
              Create Workspace
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 glass-button hover:bg-[var(--bg-card-hover)] font-medium transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] backdrop-blur-md flex-shrink-0 z-50">
        <div className="px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-600 rounded-none flex items-center justify-center font-bold text-sm shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                3D
              </div>
            </Link>
            <div>
              <input
                type="text"
                value={tutorialTitle}
                onChange={(e) => setTutorialTitle(e.target.value)}
                onBlur={() => !isNew && saveTutorial()}
                className="bg-transparent font-semibold border-b border-transparent hover:border-[var(--border-medium)] focus:border-amber-500 focus:outline-none px-1 transition-colors"
                placeholder="Tutorial title..."
              />
              <p className="text-xs text-[var(--text-secondary)]">{annotations.length} annotations</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {saving && <span className="text-sm text-[var(--text-muted)]">Saving...</span>}
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-3 py-1.5 rounded-none text-sm font-medium transition-all ${
                editMode
                  ? "bg-amber-600 text-white shadow-[0_0_10px_rgba(245,158,11,0.35)]"
                  : "glass-button hover:bg-[var(--bg-card-hover)]"
              }`}
            >
              {editMode ? "Edit Mode" : "Preview Mode"}
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 glass-button hover:bg-[var(--bg-card-hover)] rounded-none transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>
            <Link
              href={tutorial.workspaceId ? `/workspaces/${tutorial.workspaceId}` : "/dashboard"}
              className="px-4 py-1.5 glass-button hover:bg-[var(--bg-card-hover)] rounded-none text-sm transition-colors"
            >
              Done
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 3D Viewer */}
        <div className="flex-1 relative">
          <AnnotationViewer
            world={world}
            annotations={annotations}
            onAnnotationClick={handleAnnotationClick}
            onAddAnnotation={editMode ? handleAddAnnotation : undefined}
            editMode={editMode}
            activeAnnotationId={activeAnnotation?.id}
          />
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-80 border-l border-[var(--border-subtle)] bg-[var(--bg-panel)] backdrop-blur-md flex flex-col overflow-hidden absolute right-0 top-0 bottom-0 z-40 shadow-xl">
            <div className="p-4 border-b border-[var(--border-subtle)]">
              <h2 className="font-semibold">Annotations</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {editMode
                  ? "Double-click in 3D view to add"
                  : "Click to view details"}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {editingAnnotation ? (
                <AnnotationEditor
                  annotation={editingAnnotation}
                  onSave={handleSaveAnnotation}
                  onDelete={!isNewAnnotation ? handleDeleteAnnotation : undefined}
                  onCancel={() => {
                    setEditingAnnotation(null);
                    setIsNewAnnotation(false);
                  }}
                  isNew={isNewAnnotation}
                />
              ) : (
                <AnnotationList
                  annotations={annotations}
                  activeId={activeAnnotation?.id || null}
                  onSelect={handleAnnotationClick}
                  onEdit={editMode ? (annotation) => {
                    setEditingAnnotation(annotation);
                    setIsNewAnnotation(false);
                  } : undefined}
                  editMode={editMode}
                />
              )}
            </div>

            {/* Annotation detail view (when not editing) */}
            {!editingAnnotation && activeAnnotation && !editMode && (
              <div className="border-t border-[var(--border-subtle)] p-4 bg-[var(--bg-card)]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-amber-600 rounded-none flex items-center justify-center text-xs font-bold shadow-sm">
                    {activeAnnotation.order}
                  </span>
                  <h3 className="font-semibold">{activeAnnotation.title}</h3>
                </div>
                {activeAnnotation.imageUrl && (
                  <img
                    src={activeAnnotation.imageUrl}
                    alt={`${activeAnnotation.title} reference`}
                    className="w-full max-h-56 object-contain rounded-none border border-[var(--border-subtle)] bg-black/30 mb-3"
                  />
                )}
                {activeAnnotation.content && (
                  <p className="text-sm text-[var(--text-secondary)]">{activeAnnotation.content}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
