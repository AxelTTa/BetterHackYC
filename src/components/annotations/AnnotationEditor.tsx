"use client";

import { useState } from "react";
import type { Annotation } from "./AnnotationViewer";

interface AnnotationEditorProps {
  annotation: Partial<Annotation> | null;
  onSave: (annotation: Partial<Annotation>) => void;
  onDelete?: () => void;
  onCancel: () => void;
  isNew?: boolean;
}

export default function AnnotationEditor({
  annotation,
  onSave,
  onDelete,
  onCancel,
  isNew = false,
}: AnnotationEditorProps) {
  const [title, setTitle] = useState(annotation?.title || "");
  const [content, setContent] = useState(annotation?.content || "");
  const [order, setOrder] = useState(annotation?.order || 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...annotation,
      title,
      content,
      order,
    });
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        {isNew ? "New Annotation" : "Edit Annotation"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Safety Switch Location"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Content / Instructions
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Describe what the trainee should know or do at this point..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Step Order
          </label>
          <input
            type="number"
            value={order}
            onChange={(e) => setOrder(parseInt(e.target.value) || 1)}
            min={1}
            disabled={isNew}
            className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {isNew && (
            <p className="text-xs text-gray-500 mt-1">Auto-assigned based on current step count</p>
          )}
        </div>

        {annotation?.x !== undefined && (
          <div className="text-xs text-gray-500">
            Position: ({annotation.x.toFixed(2)}, {annotation.y?.toFixed(2)}, {annotation.z?.toFixed(2)})
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            {isNew ? "Add Annotation" : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          {!isNew && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
