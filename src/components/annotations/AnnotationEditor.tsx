"use client";

import { useRef, useState } from "react";
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
  const [imageUrl, setImageUrl] = useState(annotation?.imageUrl || "");
  const [imageError, setImageError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageError("Please select an image file");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setImageError("Image must be under 50MB");
      return;
    }

    try {
      setUploading(true);
      setImageError("");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/annotations/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to upload image");
      }

      const data = await res.json();
      setImageUrl(data.url || "");
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...annotation,
      title,
      content,
      order,
      imageUrl: imageUrl || null,
    });
  };

  return (
    <div className="glass-panel p-6 rounded-none">
      <h3 className="text-lg font-semibold text-white mb-4">
        {isNew ? "New Annotation" : "Edit Annotation"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 glass-input placeholder-[var(--text-muted)]"
            placeholder="e.g., Safety Switch Location"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
            Content / Instructions
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 glass-input placeholder-[var(--text-muted)] resize-none"
            placeholder="Describe what the trainee should know or do at this point..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
            Image (optional)
          </label>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 glass-button hover:bg-[var(--bg-card-hover)] text-sm transition-colors"
            >
              {uploading ? "Uploading..." : "Upload image"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <p className="text-xs text-[var(--text-muted)]">PNG, JPG, WEBP, GIF • max 50MB</p>
            {imageError && (
              <p className="text-xs text-red-400">{imageError}</p>
            )}
            {imageUrl && (
              <div className="glass-card p-2 border-[var(--border-subtle)]">
                <img
                  src={imageUrl}
                  alt="Annotation preview"
                  className="w-full max-h-48 object-contain rounded-none"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="mt-2 text-xs text-red-400 hover:text-red-300 w-full text-center"
                >
                  Remove image
                </button>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
            Step Order
          </label>
          <input
            type="number"
            value={order}
            onChange={(e) => setOrder(parseInt(e.target.value) || 1)}
            min={1}
            disabled={isNew}
            className="w-24 px-3 py-2 glass-input"
          />
          {isNew && (
            <p className="text-xs text-gray-500 mt-1">Auto-assigned based on current step count</p>
          )}
        </div>

        {annotation?.x !== undefined && (
          <div className="text-xs text-[var(--text-muted)]">
            Position: ({annotation.x.toFixed(2)}, {annotation.y?.toFixed(2)}, {annotation.z?.toFixed(2)})
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 py-2 btn-primary text-sm font-medium transition-all"
          >
            {isNew ? "Add Annotation" : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 glass-button hover:bg-[var(--bg-card-hover)] text-sm transition-colors"
          >
            Cancel
          </button>
          {!isNew && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="px-4 py-2 bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20 rounded-none text-sm transition-colors backdrop-blur-sm"
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
