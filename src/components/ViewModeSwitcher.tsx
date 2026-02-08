"use client";

import { useViewMode } from "@/lib/view-mode";

export function ViewModeSwitcher() {
  const { viewMode, setViewMode, isManager } = useViewMode();

  if (!isManager) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-none border border-gray-700">
      <span className="text-xs text-gray-400">View as:</span>
      <select
        value={viewMode}
        onChange={(e) => setViewMode(e.target.value as "manager" | "employee")}
        className="bg-transparent text-sm font-medium text-white focus:outline-none cursor-pointer"
      >
        <option value="manager" className="bg-gray-800">Manager</option>
        <option value="employee" className="bg-gray-800">Employee</option>
      </select>
    </div>
  );
}
