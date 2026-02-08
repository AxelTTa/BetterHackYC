"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UserButton } from "@/components/auth";

interface Workspace {
  id: string;
  name: string;
  modelUuid: string;
  createdAt: Date;
  tutorials: {
    id: string;
    title: string;
    shareLink: string;
    annotations: { id: string }[];
  }[];
}

interface Progress {
  id: string;
  tutorialId: string;
  completed: boolean;
  completedAnnotations: string[] | null;
  tutorial: {
    id: string;
    title: string;
    shareLink: string;
    workspace: {
      id: string;
      name: string;
    } | null;
    annotations: { id: string }[];
  };
}

interface Tutorial {
  id: string;
  title: string;
  shareLink: string;
  createdAt: Date;
  workspace: {
    id: string;
    name: string;
  } | null;
  annotations: { id: string }[];
}

interface DashboardClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string | null | undefined;
  };
  workspaces: Workspace[];
  progress: Progress[];
  allTutorials: Tutorial[];
}

export function DashboardClient({ user, workspaces, progress, allTutorials }: DashboardClientProps) {
  const isManager = user.role === "manager";
  const [viewMode, setViewMode] = useState<"manager" | "employee">(isManager ? "manager" : "employee");

  // Load view mode from localStorage
  useEffect(() => {
    if (isManager) {
      const saved = localStorage.getItem("viewMode");
      if (saved === "employee" || saved === "manager") {
        setViewMode(saved);
      }
    }
  }, [isManager]);

  // Listen for view mode changes from UserButton
  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem("viewMode");
      if (saved === "employee" || saved === "manager") {
        setViewMode(saved);
      }
    };
    window.addEventListener("storage", handleStorage);
    
    // Also check periodically for same-tab changes
    const interval = setInterval(() => {
      const saved = localStorage.getItem("viewMode");
      if (saved && saved !== viewMode && isManager) {
        setViewMode(saved as "manager" | "employee");
      }
    }, 500);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, [viewMode, isManager]);

  const showManagerView = isManager && viewMode === "manager";

  // Calculate stats
  const totalTutorials = allTutorials.length;
  const completedTutorials = progress.filter(p => p.completed).length;
  const inProgressTutorials = progress.filter(p => !p.completed && (p.completedAnnotations?.length || 0) > 0).length;

  return (
    <div className="min-h-screen text-white">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-600 rounded-none flex items-center justify-center font-bold shadow-[0_0_12px_rgba(245,158,11,0.5)] text-black">
              3D
            </div>
            <span className="text-xl font-bold tracking-tight">TrainSpace</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/studio" className="text-[var(--text-secondary)] hover:text-white transition-colors">
              Studio
            </Link>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user.name}!</h1>
            {isManager && (
              <span className={`px-3 py-1 text-xs font-medium rounded-none border backdrop-blur-sm transition-all ${
                viewMode === "employee" 
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                  : "bg-amber-500/10 text-amber-300 border-amber-500/30"
              }`}>
                {viewMode === "employee" ? "Employee View" : "Manager View"}
              </span>
            )}
          </div>
          <p className="text-[var(--text-secondary)]">
            {showManagerView 
              ? "Manage your workspaces and tutorials"
              : "Track your training progress"
            }
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {showManagerView ? (
            <>
              <div className="glass-card p-6">
                <p className="text-sm text-[var(--text-secondary)] mb-1">Workspaces</p>
                <p className="text-3xl font-bold">{workspaces.length}</p>
              </div>
              <div className="glass-card p-6">
                <p className="text-sm text-[var(--text-secondary)] mb-1">Total Tutorials</p>
                <p className="text-3xl font-bold">
                  {workspaces.reduce((acc, w) => acc + w.tutorials.length, 0)}
                </p>
              </div>
              <div className="glass-card p-6">
                <p className="text-sm text-[var(--text-secondary)] mb-1">Total Annotations</p>
                <p className="text-3xl font-bold">
                  {workspaces.reduce((acc, w) => 
                    acc + w.tutorials.reduce((a, t) => a + t.annotations.length, 0), 0
                  )}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="glass-card p-6">
                <p className="text-sm text-[var(--text-secondary)] mb-1">Completed</p>
                <p className="text-3xl font-bold text-emerald-400">{completedTutorials}</p>
              </div>
              <div className="glass-card p-6">
                <p className="text-sm text-[var(--text-secondary)] mb-1">In Progress</p>
                <p className="text-3xl font-bold text-amber-400">{inProgressTutorials}</p>
              </div>
              <div className="glass-card p-6">
                <p className="text-sm text-[var(--text-secondary)] mb-1">Available</p>
                <p className="text-3xl font-bold text-amber-400">{totalTutorials}</p>
              </div>
            </>
          )}
        </div>

        {showManagerView ? (
          /* Manager View */
          <>
            {/* Quick Actions */}
            <div className="glass-panel p-6 rounded-none mb-8">
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/workspaces/new"
                  className="px-4 py-2 btn-primary text-sm font-medium transition-all"
                >
                  + Create Workspace
                </Link>

              </div>
            </div>

            {/* Workspaces */}
            <div className="glass-card">
              <div className="p-6 border-b border-[var(--border-subtle)] flex justify-between items-center">
                <h2 className="text-lg font-semibold">Your Workspaces</h2>
                <Link
                  href="/workspaces/new"
                  className="px-3 py-1.5 btn-primary text-sm font-medium transition-all"
                >
                  + New
                </Link>
              </div>
              
              {workspaces.length === 0 ? (
                <div className="p-12 text-center text-[var(--text-muted)]">
                  <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p className="mb-4">No workspaces yet</p>
                  <Link href="/workspaces/new" className="text-amber-400 hover:text-amber-300 transition-colors">
                    Create your first workspace →
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {workspaces.map((workspace) => (
                    <Link
                      key={workspace.id}
                      href={`/workspaces/${workspace.id}`}
                      className="block p-4 hover:bg-[var(--bg-card-hover)] transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">{workspace.name}</h3>
                          <p className="text-sm text-[var(--text-secondary)]">
                            {workspace.tutorials.length} tutorial{workspace.tutorials.length !== 1 ? "s" : ""} • Created {new Date(workspace.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Employee View */
          <>
            {/* My Progress */}
            {progress.length > 0 && (
              <div className="glass-card mb-8">
                <div className="p-6 border-b border-[var(--border-subtle)]">
                  <h2 className="text-lg font-semibold">My Training Progress</h2>
                </div>
                <div className="divide-y divide-[var(--border-subtle)]">
                  {progress.map((p) => {
                    const totalSteps = p.tutorial.annotations.length;
                      const completedSteps = p.completedAnnotations?.length || 0;
                    const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
                    
                    return (
                      <div key={p.id} className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-medium">{p.tutorial.title}</h3>
                            <p className="text-sm text-[var(--text-secondary)]">{p.tutorial.workspace?.name}</p>
                          </div>
                          {p.completed ? (
                            <span className="px-2 py-1 bg-emerald-500/10 text-amber-400 border border-emerald-500/20 text-xs rounded-none">
                              Completed
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs rounded-none">
                              In Progress
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-[var(--bg-input)] rounded-none overflow-hidden">
                            <div
                              className={`h-full rounded-none transition-all ${p.completed ? "bg-emerald-500" : "bg-amber-500"}`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className="text-sm text-[var(--text-secondary)] w-16 text-right">
                            {completedSteps}/{totalSteps}
                          </span>
                          <Link
                            href={`/share/${p.tutorial.shareLink}`}
                            className="px-3 py-1 btn-primary text-sm transition-all"
                          >
                            {p.completed ? "Review" : "Continue"}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available Tutorials */}
            <div className="glass-card">
              <div className="p-6 border-b border-[var(--border-subtle)]">
                <h2 className="text-lg font-semibold">Available Tutorials</h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Start a new training module</p>
              </div>
              
              {allTutorials.length === 0 ? (
                <div className="p-12 text-center text-[var(--text-muted)]">
                  <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <p>No tutorials available yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {allTutorials.map((tutorial) => {
                    const existingProgress = progress.find(p => p.tutorialId === tutorial.id);
                    const isStarted = !!existingProgress;
                    const isCompleted = existingProgress?.completed;
                    
                    return (
                      <div
                        key={tutorial.id}
                        className="glass-panel rounded-none p-4 hover:border-[var(--border-strong)] transition-all hover:-translate-y-1"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium">{tutorial.title}</h3>
                          {isCompleted && (
                            <span className="text-amber-400">✓</span>
                          )}
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] mb-3">
                          {tutorial.workspace?.name || "Unknown workspace"}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[var(--text-muted)]">
                            {tutorial.annotations.length} steps
                          </span>
                          <Link
                            href={`/share/${tutorial.shareLink}`}
                            className={`px-3 py-1 rounded-none text-sm transition-all ${
                              isCompleted
                                ? "bg-emerald-500/10 text-amber-400 hover:bg-emerald-500/20 border border-emerald-500/30"
                                : isStarted
                                ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30"
                                : "btn-primary"
                            }`}
                          >
                            {isCompleted ? "Review" : isStarted ? "Continue" : "Start"}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
