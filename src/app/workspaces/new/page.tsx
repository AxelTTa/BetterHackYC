"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";

type GenerationStatus = "idle" | "generating" | "uploading" | "complete" | "error";
type CreationMode = "generate" | "model-id";

export default function NewWorkspacePage() {
  const router = useRouter();
  const { data: session } = useSession();
  
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [useDraft, setUseDraft] = useState(true);
  
  // Creation mode state
  const [creationMode, setCreationMode] = useState<CreationMode>("generate");
  const [modelId, setModelId] = useState("");
  
  // Image upload state
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (selectedImages.length + files.length > 8) {
      setStatus("error");
      setStatusMessage("Maximum 8 images allowed");
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        setStatus("error");
        setStatusMessage(`${file.name} is not an image file`);
        continue;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        setStatus("error");
        setStatusMessage(`${file.name} exceeds 10MB limit`);
        continue;
      }
      
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    if (validFiles.length > 0) {
      setSelectedImages(prev => [...prev, ...validFiles]);
      setImagePreviews(prev => [...prev, ...newPreviews]);
      setStatus("idle");
      setStatusMessage("");
    }
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImage = async (file: File, index: number, total: number): Promise<string> => {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    
    setStatusMessage(`Preparing upload (${index + 1}/${total})...`);
    const prepareRes = await fetch("/api/upload/prepare", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.name,
        extension: extension,
        kind: "image",
      }),
    });

    if (!prepareRes.ok) {
      const error = await prepareRes.json();
      throw new Error(error.error || "Failed to prepare upload");
    }

    const { media_asset, upload_info } = await prepareRes.json();
    
    setStatusMessage(`Uploading image ${index + 1}/${total}...`);
    const uploadRes = await fetch(upload_info.upload_url, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        ...upload_info.required_headers,
      },
      body: file,
    });

    if (!uploadRes.ok) {
      throw new Error(`Failed to upload image ${index + 1}`);
    }

    return media_asset.media_asset_id;
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setStatus("error");
      setStatusMessage("Please enter a workspace name");
      return;
    }

    // Validation based on creation mode
    if (creationMode === "model-id") {
      if (!modelId.trim()) {
        setStatus("error");
        setStatusMessage("Please enter a model ID");
        return;
      }
      
      // Direct creation with model ID - skip generation
      try {
        setStatus("generating");
        setStatusMessage("Creating workspace...");
        
        const saveRes = await fetch("/api/workspaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            modelUuid: modelId.trim(),
          }),
        });

        if (!saveRes.ok) {
          throw new Error("Failed to save workspace");
        }

        const { workspace } = await saveRes.json();
        
        setStatus("complete");
        setStatusMessage("Workspace created! Redirecting...");
        
        setTimeout(() => {
          router.push(`/workspaces/${workspace.id}`);
        }, 1000);
        return;
      } catch (error) {
        console.error("Creation error:", error);
        setStatus("error");
        setStatusMessage(error instanceof Error ? error.message : "Unknown error");
        return;
      }
    }

    // Generate mode - requires images
    if (selectedImages.length === 0) {
      setStatus("error");
      setStatusMessage("Please upload at least one image");
      return;
    }

    try {
      let mediaAssetIds: string[] = [];

      if (selectedImages.length > 0) {
        setStatus("uploading");
        for (let i = 0; i < selectedImages.length; i++) {
          const id = await uploadImage(selectedImages[i], i, selectedImages.length);
          mediaAssetIds.push(id);
        }
      }

      setStatus("generating");
      setStatusMessage("Starting 3D generation...");

      const generateRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: prompt.trim() || undefined, 
          draft: useDraft, 
          mediaAssetIds: mediaAssetIds,
        }),
      });

      if (!generateRes.ok) {
        const error = await generateRes.json();
        throw new Error(error.error || "Failed to start generation");
      }

      const { operationId } = await generateRes.json();
      setStatusMessage("Generation in progress...");

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 120;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const statusRes = await fetch(`/api/status/${operationId}`);
        
        if (!statusRes.ok) {
          throw new Error("Failed to check status");
        }

        const statusData = await statusRes.json();

        if (statusData.error) {
          throw new Error(statusData.error.message || "Generation failed");
        }

        if (statusData.progress?.description) {
          setStatusMessage(statusData.progress.description);
        }

        if (statusData.done && statusData.world) {
          setStatusMessage("Saving workspace...");
          
          // Save workspace to database
          const saveRes = await fetch("/api/workspaces", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: name.trim(),
              modelUuid: statusData.world.id,
            }),
          });

          if (!saveRes.ok) {
            throw new Error("Failed to save workspace");
          }

          const { workspace } = await saveRes.json();
          
          setStatus("complete");
          setStatusMessage("Workspace created! Redirecting...");
          
          setTimeout(() => {
            router.push(`/workspaces/${workspace.id}`);
          }, 1000);
          return;
        }

        attempts++;
      }

      throw new Error("Generation timed out");
    } catch (error) {
      console.error("Creation error:", error);
      setStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Unknown error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">
              3D
            </div>
            <span className="text-xl font-bold">TrainSpace</span>
          </Link>
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Create New Workspace</h1>
        <p className="text-gray-400 mb-8">Generate a 3D environment for your training tutorials</p>

        <div className="space-y-6">
          {/* Workspace Name */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Workspace Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
              placeholder="e.g., Warehouse Safety Training"
            />
          </div>

          {/* Creation Mode Toggle */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Creation Method
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCreationMode("generate")}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                  creationMode === "generate"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                Generate from Images
              </button>
              <button
                type="button"
                onClick={() => setCreationMode("model-id")}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                  creationMode === "model-id"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                Use Existing Model ID
              </button>
            </div>
          </div>

          {creationMode === "model-id" ? (
            /* Model ID Input */
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Model ID *
              </label>
              <input
                type="text"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500 font-mono"
                placeholder="e.g., abc123-def456-ghi789"
              />
              <p className="text-xs text-gray-500 mt-2">
                Enter the UUID of an existing 3D model from the external API
              </p>
            </div>
          ) : (
            /* Image Upload Section */
            <>
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Reference Images *
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-gray-600 transition-colors"
                >
                  <svg className="w-10 h-10 mx-auto mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-400">Click to upload images</p>
                  <p className="text-xs text-gray-500 mt-1">Up to 8 images, max 10MB each</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-4 gap-3 mt-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Prompt */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Description / Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500 resize-none"
                  placeholder="Describe the environment you want to create..."
                />
              </div>

              {/* Draft Mode Toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setUseDraft(!useDraft)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    useDraft ? "bg-blue-600" : "bg-gray-700"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      useDraft ? "left-7" : "left-1"
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-300">
                  Draft mode (faster, lower quality)
                </span>
              </div>
            </>
          )}

          {/* Status Message */}
          {statusMessage && (
            <div className={`p-4 rounded-lg ${
              status === "error" 
                ? "bg-red-900/50 border border-red-500 text-red-200" 
                : status === "complete"
                ? "bg-green-900/50 border border-green-500 text-green-200"
                : "bg-blue-900/50 border border-blue-500 text-blue-200"
            }`}>
              {statusMessage}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleCreate}
            disabled={status === "generating" || status === "uploading"}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            {status === "uploading" 
              ? "Uploading..." 
              : status === "generating" 
              ? "Generating 3D Model..." 
              : "Create Workspace"}
          </button>
        </div>
      </main>
    </div>
  );
}
