"use client";

import { useEffect, useRef, useState } from "react";
import Visualization from "../components/Visualization";
import AnimationEditor from "../components/AnimationEditor";
import PresetsManager from "../components/PresetsManager";
import Image from "next/image";
import AccessDenied from "./AccessDenied";

export default function Home() {
    const [currentView, setCurrentView] = useState("viz");
    const [authStatus, setAuthStatus] = useState("pending"); // pending, authenticated, unauthorized
    const [config, setConfig] = useState(null);
    const [rawConfigString, setRawConfigString] = useState(""); // Still needed for save functionality, even if tab is gone
    const [animations, setAnimations] = useState([]);
    const [presets, setPresets] = useState([]);
    // layoutConfig state removed — using `config` as the single source of truth
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
        setTimeout(
            () => setSnackbar((prev) => ({ ...prev, show: false })),
            3000,
        );
    };

    // Initial Fetch
    const getApiKey = () => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("apiKey");
        }
        return null;
    };

    const fetchData = async () => {
        setLoading(true);
        const apiKey = getApiKey();
        const headers = apiKey ? { "X-API-Key": apiKey } : {};
        try {
            const [configRes, animRes, presetsRes] = await Promise.all([
                fetch("/api/config/", { headers }),
                fetch("/api/animations/", { headers }),
                fetch("/api/presets/", { headers }),
            ]);

            if (
                configRes.status === 403 ||
                animRes.status === 403 ||
                presetsRes.status === 403
            ) {
                setAuthStatus("unauthorized");
                return;
            }

            if (!configRes.ok) throw new Error("Failed to fetch config");
            if (!animRes.ok) throw new Error("Failed to fetch animations");
            if (!presetsRes.ok) throw new Error("Failed to fetch presets");

            const configData = await configRes.json();
            const animData = await animRes.json();
            const presetsData = await presetsRes.json();
            setConfig(configData);
            setRawConfigString(JSON.stringify(configData, null, 2));
            setAnimations(animData);
            setPresets(presetsData);
            setAuthStatus("authenticated");
        } catch (e) {
            showSnackbar("Error fetching data: " + e.message, "error");
            setAuthStatus("unauthorized");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Update logic for Animation Editor
    const updateAnimationConfig = (newVal) => {
        const newConfig = {
            ...config,
            animation: newVal,
        };
        setConfig(newConfig);
        setRawConfigString(JSON.stringify(newConfig, null, 2));
    };

    // Update logic for Strips & Floor Editor (mapped into `config`)
    const updateLayoutConfig = (newVal) => {
        const currentFloor = config?.projection?.floor || [0, 0, 0, 0];
        const newConfig = {
            ...config,
            strips: newVal.strips,
            projection: {
                ...config.projection,
                floor: [
                    currentFloor[0] ?? 0,
                    currentFloor[1] ?? 0,
                    parseFloat(newVal.floor?.width ?? 0),
                    parseFloat(newVal.floor?.height ?? 0),
                ],
            },
        };
        setConfig(newConfig);
        setRawConfigString(JSON.stringify(newConfig, null, 2));
    };

    const saveConfig = async () => {
        setSaving(true);
        try {
            const apiKey = getApiKey();
            // Save combined config (animations, strips, and projection.floor)
            const configRes = await fetch("/api/config/", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...(apiKey && { "X-API-Key": apiKey }),
                },
                body: JSON.stringify(config),
            });
            if (!configRes.ok) throw new Error("Failed to save config");

            // Reload config to confirm
            const newConfigRes = await fetch("/api/config/", {
                headers: { ...(apiKey && { "X-API-Key": apiKey }) },
            });
            const newConfig = await newConfigRes.json();

            setConfig(newConfig);
            setRawConfigString(JSON.stringify(newConfig, null, 2));
            showSnackbar("Configuration saved successfully!", "success");
        } catch (e) {
            showSnackbar("Error saving configuration: " + e.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const resetConfig = async () => {
        if (!confirm("Are you sure you want to discard unsaved changes?"))
            return;
        const configRes = await fetch("/api/config/");
        const configData = await configRes.json();

        setConfig(configData);
        setRawConfigString(JSON.stringify(configData, null, 2));
    };

    const handleFormChange = () => {
        if (formRef.current) {
            setIsFormValid(formRef.current.checkValidity());
        }
    };

    if (authStatus === "pending" || loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-900">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (authStatus === "unauthorized") {
        return <AccessDenied />;
    }

    if (!config) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-900 text-red-400">
                Failed to load configuration.
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-950 text-gray-100 font-sans">
            {/* Header */}
            <header className="bg-gray-900/50 backdrop-blur-xl border-b border-white/5 p-4 flex flex-col md:flex-row items-center justify-between shrink-0 z-50">
                {/* Logo */}
                <div className="w-32 md:w-40 h-auto mb-4 md:mb-0 opacity-90 hover:opacity-100 transition-opacity">
                    <Image
                        src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjwhLS0gQ3JlYXRlZCB3aXRoIElua3NjYXBlIChodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy8pIC0tPgoKPHN2ZwogICB3aWR0aD0iMjA0OG1tIgogICBoZWlnaHQ9IjUxMm1tIgogICB2aWV3Qm94PSIwIDAgMjA0OCA1MTIiCiAgIHZlcnNpb249IjEuMSIKICAgaWQ9InN2ZzEiCiAgIHhtbDpzcGFjZT0icHJlc2VydmUiCiAgIHNvZGlwb2RpOmRvY25hbWU9Ik1BS0VScy1UZWFtLVdpZGUtQ29sb3ItV2hpdGVUZXh0LnN2ZyIKICAgaW5rc2NhcGU6dmVyc2lvbj0iMS40LjIgKGViZjBlOTQwZDAsIDIwMjUtMDUtMDgpIgogICB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIKICAgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIgogICB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxzb2RpcG9kaTpuYW1lZHZpZXcKICAgICBpZD0ibmFtZWR2aWV3MSIKICAgICBwYWdlY29sb3I9IiM1MDUwNTAiCiAgICAgYm9yZGVyY29sb3I9IiNmZmZmZmYiCiAgICAgYm9yZGVyb3BhY2l0eT0iMSIKICAgICBpbmtzY2FwZTpzaG93cGFnZXNoYWRvdz0iMCIKICAgICBpbmtzY2FwZTpwYWdlb3BhY2l0eT0iMCIKICAgICBpbmtzY2FwZTpwYWdlY2hlY2tlcmJvYXJkPSIxIgogICAgIGlua3NjYXBlOmRlc2tjb2xvcj0iIzUwNTA1MCIKICAgICBpbmtzY2FwZTpkb2N1bWVudC11bml0cz0ibW0iCiAgICAgaW5rc2NhcGU6em9vbT0iMC4wOTk3MzU1MTQiCiAgICAgaW5rc2NhcGU6Y3g9IjM4NzAuMjM2MiIKICAgICBpbmtzY2FwZTpjeT0iOTY3LjU1OTA2IgogICAgIGlua3NjYXBlOndpbmRvdy13aWR0aD0iMTkyMCIKICAgICBpbmtzY2FwZTp3aW5kb3ctaGVpZ2h0PSIxMDA0IgogICAgIGlua3NjYXBlOndpbmRvdy14PSIwIgogICAgIGlua3NjYXBlOndpbmRvdy15PSIwIgogICAgIGlua3NjYXBlOndpbmRvdy1tYXhpbWl6ZWQ9IjEiCiAgICAgaW5rc2NhcGU6Y3VycmVudC1sYXllcj0ibGF5ZXIyIiAvPjxkZWZzCiAgICAgaWQ9ImRlZnMxIiAvPjxnCiAgICAgaWQ9ImxheWVyMiI+PGcKICAgICAgIGlkPSJnMSIKICAgICAgIHN0eWxlPSJmaWxsOiNmZmZmZmY7ZmlsbC1vcGFjaXR5OjEiPjxwYXRoCiAgICAgICAgIGQ9Ik0gNDk2LjYxODkyLDI3Ny4zMTk0OSBWIDQ3Ny4xMzI2NiBIIDQzNC4yNDc4NiBWIDM3Ny41MDgzIGwgLTMwLjc2MjE5LDk5LjYyNDM2IGggLTUzLjYyMjE4IGwgLTMwLjc2MjIsLTk5LjYyNDM2IHYgOTkuNjI0MzYgSCAyNTYuNDQ4MDEgViAyNzcuMzE5NDkgaCA3Ni43NjQzOCBsIDQ0LjAyNjYzLDExOS45NDQzNSA0Mi44OTc3NCwtMTE5Ljk0NDM1IHogbSAxNTYuMzUxMDMsMTY5LjYxNTQyIGggLTY2LjYwNDM5IGwgLTkuODc3NzcsMzAuMTk3NzUgaCAtNjUuNzU3NzIgbCA3My4wOTU1LC0xOTkuODEzMTcgaCA3Mi4yNDg4MiBsIDcyLjgxMzI4LDE5OS44MTMxNyBoIC02Ni4wMzk5NSB6IG0gLTE1LjIzOTk4LC00Ny4xMzEwNyAtMTguMDYyMjEsLTU1LjU5NzczIC0xOC4wNjIyMSw1NS41OTc3MyB6IG0gMjI2LjA2MDAyLDc3LjMyODgyIC01OC4xMzc3MywtODYuNjQyMTUgdiA4Ni42NDIxNSBIIDc0Mi45OTg5OCBWIDI3Ny4zMTk0OSBoIDYyLjY1MzI4IHYgODQuMTAyMTYgbCA1Ny4yOTEwNiwtODQuMTAyMTYgaCA3MC44Mzc3MiBsIC02OC44NjIxNiw5NS42NzMyNiA3My4zNzc3MSwxMDQuMTM5OTEgeiBNIDEwMTguNzI5NiwzMjcuMjcyNzkgdiAyNC41NTMzMSBoIDYyLjA4ODggdiA0Ny4xMzEwNyBoIC02Mi4wODg4IHYgMjguMjIyMiBoIDcwLjU1NTUgdiA0OS45NTMyOSBIIDk1Ni4wNzYzMSBWIDI3Ny4zMTk0OSBoIDEzMy4yMDg3OSB2IDQ5Ljk1MzMgeiBtIDE5NC43MzMxLDE0OS44NTk4NyAtMzcuNTM1NSwtNzEuNjg0MzggaCAtMC4yODIyIHYgNzEuNjg0MzggaCAtNjIuNjUzMyBWIDI3Ny4zMTk0OSBoIDkzLjEzMzMgcSAyNC4yNzExLDAgNDEuNDg2Niw4Ljc0ODg5IDE3LjIxNTUsOC40NjY2NiAyNS42ODIyLDIzLjQyNDQyIDguNzQ4OSwxNC42NzU1NCA4Ljc0ODksMzMuMzAyMiAwLDIwLjAzNzc2IC0xMS4yODg5LDM1LjU1OTk3IC0xMS4wMDY3LDE1LjUyMjIgLTMxLjg5MTEsMjIuMjk1NTMgbCA0My40NjIyLDc2LjQ4MjE2IHogTSAxMTc1LjY0NSwzNjMuNjc5NDIgaCAyNC44MzU1IHEgOS4wMzExLDAgMTMuNTQ2NywtMy45NTExMSA0LjUxNTUsLTQuMjMzMzMgNC41MTU1LC0xMi45ODIyMSAwLC03LjkwMjIxIC00Ljc5NzcsLTEyLjQxNzc2IC00LjUxNTYsLTQuNTE1NTYgLTEzLjI2NDUsLTQuNTE1NTYgaCAtMjQuODM1NSB6IG0gMjA0LjYxMDksMTE1LjQyODc5IHEgLTM1Ljg0MjEsMCAtNTkuMjY2NiwtMTYuNjUxMDkgLTIzLjE0MjIsLTE2LjkzMzMyIC0yNS4xMTc3LC00OS4zODg4NSBoIDY2LjYwNDQgcSAxLjQxMTEsMTcuMjE1NTQgMTUuMjQsMTcuMjE1NTQgNS4wNzk5LDAgOC40NjY2LC0yLjI1Nzc4IDMuNjY4OSwtMi41Mzk5OSAzLjY2ODksLTcuNjE5OTkgMCwtNy4wNTU1NSAtNy42MiwtMTEuMjg4ODggLTcuNjIsLTQuNTE1NTUgLTIzLjcwNjYsLTEwLjE1OTk5IC0xOS4xOTExLC02Ljc3MzMzIC0zMS44OTExLC0xMy4yNjQ0MyAtMTIuNDE3OCwtNi40OTExMSAtMjEuNDQ4OSwtMTguOTA4ODggLTkuMDMxMSwtMTIuNDE3NzYgLTguNzQ4OSwtMzEuODkxMDggMCwtMTkuNDczMzIgOS44Nzc4LC0zMy4wMTk5NyAxMC4xNiwtMTMuODI4ODggMjcuMzc1NSwtMjAuODg0NDMgMTcuNDk3OCwtNy4wNTU1NSAzOS4yMjg5LC03LjA1NTU1IDM2LjY4ODgsMCA1OC4xMzc3LDE2LjkzMzMyIDIxLjczMTEsMTYuOTMzMzIgMjIuODYsNDcuNjk1NTIgaCAtNjcuNDUxMSBxIC0wLjI4MjIsLTguNDY2NjYgLTQuMjMzMywtMTIuMTM1NTUgLTMuOTUxMSwtMy42Njg4OSAtOS41OTU1LC0zLjY2ODg5IC0zLjk1MTIsMCAtNi40OTExLDIuODIyMjIgLTIuNTQsMi41NCAtMi41NCw3LjMzNzc4IDAsNi43NzMzMiA3LjMzNzcsMTEuMjg4ODggNy42Miw0LjIzMzMyIDIzLjk4ODksMTAuNDQyMjEgMTguOTA4OSw3LjA1NTU1IDMxLjA0NDQsMTMuNTQ2NjUgMTIuNDE3OCw2LjQ5MTExIDIxLjQ0ODksMTguMDYyMjEgOS4wMzExLDExLjU3MTEgOS4wMzExLDI5LjA2ODg3IDAsMTguMzQ0NDIgLTkuMDMxMSwzMy4wMTk5NyAtOS4wMzExLDE0LjM5MzMyIC0yNi4yNDY3LDIyLjU3Nzc2IC0xNy4yMTU1LDguMTg0NDMgLTQwLjkyMjIsOC4xODQ0MyB6IgogICAgICAgICBpZD0idGV4dDEiCiAgICAgICAgIHN0eWxlPSJmb250LXdlaWdodDo5MDA7Zm9udC1zaXplOjI4Mi4yMjJweDtmb250LWZhbWlseTpQb3BwaW5zOy1pbmtzY2FwZS1mb250LXNwZWNpZmljYXRpb246J1BvcHBpbnMsIEhlYXZ5JztsZXR0ZXItc3BhY2luZzowcHg7c3Ryb2tlLXdpZHRoOjEuMDU4MzM7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7c3Ryb2tlLWxpbmVqb2luOnJvdW5kIgogICAgICAgICBhcmlhLWxhYmVsPSJNQUtFUlMiIC8+PHBhdGgKICAgICAgICAgZD0ibSA1OTQuMjY3ODgsMjQwLjEzNDc4IHEgLTM1Ljg0MjE5LDAgLTU5LjI2NjYyLC0xNi42NTExIC0yMy4xNDIyLC0xNi45MzMzMiAtMjUuMTE3NzUsLTQ5LjM4ODg1IGggNjYuNjA0MzkgcSAxLjQxMTExLDE3LjIxNTU1IDE1LjIzOTk4LDE3LjIxNTU1IDUuMDgsMCA4LjQ2NjY2LC0yLjI1Nzc4IDMuNjY4ODksLTIuNTQgMy42Njg4OSwtNy42MTk5OSAwLC03LjA1NTU1IC03LjYxOTk5LC0xMS4yODg4OCAtNy42MiwtNC41MTU1NSAtMjMuNzA2NjUsLTEwLjE1OTk5IC0xOS4xOTExLC02Ljc3MzMzIC0zMS44OTEwOSwtMTMuMjY0NDQgLTEyLjQxNzc2LC02LjQ5MTEgLTIxLjQ0ODg3LC0xOC45MDg4NyAtOS4wMzExLC0xMi40MTc3NyAtOC43NDg4OCwtMzEuODkxMDg1IDAsLTE5LjQ3MzMxNyA5Ljg3Nzc3LC0zMy4wMTk5NzIgMTAuMTU5OTksLTEzLjgyODg3NyAyNy4zNzU1MywtMjAuODg0NDI3IDE3LjQ5Nzc3LC03LjA1NTU1IDM5LjIyODg2LC03LjA1NTU1IDM2LjY4ODg2LDAgNTguMTM3NzMsMTYuOTMzMzE5IDIxLjczMTA5LDE2LjkzMzMyIDIyLjg1OTk4LDQ3LjY5NTUxNiBoIC02Ny40NTEwNSBxIC0wLjI4MjIzLC04LjQ2NjY2IC00LjIzMzMzLC0xMi4xMzU1NDUgLTMuOTUxMTEsLTMuNjY4ODg2IC05LjU5NTU1LC0zLjY2ODg4NiAtMy45NTExMSwwIC02LjQ5MTExLDIuODIyMjIgLTIuNTQsMi41Mzk5OTcgLTIuNTQsNy4zMzc3NzEgMCw2Ljc3MzMyOSA3LjMzNzc4LDExLjI4ODg3OSA3LjYxOTk5LDQuMjMzMzMgMjMuOTg4ODYsMTAuNDQyMjEgMTguOTA4ODgsNy4wNTU1NSAzMS4wNDQ0MiwxMy41NDY2NiAxMi40MTc3Nyw2LjQ5MTEgMjEuNDQ4ODcsMTguMDYyMjEgOS4wMzExMSwxMS41NzExIDkuMDMxMTEsMjkuMDY4ODYgMCwxOC4zNDQ0MyAtOS4wMzExMSwzMy4wMTk5NyAtOS4wMzExLDE0LjM5MzMyIC0yNi4yNDY2NCwyMi41Nzc3NiAtMTcuMjE1NTQsOC4xODQ0NCAtNDAuOTIyMTksOC4xODQ0NCB6IE0gODQ5LjM5NjU1LDM4LjM0NjA2IHYgNDkuNjcxMDcgaCAtNTMuMDU3NzMgdiAxNTAuMTQyMSBIIDczMy42ODU1MyBWIDg4LjAxNzEzIEggNjgxLjE5MjI1IFYgMzguMzQ2MDYgWiBtIDc4LjE3NTI2LDAgdiAxMTIuNjA2NTcgcSAwLDEzLjgyODg4IDUuOTI2NjYsMjIuMDEzMzIgNi4yMDg4OCw3LjkwMjIxIDE5Ljc1NTU0LDcuOTAyMjEgMTMuNTQ2NjUsMCAyMC4wMzc3NiwtNy45MDIyMSA2LjQ5MTEsLTguMTg0NDQgNi40OTExLC0yMi4wMTMzMiBWIDM4LjM0NjA2IGggNjIuMzcxMDMgdiAxMTIuNjA2NTcgcSAwLDI4LjUwNDQyIC0xMS44NTMzLDQ4LjgyNDQxIC0xMS44NTMzLDIwLjAzNzc2IC0zMi40NTU1MiwzMC4xOTc3NSAtMjAuNjAyMiwxMC4xNTk5OSAtNDYuMDAyMTgsMTAuMTU5OTkgLTI1LjM5OTk4LDAgLTQ1LjE1NTUyLC0xMC4xNTk5OSAtMTkuNDczMzIsLTEwLjE1OTk5IC0zMC40Nzk5NywtMzAuMTk3NzUgLTExLjAwNjY2LC0yMC4wMzc3NyAtMTEuMDA2NjYsLTQ4LjgyNDQxIFYgMzguMzQ2MDYgWiBNIDEyMzIuNjUzOCwxMDYuOTI2IHEgMCwxOC45MDg4OCAtOC43NDg5LDM0LjQzMTA4IC04Ljc0ODksMTUuMjM5OTkgLTI1Ljk2NDQsMjQuMjcxMSAtMTYuOTMzNCw5LjAzMTEgLTQxLjIwNDQsOS4wMzExIGggLTI0LjgzNTYgdiA2My40OTk5NSBoIC02Mi42NTMzIFYgMzguMzQ2MDYgaCA4Ny40ODg5IHEgMzYuNjg4OCwwIDU2LjE2MjEsMTguNjI2NjUxIDE5Ljc1NTYsMTguNjI2NjUxIDE5Ljc1NTYsNDkuOTUzMjg5IHogbSAtODIuOTczMywxOC4zNDQ0MyBxIDE5LjQ3MzMsMCAxOS40NzMzLC0xOC4zNDQ0MyAwLC0xOC4zNDQ0MjcgLTE5LjQ3MzMsLTE4LjM0NDQyNyBoIC0xNy43OCB2IDM2LjY4ODg1NyB6IG0gMjMwLjg1NzYsODIuNjkxMDQgaCAtNjYuNjA0NCBsIC05Ljg3NzcsMzAuMTk3NzYgaCAtNjUuNzU3OCBsIDczLjA5NTUsLTE5OS44MTMxNyBoIDcyLjI0ODkgbCA3Mi44MTMyLDE5OS44MTMxNyBoIC02Ni4wMzk5IHogbSAtMTUuMjQsLTQ3LjEzMTA3IC0xOC4wNjIyLC01NS41OTc3MyAtMTguMDYyMiw1NS41OTc3MyB6IgogICAgICAgICBpZD0idGV4dDEtNSIKICAgICAgICAgc3R5bGU9ImZvbnQtd2VpZ2h0OjkwMDtmb250LXNpemU6MjgyLjIyMnB4O2ZvbnQtZmFtaWx5OlBvcHBpbnM7LWlua3NjYXBlLWZvbnQtc3BlY2lmaWNhdGlvbjonUG9wcGlucywgSGVhdnknO2xldHRlci1zcGFjaW5nOjBweDtzdHJva2Utd2lkdGg6MS4wNTgzMztzdHJva2UtbGluZWNhcDpyb3VuZDtzdHJva2UtbGluZWpvaW46cm91bmQiCiAgICAgICAgIGFyaWEtbGFiZWw9IlNUVVBBIiAvPjwvZz48ZwogICAgICAgaWQ9ImxheWVyMS00IgogICAgICAgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTUzNikiPjxnCiAgICAgICAgIGlkPSJnMTEtNy0wLTAtOS0wLTIwLTciCiAgICAgICAgIHRyYW5zZm9ybT0ibWF0cml4KDAsMC41OTY2NzEyNSwwLjU5NjY3MTI1LDAsMzkzLjI2NzMsMTYxLjg3MDA4KSIKICAgICAgICAgc3R5bGU9InN0cm9rZS13aWR0aDowLjQ0MzQzMiI+PHBhdGgKICAgICAgICAgICBpZD0icGF0aDMtOS0zLTMtOC03LTAtMS0wLTMtMi04IgogICAgICAgICAgIHN0eWxlPSJmaWxsOiNmZmNjMDA7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOm5vbnplcm87c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjUuODc2Mzc7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1vcGFjaXR5OjEiCiAgICAgICAgICAgZD0ibSA3Mi4xODcxNDUsLTYwOC42MzQ1NSBjIC04LjM4OTM2OSwzOC40NDQwNiAtMjcuMjgyMDkzLDcwLjgzNDQyIC01NC4xNzg1MjEsOTQuNjEzNTIgLTQuMTM3MDE5LDMuNjU3NTQgLTUuNDQ5ODQyLDEwLjI2OTUxIC0yLjY4ODU0OCwxNS4wNTI1MSAxNC42NzU5MzgsMjUuNDIxMDcgMjkuMzUxODc3LDUwLjg0MjE0IDQ0LjAyNzgxNiw3Ni4yNjMyMSAyLjc2MTI5Myw0Ljc4MyA4LjY3MzU1OSw2LjA5ODIgMTMuMDY4NjczLDIuNzU0MzUgMjguNTQ4MzQ1LC0yMS43MTk4OCA1Mi41MTA3MjUsLTQ4Ljk1NzYzIDcyLjAxMzg3NSwtODEuNzY1NTMgMi44MjIwNCwtNC43NDcxOCAzLjAwNDU4LC0xMi42OTA2IDAuNzI4NCwtMTcuNzIxODUgLTcuMTExMDMsLTE1LjcxODEzIC0yMS4wOTA5OCwtNTAuMTMwNTIgLTI1LjY4NjI0LC04OS4wNjExNiAtMC42NDczNSwtNS40ODQyNyAtNS40MzA5NSwtOS45NTM1MSAtMTAuOTUzOCwtOS45NTM1MyBsIC0yNC40NDA2NzUsLTZlLTUgYyAtNS41MjI4NDcsLTJlLTUgLTEwLjcxMzU5OCw0LjQyMzIxIC0xMS44OTA5OCw5LjgxODU0IHoiIC8+PHBhdGgKICAgICAgICAgICBpZD0icGF0aDMtOS0zLTMtOC03LTMtMS03LTMtNi0zLTQiCiAgICAgICAgICAgc3R5bGU9ImZpbGw6I2YxODcwMDtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6bm9uemVybztzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6NS44NzYzNztzdHJva2UtZGFzaGFycmF5Om5vbmU7c3Ryb2tlLW9wYWNpdHk6MSIKICAgICAgICAgICBkPSJtIDcyLjE4NzE0NSwtNjA4LjYzNDU1IGMgLTguMzg5MzY5LDM4LjQ0NDA2IC0yNy4yODIwOTMsNzAuODM0NDIgLTU0LjE3ODUyMSw5NC42MTM1MiAtNC4xMzcwMTksMy42NTc1NCAtNS40NDk4NDIsMTAuMjY5NTEgLTIuNjg4NTQ4LDE1LjA1MjUxIDE0LjY3NTkzOCwyNS40MjEwNyAyOS4zNTE4NzcsNTAuODQyMTQgNDQuMDI3ODE2LDc2LjI2MzIxIDIuNzYxMjkzLDQuNzgzIDguNjczNTU5LDYuMDk4MiAxMy4wNjg2NzMsMi43NTQzNSAyOC41NDgzNDUsLTIxLjcxOTg4IDUyLjUxMDcyNSwtNDguOTU3NjMgNzIuMDEzODc1LC04MS43NjU1MyAyLjgyMjA0LC00Ljc0NzE4IDMuMDA0NTgsLTEyLjY5MDYgMC43Mjg0LC0xNy43MjE4NSAtNy4xMTEwMywtMTUuNzE4MTMgLTIxLjA5MDk4LC01MC4xMzA1MiAtMjUuNjg2MjQsLTg5LjA2MTE2IC0wLjY0NzM1LC01LjQ4NDI3IC01LjQzMDk1LC05Ljk1MzUxIC0xMC45NTM4LC05Ljk1MzUzIGwgLTI0LjQ0MDY3NSwtNmUtNSBjIC01LjUyMjg0NywtMmUtNSAtMTAuNzEzNTk4LDQuNDIzMjEgLTExLjg5MDk4LDkuODE4NTQgeiIKICAgICAgICAgICB0cmFuc2Zvcm09InJvdGF0ZSgxMjAsMTU4LjQ2NDcsLTQ5NS45ODI3NSkiIC8+PHBhdGgKICAgICAgICAgICBpZD0icGF0aDMtOS0zLTMtOC03LTMtNS0yLTktMy0yLTctNSIKICAgICAgICAgICBzdHlsZT0iZmlsbDojY2UxNjI1O2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpub256ZXJvO3N0cm9rZTpub25lO3N0cm9rZS13aWR0aDo1Ljg3NjM3O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2Utb3BhY2l0eToxIgogICAgICAgICAgIGQ9Im0gNzIuMTg3MTQ1LC02MDguNjM0NTUgYyAtOC4zODkzNjksMzguNDQ0MDYgLTI3LjI4MjA5Myw3MC44MzQ0MiAtNTQuMTc4NTIxLDk0LjYxMzUyIC00LjEzNzAxOSwzLjY1NzU0IC01LjQ0OTg0MiwxMC4yNjk1MSAtMi42ODg1NDgsMTUuMDUyNTEgMTQuNjc1OTM4LDI1LjQyMTA3IDI5LjM1MTg3Nyw1MC44NDIxNCA0NC4wMjc4MTYsNzYuMjYzMjEgMi43NjEyOTMsNC43ODMgOC42NzM1NTksNi4wOTgyIDEzLjA2ODY3MywyLjc1NDM1IDI4LjU0ODM0NSwtMjEuNzE5ODggNTIuNTEwNzI1LC00OC45NTc2MyA3Mi4wMTM4NzUsLTgxLjc2NTUzIDIuODIyMDQsLTQuNzQ3MTggMy4wMDQ1OCwtMTIuNjkwNiAwLjcyODQsLTE3LjcyMTg1IC03LjExMTAzLC0xNS43MTgxMyAtMjEuMDkwOTgsLTUwLjEzMDUyIC0yNS42ODYyNCwtODkuMDYxMTYgLTAuNjQ3MzUsLTUuNDg0MjcgLTUuNDMwOTUsLTkuOTUzNTEgLTEwLjk1MzgsLTkuOTUzNTMgbCAtMjQuNDQwNjc1LC02ZS01IGMgLTUuNTIyODQ3LC0yZS01IC0xMC43MTM1OTgsNC40MjMyMSAtMTEuODkwOTgsOS44MTg1NCB6IgogICAgICAgICAgIHRyYW5zZm9ybT0icm90YXRlKC0xMjAsMTU4LjQ1NDE1LC00OTUuOTkxMjIpIiAvPjwvZz48ZwogICAgICAgICBpZD0iZzExLTctMC0wLTktMC0wLTUtMCIKICAgICAgICAgdHJhbnNmb3JtPSJtYXRyaXgoMC41MTY3MzI0NiwtMC4yOTgzMzU2MiwwLjI5ODMzNTYyLDAuNTE2NzMyNDYsMjQxLjk1NDY4LDQyMy45MzU3MykiCiAgICAgICAgIHN0eWxlPSJzdHJva2Utd2lkdGg6MC40NDM0MzIiPjxwYXRoCiAgICAgICAgICAgaWQ9InBhdGgzLTktMy0zLTgtNy0wLTEtMC0zLTEtOS0zIgogICAgICAgICAgIHN0eWxlPSJmaWxsOiMwMDhiOTI7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOm5vbnplcm87c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjUuODc2Mzc7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1vcGFjaXR5OjEiCiAgICAgICAgICAgZD0ibSA3Mi4xODcxNDUsLTYwOC42MzQ1NSBjIC04LjM4OTM2OSwzOC40NDQwNiAtMjcuMjgyMDkzLDcwLjgzNDQyIC01NC4xNzg1MjEsOTQuNjEzNTIgLTQuMTM3MDE5LDMuNjU3NTQgLTUuNDQ5ODQyLDEwLjI2OTUxIC0yLjY4ODU0OCwxNS4wNTI1MSAxNC42NzU5MzgsMjUuNDIxMDcgMjkuMzUxODc3LDUwLjg0MjE0IDQ0LjAyNzgxNiw3Ni4yNjMyMSAyLjc2MTI5Myw0Ljc4MyA4LjY3MzU1OSw2LjA5ODIgMTMuMDY4NjczLDIuNzU0MzUgMjguNTQ4MzQ1LC0yMS43MTk4OCA1Mi41MTA3MjUsLTQ4Ljk1NzYzIDcyLjAxMzg3NSwtODEuNzY1NTMgMi44MjIwNCwtNC43NDcxOCAzLjAwNDU4LC0xMi42OTA2IDAuNzI4NCwtMTcuNzIxODUgLTcuMTExMDMsLTE1LjcxODEzIC0yMS4wOTA5OCwtNTAuMTMwNTIgLTI1LjY4NjI0LC04OS4wNjExNiAtMC42NDczNSwtNS40ODQyNyAtNS40MzA5NSwtOS45NTM1MSAtMTAuOTUzOCwtOS45NTM1MyBsIC0yNC40NDA2NzUsLTZlLTUgYyAtNS41MjI4NDcsLTJlLTUgLTEwLjcxMzU5OCw0LjQyMzIxIC0xMS44OTA5OCw5LjgxODU0IHoiIC8+PHBhdGgKICAgICAgICAgICBpZD0icGF0aDMtOS0zLTMtOC03LTMtMS03LTMtNi05LTItNiIKICAgICAgICAgICBzdHlsZT0iZmlsbDojMDA3NWJmO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpub256ZXJvO3N0cm9rZTpub25lO3N0cm9rZS13aWR0aDo1Ljg3NjM3O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2Utb3BhY2l0eToxIgogICAgICAgICAgIGQ9Im0gNzIuMTg3MTQ1LC02MDguNjM0NTUgYyAtOC4zODkzNjksMzguNDQ0MDYgLTI3LjI4MjA5Myw3MC44MzQ0MiAtNTQuMTc4NTIxLDk0LjYxMzUyIC00LjEzNzAxOSwzLjY1NzU0IC01LjQ0OTg0MiwxMC4yNjk1MSAtMi42ODg1NDgsMTUuMDUyNTEgMTQuNjc1OTM4LDI1LjQyMTA3IDI5LjM1MTg3Nyw1MC44NDIxNCA0NC4wMjc4MTYsNzYuMjYzMjEgMi43NjEyOTMsNC43ODMgOC42NzM1NTksNi4wOTgyIDEzLjA2ODY3MywyLjc1NDM1IDI4LjU0ODM0NSwtMjEuNzE5ODggNTIuNTEwNzI1LC00OC45NTc2MyA3Mi4wMTM4NzUsLTgxLjc2NTUzIDIuODIyMDQsLTQuNzQ3MTggMy4wMDQ1OCwtMTIuNjkwNiAwLjcyODQsLTE3LjcyMTg1IC03LjExMTAzLC0xNS43MTgxMyAtMjEuMDkwOTgsLTUwLjEzMDUyIC0yNS42ODYyNCwtODkuMDYxMTYgLTAuNjQ3MzUsLTUuNDg0MjcgLTUuNDMwOTUsLTkuOTUzNTEgLTEwLjk1MzgsLTkuOTUzNTMgbCAtMjQuNDQwNjc1LC02ZS01IGMgLTUuNTIyODQ3LC0yZS01IC0xMC43MTM1OTgsNC40MjMyMSAtMTEuODkwOTgsOS44MTg1NCB6IgogICAgICAgICAgIHRyYW5zZm9ybT0icm90YXRlKDEyMCwxNTguNDY0NywtNDk1Ljk4Mjc1KSIgLz48cGF0aAogICAgICAgICAgIGlkPSJwYXRoMy05LTMtMy04LTctMy01LTItOS0zLTItNi0yLTEiCiAgICAgICAgICAgc3R5bGU9ImZpbGw6IzI5MjM1YztmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6bm9uemVybztzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6NS44NzYzNztzdHJva2UtZGFzaGFycmF5Om5vbmU7c3Ryb2tlLW9wYWNpdHk6MSIKICAgICAgICAgICBkPSJtIDcyLjE4NzE0NSwtNjA4LjYzNDU1IGMgLTguMzg5MzY5LDM4LjQ0NDA2IC0yNy4yODIwOTMsNzAuODM0NDIgLTU0LjE3ODUyMSw5NC42MTM1MiAtNC4xMzcwMTksMy42NTc1NCAtNS40NDk4NDIsMTAuMjY5NTEgLTIuNjg4NTQ4LDE1LjA1MjUxIDE0LjY3NTkzOCwyNS40MjEwNyAyOS4zNTE4NzcsNTAuODQyMTQgNDQuMDI3ODE2LDc2LjI2MzIxIDIuNzYxMjkzLDQuNzgzIDguNjczNTU5LDYuMDk4MiAxMy4wNjg2NzMsMi43NTQzNSAyOC41NDgzNDUsLTIxLjcxOTg4IDUyLjUxMDcyNSwtNDguOTU3NjMgNzIuMDEzODc1LC04MS43NjU1MyAyLjgyMjA0LC00Ljc0NzE4IDMuMDA0NTgsLTEyLjY5MDYgMC43Mjg0LC0xNy43MjE4NSAtNy4xMTEwMywtMTUuNzE4MTMgLTIxLjA5MDk4LC01MC4xMzA1MiAtMjUuNjg2MjQsLTg5LjA2MTE2IC0wLjY0NzM1LC01LjQ4NDI3IC01LjQzMDk1LC05Ljk1MzUxIC0xMC45NTM4LC05Ljk1MzUzIGwgLTI0LjQ0MDY3NSwtNmUtNSBjIC01LjUyMjg0NywtMmUtNSAtMTAuNzEzNTk4LDQuNDIzMjEgLTExLjg5MDk4LDkuODE4NTQgeiIKICAgICAgICAgICB0cmFuc2Zvcm09InJvdGF0ZSgtMTIwLDE1OC40NTQxNSwtNDk1Ljk5MTIyKSIgLz48L2c+PGcKICAgICAgICAgaWQ9ImcxMS03LTAtMC05LTAtMi04OS0wIgogICAgICAgICB0cmFuc2Zvcm09Im1hdHJpeCgwLDAuNTk2NjcxMjUsMC41OTY2NzEyNSwwLDYzMC4xMzI4NCwyNS42ODQyMjEpIgogICAgICAgICBzdHlsZT0ic3Ryb2tlLXdpZHRoOjAuNDQzNDMyIj48cGF0aAogICAgICAgICAgIGlkPSJwYXRoMy05LTMtMy04LTctMC0xLTAtMy0xNi03LTYiCiAgICAgICAgICAgc3R5bGU9ImZpbGw6I2ZmY2MwMDtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6bm9uemVybztzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6NS44NzYzNztzdHJva2UtZGFzaGFycmF5Om5vbmU7c3Ryb2tlLW9wYWNpdHk6MSIKICAgICAgICAgICBkPSJtIDcyLjE4NzE0NSwtNjA4LjYzNDU1IGMgLTguMzg5MzY5LDM4LjQ0NDA2IC0yNy4yODIwOTMsNzAuODM0NDIgLTU0LjE3ODUyMSw5NC42MTM1MiAtNC4xMzcwMTksMy42NTc1NCAtNS40NDk4NDIsMTAuMjY5NTEgLTIuNjg4NTQ4LDE1LjA1MjUxIDE0LjY3NTkzOCwyNS40MjEwNyAyOS4zNTE4NzcsNTAuODQyMTQgNDQuMDI3ODE2LDc2LjI2MzIxIDIuNzYxMjkzLDQuNzgzIDguNjczNTU5LDYuMDk4MiAxMy4wNjg2NzMsMi43NTQzNSAyOC41NDgzNDUsLTIxLjcxOTg4IDUyLjUxMDcyNSwtNDguOTU3NjMgNzIuMDEzODc1LC04MS43NjU1MyAyLjgyMjA0LC00Ljc0NzE4IDMuMDA0NTgsLTEyLjY5MDYgMC43Mjg0LC0xNy43MjE4NSAtNy4xMTEwMywtMTUuNzE4MTMgLTIxLjA5MDk4LC01MC4xMzA1MiAtMjUuNjg2MjQsLTg5LjA2MTE2IC0wLjY0NzM1LC01LjQ4NDI3IC01LjQzMDk1LC05Ljk1MzUxIC0xMC45NTM4LC05Ljk1MzUzIGwgLTI0LjQ0MDY3NSwtNmUtNSBjIC01LjUyMjg0NywtMmUtNSAtMTAuNzEzNTk4LDQuNDIzMjEgLTExLjg5MDk4LDkuODE4NTQgeiIgLz48cGF0aAogICAgICAgICAgIGlkPSJwYXRoMy05LTMtMy04LTctMy0xLTctMy02LTItMzYtMyIKICAgICAgICAgICBzdHlsZT0iZmlsbDojZjE4NzAwO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpub256ZXJvO3N0cm9rZTpub25lO3N0cm9rZS13aWR0aDo1Ljg3NjM3O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2Utb3BhY2l0eToxIgogICAgICAgICAgIGQ9Im0gNzIuMTg3MTQ1LC02MDguNjM0NTUgYyAtOC4zODkzNjksMzguNDQ0MDYgLTI3LjI4MjA5Myw3MC44MzQ0MiAtNTQuMTc4NTIxLDk0LjYxMzUyIC00LjEzNzAxOSwzLjY1NzU0IC01LjQ0OTg0MiwxMC4yNjk1MSAtMi42ODg1NDgsMTUuMDUyNTEgMTQuNjc1OTM4LDI1LjQyMTA3IDI5LjM1MTg3Nyw1MC44NDIxNCA0NC4wMjc4MTYsNzYuMjYzMjEgMi43NjEyOTMsNC43ODMgOC42NzM1NTksNi4wOTgyIDEzLjA2ODY3MywyLjc1NDM1IDI4LjU0ODM0NSwtMjEuNzE5ODggNTIuNTEwNzI1LC00OC45NTc2MyA3Mi4wMTM4NzUsLTgxLjc2NTUzIDIuODIyMDQsLTQuNzQ3MTggMy4wMDQ1OCwtMTIuNjkwNiAwLjcyODQsLTE3LjcyMTg1IC03LjExMTAzLC0xNS43MTgxMyAtMjEuMDkwOTgsLTUwLjEzMDUyIC0yNS42ODYyNCwtODkuMDYxMTYgLTAuNjQ3MzUsLTUuNDg0MjcgLTUuNDMwOTUsLTkuOTUzNTEgLTEwLjk1MzgsLTkuOTUzNTMgbCAtMjQuNDQwNjc1LC02ZS01IGMgLTUuNTIyODQ3LC0yZS01IC0xMC43MTM1OTgsNC40MjMyMSAtMTEuODkwOTgsOS44MTg1NCB6IgogICAgICAgICAgIHRyYW5zZm9ybT0icm90YXRlKDEyMCwxNTguNDY0NywtNDk1Ljk4Mjc1KSIgLz48cGF0aAogICAgICAgICAgIGlkPSJwYXRoMy05LTMtMy04LTctMy01LTItOS0zLTItMS0xLTIiCiAgICAgICAgICAgc3R5bGU9ImZpbGw6I2NlMTYyNTtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6bm9uemVybztzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6NS44NzYzNztzdHJva2UtZGFzaGFycmF5Om5vbmU7c3Ryb2tlLW9wYWNpdHk6MSIKICAgICAgICAgICBkPSJtIDcyLjE4NzE0NSwtNjA4LjYzNDU1IGMgLTguMzg5MzY5LDM4LjQ0NDA2IC0yNy4yODIwOTMsNzAuODM0NDIgLTU0LjE3ODUyMSw5NC42MTM1MiAtNC4xMzcwMTksMy42NTc1NCAtNS40NDk4NDIsMTAuMjY5NTEgLTIuNjg4NTQ4LDE1LjA1MjUxIDE0LjY3NTkzOCwyNS40MjEwNyAyOS4zNTE4NzcsNTAuODQyMTQgNDQuMDI3ODE2LDc2LjI2MzIxIDIuNzYxMjkzLDQuNzgzIDguNjczNTU5LDYuMDk4MiAxMy4wNjg2NzMsMi43NTQzNSAyOC41NDgzNDUsLTIxLjcxOTg4IDUyLjUxMDcyNSwtNDguOTU3NjMgNzIuMDEzODc1LC04MS43NjU1MyAyLjgyMjA0LC00Ljc0NzE4IDMuMDA0NTgsLTEyLjY5MDYgMC43Mjg0LC0xNy43MjE4NSAtNy4xMTEwMywtMTUuNzE4MTMgLTIxLjA5MDk4LC01MC4xMzA1MiAtMjUuNjg2MjQsLTg5LjA2MTE2IC0wLjY0NzM1LC01LjQ4NDI3IC01LjQzMDk1LC05Ljk1MzUxIC0xMC45NTM4LC05Ljk1MzUzIGwgLTI0LjQ0MDY3NSwtNmUtNSBjIC01LjUyMjg0NywtMmUtNSAtMTAuNzEzNTk4LDQuNDIzMjEgLTExLjg5MDk4LDkuODE4NTQgeiIKICAgICAgICAgICB0cmFuc2Zvcm09InJvdGF0ZSgtMTIwLDE1OC40NTQxNSwtNDk1Ljk5MTIyKSIgLz48L2c+PGcKICAgICAgICAgaWQ9ImcxMS03LTAtMC05LTAtMi04LTItMCIKICAgICAgICAgdHJhbnNmb3JtPSJtYXRyaXgoMCwwLjU5NjY3MTI1LDAuNTk2NjcxMjUsMCw2MzAuNDM1NjUsMzAwLjMxMjg0KSIKICAgICAgICAgc3R5bGU9InN0cm9rZS13aWR0aDowLjQ0MzQzMiI+PHBhdGgKICAgICAgICAgICBpZD0icGF0aDMtOS0zLTMtOC03LTAtMS0wLTMtMTYtNi05LTYiCiAgICAgICAgICAgc3R5bGU9ImZpbGw6I2ZmY2MwMDtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6bm9uemVybztzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6NS44NzYzNztzdHJva2UtZGFzaGFycmF5Om5vbmU7c3Ryb2tlLW9wYWNpdHk6MSIKICAgICAgICAgICBkPSJtIDcyLjE4NzE0NSwtNjA4LjYzNDU1IGMgLTguMzg5MzY5LDM4LjQ0NDA2IC0yNy4yODIwOTMsNzAuODM0NDIgLTU0LjE3ODUyMSw5NC42MTM1MiAtNC4xMzcwMTksMy42NTc1NCAtNS40NDk4NDIsMTAuMjY5NTEgLTIuNjg4NTQ4LDE1LjA1MjUxIDE0LjY3NTkzOCwyNS40MjEwNyAyOS4zNTE4NzcsNTAuODQyMTQgNDQuMDI3ODE2LDc2LjI2MzIxIDIuNzYxMjkzLDQuNzgzIDguNjczNTU5LDYuMDk4MiAxMy4wNjg2NzMsMi43NTQzNSAyOC41NDgzNDUsLTIxLjcxOTg4IDUyLjUxMDcyNSwtNDguOTU3NjMgNzIuMDEzODc1LC04MS43NjU1MyAyLjgyMjA0LC00Ljc0NzE4IDMuMDA0NTgsLTEyLjY5MDYgMC43Mjg0LC0xNy43MjE4NSAtNy4xMTEwMywtMTUuNzE4MTMgLTIxLjA5MDk4LC01MC4xMzA1MiAtMjUuNjg2MjQsLTg5LjA2MTE2IC0wLjY0NzM1LC01LjQ4NDI3IC01LjQzMDk1LC05Ljk1MzUxIC0xMC45NTM4LC05Ljk1MzUzIGwgLTI0LjQ0MDY3NSwtNmUtNSBjIC01LjUyMjg0NywtMmUtNSAtMTAuNzEzNTk4LDQuNDIzMjEgLTExLjg5MDk4LDkuODE4NTQgeiIgLz48cGF0aAogICAgICAgICAgIGlkPSJwYXRoMy05LTMtMy04LTctMy0xLTctMy02LTItMy0zLTEiCiAgICAgICAgICAgc3R5bGU9ImZpbGw6I2YxODcwMDtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6bm9uemVybztzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6NS44NzYzNztzdHJva2UtZGFzaGFycmF5Om5vbmU7c3Ryb2tlLW9wYWNpdHk6MSIKICAgICAgICAgICBkPSJtIDcyLjE4NzE0NSwtNjA4LjYzNDU1IGMgLTguMzg5MzY5LDM4LjQ0NDA2IC0yNy4yODIwOTMsNzAuODM0NDIgLTU0LjE3ODUyMSw5NC42MTM1MiAtNC4xMzcwMTksMy42NTc1NCAtNS40NDk4NDIsMTAuMjY5NTEgLTIuNjg4NTQ4LDE1LjA1MjUxIDE0LjY3NTkzOCwyNS40MjEwNyAyOS4zNTE4NzcsNTAuODQyMTQgNDQuMDI3ODE2LDc2LjI2MzIxIDIuNzYxMjkzLDQuNzgzIDguNjczNTU5LDYuMDk4MiAxMy4wNjg2NzMsMi43NTQzNSAyOC41NDgzNDUsLTIxLjcxOTg4IDUyLjUxMDcyNSwtNDguOTU3NjMgNzIuMDEzODc1LC04MS43NjU1MyAyLjgyMjA0LC00Ljc0NzE4IDMuMDA0NTgsLTEyLjY5MDYgMC43Mjg0LC0xNy43MjE4NSAtNy4xMTEwMywtMTUuNzE4MTMgLTIxLjA5MDk4LC01MC4xMzA1MiAtMjUuNjg2MjQsLTg5LjA2MTE2IC0wLjY0NzM1LC01LjQ4NDI3IC01LjQzMDk1LC05Ljk1MzUxIC0xMC45NTM4LC05Ljk1MzUzIGwgLTI0LjQ0MDY3NSwtNmUtNSBjIC01LjUyMjg0NywtMmUtNSAtMTAuNzEzNTk4LDQuNDIzMjEgLTExLjg5MDk4LDkuODE4NTQgeiIKICAgICAgICAgICB0cmFuc2Zvcm09InJvdGF0ZSgxMjAsMTU4LjQ2NDcsLTQ5NS45ODI3NSkiIC8+PHBhdGgKICAgICAgICAgICBpZD0icGF0aDMtOS0zLTMtOC03LTMtNS0yLTktMy0yLTEtOC0xLTUiCiAgICAgICAgICAgc3R5bGU9ImZpbGw6I2NlMTYyNTtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6bm9uemVybztzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6NS44NzYzNztzdHJva2UtZGFzaGFycmF5Om5vbmU7c3Ryb2tlLW9wYWNpdHk6MSIKICAgICAgICAgICBkPSJtIDcyLjE4NzE0NSwtNjA4LjYzNDU1IGMgLTguMzg5MzY5LDM4LjQ0NDA2IC0yNy4yODIwOTMsNzAuODM0NDIgLTU0LjE3ODUyMSw5NC42MTM1MiAtNC4xMzcwMTksMy42NTc1NCAtNS40NDk4NDIsMTAuMjY5NTEgLTIuNjg4NTQ4LDE1LjA1MjUxIDE0LjY3NTkzOCwyNS40MjEwNyAyOS4zNTE4NzcsNTAuODQyMTQgNDQuMDI3ODE2LDc2LjI2MzIxIDIuNzYxMjkzLDQuNzgzIDguNjczNTU5LDYuMDk4MiAxMy4wNjg2NzMsMi43NTQzNSAyOC41NDgzNDUsLTIxLjcxOTg4IDUyLjUxMDcyNSwtNDguOTU3NjMgNzIuMDEzODc1LC04MS43NjU1MyAyLjgyMjA0LC00Ljc0NzE4IDMuMDA0NTgsLTEyLjY5MDYgMC43Mjg0LC0xNy43MjE4NSAtNy4xMTEwMywtMTUuNzE4MTMgLTIxLjA5MDk4LC01MC4xMzA1MiAtMjUuNjg2MjQsLTg5LjA2MTE2IC0wLjY0NzM1LC01LjQ4NDI3IC01LjQzMDk1LC05Ljk1MzUxIC0xMC45NTM4LC05Ljk1MzUzIGwgLTI0LjQ0MDY3NSwtNmUtNSBjIC01LjUyMjg0NywtMmUtNSAtMTAuNzEzNTk4LDQuNDIzMjEgLTExLjg5MDk4LDkuODE4NTQgeiIKICAgICAgICAgICB0cmFuc2Zvcm09InJvdGF0ZSgtMTIwLDE1OC40NTQxNCwtNDk1Ljk5MTIyKSIgLz48L2c+PGcKICAgICAgICAgaWQ9ImcxMS03LTAtMC05LTAtMC0wLTk0LTUiCiAgICAgICAgIHRyYW5zZm9ybT0ibWF0cml4KDAuNTE2NzMyNDYsLTAuMjk4MzM1NjIsMC4yOTgzMzU2MiwwLjUxNjczMjQ2LDQ3OC44MjAxMSw1NjAuMjg5NykiCiAgICAgICAgIHN0eWxlPSJzdHJva2Utd2lkdGg6MC40NDM0MzIiPjxwYXRoCiAgICAgICAgICAgaWQ9InBhdGgzLTktMy0zLTgtNy0wLTEtMC0zLTEtMS03OC00IgogICAgICAgICAgIHN0eWxlPSJmaWxsOiMwMDhiOTI7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOm5vbnplcm87c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjUuODc2Mzc7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1vcGFjaXR5OjEiCiAgICAgICAgICAgZD0ibSA3Mi4xODcxNDUsLTYwOC42MzQ1NSBjIC04LjM4OTM2OSwzOC40NDQwNiAtMjcuMjgyMDkzLDcwLjgzNDQyIC01NC4xNzg1MjEsOTQuNjEzNTIgLTQuMTM3MDE5LDMuNjU3NTQgLTUuNDQ5ODQyLDEwLjI2OTUxIC0yLjY4ODU0OCwxNS4wNTI1MSAxNC42NzU5MzgsMjUuNDIxMDcgMjkuMzUxODc3LDUwLjg0MjE0IDQ0LjAyNzgxNiw3Ni4yNjMyMSAyLjc2MTI5Myw0Ljc4MyA4LjY3MzU1OSw2LjA5ODIgMTMuMDY4NjczLDIuNzU0MzUgMjguNTQ4MzQ1LC0yMS43MTk4OCA1Mi41MTA3MjUsLTQ4Ljk1NzYzIDcyLjAxMzg3NSwtODEuNzY1NTMgMi44MjIwNCwtNC43NDcxOCAzLjAwNDU4LC0xMi42OTA2IDAuNzI4NCwtMTcuNzIxODUgLTcuMTExMDMsLTE1LjcxODEzIC0yMS4wOTA5OCwtNTAuMTMwNTIgLTI1LjY4NjI0LC04OS4wNjExNiAtMC42NDczNSwtNS40ODQyNyAtNS40MzA5NSwtOS45NTM1MSAtMTAuOTUzOCwtOS45NTM1MyBsIC0yNC40NDA2NzUsLTZlLTUgYyAtNS41MjI4NDcsLTJlLTUgLTEwLjcxMzU5OCw0LjQyMzIxIC0xMS44OTA5OCw5LjgxODU0IHoiIC8+PHBhdGgKICAgICAgICAgICBpZD0icGF0aDMtOS0zLTMtOC03LTMtMS03LTMtNi05LTktNC03IgogICAgICAgICAgIHN0eWxlPSJmaWxsOiMwMDc1YmY7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOm5vbnplcm87c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjUuODc2Mzc7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1vcGFjaXR5OjEiCiAgICAgICAgICAgZD0ibSA3Mi4xODcxNDUsLTYwOC42MzQ1NSBjIC04LjM4OTM2OSwzOC40NDQwNiAtMjcuMjgyMDkzLDcwLjgzNDQyIC01NC4xNzg1MjEsOTQuNjEzNTIgLTQuMTM3MDE5LDMuNjU3NTQgLTUuNDQ5ODQyLDEwLjI2OTUxIC0yLjY4ODU0OCwxNS4wNTI1MSAxNC42NzU5MzgsMjUuNDIxMDcgMjkuMzUxODc3LDUwLjg0MjE0IDQ0LjAyNzgxNiw3Ni4yNjMyMSAyLjc2MTI5Myw0Ljc4MyA4LjY3MzU1OSw2LjA5ODIgMTMuMDY4NjczLDIuNzU0MzUgMjguNTQ4MzQ1LC0yMS43MTk4OCA1Mi41MTA3MjUsLTQ4Ljk1NzYzIDcyLjAxMzg3NSwtODEuNzY1NTMgMi44MjIwNCwtNC43NDcxOCAzLjAwNDU4LC0xMi42OTA2IDAuNzI4NCwtMTcuNzIxODUgLTcuMTExMDMsLTE1LjcxODEzIC0yMS4wOTA5OCwtNTAuMTMwNTIgLTI1LjY4NjI0LC04OS4wNjExNiAtMC42NDczNSwtNS40ODQyNyAtNS40MzA5NSwtOS45NTM1MSAtMTAuOTUzOCwtOS45NTM1MyBsIC0yNC40NDA2NzUsLTZlLTUgYyAtNS41MjI4NDcsLTJlLTUgLTEwLjcxMzU5OCw0LjQyMzIxIC0xMS44OTA5OCw5LjgxODU0IHoiCiAgICAgICAgICAgdHJhbnNmb3JtPSJyb3RhdGUoMTIwLDE1OC40NjQ3LC00OTUuOTgyNzUpIiAvPjxwYXRoCiAgICAgICAgICAgaWQ9InBhdGgzLTktMy0zLTgtNy0zLTUtMi05LTMtMi02LTctNS02IgogICAgICAgICAgIHN0eWxlPSJmaWxsOiMyOTIzNWM7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOm5vbnplcm87c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjUuODc2Mzc7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1vcGFjaXR5OjEiCiAgICAgICAgICAgZD0ibSA3Mi4xODcxNDUsLTYwOC42MzQ1NSBjIC04LjM4OTM2OSwzOC40NDQwNiAtMjcuMjgyMDkzLDcwLjgzNDQyIC01NC4xNzg1MjEsOTQuNjEzNTIgLTQuMTM3MDE5LDMuNjU3NTQgLTUuNDQ5ODQyLDEwLjI2OTUxIC0yLjY4ODU0OCwxNS4wNTI1MSAxNC42NzU5MzgsMjUuNDIxMDcgMjkuMzUxODc3LDUwLjg0MjE0IDQ0LjAyNzgxNiw3Ni4yNjMyMSAyLjc2MTI5Myw0Ljc4MyA4LjY3MzU1OSw2LjA5ODIgMTMuMDY4NjczLDIuNzU0MzUgMjguNTQ4MzQ1LC0yMS43MTk4OCA1Mi41MTA3MjUsLTQ4Ljk1NzYzIDcyLjAxMzg3NSwtODEuNzY1NTMgMi44MjIwNCwtNC43NDcxOCAzLjAwNDU4LC0xMi42OTA2IDAuNzI4NCwtMTcuNzIxODUgLTcuMTExMDMsLTE1LjcxODEzIC0yMS4wOTA5OCwtNTAuMTMwNTIgLTI1LjY4NjI0LC04OS4wNjExNiAtMC42NDczNSwtNS40ODQyNyAtNS40MzA5NSwtOS45NTM1MSAtMTAuOTUzOCwtOS45NTM1MyBsIC0yNC40NDA2NzUsLTZlLTUgYyAtNS41MjI4NDcsLTJlLTUgLTEwLjcxMzU5OCw0LjQyMzIxIC0xMS44OTA5OCw5LjgxODU0IHoiCiAgICAgICAgICAgdHJhbnNmb3JtPSJyb3RhdGUoLTEyMCwxNTguNDU0MTUsLTQ5NS45OTEyMikiIC8+PC9nPjxnCiAgICAgICAgIGlkPSJnMTEtNy0wLTAtOS0wLTAtMC05LTAtNSIKICAgICAgICAgdHJhbnNmb3JtPSJtYXRyaXgoMC41MTY3MzI0NiwtMC4yOTgzMzU2MiwwLjI5ODMzNTYyLDAuNTE2NzMyNDYsMjQxLjk1NDY3LDY5OC43MzI1MSkiCiAgICAgICAgIHN0eWxlPSJzdHJva2Utd2lkdGg6MC40NDM0MzIiPjxwYXRoCiAgICAgICAgICAgaWQ9InBhdGgzLTktMy0zLTgtNy0wLTEtMC0zLTEtMS01LTMtNiIKICAgICAgICAgICBzdHlsZT0iZmlsbDojMDA4YjkyO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpub256ZXJvO3N0cm9rZTpub25lO3N0cm9rZS13aWR0aDo1Ljg3NjM3O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2Utb3BhY2l0eToxIgogICAgICAgICAgIGQ9Im0gNzIuMTg3MTQ1LC02MDguNjM0NTUgYyAtOC4zODkzNjksMzguNDQ0MDYgLTI3LjI4MjA5Myw3MC44MzQ0MiAtNTQuMTc4NTIxLDk0LjYxMzUyIC00LjEzNzAxOSwzLjY1NzU0IC01LjQ0OTg0MiwxMC4yNjk1MSAtMi42ODg1NDgsMTUuMDUyNTEgMTQuNjc1OTM4LDI1LjQyMTA3IDI5LjM1MTg3Nyw1MC44NDIxNCA0NC4wMjc4MTYsNzYuMjYzMjEgMi43NjEyOTMsNC43ODMgOC42NzM1NTksNi4wOTgyIDEzLjA2ODY3MywyLjc1NDM1IDI4LjU0ODM0NSwtMjEuNzE5ODggNTIuNTEwNzI1LC00OC45NTc2MyA3Mi4wMTM4NzUsLTgxLjc2NTUzIDIuODIyMDQsLTQuNzQ3MTggMy4wMDQ1OCwtMTIuNjkwNiAwLjcyODQsLTE3LjcyMTg1IC03LjExMTAzLC0xNS43MTgxMyAtMjEuMDkwOTgsLTUwLjEzMDUyIC0yNS42ODYyNCwtODkuMDYxMTYgLTAuNjQ3MzUsLTUuNDg0MjcgLTUuNDMwOTUsLTkuOTUzNTEgLTEwLjk1MzgsLTkuOTUzNTMgbCAtMjQuNDQwNjc1LC02ZS01IGMgLTUuNTIyODQ3LC0yZS01IC0xMC43MTM1OTgsNC40MjMyMSAtMTEuODkwOTgsOS44MTg1NCB6IiAvPjxwYXRoCiAgICAgICAgICAgaWQ9InBhdGgzLTktMy0zLTgtNy0zLTEtNy0zLTYtOS05LTEtNi05IgogICAgICAgICAgIHN0eWxlPSJmaWxsOiMwMDc1YmY7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOm5vbnplcm87c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjUuODc2Mzc7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1vcGFjaXR5OjEiCiAgICAgICAgICAgZD0ibSA3Mi4xODcxNDUsLTYwOC42MzQ1NSBjIC04LjM4OTM2OSwzOC40NDQwNiAtMjcuMjgyMDkzLDcwLjgzNDQyIC01NC4xNzg1MjEsOTQuNjEzNTIgLTQuMTM3MDE5LDMuNjU3NTQgLTUuNDQ5ODQyLDEwLjI2OTUxIC0yLjY4ODU0OCwxNS4wNTI1MSAxNC42NzU5MzgsMjUuNDIxMDcgMjkuMzUxODc3LDUwLjg0MjE0IDQ0LjAyNzgxNiw3Ni4yNjMyMSAyLjc2MTI5Myw0Ljc4MyA4LjY3MzU1OSw2LjA5ODIgMTMuMDY4NjczLDIuNzU0MzUgMjguNTQ4MzQ1LC0yMS43MTk4OCA1Mi41MTA3MjUsLTQ4Ljk1NzYzIDcyLjAxMzg3NSwtODEuNzY1NTMgMi44MjIwNCwtNC43NDcxOCAzLjAwNDU4LC0xMi42OTA2IDAuNzI4NCwtMTcuNzIxODUgLTcuMTExMDMsLTE1LjcxODEzIC0yMS4wOTA5OCwtNTAuMTMwNTIgLTI1LjY4NjI0LC04OS4wNjExNiAtMC42NDczNSwtNS40ODQyNyAtNS40MzA5NSwtOS45NTM1MSAtMTAuOTUzOCwtOS45NTM1MyBsIC0yNC40NDA2NzUsLTZlLTUgYyAtNS41MjI4NDcsLTJlLTUgLTEwLjcxMzU5OCw0LjQyMzIxIC0xMS44OTA5OCw5LjgxODU0IHoiCiAgICAgICAgICAgdHJhbnNmb3JtPSJyb3RhdGUoMTIwLDE1OC40NjQ3LC00OTUuOTgyNzUpIiAvPjxwYXRoCiAgICAgICAgICAgaWQ9InBhdGgzLTktMy0zLTgtNy0zLTUtMi05LTMtMi02LTctMi0xMC0zIgogICAgICAgICAgIHN0eWxlPSJmaWxsOiMyOTIzNWM7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOm5vbnplcm87c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjUuODc2Mzc7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1vcGFjaXR5OjEiCiAgICAgICAgICAgZD0ibSA3Mi4xODcxNDUsLTYwOC42MzQ1NSBjIC04LjM4OTM2OSwzOC40NDQwNiAtMjcuMjgyMDkzLDcwLjgzNDQyIC01NC4xNzg1MjEsOTQuNjEzNTIgLTQuMTM3MDE5LDMuNjU3NTQgLTUuNDQ5ODQyLDEwLjI2OTUxIC0yLjY4ODU0OCwxNS4wNTI1MSAxNC42NzU5MzgsMjUuNDIxMDcgMjkuMzUxODc3LDUwLjg0MjE0IDQ0LjAyNzgxNiw3Ni4yNjMyMSAyLjc2MTI5Myw0Ljc4MyA4LjY3MzU1OSw2LjA5ODIgMTMuMDY4NjczLDIuNzU0MzUgMjguNTQ4MzQ1LC0yMS43MTk4OCA1Mi41MTA3MjUsLTQ4Ljk1NzYzIDcyLjAxMzg3NSwtODEuNzY1NTMgMi44MjIwNCwtNC43NDcxOCAzLjAwNDU4LC0xMi42OTA2IDAuNzI4NCwtMTcuNzIxODUgLTcuMTExMDMsLTE1LjcxODEzIC0yMS4wOTA5OCwtNTAuMTMwNTIgLTI1LjY4NjI0LC04OS4wNjExNiAtMC42NDczNSwtNS40ODQyNyAtNS40MzA5NSwtOS45NTM1MSAtMTAuOTUzOCwtOS45NTM1MyBsIC0yNC40NDA2NzUsLTZlLTUgYyAtNS41MjI4NDcsLTJlLTUgLTEwLjcxMzU5OCw0LjQyMzIxIC0xMS44OTA5OCw5LjgxODU0IHoiCiAgICAgICAgICAgdHJhbnNmb3JtPSJyb3RhdGUoLTEyMCwxNTguNDU0MTUsLTQ5NS45OTEyMikiIC8+PC9nPjwvZz48L2c+PGcKICAgICBpZD0ibGF5ZXIxIiAvPjwvc3ZnPgo="
                        alt="STUPA MAKERS"
                        width={120} // Equivalent to w-40 in a typical Tailwind config (160px)
                        height={40} // Adjust height as needed, maintaining aspect ratio
                        priority
                    />
                </div>
                <nav className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/5 shadow-inner">
                    <NavButton
                        active={currentView === "viz"}
                        onClick={() => setCurrentView("viz")}
                    >
                        LIVE
                    </NavButton>
                    <NavButton
                        active={currentView === "animations"}
                        onClick={() => setCurrentView("animations")}
                    >
                        ANIMATION
                    </NavButton>
                    <NavButton
                        active={currentView === "presets"}
                        onClick={() => setCurrentView("presets")}
                    >
                        PRESETS
                    </NavButton>
                </nav>
            </header>
            {/* Main Content */}
            <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Visualization View */}
                <div
                    className={`h-full flex-col ${currentView === "viz" ? "flex w-full md:w-full" : "hidden md:flex md:w-1/2"}`}
                >
                    <Visualization config={config} />
                </div>

                {/* Right Panel for other tabs */}
                <div
                    className={`border-l border-white/5 bg-gray-900/20 flex-1 overflow-y-auto ${currentView === "viz" ? "hidden md:hidden" : "block w-full md:block md:w-1/2"}`}
                >
                    {/* Animations View */}
                    <div
                        className={`h-full overflow-y-auto p-4 md:p-12 ${currentView === "animations" ? "block" : "hidden"}`}
                    >
                        <div className="max-w-4xl mx-auto">
                            <form
                                ref={formRef}
                                onInput={handleFormChange}
                                className="space-y-10"
                            >
                                {/* Animation */}
                                <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-white/5 shadow-xl">
                                    <AnimationEditor
                                        config={config.animation}
                                        onChange={updateAnimationConfig}
                                        allAnimations={animations}
                                        availableAnimations={animations}
                                        presets={presets}
                                        isRoot={true}
                                    />
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Presets View */}
                    <div
                        className={`h-full overflow-y-auto p-4 md:p-12 ${currentView === "presets" ? "block" : "hidden"}`}
                    >
                        <div className="max-w-4xl mx-auto">
                            <PresetsManager
                                presets={presets}
                                animations={animations}
                                onPresetsChanged={fetchData}
                                onPresetLoaded={fetchData}
                                showSnackbar={showSnackbar}
                            />
                        </div>
                    </div>
                </div>
            </main>

            {/* Mobile Floating Save Button */}
            <div
                className={`fixed bottom-8 right-6 z-50 ${currentView === "viz" ? "hidden" : ""}`}
            >
                <button
                    onClick={saveConfig}
                    disabled={saving || !isFormValid}
                    className={`w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all transform active:scale-90 disabled:opacity-50 ${
                        !isFormValid
                            ? "bg-gray-800 text-gray-600 border border-white/5"
                            : "bg-teal-600 text-white shadow-teal-900/40"
                    }`}
                >
                    {saving ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/20 border-t-white"></div>
                    ) : (
                        <svg
                            className="w-6 h-6"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                            <polyline points="17 21 17 13 7 13 7 21" />
                            <polyline points="7 3 7 8 15 8" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Snackbar */}
            <div
                className={`fixed bottom-4 right-4 px-6 py-3 rounded shadow-lg text-white transition-all duration-300 transform ${
                    snackbar.show
                        ? "translate-y-0 opacity-100"
                        : "translate-y-2 opacity-0 pointer-events-none"
                } ${snackbar.type === "error" ? "bg-red-600" : "bg-teal-600"}`}
            >
                {snackbar.message}
            </div>
        </div>
    );
}

function NavButton({ active, onClick, children }) {
    return (
        <button
            onClick={onClick}
            className={`px-6 py-1.5 rounded-lg transition-all font-bold text-[11px] tracking-wider uppercase ${
                active
                    ? "bg-teal-600 text-white shadow-lg shadow-teal-900/20"
                    : "text-gray-500 hover:text-gray-300"
            }`}
        >
            {children}
        </button>
    );
}
