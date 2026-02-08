"use client";

import type { Annotation } from "./AnnotationViewer";

interface AnnotationListProps {
  annotations: Annotation[];
  activeId: string | null;
  onSelect: (annotation: Annotation) => void;
  onEdit?: (annotation: Annotation) => void;
  onReorder?: (annotations: Annotation[]) => void;
  editMode?: boolean;
}

export default function AnnotationList({
  annotations,
  activeId,
  onSelect,
  onEdit,
  editMode = false,
}: AnnotationListProps) {
  const sortedAnnotations = [...annotations].sort((a, b) => a.order - b.order);

  if (annotations.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-muted)]">
        <svg
          className="w-12 h-12 mx-auto mb-3 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <p>No annotations yet</p>
        <p className="text-sm mt-1">Double-click in the 3D view to add one</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedAnnotations.map((annotation) => (
        <div
          key={annotation.id}
          onClick={() => onSelect(annotation)}
          className={`w-full text-left p-3 rounded-none border transition-all ${
            activeId === annotation.id
              ? "bg-amber-600/20 border-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.25)]"
              : "glass-button border-transparent hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`w-7 h-7 rounded-none flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
                activeId === annotation.id
                  ? "bg-amber-600 text-black"
                  : "bg-[var(--bg-input)] text-[var(--text-muted)]"
              }`}
            >
              {annotation.order}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`font-medium truncate ${activeId === annotation.id ? "text-amber-100" : ""}`}>
                {annotation.title}
              </p>
              {annotation.content && (
                <p className="text-sm text-[var(--text-muted)] truncate">
                  {annotation.content}
                </p>
              )}
            </div>
            {editMode && onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(annotation);
                }}
                className="p-2 text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card-hover)] rounded-none transition-colors flex-shrink-0"
                title="Edit annotation"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
