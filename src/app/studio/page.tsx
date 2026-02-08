"use client";

import { useState, useEffect, useRef } from "react";
import SplatViewer from "@/components/SplatViewer";

interface WorldAssets {
  splats: {
    spz_urls: {
      "100k": string;
      "500k": string;
      full_res: string;
    };
  };
  thumbnail_url: string;
  caption: string;
}

interface World {
  id: string;
  display_name: string;
  assets: WorldAssets;
  world_marble_url: string;
}

type GenerationStatus = "idle" | "generating" | "uploading" | "loading" | "complete" | "error";

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [worldIdInput, setWorldIdInput] = useState("");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [world, setWorld] = useState<World | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [useDraft, setUseDraft] = useState(true);
  
  // Image upload state - now supports multiple images
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("wlt_api_key");
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  // Save API key to localStorage when it changes
  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    if (value) {
      localStorage.setItem("wlt_api_key", value);
    } else {
      localStorage.removeItem("wlt_api_key");
    }
  };

  // Handle image selection - supports multiple
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate total count (max 8 images)
    if (selectedImages.length + files.length > 8) {
      setStatus("error");
      setStatusMessage("Maximum 8 images allowed");
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setStatus("error");
        setStatusMessage(`${file.name} is not an image file`);
        continue;
      }
      
      // Validate file size (max 10MB each)
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

  const clearAllImages = () => {
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setSelectedImages([]);
    setImagePreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Upload image and get media asset ID
  const uploadImage = async (file: File, index: number, total: number): Promise<string> => {
    // Get file extension
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    
    // Step 1: Prepare upload
    setStatusMessage(`Preparing upload (${index + 1}/${total})...`);
    const prepareRes = await fetch("/api/upload/prepare", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey.trim(),
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
    
    // Step 2: Upload file to signed URL
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

  const loadExistingWorld = async (worldId: string) => {
    if (!worldId.trim()) return;
    if (!apiKey.trim()) {
      setStatus("error");
      setStatusMessage("Please enter your World Labs API key");
      return;
    }

    setStatus("loading");
    setStatusMessage("Loading world...");

    try {
      const res = await fetch(`/api/world/${worldId.trim()}`, {
        headers: { "x-api-key": apiKey.trim() },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to load world");
      }

      const data = await res.json();
      setWorld(data.world);
      setStatus("complete");
      setStatusMessage("World loaded successfully!");
      setShowViewer(true);
    } catch (error) {
      console.error("Load world error:", error);
      setStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Failed to load world");
    }
  };

  const generateWorld = async (mediaAssetIds?: string[]) => {
    if ((!mediaAssetIds || mediaAssetIds.length === 0) && !prompt.trim()) return;
    if (!apiKey.trim()) {
      setStatus("error");
      setStatusMessage("Please enter your World Labs API key");
      return;
    }

    setStatus("generating");
    setStatusMessage("Starting generation...");
    setWorld(null);

    try {
      // Start generation
      const generateRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: prompt.trim(), 
          draft: useDraft, 
          apiKey: apiKey.trim(),
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
      const maxAttempts = 120; // 10 minutes max (5s intervals)

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const statusRes = await fetch(`/api/status/${operationId}`, {
          headers: { "x-api-key": apiKey.trim() },
        });
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
          setWorld(statusData.world);
          setStatus("complete");
          setStatusMessage("World generated successfully!");
          setShowViewer(true);
          return;
        }

        attempts++;
      }

      throw new Error("Generation timed out");
    } catch (error) {
      console.error("Generation error:", error);
      setStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Unknown error");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && status !== "generating" && status !== "uploading") {
      e.preventDefault();
      handleGenerate();
    }
  };

  // Handle generation (with or without image)
  const handleGenerate = async () => {
    if (!apiKey.trim()) {
      setStatus("error");
      setStatusMessage("Please enter your World Labs API key");
      return;
    }

    if (selectedImages.length === 0 && !prompt.trim()) {
      setStatus("error");
      setStatusMessage("Please enter a prompt or upload at least one image");
      return;
    }

    try {
      let mediaAssetIds: string[] = [];

      // If images are selected, upload them first
      if (selectedImages.length > 0) {
        setStatus("uploading");
        for (let i = 0; i < selectedImages.length; i++) {
          const id = await uploadImage(selectedImages[i], i, selectedImages.length);
          mediaAssetIds.push(id);
        }
      }

      // Generate world
      await generateWorld(mediaAssetIds.length > 0 ? mediaAssetIds : undefined);
      
      // Clear images after successful generation
      clearAllImages();
    } catch (error) {
      console.error("Generation error:", error);
      setStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Unknown error");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🌍 World Labs 3D Generator
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Enter a text prompt or upload an image to generate an immersive 3D scene using World Labs AI.
            The scene will be rendered directly in your browser using Gaussian Splatting.
          </p>
        </div>

        {/* Input Section */}
        <div className="max-w-2xl mx-auto">
          {/* API Key Section */}
          <div className="bg-gray-800/50 backdrop-blur rounded-none p-6 shadow-xl border border-gray-700 mb-6">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="api-key" className="block text-sm font-medium text-gray-300">
                World Labs API Key
              </label>
              <a
                href="https://platform.worldlabs.ai/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-400 hover:text-amber-300"
              >
                Get your API key →
              </a>
            </div>
            <div className="relative">
              <input
                id="api-key"
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="Enter your WLT API key..."
                className="w-full px-4 py-3 pr-20 bg-gray-900/50 border border-gray-600 rounded-none text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono text-sm"
                disabled={status === "generating"}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 text-sm"
              >
                {showApiKey ? "Hide" : "Show"}
              </button>
            </div>
            {apiKey && (
              <p className="text-xs text-green-400 mt-2">✓ API key saved to browser storage</p>
            )}
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-none p-6 shadow-xl border border-gray-700">
            <div className="space-y-4">
              <div>
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">
                  Describe your scene
                </label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={selectedImages.length > 0 ? "Optional: Add a description to guide the generation..." : "A mystical forest with glowing mushrooms and fireflies at twilight..."}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-none text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                  rows={3}
                  disabled={status === "generating" || status === "uploading"}
                />
              </div>

              {/* Image Upload Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Or upload images <span className="text-gray-500">(up to 8)</span>
                  </label>
                  {selectedImages.length > 0 && (
                    <button
                      onClick={clearAllImages}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                
                {/* Image Grid */}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative aspect-square rounded-none overflow-hidden group">
                        <img
                          src={preview}
                          alt={`Selected ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-600 rounded-none text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-1 py-0.5 truncate">
                          {selectedImages[index]?.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                {selectedImages.length < 8 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-600 rounded-none p-4 text-center cursor-pointer hover:border-gray-500 hover:bg-gray-800/30 transition-colors"
                  >
                    <svg className="w-8 h-8 mx-auto text-gray-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <p className="text-gray-400 text-sm">
                      {selectedImages.length === 0 ? "Click to upload images" : "Add more images"}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      {selectedImages.length}/8 images • PNG, JPG, WEBP up to 10MB each
                    </p>
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                
                {selectedImages.length > 1 && (
                  <p className="text-xs text-amber-400 mt-2">
                    💡 Multiple images will be combined into a 360° world
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={useDraft}
                    onChange={(e) => setUseDraft(e.target.checked)}
                    className="w-4 h-4 rounded-none border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500"
                    disabled={status === "generating" || status === "uploading"}
                  />
                  <span className="text-sm">
                    Draft mode <span className="text-gray-500">(faster, ~30-45s)</span>
                  </span>
                </label>

                <button
                  onClick={handleGenerate}
                  disabled={(!prompt.trim() && selectedImages.length === 0) || !apiKey.trim() || status === "generating" || status === "uploading"}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-none transition-colors flex items-center space-x-2"
                >
                  {status === "uploading" ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>Uploading...</span>
                    </>
                  ) : status === "generating" ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <span>Generate World</span>
                      <span>✨</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Status Message */}
            {statusMessage && (
              <div
                className={`mt-4 p-3 rounded-none ${
                  status === "error"
                    ? "bg-red-900/50 text-red-300"
                    : status === "complete"
                    ? "bg-green-900/50 text-green-300"
                    : "bg-amber-900/30 text-amber-300"
                }`}
              >
                {statusMessage}
              </div>
            )}
          </div>

          {/* Generated World Card */}
          {world && !showViewer && (
            <div className="mt-8 bg-gray-800/50 backdrop-blur rounded-none overflow-hidden shadow-xl border border-gray-700">
              <div className="relative">
                <img
                  src={world.assets.thumbnail_url}
                  alt={world.display_name || "Generated world"}
                  className="w-full h-64 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-white text-xl font-semibold">
                    {world.display_name || "Your Generated World"}
                  </h3>
                  <p className="text-gray-300 text-sm mt-1 line-clamp-2">
                    {world.assets.caption}
                  </p>
                </div>
              </div>
              <div className="p-4 flex flex-wrap gap-3">
                <button
                  onClick={() => setShowViewer(true)}
                  className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-none transition-colors"
                >
                  View in 3D
                </button>
                <a
                  href={`/tutorials/new?worldId=${world.id}`}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-none transition-colors text-center"
                >
                  Create Tutorial
                </a>
                <a
                  href={world.world_marble_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-none transition-colors"
                >
                  Open in Marble ↗
                </a>
              </div>
            </div>
          )}

          {/* Example Prompts */}
          <div className="mt-8">
            <h3 className="text-gray-400 text-sm font-medium mb-3">Try these prompts:</h3>
            <div className="flex flex-wrap gap-2">
              {[
                "A cozy cabin in a snowy mountain forest",
                "An underwater coral reef with tropical fish",
                "A futuristic cyberpunk city street at night",
                "A peaceful Japanese zen garden with cherry blossoms",
                "An ancient temple ruins in a jungle",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setPrompt(example)}
                  disabled={status === "generating" || status === "loading" || status === "uploading"}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 text-sm rounded-none transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Load Existing World */}
          <div className="mt-8 bg-gray-800/30 rounded-none p-4 border border-gray-700/50">
            <h3 className="text-gray-400 text-sm font-medium mb-3">Or load an existing world:</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={worldIdInput}
                onChange={(e) => setWorldIdInput(e.target.value)}
                placeholder="World ID (e.g., cd34826d-72bf-493a-8f31-52b816a5566d)"
                className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-none text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                disabled={status === "generating" || status === "loading" || status === "uploading"}
              />
              <button
                onClick={() => loadExistingWorld(worldIdInput)}
                disabled={!worldIdInput.trim() || !apiKey.trim() || status === "generating" || status === "loading" || status === "uploading"}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white text-sm rounded-none transition-colors"
              >
                Load
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Viewer Modal */}
      {showViewer && (
        <SplatViewer world={world} onClose={() => setShowViewer(false)} />
      )}
    </main>
  );
}
