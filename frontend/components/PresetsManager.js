import { useState } from "react";
import AnimationEditor from "./AnimationEditor";

// Simple Icons to avoid external dependencies
const PlayIcon = ({ className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className={className}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
        />
    </svg>
);

const EditIcon = ({ className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className={className}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
        />
    </svg>
);

const TrashIcon = ({ className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className={className}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
        />
    </svg>
);

const PlusIcon = ({ className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className={className}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
        />
    </svg>
);

const RenameIcon = ({ className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className={className}
    >
        <path d="m 12.257897,4.6074221 h 7.435547 -3.71875 V 19.392578 h -3.716797 7.435547 m -5.742188,-2.543034 -7.5197,-1e-6 c -1.350375,0 -2.4375,-1.087125 -2.4375,-2.4375 V 9.5330171 c 0,-1.3503748 1.087125,-2.4374997 2.4375,-2.4374997 l 7.5197,4e-7 m 3.985932,0.054938 c 1.174171,0.1767189 2.068756,1.1850629 2.068756,2.4100327 v 4.8790225 c 0,1.22497 -0.894585,2.233314 -2.068756,2.410033" />
    </svg>
);

export default function PresetsManager({
    presets = [],
    animations = [],
    onPresetLoaded,
    onPresetsChanged,
    showSnackbar,
}) {
    const [newPresetName, setNewPresetName] = useState("");
    const [loading, setLoading] = useState(false);
    const [editingPresetName, setEditingPresetName] = useState(null);
    const [editingConfig, setEditingConfig] = useState(null);
    const [renamingPresetName, setRenamingPresetName] = useState(null);
    const [newRenamedName, setNewRenamedName] = useState("");

    const getApiKey = () => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("apiKey");
        }
        return null;
    };

    const handleSavePreset = async () => {
        const name = newPresetName.trim();
        if (!name) return;

        if (presets.includes(name)) {
            showSnackbar?.("Preset name already exists", "error");
            return;
        }

        setLoading(true);
        try {
            const apiKey = getApiKey();
            const headers = apiKey ? { "X-API-Key": apiKey } : {};
            // Save current active config as preset
            const res = await fetch(`/api/presets/${name}`, {
                method: "POST",
                headers,
            });
            if (res.ok) {
                showSnackbar?.("Preset saved", "success");
                setNewPresetName("");
                onPresetsChanged?.();
            } else {
                const err = await res.json();
                showSnackbar?.(`Failed to save: ${err.detail}`, "error");
            }
        } catch (error) {
            console.error(error);
            showSnackbar?.("Error saving preset", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleEditPreset = async (name) => {
        setLoading(true);
        try {
            const apiKey = getApiKey();
            const headers = apiKey ? { "X-API-Key": apiKey } : {};
            const res = await fetch(`/api/presets/${name}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setEditingPresetName(name);
                setEditingConfig(data.animation);
            } else {
                showSnackbar?.("Failed to load preset data", "error");
            }
        } catch (error) {
            console.error(error);
            showSnackbar?.("Error loading preset data", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEditedPreset = async () => {
        if (!editingPresetName || !editingConfig) return;
        setLoading(true);
        try {
            const apiKey = getApiKey();
            const headers = apiKey
                ? { "X-API-Key": apiKey, "Content-Type": "application/json" }
                : {};
            const res = await fetch(`/api/presets/${editingPresetName}`, {
                method: "POST",
                headers,
                body: JSON.stringify(editingConfig),
            });
            if (res.ok) {
                showSnackbar?.(
                    `Preset '${editingPresetName}' updated`,
                    "success",
                );
                setEditingPresetName(null);
                setEditingConfig(null);
                onPresetsChanged?.();
            } else {
                const err = await res.json();
                showSnackbar?.(`Failed to update: ${err.detail}`, "error");
            }
        } catch (error) {
            console.error(error);
            showSnackbar?.("Error updating preset", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleLoadPreset = async (name) => {
        setLoading(true);
        try {
            const apiKey = getApiKey();
            const headers = apiKey
                ? { "X-API-Key": apiKey, "Content-Type": "application/json" }
                : {};
            const res = await fetch(`/api/presets/${name}/load`, {
                method: "POST",
                headers,
            });
            if (res.ok) {
                showSnackbar?.(`Preset '${name}' loaded`, "success");
                onPresetLoaded?.();
            } else {
                const err = await res.json();
                showSnackbar?.(`Failed to load: ${err.detail}`, "error");
            }
        } catch (error) {
            console.error(error);
            showSnackbar?.("Error loading preset", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePreset = async (name) => {
        if (!confirm(`Delete preset "${name}"?`)) return;
        try {
            const apiKey = getApiKey();
            const headers = apiKey
                ? { "X-API-Key": apiKey, "Content-Type": "application/json" }
                : {};
            const res = await fetch(`/api/presets/${name}`, {
                method: "DELETE",
                headers,
            });
            if (res.ok) {
                showSnackbar?.("Preset deleted", "success");
                onPresetsChanged?.();
            } else {
                const err = await res.json();
                showSnackbar?.(
                    `Failed to delete preset: ${err.detail}`,
                    "error",
                );
            }
        } catch (error) {
            console.error(error);
            showSnackbar?.("Error deleting preset", "error");
        }
    };

    const handleRenameClick = (name) => {
        setRenamingPresetName(name);
        setNewRenamedName(name);
    };

    const handlePerformRename = async () => {
        if (!renamingPresetName || !newRenamedName.trim()) return;
        if (renamingPresetName === newRenamedName.trim()) {
            setRenamingPresetName(null);
            return;
        }

        setLoading(true);
        try {
            const apiKey = getApiKey();
            const headers = apiKey ? { "X-API-Key": apiKey } : {};
            const res = await fetch(
                `/api/presets/${renamingPresetName}/rename?new_name=${encodeURIComponent(
                    newRenamedName.trim(),
                )}`,
                {
                    method: "POST",
                    headers,
                },
            );

            if (res.ok) {
                showSnackbar?.("Preset renamed", "success");
                setRenamingPresetName(null);
                onPresetsChanged?.();
            } else {
                const err = await res.json();
                showSnackbar?.(`Failed to rename: ${err.detail}`, "error");
            }
        } catch (error) {
            console.error(error);
            showSnackbar?.("Error renaming preset", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-white/5 shadow-xl">
            <h3 className="text-xs uppercase tracking-widest font-black mb-8 text-teal-500 flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.8)]"></span>
                Archive
            </h3>
            <div className="flex gap-3 mb-8">
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
                    className="bg-teal-600 text-white px-6 py-2.5 rounded-xl hover:bg-teal-500 disabled:opacity-50 flex items-center gap-2 transition-all transform active:scale-95 shadow-lg shadow-teal-900/20 font-bold text-sm"
                >
                    <PlusIcon className="w-5 h-5" />
                    Save
                </button>
            </div>

            {/* Preset List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
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
                                    title="Edit Preset Config"
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
            {editingPresetName && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
                    <div className="bg-gray-950 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-white/5 overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gray-900/50 backdrop-blur-xl">
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
                            />
                        </div>
                        <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-gray-900/50 backdrop-blur-xl">
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
                </div>
            )}

            {/* Rename Modal */}
            {renamingPresetName && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
                    <div className="bg-gray-950 rounded-2xl shadow-2xl w-full max-w-md border border-white/5 overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gray-900/50 backdrop-blur-xl">
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
                                Allowed characters: letters, numbers, spaces,
                                hyphens, underscores.
                            </p>
                        </div>
                        <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-gray-900/50 backdrop-blur-xl">
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
                </div>
            )}
        </div>
    );
}
