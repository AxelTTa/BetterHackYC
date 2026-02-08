"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { UserButton } from "@/components/auth";

interface Tutorial {
  id: string;
  title: string;
  shareLink: string;
  createdAt: string;
  workspace: {
    id: string;
    name: string;
    modelUuid: string;
  };
  annotations: { id: string }[];
}

export default function TutorialsPage() {
  const { data: session } = useSession();
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTutorials() {
      try {
        const res = await fetch("/api/tutorials");
        if (res.ok) {
          const data = await res.json();
          setTutorials(data.tutorials || []);
        }
      } catch (err) {
        console.error("Failed to load tutorials:", err);
      } finally {
        setLoading(false);
      }
    }

    loadTutorials();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-600 rounded-none flex items-center justify-center font-bold">
              3D
            </div>
            <span className="text-xl font-bold">TrainSpace</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/studio" className="text-gray-300 hover:text-white transition-colors">
              Studio
            </Link>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Tutorials</h1>
            <p className="text-gray-400 mt-1">Interactive 3D training modules</p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-none font-medium transition-colors"
          >
            + Create Tutorial
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading tutorials...</div>
        ) : tutorials.length === 0 ? (
          <div className="bg-gray-800 rounded-none border border-gray-700 p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-xl font-semibold mb-2">No tutorials yet</h3>
            <p className="text-gray-400 mb-6">Create your first tutorial from a workspace</p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-amber-600 hover:bg-amber-700 rounded-none font-medium transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tutorials.map((tutorial) => (
              <div
                key={tutorial.id}
                className="bg-gray-800 rounded-none border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors"
              >
                {/* Thumbnail */}
                <div className="h-40 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                  <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{tutorial.title}</h3>
                  <p className="text-sm text-gray-400 mb-3">{tutorial.workspace?.name || "Unknown workspace"}</p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span>{tutorial.annotations?.length || 0} annotations</span>
                    <span>•</span>
                    <span>{new Date(tutorial.createdAt).toLocaleDateString()}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/tutorials/${tutorial.id}`}
                      className="flex-1 px-3 py-2 bg-amber-600 hover:bg-amber-700 rounded-none text-sm font-medium text-center transition-colors"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/share/${tutorial.shareLink}`);
                        alert("Share link copied!");
                      }}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-none text-sm transition-colors"
                      title="Copy share link"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
