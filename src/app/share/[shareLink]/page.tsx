"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AnnotationViewer, type Annotation } from "@/components/annotations";
import { useSession } from "@/lib/auth-client";

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
  shareLink: string;
  workspace: {
    id: string;
    name: string;
    modelUuid: string;
  };
  annotations: Annotation[];
}

export default function SharedTutorialPage() {
  const params = useParams();
  const shareLink = params.shareLink as string;
  const { data: session } = useSession();

  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0, z: 0 });
  const [proximityWarning, setProximityWarning] = useState<string | null>(null);

  // Load tutorial
  useEffect(() => {
    async function loadTutorial() {
      try {
        const res = await fetch(`/api/share/${shareLink}`);
        if (!res.ok) {
          setError("Tutorial not found");
          setLoading(false);
          return;
        }

        const data = await res.json();
        setTutorial(data.tutorial);

        // Load world data
        if (data.tutorial.workspace?.modelUuid) {
          const worldRes = await fetch(`/api/world/${data.tutorial.workspace.modelUuid}`);
          if (worldRes.ok) {
            const worldData = await worldRes.json();
            setWorld(worldData.world);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Failed to load tutorial:", err);
        setError("Failed to load tutorial");
        setLoading(false);
      }
    }

    loadTutorial();
  }, [shareLink]);

  // Load progress separately when session is available
  useEffect(() => {
    async function loadProgress() {
      if (!session || !tutorial || progressLoaded) return;
      
      try {
        const progressRes = await fetch(`/api/progress?tutorialId=${tutorial.id}`);
        if (progressRes.ok) {
          const progressData = await progressRes.json();
          if (progressData.progress?.completedAnnotations) {
            setCompletedSteps(new Set(progressData.progress.completedAnnotations));
          }
        }
        setProgressLoaded(true);
      } catch (err) {
        console.error("Failed to load progress:", err);
      }
    }

    loadProgress();
  }, [session, tutorial, progressLoaded]);

  const sortedAnnotations = tutorial?.annotations
    ? [...tutorial.annotations].sort((a, b) => a.order - b.order)
    : [];

  const currentAnnotation = sortedAnnotations[currentStep];
  const progress = sortedAnnotations.length > 0 
    ? Math.round((completedSteps.size / sortedAnnotations.length) * 100)
    : 0;

  // Calculate distance between camera and annotation
  const getDistance = (pos1: { x: number; y: number; z: number }, pos2: { x: number; y: number; z: number }) => {
    return Math.sqrt(
      Math.pow(pos1.x - pos2.x, 2) +
      Math.pow(pos1.y - pos2.y, 2) +
      Math.pow(pos1.z - pos2.z, 2)
    );
  };

  // Check if user can complete current step (must be near the annotation)
  const PROXIMITY_THRESHOLD = 3.0; // Distance threshold to complete annotation
  const isNearCurrentAnnotation = currentAnnotation 
    ? getDistance(cameraPosition, { x: currentAnnotation.x, y: currentAnnotation.y, z: currentAnnotation.z }) < PROXIMITY_THRESHOLD
    : false;

  // Get the next step that needs to be completed (for sequential enforcement)
  const nextRequiredStep = sortedAnnotations.findIndex(ann => !completedSteps.has(ann.id));

  const saveProgress = useCallback(async (newCompletedSteps: Set<string>) => {
    if (!session || !tutorial) return;
    
    setSaving(true);
    try {
      const isComplete = newCompletedSteps.size === sortedAnnotations.length;
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorialId: tutorial.id,
          completedAnnotations: Array.from(newCompletedSteps),
          completed: isComplete,
        }),
      });
      
      // Redirect to dashboard on completion
      if (isComplete) {
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 2000);
      }
    } catch (err) {
      console.error("Failed to save progress:", err);
    } finally {
      setSaving(false);
    }
  }, [session, tutorial, sortedAnnotations.length]);

  const markComplete = useCallback(() => {
    if (!currentAnnotation) return;
    
    // Check if this step is already completed
    if (completedSteps.has(currentAnnotation.id)) {
      setProximityWarning("This step is already completed!");
      setTimeout(() => setProximityWarning(null), 2000);
      return;
    }
    
    // Enforce sequential completion - must complete steps in order
    if (nextRequiredStep !== -1 && currentStep !== nextRequiredStep) {
      setProximityWarning(`Complete step ${nextRequiredStep + 1} first!`);
      setTimeout(() => setProximityWarning(null), 2000);
      return;
    }
    
    // Check proximity to annotation
    if (!isNearCurrentAnnotation) {
      setProximityWarning("Move closer to the marker to complete this step!");
      setTimeout(() => setProximityWarning(null), 2000);
      return;
    }
    
    // All checks passed - mark as complete
    const newCompleted = new Set([...completedSteps, currentAnnotation.id]);
    setCompletedSteps(newCompleted);
    saveProgress(newCompleted);
    setProximityWarning(null);
    
    // Auto-advance to next step
    if (currentStep < sortedAnnotations.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentAnnotation, completedSteps, currentStep, sortedAnnotations.length, saveProgress, isNearCurrentAnnotation, nextRequiredStep]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showWelcome) return; // Don't navigate while welcome popup is open
      
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        if (currentStep < sortedAnnotations.length - 1) {
          setCurrentStep(currentStep + 1);
        }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        if (currentStep > 0) {
          setCurrentStep(currentStep - 1);
        }
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        markComplete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, sortedAnnotations.length, showWelcome, markComplete]);

  const goToStep = (index: number) => {
    setCurrentStep(index);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-none animate-spin mx-auto mb-4" />
          <p>Loading tutorial...</p>
        </div>
      </div>
    );
  }

  if (error || !tutorial) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{error || "Tutorial not found"}</h1>
          <p className="text-[var(--text-secondary)] mb-6">This tutorial link may be invalid or expired.</p>
          <Link
            href="/"
            className="px-6 py-3 btn-primary font-medium transition-all"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (!world) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">3D Model Unavailable</h1>
          <p className="text-[var(--text-secondary)]">The 3D model for this tutorial could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen text-white flex flex-col overflow-hidden">
      {/* Welcome Popup */}
      {showWelcome && !loading && tutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[var(--bg-panel)] rounded-none border border-[var(--border-subtle)] p-8 max-w-md mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-600 rounded-none flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2">Welcome to {tutorial.title}</h2>
              <p className="text-[var(--text-secondary)]">Follow the steps to complete this training tutorial</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3 p-3 bg-[var(--bg-card)] rounded-none">
                <div className="w-8 h-8 bg-amber-600/20 rounded-none flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-400 font-bold">←→</span>
                </div>
                <div>
                  <p className="font-medium">Navigate with Arrow Keys</p>
                  <p className="text-sm text-[var(--text-secondary)]">Use left/right arrows to move between steps</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-[var(--bg-card)] rounded-none">
                <div className="w-8 h-8 bg-emerald-600/20 rounded-none flex items-center justify-center flex-shrink-0">
                  <span className="text-emerald-400 font-bold text-xs">↵</span>
                </div>
                <div>
                  <p className="font-medium">Complete Steps in Order</p>
                  <p className="text-sm text-[var(--text-secondary)]">Navigate to each marker and press Enter when close</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-[var(--bg-card)] rounded-none">
                <div className="w-8 h-8 bg-amber-600/20 rounded-none flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Get Close to Markers</p>
                  <p className="text-sm text-[var(--text-secondary)]">Move near each marker to complete that step</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-[var(--bg-card)] rounded-none">
                <div className="w-8 h-8 bg-amber-600/20 rounded-none flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Drag to Look Around</p>
                  <p className="text-sm text-[var(--text-secondary)]">Click and drag in the 3D view to explore</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowWelcome(false)}
              className="w-full py-3 btn-primary font-semibold rounded-none"
            >
              Start Tutorial
            </button>

            <p className="text-center text-xs text-[var(--text-muted)] mt-4">
              {sortedAnnotations.length} steps to complete
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] backdrop-blur-md flex-shrink-0 z-50">
        <div className="px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-600 rounded-none flex items-center justify-center font-bold text-sm shadow-[0_0_12px_rgba(245,158,11,0.5)] text-black">
                3D
              </div>
            </Link>
            <div>
              <h1 className="font-semibold tracking-tight">{tutorial.title}</h1>
              <p className="text-xs text-[var(--text-secondary)]">{tutorial.workspace?.name}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-4">
            {saving && (
              <span className="text-xs text-amber-400">Saving...</span>
            )}
            {!session && (
              <Link href="/auth/signin" className="text-xs text-amber-400 hover:underline">
                Sign in to save progress
              </Link>
            )}
            <div className="text-sm text-[var(--text-secondary)]">
              {completedSteps.size} / {sortedAnnotations.length} completed
            </div>
            <div className="w-32 h-2 bg-[var(--bg-input)] rounded-none overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 3D Viewer */}
        <div className="flex-1 relative">
          <AnnotationViewer
            world={world}
            annotations={sortedAnnotations}
            onAnnotationClick={(ann) => {
              const index = sortedAnnotations.findIndex((a) => a.id === ann.id);
              if (index !== -1) setCurrentStep(index);
            }}
            onCameraMove={setCameraPosition}
            editMode={false}
            activeAnnotationId={currentAnnotation?.id}
          />
          
          {/* Proximity Warning */}
          {proximityWarning && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-yellow-600 text-white rounded-lg shadow-lg animate-pulse">
              {proximityWarning}
            </div>
          )}
          
          {/* Proximity Indicator */}
          {currentAnnotation && !completedSteps.has(currentAnnotation.id) && (
            <div className="absolute bottom-4 left-4 z-20 px-3 py-2 bg-gray-800/90 rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isNearCurrentAnnotation ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-gray-300">
                  {isNearCurrentAnnotation ? 'Close enough to complete!' : 'Move closer to marker'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Step Guide */}
        <div className="w-96 border-l border-[var(--border-subtle)] bg-[var(--bg-panel)] backdrop-blur-md flex flex-col absolute right-0 top-0 bottom-0 z-40 shadow-xl">
          {/* Current Step */}
          <div className="p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 bg-amber-600 rounded-none flex items-center justify-center text-lg font-bold shadow-lg text-black">
                {currentStep + 1}
              </span>
              <div>
                <p className="text-xs text-[var(--text-secondary)]">Step {currentStep + 1} of {sortedAnnotations.length}</p>
                <h2 className="font-semibold text-lg">{currentAnnotation?.title || "No steps"}</h2>
              </div>
            </div>
            
            {currentAnnotation?.imageUrl && (
              <img
                src={currentAnnotation.imageUrl}
                alt={`${currentAnnotation.title} reference`}
                className="w-full max-h-64 object-contain rounded-none border border-[var(--border-subtle)] bg-black/30 mb-4"
              />
            )}
            
            {currentAnnotation?.content && (
              <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">{currentAnnotation.content}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="px-4 py-2 glass-button hover:bg-[var(--bg-card-hover)] disabled:opacity-50 disabled:cursor-not-allowed rounded-none transition-colors"
              >
                Previous
              </button>
              {completedSteps.has(currentAnnotation?.id || "") ? (
                <button
                  onClick={() => currentStep < sortedAnnotations.length - 1 && setCurrentStep(currentStep + 1)}
                  disabled={currentStep >= sortedAnnotations.length - 1}
                  className="flex-1 px-4 py-2 btn-primary disabled:opacity-50 disabled:cursor-not-allowed rounded-none font-medium transition-colors"
                >
                  {currentStep < sortedAnnotations.length - 1 ? "Next Step" : "All Done! ✓"}
                </button>
              ) : (
                <button
                  onClick={markComplete}
                  disabled={!isNearCurrentAnnotation || (nextRequiredStep !== -1 && currentStep !== nextRequiredStep)}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-[var(--bg-input)] disabled:cursor-not-allowed rounded-none font-medium transition-colors"
                >
                  {nextRequiredStep !== -1 && currentStep !== nextRequiredStep
                    ? `Complete Step ${nextRequiredStep + 1} First`
                    : isNearCurrentAnnotation 
                      ? "Mark Complete ✓" 
                      : "Move Closer to Complete"}
                </button>
              )}
            </div>
          </div>

          {/* Steps List */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-sm font-medium text-[var(--text-muted)] mb-3 uppercase tracking-wider">All Steps</h3>
            <div className="space-y-2">
              {sortedAnnotations.map((ann, index) => (
                <button
                  key={ann.id}
                  onClick={() => goToStep(index)}
                  className={`w-full text-left p-3 rounded-none border transition-all ${
                    currentStep === index
                      ? "bg-amber-500/10 border-amber-500/30 shadow-sm"
                      : completedSteps.has(ann.id)
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : "glass-button border-transparent hover:bg-[var(--bg-card-hover)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-none flex items-center justify-center text-xs font-bold transition-colors ${
                        completedSteps.has(ann.id)
                          ? "bg-emerald-500 text-white"
                          : currentStep === index
                          ? "bg-amber-600 text-black"
                          : "bg-[var(--bg-input)] text-[var(--text-muted)]"
                      }`}
                    >
                      {completedSteps.has(ann.id) ? "✓" : index + 1}
                    </span>
                    <span className={`transition-colors ${
                      completedSteps.has(ann.id) ? "text-emerald-400" : currentStep === index ? "text-amber-300" : "text-[var(--text-secondary)]"
                    }`}>
                      {ann.title}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Completion Message */}
          {progress === 100 && (
            <div className="p-4 bg-emerald-500/10 border-t border-emerald-500/20 backdrop-blur-md">
              <div className="text-center">
                <p className="text-emerald-400 font-semibold mb-2">🎉 Tutorial Complete!</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {session ? "Redirecting to dashboard..." : "Great job completing all steps."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
