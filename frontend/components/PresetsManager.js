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

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-6">
            <h2 className="text-xl font-semibold mb-6 text-teal-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-300"></span>
                Presets
            </h2>

            {/* Save New Preset */}
            <div className="flex flex-wrap gap-2 mb-6">
                <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="New preset name..."
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-white placeholder-gray-400"
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
                    className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-500 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                    Save Current
                </button>
            </div>

            {/* Preset List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {presets.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">
                        No presets saved yet.
                    </p>
                ) : (
                    presets.map((name) => (
                        <div
                            key={name}
                            className="flex items-center justify-between p-3 bg-gray-700 rounded-md border border-gray-600 hover:bg-gray-600 transition-colors"
                        >
                            <span className="font-medium text-white truncate mr-4">
                                {name}
                            </span>
                            <div className="flex gap-2 flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => handleLoadPreset(name)}
                                    disabled={loading}
                                    className="p-2 text-teal-400 hover:bg-gray-500 rounded-md transition-colors"
                                    title="Load Preset"
                                >
                                    <PlayIcon className="w-5 h-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleEditPreset(name)}
                                    disabled={loading}
                                    className="p-2 text-blue-400 hover:bg-gray-500 rounded-md transition-colors"
                                    title="Edit Preset"
                                >
                                    <EditIcon className="w-5 h-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeletePreset(name)}
                                    disabled={loading}
                                    className="p-2 text-red-400 hover:bg-gray-500 rounded-md transition-colors"
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-700">
                        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 rounded-t-lg">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <EditIcon className="w-5 h-5 text-blue-400" />
                                Editing:{" "}
                                <span className="text-teal-400">
                                    {editingPresetName}
                                </span>
                            </h3>
                            <button
                                onClick={() => {
                                    setEditingPresetName(null);
                                    setEditingConfig(null);
                                }}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
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
                        <div className="p-4 border-t border-gray-700 flex justify-end gap-2 bg-gray-900 rounded-b-lg">
                            <button
                                onClick={() => {
                                    setEditingPresetName(null);
                                    setEditingConfig(null);
                                }}
                                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEditedPreset}
                                disabled={loading}
                                className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-500 disabled:opacity-50 transition-colors"
                            >
                                {loading ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
