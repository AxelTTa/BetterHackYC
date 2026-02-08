"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { UserButton } from "@/components/auth";
import { AnnotationViewer } from "@/components/annotations";

interface Workspace {
  id: string;
  name: string;
  modelUuid: string;
  createdAt: string;
  tutorials: {
    id: string;
    title: string;
    shareLink: string;
    annotations: { id: string }[];
  }[];
}

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

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const workspaceId = params.id as string;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  useEffect(() => {
    async function loadWorkspace() {
      try {
        // Load workspace from database
        const res = await fetch(`/api/workspaces/${workspaceId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Workspace not found");
          } else {
            setError("Failed to load workspace");
          }
          setLoading(false);
          return;
        }

        const data = await res.json();
        setWorkspace(data.workspace);

        // Load world data from World Labs API
        const worldRes = await fetch(`/api/world/${data.workspace.modelUuid}`);
        if (worldRes.ok) {
          const worldData = await worldRes.json();
          setWorld(worldData.world);
        }

        setLoading(false);
      } catch (err) {
        console.error("Load error:", err);
        setError("Failed to load workspace");
        setLoading(false);
      }
    }

    loadWorkspace();
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading workspace...</div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="min-h-screen text-white">
        <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <Link href="/dashboard" className="flex items-center gap-2 w-fit">
              <div className="w-8 h-8 bg-amber-600 rounded-none flex items-center justify-center font-bold shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                3D
              </div>
              <span className="text-xl font-bold tracking-tight">TrainSpace</span>
            </Link>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">{error || "Workspace not found"}</h1>
          <Link
            href="/dashboard"
            className="text-amber-400 hover:text-amber-300 hover:underline transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-600 rounded-none flex items-center justify-center font-bold shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                3D
              </div>
              <span className="text-xl font-bold tracking-tight">TrainSpace</span>
            </Link>
            <span className="text-[var(--text-muted)]">/</span>
            <span className="text-[var(--text-secondary)]">{workspace.name}</span>
          </div>
          <UserButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Workspace Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-2 tracking-tight">{workspace.name}</h1>
            <p className="text-[var(--text-secondary)]">
              Created {new Date(workspace.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowViewer(true)}
              disabled={!world}
              className="px-4 py-2 glass-button hover:bg-[var(--bg-card-hover)] rounded-none font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              View 3D Model
            </button>
            <Link
              href={`/tutorials/new?workspaceId=${workspace.id}&worldId=${workspace.modelUuid}`}
              className="px-4 py-2 btn-primary rounded-none font-medium transition-all"
            >
              + Create Tutorial
            </Link>
          </div>
        </div>

        {/* 3D Preview */}
        {world && (
          <div className="glass-card overflow-hidden mb-8 group">
            <div className="relative h-64">
              <img
                src={world.assets.thumbnail_url}
                alt={workspace.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <button
                onClick={() => setShowViewer(true)}
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              >
                <div className="w-16 h-16 bg-white/10 backdrop-blur-md border border-white/20 rounded-none flex items-center justify-center hover:bg-white/20 transition-all hover:scale-110">
                  <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </button>
            </div>
            <div className="p-4 border-t border-[var(--border-subtle)]">
              <p className="text-[var(--text-secondary)] text-sm">{world.assets.caption}</p>
            </div>
          </div>
        )}

        {/* Tutorials Section */}
        <div className="glass-card">
          <div className="p-6 border-b border-[var(--border-subtle)] flex justify-between items-center">
            <h2 className="text-lg font-semibold">Tutorials</h2>
            <Link
              href={`/tutorials/new?workspaceId=${workspace.id}&worldId=${workspace.modelUuid}`}
              className="px-3 py-1.5 btn-primary text-sm font-medium transition-all"
            >
              + New Tutorial
            </Link>
          </div>

          {workspace.tutorials.length === 0 ? (
            <div className="p-12 text-center text-[var(--text-muted)]">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="mb-4">No tutorials yet</p>
              <Link
                href={`/tutorials/new?workspaceId=${workspace.id}&worldId=${workspace.modelUuid}`}
                className="text-amber-400 hover:text-amber-300 hover:underline transition-colors"
              >
                Create your first tutorial →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {workspace.tutorials.map((tutorial) => (
                <div
                  key={tutorial.id}
                  className="p-4 hover:bg-[var(--bg-card-hover)] transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <Link href={`/tutorials/${tutorial.id}`} className="flex-1 group">
                      <h3 className="font-medium group-hover:text-amber-400 transition-colors">{tutorial.title}</h3>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {tutorial.annotations.length} annotations
                      </p>
                    </Link>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/tutorials/${tutorial.id}/progress`}
                        className="p-2 text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-panel)] rounded-none transition-colors"
                        title="View employee progress"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </Link>
                      <button
                        onClick={() => {
                          const shareUrl = `${window.location.origin}/share/${tutorial.shareLink}`;
                          navigator.clipboard.writeText(shareUrl);
                          alert(`Share link copied!\n\n${shareUrl}`);
                        }}
                        className="p-2 text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-panel)] rounded-none transition-colors"
                        title="Copy share link"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      </button>
                      <Link
                        href={`/tutorials/${tutorial.id}`}
                        className="p-2 text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-panel)] rounded-none transition-colors"
                        title="Edit tutorial"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 3D Viewer Modal */}
      {showViewer && world && (
        <div className="fixed inset-0 z-50 bg-black">
          <AnnotationViewer
            world={world}
            annotations={[]}
            onClose={() => setShowViewer(false)}
          />
        </div>
      )}
    </div>
  );
}
