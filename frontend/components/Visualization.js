"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Camera, Users } from "lucide-react";

const getApiKey = () => {
    if (typeof window !== "undefined") {
        return localStorage.getItem("apiKey");
    }
    return null;
};

export default function Visualization({ config }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const mousePosRef = useRef({ x: -1000, y: -1000 });

    // Data Storage Refs (to avoid React re-renders during high-freq logic)
    const ledsRef = useRef({});
    const objectsRef = useRef([]);
    const statsRef = useRef(null);
    const hoveredIndexRef = useRef(null);

    // State for UI triggers
    const [uiStats, setUiStats] = useState(null);
    const [hoveredStripIndex, setHoveredStripIndex] = useState(null);
    const hasFetchedOnceRef = useRef(false);
    const lastObjectURLRef = useRef(null);
    const [imageSrc, setImageSrc] = useState("");
    const [imageDims, setImageDims] = useState({ width: 0, height: 0 });
    const [scale, setScale] = useState(1);
    const [viewMode, setViewMode] = useState("mapped");
    const [showImage, setShowImage] = useState(false);
    const [showObjects, setShowObjects] = useState(true);
    const [homography, setHomography] = useState(null);

    const floorWidth = config?.projection?.floor?.[2] || 800;
    const floorHeight = config?.projection?.floor?.[3] || 600;

    // Fetch Homography once
    useEffect(() => {
        const fetchHomography = async () => {
            const apiKey = getApiKey();
            try {
                const res = await fetch("/api/visualization/homography", {
                    headers: apiKey ? { "X-API-Key": apiKey } : {},
                });
                if (res.ok) {
                    const data = await res.json();
                    setHomography(data.matrix);
                }
            } catch (e) {
                console.error("Failed to fetch homography", e);
            }
        };
        fetchHomography();
    }, []);

    // Handle Resize
    useEffect(() => {
        if (!containerRef.current || !floorWidth || !floorHeight) return;
        const updateScale = () => {
            const margin = 40;
            const sX = (containerRef.current.clientWidth - margin) / floorWidth;
            const sY =
                (containerRef.current.clientHeight - margin) / floorHeight;
            setScale(Math.min(sX, sY));
        };
        const obs = new ResizeObserver(updateScale);
        obs.observe(containerRef.current);
        updateScale();
        return () => obs.disconnect();
    }, [floorWidth, floorHeight]);

    // Fast Data Fetching Loop (Independent of UI state)
    useEffect(() => {
        let active = true;
        const fetchData = async () => {
            const apiKey = getApiKey();
            const headers = apiKey ? { "X-API-Key": apiKey } : {};
            try {
                const [lR, oR, fR] = await Promise.all([
                    fetch("/api/data/leds", { headers }),
                    fetch("/api/data/objects", { headers }),
                    fetch("/api/data/fps", { headers }),
                ]);
                if (!active) return;
                ledsRef.current = await lR.json();
                objectsRef.current = await oR.json();
                const s = await fR.json();
                statsRef.current = s;
                setUiStats(s); // Only update state for stats occasionally or on change
            } catch (e) {}
            if (active) setTimeout(fetchData, 50);
        };
        fetchData();
        return () => {
            active = false;
        };
    }, []);

    // Image Stream
    useEffect(() => {
        let active = true;
        let timeoutId;
        let isFetching = false;
        hasFetchedOnceRef.current = false;

        const loadNext = async () => {
            if (!active) return;
            if (isFetching) {
                timeoutId = setTimeout(loadNext, 200);
                return;
            }
            if (!showImage && hasFetchedOnceRef.current) {
                timeoutId = setTimeout(loadNext, 1000);
                return;
            }
            const apiKey = getApiKey();
            const url =
                viewMode === "mapped"
                    ? "/api/visualization/live_mapped"
                    : "/api/visualization/live";
            try {
                isFetching = true;
                const res = await fetch(url, {
                    headers: apiKey ? { "X-API-Key": apiKey } : {},
                });
                if (res.ok && active) {
                    const blob = await res.blob();
                    const nextUrl = URL.createObjectURL(blob);
                    await new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => {
                            if (active) {
                                setImageDims({
                                    width: img.naturalWidth,
                                    height: img.naturalHeight,
                                });
                                if (lastObjectURLRef.current)
                                    URL.revokeObjectURL(
                                        lastObjectURLRef.current,
                                    );
                                lastObjectURLRef.current = nextUrl;
                                setImageSrc(nextUrl);
                                hasFetchedOnceRef.current = true;
                            } else {
                                URL.revokeObjectURL(nextUrl);
                            }
                            resolve();
                        };
                        img.onerror = resolve;
                        img.src = nextUrl;
                    });
                }
            } catch (e) {
            } finally {
                isFetching = false;
            }
            if (active) timeoutId = setTimeout(loadNext, 200);
        };
        loadNext();
        return () => {
            active = false;
            clearTimeout(timeoutId);
        };
    }, [showImage, viewMode]);

    useEffect(() => {
        return () => {
            if (lastObjectURLRef.current)
                URL.revokeObjectURL(lastObjectURLRef.current);
        };
    }, []);

    const invH = useMemo(() => {
        if (!homography) return null;
        const m = homography;
        const det =
            m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
            m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
            m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
        if (Math.abs(det) < 1e-10) return null;
        const id = 1.0 / det;
        const res = [
            [
                (m[1][1] * m[2][2] - m[1][2] * m[2][1]) * id,
                (m[0][2] * m[2][1] - m[0][1] * m[2][2]) * id,
                (m[0][1] * m[1][2] - m[0][2] * m[1][1]) * id,
            ],
            [
                (m[1][2] * m[2][0] - m[1][0] * m[2][2]) * id,
                (m[0][0] * m[2][2] - m[0][2] * m[2][0]) * id,
                (m[0][2] * m[1][0] - m[0][0] * m[1][2]) * id,
            ],
            [
                (m[1][0] * m[2][1] - m[1][1] * m[2][0]) * id,
                (m[0][1] * m[2][0] - m[0][0] * m[2][1]) * id,
                (m[0][0] * m[1][1] - m[0][1] * m[1][0]) * id,
            ],
        ];
        const norm = res[2][2];
        return res.map((row) => row.map((v) => v / norm));
    }, [homography]);

    const project = (fx, fy, matrix) => {
        if (!matrix) return [fx, fy];
        const w = matrix[2][0] * fx + matrix[2][1] * fy + matrix[2][2];
        return [
            (matrix[0][0] * fx + matrix[0][1] * fy + matrix[0][2]) / w,
            (matrix[1][0] * fx + matrix[1][1] * fy + matrix[1][2]) / w,
        ];
    };

    // Render loop (Runs at 60fps)
    useEffect(() => {
        if (!config) return;
        const ctx = canvasRef.current.getContext("2d");
        let frameId;

        const render = () => {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            // 1. Hover Logic in Floor Space
            let mx = -1000,
                my = -1000;
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const rx = mousePosRef.current.x;
                const ry = mousePosRef.current.y;
                if (viewMode === "mapped") {
                    const midX = containerRef.current.clientWidth / 2;
                    const midY = containerRef.current.clientHeight / 2;
                    mx = (rx - midX) / scale + floorWidth / 2;
                    my = (ry - midY) / scale + floorHeight / 2;
                } else if (imageDims.width > 0 && homography) {
                    const cW = containerRef.current.clientWidth;
                    const cH = containerRef.current.clientHeight;
                    const cA = cW / cH;
                    const iA = imageDims.width / imageDims.height;
                    let rw, rh, ox, oy;
                    if (cA > iA) {
                        rh = cH;
                        rw = rh * iA;
                        ox = (cW - rw) / 2;
                        oy = 0;
                    } else {
                        rw = cW;
                        rh = rw / iA;
                        ox = 0;
                        oy = (cH - rh) / 2;
                    }
                    const imgX = ((rx - ox) / rw) * imageDims.width;
                    const imgY = ((ry - oy) / rh) * imageDims.height;
                    const floorPt = project(imgX, imgY, homography);
                    mx = floorPt[0];
                    my = floorHeight - floorPt[1];
                }
            }

            let bestDist = 100; // Hover sensitivity
            let topHover = null;

            const getC = (fx, fy) =>
                viewMode === "raw" && invH
                    ? project(fx, floorHeight - fy, invH)
                    : [fx, fy];

            config.strips.forEach((strip, idx) => {
                const [x1, y1] = getC(strip.start[0], strip.start[1]);
                const [x2, y2] = getC(strip.end[0], strip.end[1]);

                // Hover check
                const sx = strip.start[0],
                    sy = strip.start[1],
                    ex = strip.end[0],
                    ey = strip.end[1];
                const l2 = (sx - ex) ** 2 + (sy - ey) ** 2;
                let t =
                    l2 === 0
                        ? 0
                        : ((mx - sx) * (ex - sx) + (my - sy) * (ey - sy)) / l2;
                t = Math.max(0, Math.min(1, t));
                const d2 =
                    (mx - (sx + t * (ex - sx))) ** 2 +
                    (my - (sy + t * (ey - sy))) ** 2;
                if (d2 < bestDist) {
                    bestDist = d2;
                    topHover = idx;
                }

                const isH = hoveredStripIndex === idx;
                const grad = ctx.createLinearGradient(x1, y1, x2, y2);
                for (let i = 0; i < strip.len; i++) {
                    const c = ledsRef.current[strip.index + i];
                    const stop = i / (strip.len - 1 || 1);
                    if (c) {
                        const r = Math.min(255, c.r + c.cw + c.ww);
                        const g = Math.min(255, c.g + c.cw + c.ww);
                        const b = Math.min(255, c.b + c.cw + c.ww);
                        grad.addColorStop(stop, `rgb(${r},${g},${b})`);
                    } else grad.addColorStop(stop, "#111");
                }

                let w = 4;
                if (viewMode === "raw" && invH) {
                    const z =
                        invH[2][0] * ((strip.start[0] + strip.end[0]) / 2) +
                        invH[2][1] *
                            (floorHeight -
                                (strip.start[1] + strip.end[1]) / 2) +
                        invH[2][2];
                    w = Math.max(1, Math.min(10, 2.5 / (z || 1)));
                }

                ctx.lineCap = "round";
                if (isH) {
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = "white";
                    ctx.strokeStyle = "rgba(255,255,255,0.9)";
                    ctx.lineWidth = w + 4;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                }
                ctx.strokeStyle = "rgba(0,0,0,0.5)";
                ctx.lineWidth = w + 1.5;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
                ctx.strokeStyle = grad;
                ctx.lineWidth = w;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            });

            if (showObjects) {
                ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
                objectsRef.current.forEach((obj) => {
                    const [ox, oy] = getC(obj.x, obj.y);
                    ctx.beginPath();
                    ctx.arc(ox, oy, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = "white";
                    ctx.lineWidth = 1;
                    ctx.stroke();
                });
            }

            if (topHover !== hoveredIndexRef.current) {
                hoveredIndexRef.current = topHover;
                setHoveredStripIndex(topHover);
            }
            frameId = requestAnimationFrame(render);
        };
        frameId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(frameId);
    }, [
        config,
        viewMode,
        scale,
        imageDims,
        homography,
        invH,
        showObjects,
        hoveredStripIndex,
    ]);

    return (
        <div className="h-full flex flex-col relative bg-gray-950">
            <div
                ref={containerRef}
                className="flex-1 relative overflow-hidden flex items-center justify-center cursor-default"
                onMouseMove={(e) => {
                    const rect = containerRef.current.getBoundingClientRect();
                    mousePosRef.current = {
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                    };
                }}
                onMouseLeave={() => {
                    mousePosRef.current = { x: -1000, y: -1000 };
                }}
            >
                {uiStats && (
                    <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur p-2 md:p-3 rounded-lg border border-white/10 text-[10px] font-mono text-teal-400 pointer-events-none select-none">
                        <div className="flex justify-between gap-4">
                            <span>RPS</span>
                            <span className="text-white">{uiStats.fps}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span>UPS</span>
                            <span className="text-white">{uiStats.ups}</span>
                        </div>
                    </div>
                )}

                <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 z-20 flex flex-col gap-1 select-none pointer-events-none md:pointer-events-auto max-h-[50%] overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {config.strips.map((s, i) => (
                        <div
                            key={i}
                            onMouseEnter={() => setHoveredStripIndex(i)}
                            onMouseLeave={() => setHoveredStripIndex(null)}
                            className={`px-2 py-1 md:px-3 md:py-1.5 rounded-lg transition-all flex items-center gap-2 md:gap-3 border pointer-events-auto ${hoveredStripIndex === i ? "bg-teal-500/20 border-teal-500/50 shadow-lg scale-105" : "bg-black/20 border-transparent"}`}
                        >
                            <div
                                className={`w-1.5 h-1.5 rounded-full transition-all ${hoveredStripIndex === i ? "bg-white shadow-[0_0_8px_white]" : "bg-teal-600"}`}
                            />
                            <span
                                className={`text-[11px] transition-colors ${hoveredStripIndex === i ? "text-white font-bold" : "text-gray-400"}`}
                            >
                                Strip {i + 1}
                            </span>
                            {hoveredStripIndex === i && (
                                <span className="text-[10px] text-teal-300 font-mono ml-2 opacity-100 animate-in fade-in zoom-in duration-200">
                                    idx {s.index} • len {s.len}
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                <div
                    className="relative shadow-2xl transition-all duration-500"
                    style={
                        viewMode === "mapped"
                            ? {
                                  width: floorWidth,
                                  height: floorHeight,
                                  transform: `scale(${scale})`,
                                  border: "1px solid rgba(255,255,255,0.05)",
                              }
                            : { width: "100%", height: "100%" }
                    }
                >
                    {imageSrc && (
                        <img
                            src={imageSrc}
                            className={`absolute inset-0 w-full h-full transition-opacity duration-700 ${
                                viewMode === "raw"
                                    ? showImage
                                        ? "opacity-100"
                                        : "opacity-40"
                                    : "opacity-30"
                            } ${viewMode === "raw" ? "object-contain" : "object-cover"}`}
                        />
                    )}
                    <canvas
                        ref={canvasRef}
                        width={
                            viewMode === "raw"
                                ? imageDims.width || 1280
                                : floorWidth
                        }
                        height={
                            viewMode === "raw"
                                ? imageDims.height || 720
                                : floorHeight
                        }
                        className={`absolute inset-0 w-full h-full z-10 pointer-events-none ${viewMode === "raw" ? "object-contain" : ""}`}
                    />
                </div>
            </div>

            <div className="h-20 bg-gray-900 border-t border-white/5 flex items-center justify-center gap-4 md:gap-8 px-6 md:px-8">
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                    {["mapped", "raw"].map((m) => (
                        <button
                            key={m}
                            onClick={() => setViewMode(m)}
                            className={`px-6 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === m ? "bg-teal-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"}`}
                        >
                            {m.toUpperCase()}
                        </button>
                    ))}
                </div>
                <div className="w-px h-8 bg-white/5" />
                <div className="flex gap-4">
                    <ToggleButton
                        active={showImage}
                        onClick={() => setShowImage(!showImage)}
                        icon={<Camera size={20} />}
                        label="Live"
                    />
                    <ToggleButton
                        active={showObjects}
                        onClick={() => setShowObjects(!showObjects)}
                        icon={<Users size={20} />}
                        label="People"
                    />
                </div>
            </div>
        </div>
    );
}

function ToggleButton({ active, onClick, icon, label }) {
    return (
        <button
            onClick={onClick}
            title={label}
            className={`px-4 py-2 rounded-xl border transition-all flex items-center justify-center ${active ? "bg-teal-900/30 border-teal-500 text-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.1)]" : "bg-black/20 border-white/5 text-gray-500 hover:border-white/10"}`}
        >
            {icon}
        </button>
    );
}
