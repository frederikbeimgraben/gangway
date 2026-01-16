"use client";

import { useEffect, useRef, useState } from "react";
import { Save, RefreshCw, Eye, Code } from "lucide-react";

import AnimationEditor from "../components/AnimationEditor";
import PresetsManager from "../components/PresetsManager";
import Visualization from "../components/Visualization";
import ClientLayout from "./ClientLayout";

export default function Home() {
    const [currentView, setCurrentView] = useState("viz");
    const [authStatus, setAuthStatus] = useState("pending"); // pending, authenticated, unauthorized, error
    const [apiKey, setApiKey] = useState(null);
    const [config, setConfig] = useState(null);
    const [rawConfigString, setRawConfigString] = useState("");
    const [animations, setAnimations] = useState([]);
    const [presets, setPresets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isFormValid, setIsFormValid] = useState(true);
    const [snackbar, setSnackbar] = useState({
        show: false,
        message: "",
        type: "success",
    });

    const formRef = useRef(null);

    const showSnackbar = (message, type = "success") => {
        setSnackbar({ show: true, message, type });
        setTimeout(() => {
            setSnackbar((s) => ({ ...s, show: false }));
        }, 3000);
    };

    // Effect to check localStorage on initial mount for the API key (handles reloads)
    useEffect(() => {
        const storedApiKey = localStorage.getItem("apiKey");
        if (storedApiKey) {
            setApiKey(storedApiKey);
        } else {
            // If no key is stored, we wait for the ApiKeyWrapper to potentially provide one from the URL.
            // We set a timeout to move to unauthorized if no key is provided after a short delay.
            const timer = setTimeout(() => {
                if (!apiKey) {
                    setAuthStatus("unauthorized");
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, []);

    // Effect to fetch data when the apiKey is set or changed. This is the core of the fix.
    useEffect(() => {
        const fetchData = async () => {
            if (!apiKey) {
                // Do not set to unauthorized immediately, as the key might be coming from the URL wrapper.
                return;
            }

            setLoading(true);
            setAuthStatus("pending");
            const headers = { "X-API-Key": apiKey };

            try {
                const [configRes, animRes, presetsRes] = await Promise.all([
                    fetch("/api/config/", { headers }),
                    fetch("/api/animations/", { headers }),
                    fetch("/api/presets/", { headers }),
                ]);

                if (
                    [configRes, animRes, presetsRes].some(
                        (res) => res.status === 401,
                    )
                ) {
                    localStorage.removeItem("apiKey");
                    setApiKey(null);
                    setAuthStatus("unauthorized");
                    return;
                }

                if (!configRes.ok || !animRes.ok || !presetsRes.ok) {
                    throw new Error(`HTTP error during data fetch.`);
                }

                const configData = await configRes.json();
                const animData = await animRes.json();
                const presetsData = await presetsRes.json();

                setConfig(configData);
                setRawConfigString(JSON.stringify(configData, null, 4));
                setAnimations(animData);
                setPresets(presetsData);
                setAuthStatus("authenticated");
            } catch (error) {
                console.error("Failed to fetch data:", error);
                setAuthStatus("error");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [apiKey]);

    const updateAnimationConfig = (newAnimConfig) => {
        const newConfig = { ...config, animation: newAnimConfig };
        setConfig(newConfig);
        setRawConfigString(JSON.stringify(newConfig, null, 4));
    };

    const updateLayoutConfig = (newLayoutConfig) => {
        const currentFloor = config.projection.floors[0].id;
        const newConfig = {
            ...config,
            strips: newLayoutConfig.strips,
            projection: {
                ...config.projection,
                floors: [{ id: currentFloor, ...newLayoutConfig.floor }],
            },
        };
        setConfig(newConfig);
        setRawConfigString(JSON.stringify(newConfig, null, 4));
    };

    const saveConfig = async () => {
        if (!isFormValid) {
            showSnackbar("Cannot save, form has invalid data.", "error");
            return;
        }
        setSaving(true);
        try {
            const configRes = await fetch("/api/config/", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": apiKey,
                },
                body: JSON.stringify(config),
            });
            if (!configRes.ok)
                throw new Error(
                    `Failed to save config: ${configRes.statusText}`,
                );
            const newConfig = await configRes.json();
            setConfig(newConfig);
            setRawConfigString(JSON.stringify(newConfig, null, 4));
            showSnackbar("Configuration saved successfully!");
        } catch (error) {
            console.error(error);
            showSnackbar("Failed to save configuration.", "error");
        }
        setSaving(false);
    };

    const resetConfig = async () => {
        setSaving(true);
        try {
            await fetch("/api/config/reset", {
                method: "POST",
                headers: { "X-API-Key": apiKey },
            });
            const configRes = await fetch("/api/config/", {
                headers: { "X-API-Key": apiKey },
            });
            const configData = await configRes.json();
            setConfig(configData);
            setRawConfigString(JSON.stringify(configData, null, 4));
            showSnackbar("Configuration has been reset.");
        } catch (error) {
            console.error("Failed to reset config:", error);
            showSnackbar("Failed to reset configuration.", "error");
        }
        setSaving(false);
    };

    const handleFormChange = () => {
        if (formRef.current) setIsFormValid(formRef.current.checkValidity());
    };

    const reloadPresets = async () => {
        const headers = { "X-API-Key": apiKey };
        const presetsRes = await fetch("/api/presets/", { headers });
        if (presetsRes.ok) {
            const presetsData = await presetsRes.json();
            setPresets(presetsData);
        }
    };

    return (
        <ClientLayout onApiKeySet={setApiKey}>
            {(authStatus === "pending" ||
                (authStatus === "authenticated" && loading)) && (
                <div className="h-screen flex items-center justify-center bg-gray-900">
                    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-teal-500"></div>
                </div>
            )}
            {authStatus === "unauthorized" && (
                <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
                    <div className="text-center p-4">
                        <h2 className="text-2xl font-bold mb-2">
                            Access Denied
                        </h2>
                        <p>
                            Please provide a valid API key in the URL query
                            parameter.
                        </p>
                        <p className="text-gray-400 text-sm mt-1">
                            Example:{" "}
                            <code className="bg-gray-700 p-1 rounded text-white">
                                ?apiKey=YOUR_API_KEY
                            </code>
                        </p>
                    </div>
                </div>
            )}
            {authStatus === "error" && (
                <div className="h-screen flex items-center justify-center bg-gray-900 text-red-400">
                    Failed to load configuration. Check the browser console for
                    details.
                </div>
            )}
            {authStatus === "authenticated" && config && !loading && (
                <main className="bg-gray-900 text-gray-100 min-h-screen">
                    <div className="container mx-auto p-4">
                        <header className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg p-4 mb-8 sticky top-4 z-10">
                            <div className="flex justify-between items-center">
                                <h1 className="text-2xl font-bold text-teal-300">
                                    GANGWAY
                                </h1>
                                <div className="hidden md:flex items-center gap-2">
                                    <NavButton
                                        active={currentView === "viz"}
                                        onClick={() => setCurrentView("viz")}
                                    >
                                        <Eye className="w-4 h-4 mr-2" />
                                        Visualization
                                    </NavButton>
                                    <NavButton
                                        active={currentView === "config"}
                                        onClick={() => setCurrentView("config")}
                                    >
                                        <Code className="w-4 h-4 mr-2" />
                                        Configuration
                                    </NavButton>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={resetConfig}
                                        className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                                        disabled={saving}
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        <span>Reset</span>
                                    </button>
                                    <button
                                        onClick={saveConfig}
                                        className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                                        disabled={saving || !isFormValid}
                                    >
                                        {saving ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        <span>
                                            {saving ? "Saving..." : "Save"}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </header>
                        <div className={currentView === "viz" ? "" : "hidden"}>
                            <Visualization config={config} />
                        </div>
                        <div
                            className={currentView === "config" ? "" : "hidden"}
                        >
                            <div className="max-w-4xl mx-auto">
                                <form
                                    ref={formRef}
                                    onInput={handleFormChange}
                                    className="grid grid-cols-1 gap-8"
                                >
                                    <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
                                        <h3 className="text-xl font-semibold mb-6 text-teal-300 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-teal-300"></span>
                                            Animation
                                        </h3>
                                        <AnimationEditor
                                            config={config.animation}
                                            onChange={updateAnimationConfig}
                                            allAnimations={animations}
                                            availableAnimations={animations}
                                            presets={presets}
                                            isRoot={true}
                                        />
                                    </div>
                                    <PresetsManager
                                        presets={presets}
                                        animations={animations}
                                        onPresetsChanged={reloadPresets}
                                        onPresetLoaded={() =>
                                            useEffect(() => {
                                                fetchData();
                                            }, [])
                                        }
                                        showSnackbar={showSnackbar}
                                        apiKey={apiKey}
                                    />
                                </form>
                            </div>
                        </div>
                    </div>
                </main>
            )}
            <div
                className={`fixed bottom-4 right-4 px-6 py-3 rounded shadow-lg text-white transition-all duration-300 transform ${snackbar.show ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0 pointer-events-none"} ${snackbar.type === "error" ? "bg-red-600" : "bg-teal-600"}`}
            >
                {snackbar.message}
            </div>
        </ClientLayout>
    );
}

function NavButton({ active, onClick, children }) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${active ? "bg-gray-700 text-white shadow-sm" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"}`}
        >
            {children}
        </button>
    );
}
