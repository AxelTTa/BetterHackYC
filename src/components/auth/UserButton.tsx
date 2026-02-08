"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import type { AppUser } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function UserButton() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"manager" | "employee">("manager");
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Cast to include custom fields
  const user = session?.user as AppUser | undefined;
  const isManager = user?.role === "manager";

  // Load view mode from localStorage
  useEffect(() => {
    if (isManager) {
      const saved = localStorage.getItem("viewMode");
      if (saved === "employee" || saved === "manager") {
        setViewMode(saved);
      }
    }
  }, [isManager]);

  const handleViewModeChange = (mode: "manager" | "employee") => {
    setViewMode(mode);
    localStorage.setItem("viewMode", mode);
    setIsOpen(false);
    router.refresh();
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isPending) {
    return (
      <div className="h-10 w-10 rounded-none bg-gray-200 animate-pulse" />
    );
  }

  if (!session || !user) {
    return (
      <a
        href="/auth/signin"
        className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-none hover:bg-amber-700 transition-colors"
      >
        Sign In
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* View Mode Indicator for Managers */}
      {isManager && viewMode === "employee" && (
        <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded-none border border-yellow-600/50">
          Viewing as Employee
        </span>
      )}
      
      <div className="text-right hidden sm:block">
        <p className="text-sm font-medium">{user.name}</p>
        <p className="text-xs text-gray-500 capitalize">{user.role || "employee"}</p>
      </div>
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="h-10 w-10 rounded-none bg-amber-600 text-white flex items-center justify-center font-medium hover:bg-amber-700 transition-colors"
        >
          {user.name?.charAt(0).toUpperCase() || "U"}
        </button>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-none shadow-lg py-1 z-50 border border-gray-700">
            <div className="px-4 py-3 border-b border-gray-700">
              <p className="text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-gray-400">{user.email}</p>
              <p className="text-xs text-gray-500 capitalize mt-1">Role: {user.role}</p>
            </div>
            
            {/* View Mode Switcher for Managers */}
            {isManager && (
              <div className="px-4 py-3 border-b border-gray-700">
                <p className="text-xs text-gray-400 mb-2">View Mode</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewModeChange("manager")}
                    className={`flex-1 px-3 py-1.5 text-xs rounded-none transition-colors ${
                      viewMode === "manager"
                        ? "bg-amber-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    Manager
                  </button>
                  <button
                    onClick={() => handleViewModeChange("employee")}
                    className={`flex-1 px-3 py-1.5 text-xs rounded-none transition-colors ${
                      viewMode === "employee"
                        ? "bg-yellow-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    Employee
                  </button>
                </div>
              </div>
            )}
            
            <a
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
            >
              Dashboard
            </a>
            <a
              href="/tutorials"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
            >
              My Tutorials
            </a>
            <button
              onClick={handleSignOut}
              className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
