"use client";

import { useEffect, useRef, useState } from "react";

// Helper to get API Key from localStorage
const getApiKey = () => {
    if (typeof window !== "undefined") {
        return localStorage.getItem("apiKey");
    }
    return null;
};

export default function Visualization({ config }) {
    const canvasRef = useRef(null);
    const [showImage, setShowImage] = useState(true);
    const [showObjects, setShowObjects] = useState(true);
    const [showColors, setShowColors] = useState(true);
    const [imageSrc, setImageSrc] = useState("");
    const [scale, setScale] = useState(1);
    const [stats, setStats] = useState(null);
    const [viewMode, setViewMode] = useState("mapped");
    const containerRef = useRef(null);

    const floorWidth = config?.projection?.floor?.[2] || 800;
    const floorHeight = config?.projection?.floor?.[3] || 600;

    // Handle Resize
    useEffect(() => {
        if (!containerRef.current || !floorWidth || !floorHeight) return;

        const updateScale = () => {
            const container = containerRef.current;
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            const margin = 40; // 20px on each side

            const availableWidth = containerWidth - margin;
            const availableHeight = containerHeight - margin;

            const scaleX = availableWidth / floorWidth;
            const scaleY = availableHeight / floorHeight;

            setScale(Math.min(scaleX, scaleY));
        };

        const observer = new ResizeObserver(updateScale);
        observer.observe(containerRef.current);
        updateScale(); // Initial calculation

        return () => observer.disconnect();
    }, [floorWidth, floorHeight]);

    // Image Refresh Loop with Authentication
    useEffect(() => {
        if (!showImage) {
            setImageSrc(""); // Clear image if toggled off
            return;
        }

        let isMounted = true;
        let timeoutId;
        let currentObjectUrl = null;

        const loadNextImage = async () => {
            if (!isMounted) return;

            const apiKey = getApiKey();
            if (!apiKey) {
                console.error("API Key not found for visualization.");
                timeoutId = setTimeout(loadNextImage, 1000); // Retry
                return;
            }

            const endpoint =
                viewMode === "mapped"
                    ? "/api/visualization/live_mapped"
                    : "/api/visualization/live";

            try {
                const response = await fetch(endpoint, {
                    headers: { "X-API-Key": apiKey },
                });

                if (!isMounted) return;

                if (response.ok) {
                    const blob = await response.blob();
                    const nextObjectUrl = URL.createObjectURL(blob);

                    if (currentObjectUrl) {
                        URL.revokeObjectURL(currentObjectUrl);
                    }
                    currentObjectUrl = nextObjectUrl;
                    setImageSrc(nextObjectUrl);
                } else {
                    console.error(
                        "Failed to fetch live visualization image:",
                        response.status,
                    );
                }
            } catch (error) {
                if (isMounted)
                    console.error("Error fetching live image:", error);
            } finally {
                if (isMounted) {
                    timeoutId = setTimeout(loadNextImage, 200);
                }
            }
        };

        loadNextImage();

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            if (currentObjectUrl) {
                URL.revokeObjectURL(currentObjectUrl);
            }
        };
    }, [showImage, viewMode]);

    // Canvas Render Loop
    useEffect(() => {
        if (!config) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        let animationFrameId;
        let isRunning = true;

        const render = async () => {
            const apiKey = getApiKey();
            const headers = apiKey ? { "X-API-Key": apiKey } : {};

            try {
                const [ledsRes, objectsRes, fpsRes] = await Promise.all([
                    fetch("/api/data/leds", { headers }),
                    fetch("/api/data/objects", { headers }),
                    fetch("/api/data/fps", { headers }),
                ]);

                if (!isRunning) return;

                if (
                    [ledsRes, objectsRes, fpsRes].some(
                        (res) => res.status === 403,
                    )
                ) {
                    console.error(
                        "Authentication failed for visualization data.",
                    );
                    return; // Stop rendering
                }

                const leds = showColors ? await ledsRes.json() : {};
                const objects = showObjects ? await objectsRes.json() : [];
                const fpsData = await fpsRes.json();

                setStats(fpsData);
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (viewMode === "raw") {
                    if (isRunning) {
                        animationFrameId = requestAnimationFrame(render);
                    }
                    return;
                }

                ctx.lineWidth = 4;
                config.strips.forEach((strip) => {
                    ctx.strokeStyle = "#333";
                    ctx.beginPath();
                    ctx.moveTo(strip.start[0], strip.start[1]);
                    ctx.lineTo(strip.end[0], strip.end[1]);
                    ctx.stroke();

                    const dx =
                        (strip.end[0] - strip.start[0]) / (strip.len - 1);
                    const dy =
                        (strip.end[1] - strip.start[1]) / (strip.len - 1);

                    for (let i = 0; i < strip.len; i++) {
                        const x = strip.start[0] + dx * i;
                        const y = strip.start[1] + dy * i;
                        const ledIndex = strip.index + i;
                        const color = leds[ledIndex];

                        if (color) {
                            const r = Math.min(
                                255,
                                color.r + color.cw + color.ww,
                            );
                            const g = Math.min(
                                255,
                                color.g + color.cw + color.ww,
                            );
                            const b = Math.min(
                                255,
                                color.b + color.cw + color.ww,
                            );
                            ctx.fillStyle = `rgb(${r},${g},${b})`;
                        } else {
                            ctx.fillStyle = "#111";
                        }

                        ctx.beginPath();
                        ctx.arc(x, y, 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                });

                ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
                objects.forEach((obj) => {
                    ctx.beginPath();
                    ctx.arc(obj.x, obj.y, 10, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = "white";
                    ctx.lineWidth = 2;
                    ctx.stroke();
                });
            } catch (e) {
                if (isRunning) console.error("Viz Error:", e);
            }

            if (isRunning) {
                animationFrameId = requestAnimationFrame(render);
            }
        };

        render();

        return () => {
            isRunning = false;
            cancelAnimationFrame(animationFrameId);
        };
    }, [config, showColors, showObjects, viewMode]);

    return (
        <div className="h-full flex flex-col">
            <div
                ref={containerRef}
                className="flex-1 relative bg-gray-900 border border-gray-800 overflow-hidden flex items-center justify-center"
            >
                {stats && (
                    <div className="absolute top-4 left-4 z-20 bg-black/50 text-teal-400 p-2 rounded text-xs font-mono">
                        <div>RPS: {stats.fps}</div>
                        <div>UPS: {stats.ups}</div>
                        <div className="text-gray-400 mt-1">MSPR (ms)</div>
                        <div>Min: {stats.tpf_min}</div>
                        <div>Avg: {stats.tpf_avg}</div>
                        <div>Max: {stats.tpf_max}</div>
                    </div>
                )}
                <div
                    className="relative border border-gray-800 bg-gray-900 shadow-2xl origin-center"
                    style={
                        viewMode === "mapped"
                            ? {
                                  width: floorWidth,
                                  height: floorHeight,
                                  transform: `scale(${scale})`,
                              }
                            : {
                                  width: "100%",
                                  height: "100%",
                                  transform: "none",
                              }
                    }
                >
                    {showImage && imageSrc && (
                        <img
                            src={imageSrc}
                            className={`absolute top-0 left-0 w-full h-full ${
                                viewMode === "raw"
                                    ? "object-contain opacity-100"
                                    : "object-cover opacity-60"
                            }`}
                            alt="Live View"
                        />
                    )}
                    <canvas
                        ref={canvasRef}
                        width={floorWidth}
                        height={floorHeight}
                        className={`absolute top-0 left-0 w-full h-full z-10 ${
                            viewMode === "raw" ? "hidden" : ""
                        }`}
                    />
                </div>
            </div>

            <div className="bg-gray-800 p-4 border-t border-gray-700 flex justify-center gap-4">
                <select
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value)}
                    className="bg-gray-700 text-white rounded px-1 py-1 outline-none text-sm border border-gray-600 focus:border-teal-500"
                >
                    <option value="mapped">Mapped</option>
                    <option value="raw">Raw</option>
                </select>
                <div className="w-px h-6 bg-gray-600 mx-2"></div>
                <Label
                    checked={showImage}
                    onChange={setShowImage}
                    label="Live"
                />
                <Label
                    checked={showObjects}
                    onChange={setShowObjects}
                    label="People"
                />
                <Label
                    checked={showColors}
                    onChange={setShowColors}
                    label="Colors"
                />
            </div>
        </div>
    );
}

function Label({ checked, onChange, label }) {
    return (
        <label className="flex items-center space-x-2 cursor-pointer select-none group">
            <div
                className={`w-5 h-5 rounded border border-gray-600 flex items-center justify-center transition-colors ${checked ? "bg-teal-600 border-teal-600" : "bg-gray-700 group-hover:border-gray-500"}`}
            >
                {checked && (
                    <svg
                        className="w-3 h-3 text-white fill-current"
                        viewBox="0 0 20 20"
                    >
                        <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                    </svg>
                )}
            </div>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="hidden"
            />
            <span className="text-gray-300 group-hover:text-white transition-colors">
                {label}
            </span>
        </label>
    );
}
