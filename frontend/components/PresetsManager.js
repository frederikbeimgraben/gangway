"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import AnimationEditor from "./AnimationEditor";

const PlayIcon = ({ className }) => (
    <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
        />
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
    </svg>
);

const EditIcon = ({ className }) => (
    <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
    </svg>
);

const TrashIcon = ({ className }) => (
    <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
    </svg>
);

const PlusIcon = ({ className }) => (
    <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
        />
    </svg>
);

const RenameIcon = ({ className }) => (
    <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="m 12.257897,4.6074221 h 7.435547 -3.71875 V 19.392578 h -3.716797 7.435547 m -5.742188,-2.543034 -7.5197,-1e-6 c -1.350375,0 -2.4375,-1.087125 -2.4375,-2.4375 V 9.5330171 c 0,-1.3503748 1.087125,-2.4374997 2.4375,-2.4374997 l 7.5197,4e-7 m 3.985932,0.054938 c 1.174171,0.1767189 2.068756,1.1850629 2.068756,2.4100327 v 4.8790225 c 0,1.22497 -0.894585,2.233314 -2.068756,2.410033"
        />
    </svg>
);

export default function PresetsManager({
    presets = [],
    animations = [],
    onPresetsChanged,
    onPresetLoaded,
    showSnackbar,
    fullConfig = null,
}) {
    const [newPresetName, setNewPresetName] = useState("");
    const [loading, setLoading] = useState(false);
    const [editingPresetName, setEditingPresetName] = useState(null);
    const [editingConfig, setEditingConfig] = useState(null);
    const [renamingPresetName, setRenamingPresetName] = useState(null);
    const [newRenamedName, setNewRenamedName] = useState("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && (editingPresetName || renamingPresetName)) {
            document.body.style.overflow = "hidden";
        } else if (mounted) {
            document.body.style.overflow = "";
        }
        return () => {
            if (typeof document !== "undefined")
                document.body.style.overflow = "";
        };
    }, [mounted, editingPresetName, renamingPresetName]);

    const getApiKey = () => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("apiKey");
        }
        return null;
    };

    const handleSavePreset = async () => {
        const name = newPresetName.trim();
        if (!name) return;

        setLoading(true);
        try {
            const apiKey = getApiKey();
            const res = await fetch(
                `/api/presets/${encodeURIComponent(name)}`,
                {
                    method: "POST",
                    headers: apiKey ? { "X-API-Key": apiKey } : {},
                },
            );

            if (res.ok) {
                setNewPresetName("");
                onPresetsChanged();
                showSnackbar("Preset saved successfully!", "success");
            } else {
                const err = await res.json();
                showSnackbar(`Error: ${err.detail || res.statusText}`, "error");
            }
        } catch (e) {
            showSnackbar(`Error saving preset: ${e.message}`, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleEditPreset = async (name) => {
        setLoading(true);
        try {
            const apiKey = getApiKey();
            const res = await fetch(
                `/api/presets/${encodeURIComponent(name)}`,
                {
                    headers: apiKey ? { "X-API-Key": apiKey } : {},
                },
            );
            if (res.ok) {
                const data = await res.json();
                setEditingConfig(data.animation);
                setEditingPresetName(name);
            } else {
                showSnackbar("Failed to load preset data", "error");
            }
        } catch (e) {
            showSnackbar(`Error fetching preset: ${e.message}`, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEditedPreset = async () => {
        if (!editingPresetName || !editingConfig) return;
        setLoading(true);
        try {
            const apiKey = getApiKey();
            const res = await fetch(
                `/api/presets/${encodeURIComponent(editingPresetName)}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(apiKey && { "X-API-Key": apiKey }),
                    },
                    body: JSON.stringify(editingConfig),
                },
            );

            if (res.ok) {
                setEditingPresetName(null);
                setEditingConfig(null);
                showSnackbar("Preset updated successfully!", "success");
                onPresetsChanged();
            } else {
                const err = await res.json();
                showSnackbar(
                    `Error updating preset: ${err.detail || res.statusText}`,
                    "error",
                );
            }
        } catch (e) {
            showSnackbar(`Error updating preset: ${e.message}`, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleLoadPreset = async (name) => {
        setLoading(true);
        try {
            const apiKey = getApiKey();
            const res = await fetch(
                `/api/presets/${encodeURIComponent(name)}/load`,
                {
                    method: "POST",
                    headers: apiKey ? { "X-API-Key": apiKey } : {},
                },
            );

            if (res.ok) {
                showSnackbar(`Preset "${name}" loaded!`, "success");
                onPresetLoaded();
            } else {
                const err = await res.json();
                showSnackbar(
                    `Error loading preset: ${err.detail || res.statusText}`,
                    "error",
                );
            }
        } catch (e) {
            showSnackbar(`Error loading preset: ${e.message}`, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePreset = async (name) => {
        if (!confirm(`Are you sure you want to delete preset "${name}"?`))
            return;

        setLoading(true);
        try {
            const apiKey = getApiKey();
            const res = await fetch(
                `/api/presets/${encodeURIComponent(name)}`,
                {
                    method: "DELETE",
                    headers: apiKey ? { "X-API-Key": apiKey } : {},
                },
            );

            if (res.ok) {
                showSnackbar("Preset deleted.", "success");
                onPresetsChanged();
            } else {
                const err = await res.json();
                showSnackbar(
                    `Error deleting preset: ${err.detail || res.statusText}`,
                    "error",
                );
            }
        } catch (e) {
            showSnackbar(`Error deleting preset: ${e.message}`, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleRenameClick = (name) => {
        setRenamingPresetName(name);
        setNewRenamedName(name);
    };

    const handlePerformRename = async () => {
        const cleanedNewName = newRenamedName.trim();
        if (!cleanedNewName || cleanedNewName === renamingPresetName) {
            setRenamingPresetName(null);
            return;
        }

        setLoading(true);
        try {
            const apiKey = getApiKey();
            const res = await fetch(
                `/api/presets/${encodeURIComponent(renamingPresetName)}/rename?new_name=${encodeURIComponent(cleanedNewName)}`,
                {
                    method: "POST",
                    headers: apiKey ? { "X-API-Key": apiKey } : {},
                },
            );

            if (res.ok) {
                setRenamingPresetName(null);
                onPresetsChanged();
                showSnackbar("Preset renamed.", "success");
            } else {
                const err = await res.json();
                showSnackbar(
                    `Error renaming preset: ${err.detail || res.statusText}`,
                    "error",
                );
            }
        } catch (e) {
            showSnackbar(`Error renaming preset: ${e.message}`, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-white/5 shadow-xl">
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="New preset name..."
                    className="flex-1 px-4 py-2.5 bg-black/30 border border-white/5 rounded-xl focus:outline-none focus:border-teal-500/50 text-white placeholder-gray-600 transition-all hover:bg-black/50 shadow-inner"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            handleSavePreset();
                        }
                    }}
                />
                <button
                    type="button"
                    onClick={handleSavePreset}
                    disabled={loading || !newPresetName.trim()}
                    className="bg-teal-600 text-white px-6 py-2.5 rounded-xl hover:bg-teal-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-lg shadow-teal-900/20 font-bold text-sm whitespace-nowrap"
                >
                    <PlusIcon className="w-5 h-5" />
                    Save Current
                </button>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {presets.length === 0 ? (
                    <p className="text-gray-600 text-center py-8 text-sm italic">
                        No presets archived yet.
                    </p>
                ) : (
                    presets.map((name) => (
                        <div
                            key={name}
                            className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] transition-all group/preset shadow-sm"
                        >
                            <span className="font-bold text-gray-200 truncate mr-4 text-sm tracking-tight">
                                {name}
                            </span>
                            <div className="flex gap-1 flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => handleLoadPreset(name)}
                                    disabled={loading}
                                    className="p-2 text-teal-500 hover:bg-teal-500/10 rounded-lg transition-all"
                                    title="Load Preset"
                                >
                                    <PlayIcon className="w-5 h-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRenameClick(name)}
                                    disabled={loading}
                                    className="p-2 text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-all"
                                    title="Rename Preset"
                                >
                                    <RenameIcon className="w-5 h-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleEditPreset(name)}
                                    disabled={loading}
                                    className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                                    title="Edit Preset"
                                >
                                    <EditIcon className="w-5 h-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeletePreset(name)}
                                    disabled={loading}
                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                    title="Delete Preset"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Edit Modal */}
            {editingPresetName &&
                mounted &&
                createPortal(
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-xl animate-in fade-in duration-300">
                        <div className="bg-gray-950 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-white/10 overflow-hidden animate-in zoom-in duration-300">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gray-900/80 backdrop-blur-xl">
                                <h3 className="text-lg font-black text-white flex items-center gap-3">
                                    <EditIcon className="w-5 h-5 text-blue-500" />
                                    <span className="opacity-50 uppercase tracking-widest text-[10px]">
                                        Edit
                                    </span>
                                    <span className="text-teal-500">
                                        {editingPresetName}
                                    </span>
                                </h3>
                                <button
                                    onClick={() => {
                                        setEditingPresetName(null);
                                        setEditingConfig(null);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-gray-400 hover:text-white transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="p-8 overflow-y-auto flex-1 bg-gray-950/50">
                                <AnimationEditor
                                    config={editingConfig}
                                    onChange={(newConfig) =>
                                        setEditingConfig(newConfig)
                                    }
                                    allAnimations={animations}
                                    availableAnimations={animations}
                                    presets={presets}
                                    isRoot={true}
                                    fullConfig={fullConfig}
                                />
                            </div>
                            <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-gray-900/80 backdrop-blur-xl">
                                <button
                                    onClick={() => {
                                        setEditingPresetName(null);
                                        setEditingConfig(null);
                                    }}
                                    className="px-6 py-2 bg-black/40 text-gray-400 rounded-xl hover:text-white transition-all font-bold text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEditedPreset}
                                    disabled={loading}
                                    className="px-8 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-500 disabled:opacity-50 transition-all shadow-lg shadow-teal-900/20 font-bold text-xs"
                                >
                                    {loading ? "Saving..." : "Apply Changes"}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}

            {/* Rename Modal */}
            {renamingPresetName &&
                mounted &&
                createPortal(
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-xl animate-in fade-in duration-300">
                        <div className="bg-gray-950 rounded-3xl shadow-2xl w-full max-w-md border border-white/10 overflow-hidden animate-in zoom-in duration-300">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gray-900/80 backdrop-blur-xl">
                                <h3 className="text-lg font-black text-white flex items-center gap-3">
                                    <RenameIcon className="w-5 h-5 text-yellow-500" />
                                    <span className="uppercase tracking-widest text-[10px]">
                                        Rename
                                    </span>
                                </h3>
                                <button
                                    onClick={() => setRenamingPresetName(null)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-gray-400 hover:text-white transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="p-8">
                                <label className="block text-gray-500 text-[10px] uppercase tracking-widest font-black mb-3 ml-1">
                                    New Name
                                </label>
                                <input
                                    type="text"
                                    value={newRenamedName}
                                    onChange={(e) =>
                                        setNewRenamedName(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handlePerformRename();
                                        }
                                    }}
                                    className="w-full px-4 py-3 bg-black/30 border border-white/5 rounded-xl focus:outline-none focus:border-teal-500/50 text-white transition-all hover:bg-black/50 shadow-inner"
                                    autoFocus
                                />
                                <p className="text-[10px] text-gray-600 mt-4 leading-relaxed italic">
                                    Allowed characters: letters, numbers,
                                    spaces, hyphens, underscores.
                                </p>
                            </div>
                            <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-gray-900/80 backdrop-blur-xl">
                                <button
                                    onClick={() => setRenamingPresetName(null)}
                                    className="px-6 py-2 bg-black/40 text-gray-400 rounded-xl hover:text-white transition-all font-bold text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePerformRename}
                                    disabled={
                                        loading ||
                                        !newRenamedName.trim() ||
                                        newRenamedName === renamingPresetName
                                    }
                                    className="px-8 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-500 disabled:opacity-50 transition-all shadow-lg shadow-teal-900/20 font-bold text-xs"
                                >
                                    {loading ? "Updating..." : "Confirm"}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}
        </div>
    );
}
