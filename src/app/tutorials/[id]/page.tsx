"use client";

import { useState, useEffect } from "react";
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

  // Load tutorial or create new one
  useEffect(() => {
    async function loadData() {
      try {
        if (isNew) {
          // Creating new tutorial
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
          // Load existing tutorial
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
  }, [tutorialId, isNew, searchParams]);

  const saveTutorial = async () => {
    if (!tutorial) return null;

    setSaving(true);
    try {
      if (isNew) {
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
        // Redirect to the new tutorial's edit page
        router.replace(`/tutorials/${data.tutorial.id}`);
        return data.tutorial;
      } else {
        // Update existing tutorial
        const res = await fetch(`/api/tutorials/${tutorialId}`, {
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
    // If this is a new tutorial, save it first
    let currentTutorialId = tutorialId;
    if (isNew) {
      const saved = await saveTutorial();
      if (!saved) return;
      currentTutorialId = saved.id;
    }

    const newAnnotation: Partial<Annotation> = {
      ...position,
      title: "",
      content: "",
      order: annotations.length + 1,
    };
    setEditingAnnotation(newAnnotation);
    setIsNewAnnotation(true);
    setSidebarOpen(true);
  };

  const handleSaveAnnotation = async (data: Partial<Annotation>) => {
    const currentTutorialId = tutorial?.id === "new" ? null : tutorial?.id;
    
    if (!currentTutorialId || currentTutorialId === "new") {
      // Save tutorial first if new
      const saved = await saveTutorial();
      if (!saved) return;
    }

    const targetTutorialId = currentTutorialId && currentTutorialId !== "new" 
      ? currentTutorialId 
      : tutorial?.id;

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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!world || !tutorial) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <header className="border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <Link href="/dashboard" className="flex items-center gap-2 w-fit">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">
                3D
              </div>
              <span className="text-xl font-bold">TrainSpace</span>
            </Link>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">No 3D Model Loaded</h1>
          <p className="text-gray-400 mb-8">
            To create a tutorial, you need a workspace with a 3D model first.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/workspaces/new"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              Create Workspace
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-700 flex-shrink-0">
        <div className="px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">
                3D
              </div>
            </Link>
            <div>
              <input
                type="text"
                value={tutorialTitle}
                onChange={(e) => setTutorialTitle(e.target.value)}
                onBlur={() => !isNew && saveTutorial()}
                className="bg-transparent font-semibold border-b border-transparent hover:border-gray-600 focus:border-blue-500 focus:outline-none px-1"
                placeholder="Tutorial title..."
              />
              <p className="text-xs text-gray-400">{annotations.length} annotations</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {saving && <span className="text-sm text-gray-400">Saving...</span>}
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                editMode
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300"
              }`}
            >
              {editMode ? "Edit Mode" : "Preview Mode"}
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>
            <Link
              href={tutorial.workspaceId ? `/workspaces/${tutorial.workspaceId}` : "/dashboard"}
              className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              Done
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
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
          <div className="w-80 border-l border-gray-700 bg-gray-900 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h2 className="font-semibold">Annotations</h2>
              <p className="text-xs text-gray-400 mt-1">
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
              <div className="border-t border-gray-700 p-4 bg-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                    {activeAnnotation.order}
                  </span>
                  <h3 className="font-semibold">{activeAnnotation.title}</h3>
                </div>
                {activeAnnotation.content && (
                  <p className="text-sm text-gray-300">{activeAnnotation.content}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
