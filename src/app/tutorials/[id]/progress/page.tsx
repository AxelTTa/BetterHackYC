"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@/components/auth";

interface EmployeeProgress {
  id: string;
  employee: {
    id: string;
    name: string;
    email: string;
  };
  completedSteps: number;
  totalSteps: number;
  percentComplete: number;
  completed: boolean;
  lastUpdated: string;
}

interface TutorialProgress {
  tutorial: {
    id: string;
    title: string;
    shareLink: string;
    workspace: {
      id: string;
      name: string;
    };
    totalAnnotations: number;
  };
  employeeProgress: EmployeeProgress[];
  summary: {
    totalEmployees: number;
    completed: number;
    inProgress: number;
    notStarted: number;
  };
}

export default function TutorialProgressPage() {
  const params = useParams();
  const tutorialId = params.id as string;

  const [data, setData] = useState<TutorialProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadProgress() {
      try {
        const res = await fetch(`/api/tutorials/${tutorialId}/progress`);
        if (!res.ok) {
          if (res.status === 403) {
            setError("Only managers can view progress");
          } else {
            setError("Failed to load progress");
          }
          setLoading(false);
          return;
        }

        const progressData = await res.json();
        setData(progressData);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load progress:", err);
        setError("Failed to load progress");
        setLoading(false);
      }
    }

    loadProgress();
  }, [tutorialId]);

  const copyShareLink = () => {
    if (data?.tutorial.shareLink) {
      navigator.clipboard.writeText(`${window.location.origin}/share/${data.tutorial.shareLink}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading progress...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <header className="border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <Link href="/dashboard" className="flex items-center gap-2 w-fit">
              <div className="w-8 h-8 bg-amber-600 rounded-none flex items-center justify-center font-bold">
                3D
              </div>
              <span className="text-xl font-bold">TrainSpace</span>
            </Link>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">{error || "Error"}</h1>
          <Link href="/dashboard" className="text-amber-400 hover:underline">
            ← Back to Dashboard
          </Link>
        </main>
      </div>
    );
  }

  const { tutorial, employeeProgress, summary } = data;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-600 rounded-none flex items-center justify-center font-bold">
                3D
              </div>
              <span className="text-xl font-bold">TrainSpace</span>
            </Link>
            <span className="text-gray-600">/</span>
            <Link href={`/workspaces/${tutorial.workspace.id}`} className="text-gray-400 hover:text-white">
              {tutorial.workspace.name}
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-gray-300">{tutorial.title}</span>
          </div>
          <UserButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-2">Employee Progress</h1>
            <p className="text-gray-400">{tutorial.title} • {tutorial.totalAnnotations} steps</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={copyShareLink}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-none font-medium transition-colors flex items-center gap-2"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Copy Share Link
                </>
              )}
            </button>
            <Link
              href={`/tutorials/${tutorialId}`}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-none font-medium transition-colors"
            >
              Edit Tutorial
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-none p-6 border border-gray-700">
            <p className="text-sm text-gray-400 mb-1">Total Employees</p>
            <p className="text-3xl font-bold">{summary.totalEmployees}</p>
          </div>
          <div className="bg-gray-800 rounded-none p-6 border border-green-700/50">
            <p className="text-sm text-gray-400 mb-1">Completed</p>
            <p className="text-3xl font-bold text-green-400">{summary.completed}</p>
          </div>
          <div className="bg-gray-800 rounded-none p-6 border border-yellow-700/50">
            <p className="text-sm text-gray-400 mb-1">In Progress</p>
            <p className="text-3xl font-bold text-yellow-400">{summary.inProgress}</p>
          </div>
          <div className="bg-gray-800 rounded-none p-6 border border-gray-700">
            <p className="text-sm text-gray-400 mb-1">Not Started</p>
            <p className="text-3xl font-bold text-gray-400">{summary.notStarted}</p>
          </div>
        </div>

        {/* Share Link Box */}
        <div className="bg-amber-900/20 border border-amber-600/50 rounded-none p-4 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-400 font-medium mb-1">Share this link with employees</p>
              <code className="text-gray-300 text-sm bg-gray-800 px-2 py-1 rounded-none">
                {window.location.origin}/share/{tutorial.shareLink}
              </code>
            </div>
            <button
              onClick={copyShareLink}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 rounded-none text-sm transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Employee Progress Table */}
        <div className="bg-gray-800 rounded-none border border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-lg font-semibold">Employee Progress</h2>
          </div>

          {employeeProgress.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="mb-2">No employees have started this tutorial yet</p>
              <p className="text-sm">Share the link above to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-400">Employee</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-400">Progress</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-400">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-400">Last Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {employeeProgress.map((ep) => (
                    <tr key={ep.id} className="hover:bg-gray-700/30">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">{ep.employee.name}</p>
                          <p className="text-sm text-gray-400">{ep.employee.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-gray-700 rounded-none overflow-hidden">
                            <div
                              className={`h-full rounded-none ${
                                ep.completed ? "bg-green-500" : "bg-amber-500"
                              }`}
                              style={{ width: `${ep.percentComplete}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-400 w-20">
                            {ep.completedSteps}/{ep.totalSteps} ({ep.percentComplete}%)
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {ep.completed ? (
                          <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded-none">
                            Completed
                          </span>
                        ) : ep.completedSteps > 0 ? (
                          <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded-none">
                            In Progress
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-600/20 text-gray-400 text-xs rounded-none">
                            Not Started
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(ep.lastUpdated).toLocaleDateString()} {new Date(ep.lastUpdated).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
