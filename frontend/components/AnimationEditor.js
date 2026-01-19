"use client";

import { useEffect, useState } from "react";
import { Trash2, Plus } from "lucide-react";

/**
 * A recursive component to edit an animation and its parameters.
 */
export default function AnimationEditor({
    config, // The current configuration for this animation, e.g., { "strobo": { "frequency": 10 } }
    onChange, // Callback when the configuration changes
    availableAnimations, // The list of animations to show in the dropdown
    allAnimations, // The complete list of all animations (for nested editors)
    presets = [],
    isRoot = false, // Flag to indicate if this is a top-level editor
    isDeletable = false,
}) {
    const [selectedAnimName, setSelectedAnimName] = useState("");
    const [params, setParams] = useState({});

    // Effect to synchronize the component's state with the `config` prop from above.
    useEffect(() => {
        if (!config || typeof config !== "object") return;

        // The config is expected to have a single key which is the animation name.
        const keys = Object.keys(config);
        if (keys.length === 1) {
            const name = keys[0];
            const animParams = config[name] || {};
            setSelectedAnimName(name);
            setParams(animParams);
        } else {
            // Handle cases with no animation selected
            setSelectedAnimName("");
            setParams({});
        }
    }, [config]);

    // Handler for when a new animation is selected from the dropdown.
    const handleNameChange = (newName) => {
        setSelectedAnimName(newName);
        const animDef = availableAnimations.find((a) => a.name === newName);
        const newParams = {};

        // Pre-fill parameters with their default values, if available.
        if (animDef) {
            animDef.params.forEach((p) => {
                if (p.default !== null && p.default !== undefined) {
                    newParams[p.name] = p.default;
                }
            });
        }
        setParams(newParams);
        emitChange(newName, newParams);
    };

    // Handler for when a single parameter's value changes.
    const handleParamChange = (paramName, value) => {
        const newParams = { ...params, [paramName]: value };
        setParams(newParams);
        emitChange(selectedAnimName, newParams);
    };

    // Propagate changes up to the parent component.
    const emitChange = (name, p) => {
        if (name) {
            onChange({ [name]: p });
        }
    };

    const currentAnimDef = availableAnimations.find(
        (a) => a.name === selectedAnimName,
    );

    if (!availableAnimations) return <div>Loading animations...</div>;

    return (
        <div
            className={`space-y-6 ${!isRoot ? "border-l border-white/10 pl-6 mt-4 ml-2" : ""}`}
        >
            {/* Animation Selector Dropdown */}
            <div className="relative group/select">
                <select
                    value={selectedAnimName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className={`${isDeletable ? "w-[calc(100%-3.5rem)]" : "w-full"} bg-black/40 border border-white/5 text-white rounded-xl px-4 py-3 outline-none text-sm transition-all focus:border-teal-500/50 focus:bg-black/60 shadow-xl cursor-pointer`}
                >
                    <option value="" disabled>
                        Select Animation
                    </option>
                    {availableAnimations.map((anim) => (
                        <option key={anim.name} value={anim.name}>
                            {anim.title || anim.name}
                        </option>
                    ))}
                </select>
                {currentAnimDef?.description && (
                    <p className="mt-2 text-gray-500 text-[11px] leading-relaxed italic px-1">
                        {currentAnimDef.description}
                    </p>
                )}
            </div>

            {/* Parameters Editor */}
            {currentAnimDef && (
                <div className="space-y-4 pt-2">
                    {currentAnimDef.params.map((param) => (
                        <div key={param.name} className="group/param">
                            <label className="block text-gray-500 text-[10px] uppercase tracking-widest font-black mb-2 ml-1 group-focus-within/param:text-teal-500 transition-colors">
                                {param.name}
                            </label>
                            <ParamInput
                                param={param}
                                animName={selectedAnimName}
                                value={params[param.name]}
                                onChange={(val) =>
                                    handleParamChange(param.name, val)
                                }
                                allAnimations={allAnimations}
                                presets={presets}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Renders the correct input control based on a parameter's type definition.
 */

// --- Component for RGBCCT Color Inputs ---
const ColorInputs = ({ value: colorValue, onChange: onColorChange }) => {
    const c =
        typeof colorValue === "object" && colorValue !== null
            ? colorValue
            : { r: 0, g: 0, b: 0, cw: 0, ww: 0 };

    const updateColor = (channel, val) => {
        if (val === "") {
            onColorChange({ ...c, [channel]: "" });
        } else {
            let numVal = parseInt(val, 10);
            if (isNaN(numVal)) numVal = 0;
            if (numVal > 255) numVal = 255;
            if (numVal < 0) numVal = 0;
            onColorChange({ ...c, [channel]: numVal });
        }
    };

    const channelColors = {
        r: "border-red-500/20 focus:border-red-500/60 bg-red-500/5",
        g: "border-green-500/20 focus:border-green-500/60 bg-green-500/5",
        b: "border-blue-500/20 focus:border-blue-500/60 bg-blue-500/5",
        cw: "border-cyan-300/20 focus:border-cyan-300/60 bg-cyan-300/5",
        ww: "border-yellow-300/20 focus:border-yellow-300/60 bg-yellow-300/5",
    };

    const rgbToHex = (r, g, b) => {
        const toHex = (n) => {
            const hex = Math.max(0, Math.min(255, n || 0)).toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };

    const handleColorPick = (e) => {
        const hex = e.target.value;
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            onColorChange({
                ...c,
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16),
            });
        }
    };

    return (
        <div className="flex items-center gap-3 w-full">
            <div className="relative w-10 h-10 shrink-0 group/picker">
                <input
                    type="color"
                    value={rgbToHex(c.r, c.g, c.b)}
                    onChange={handleColorPick}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div
                    className="w-full h-full rounded-xl border border-white/10 shadow-lg transition-transform group-hover/picker:scale-105 active:scale-95"
                    style={{
                        backgroundColor: `rgb(${c.r || 0}, ${c.g || 0}, ${c.b || 0})`,
                    }}
                />
            </div>

            <div className="grid grid-cols-5 gap-1.5 flex-1 w-full">
                {["r", "g", "b", "cw", "ww"].map((chan) => (
                    <div
                        key={chan}
                        className="flex flex-col gap-1 items-center"
                    >
                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-tighter">
                            {chan}
                        </span>
                        <input
                            type="number"
                            min="0"
                            max="255"
                            value={c[chan]}
                            onChange={(e) => updateColor(chan, e.target.value)}
                            onBlur={(e) => {
                                const val = e.target.value;
                                let numVal = parseInt(val, 10);
                                if (val === "" || isNaN(numVal)) {
                                    numVal = 0;
                                } else if (numVal > 255) {
                                    numVal = 255;
                                } else if (numVal < 0) {
                                    numVal = 0;
                                }
                                onColorChange({ ...c, [chan]: numVal });
                            }}
                            className={`w-full bg-black/40 border rounded-lg px-0.5 py-1.5 text-center text-[11px] font-bold text-gray-200 outline-none transition-all focus:shadow-[0_0_10px_rgba(255,255,255,0.05)] ${channelColors[chan]}`}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

function ParamInput({
    param,
    value,
    onChange,
    allAnimations,
    presets,
    animName,
}) {
    // --- Type Parsing Helpers ---
    // These functions inspect the detailed type object from the backend API.
    const findTypeByName = (typeObj, name) => {
        if (!typeObj) return null;
        if (typeObj.name === name) return typeObj;
        if (typeObj.args) {
            for (const arg of typeObj.args) {
                const found = findTypeByName(arg, name);
                if (found) return found;
            }
        }
        return null;
    };

    const isColor = (typeObj) => !!findTypeByName(typeObj, "RGBCCT");
    const isAnimation = (typeObj) =>
        !!findTypeByName(typeObj, "Animation") ||
        !!findTypeByName(typeObj, "Union");
    const isList = (typeObj) =>
        typeObj && typeObj.name.toLowerCase() === "list";
    const isNumber = (typeObj) =>
        typeObj && (typeObj.name === "int" || typeObj.name === "float");
    const isBool = (typeObj) => typeObj && typeObj.name === "bool";
    const isLiteral = (typeObj) => typeObj && typeObj.name === "Literal";
    const isPresetName = () =>
        (param.type && param.type.name === "Preset") ||
        (animName === "preset" && param.name === "name");
    const isStripAssignment = (typeObj) =>
        typeObj && typeObj.name === "StripAssignment";

    // --- Determine Child Animation Availability ---
    const getChildAnimations = () => {
        if (!allAnimations) return [];
        const animType = findTypeByName(param.type, "Animation");
        const module = animType?.module;
        if (module && module !== "any") {
            return allAnimations.filter((a) => a.module === module);
        }
        return allAnimations; // Fallback for generic "Animation"
    };

    // --- Render Logic based on Parameter Type ---

    // Case: VAR_POSITIONAL is always a list of animations
    if (param.kind === 2) {
        const list = Array.isArray(value) ? value : [];
        const childAnims = getChildAnimations();
        const addItem = () => {
            const defaultAnim = childAnims[0]?.name || "static";
            onChange([...list, { [defaultAnim]: {} }]);
        };
        const updateItem = (idx, newVal) => {
            const newList = [...list];
            newList[idx] = newVal;
            onChange(newList);
        };
        const removeItem = (idx) => onChange(list.filter((_, i) => i !== idx));

        return (
            <div className="space-y-2">
                {list.map((item, idx) => (
                    <div
                        key={idx}
                        className="bg-white/[0.02] border border-white/5 rounded-2xl relative py-3 group/item overflow-hidden shadow-sm"
                    >
                        <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="absolute top-4 right-4 text-red-400/50 hover:text-red-400 transition-colors p-2 hover:bg-red-400/10 rounded-lg z-10"
                            aria-label="Remove"
                            title="Remove"
                        >
                            <Trash2 size={16} />
                        </button>
                        <AnimationEditor
                            config={item}
                            onChange={(val) => updateItem(idx, val)}
                            availableAnimations={childAnims}
                            allAnimations={allAnimations}
                            isDeletable={true}
                        />
                    </div>
                ))}
                <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500/5 border border-teal-500/20 text-teal-500 text-[10px] font-black uppercase tracking-widest hover:bg-teal-500/10 transition-all active:scale-95 shadow-sm"
                >
                    <Plus size={14} /> Add Animation
                </button>
            </div>
        );
    }

    // Case: List of items (e.g., List[RGBCCT] or List[Animation])
    if (isList(param.type)) {
        const list = Array.isArray(value) ? value : [];
        const innerType = param.type.args?.[0];

        // List of StripAssignments
        if (isStripAssignment(innerType)) {
            const childAnims = getChildAnimations();
            const addItem = () => {
                const defaultAnim = childAnims[0]?.name || "static";
                onChange([
                    ...list,
                    {
                        strip_assignment: {
                            strip: 0,
                            animation: { [defaultAnim]: {} },
                        },
                    },
                ]);
            };

            const updateItem = (idx, field, val) => {
                const newList = [...list];
                const item = { ...newList[idx] };
                const sa = { ...(item.strip_assignment || {}) };
                sa[field] = val;
                item.strip_assignment = sa;
                newList[idx] = item;
                onChange(newList);
            };

            const removeItem = (idx) =>
                onChange(list.filter((_, i) => i !== idx));

            return (
                <div className="space-y-2">
                    {list.map((item, idx) => {
                        const data = item.strip_assignment || {};
                        return (
                            <div
                                key={idx}
                                className="bg-white/[0.02] border border-white/5 rounded-2xl relative p-6 pt-10 space-y-6 group/item shadow-sm"
                            >
                                <button
                                    type="button"
                                    onClick={() => removeItem(idx)}
                                    className="absolute top-4 right-4 text-red-400/50 hover:text-red-400 transition-colors p-2 hover:bg-red-400/10 rounded-lg z-10"
                                    aria-label="Remove"
                                    title="Remove"
                                >
                                    <Trash2 size={16} />
                                </button>

                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-400 text-xs uppercase font-bold tracking-wider">
                                        Strip Index
                                    </label>
                                    <ParamInput
                                        param={{
                                            name: "strip",
                                            type: { name: "int" },
                                        }}
                                        value={data.strip}
                                        onChange={(val) =>
                                            updateItem(idx, "strip", val)
                                        }
                                        allAnimations={allAnimations}
                                        presets={presets}
                                        animName="strip_assignment"
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-400 text-xs uppercase font-bold tracking-wider">
                                        Animation
                                    </label>
                                    <ParamInput
                                        param={{
                                            name: "animation",
                                            type: {
                                                name: "Union",
                                                args: [
                                                    {
                                                        name: "Animation",
                                                        module: "any",
                                                    },
                                                    { name: "RGBCCT" },
                                                ],
                                            },
                                        }}
                                        value={data.animation}
                                        onChange={(val) =>
                                            updateItem(idx, "animation", val)
                                        }
                                        allAnimations={allAnimations}
                                        presets={presets}
                                        animName="strip_assignment"
                                    />
                                </div>
                            </div>
                        );
                    })}
                    <button
                        type="button"
                        onClick={addItem}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500/5 border border-teal-500/20 text-teal-500 text-[10px] font-black uppercase tracking-widest hover:bg-teal-500/10 transition-all active:scale-95 shadow-sm"
                    >
                        <Plus size={14} /> Add Strip Assignment
                    </button>
                </div>
            );
        }

        // List of Colors
        if (isColor(innerType)) {
            const addItem = () =>
                onChange([...list, { r: 0, g: 0, b: 0, cw: 0, ww: 0 }]);
            const updateItem = (idx, newVal) => {
                const newList = [...list];
                newList[idx] = newVal;
                onChange(newList);
            };
            const removeItem = (idx) =>
                onChange(list.filter((_, i) => i !== idx));

            return (
                <div className="space-y-2 w-[calc(100%-2.5rem)]">
                    {list.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                            <div className="flex-1">
                                <ColorInputs
                                    value={item}
                                    onChange={(val) => updateItem(idx, val)}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                className="text-red-400 text-xs"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addItem}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500/5 border border-teal-500/20 text-teal-500 text-[10px] font-black uppercase tracking-widest hover:bg-teal-500/10 transition-all active:scale-95 shadow-sm"
                    >
                        <Plus size={14} /> Add Color
                    </button>
                </div>
            );
        }

        // List of Animations
        if (isAnimation(innerType)) {
            const childAnims = getChildAnimations();
            const addItem = () => {
                const defaultAnim = childAnims[0]?.name || "static";
                onChange([...list, { [defaultAnim]: {} }]);
            };
            const updateItem = (idx, newVal) => {
                const newList = [...list];
                newList[idx] = newVal;
                onChange(newList);
            };
            const removeItem = (idx) =>
                onChange(list.filter((_, i) => i !== idx));

            return (
                <div className="space-y-2">
                    {list.map((item, idx) => (
                        <div
                            key={idx}
                            className="bg-white/[0.02] border border-white/5 rounded-2xl relative py-3 group/item overflow-hidden shadow-sm"
                        >
                            <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                className="absolute top-4 right-4 text-red-400/50 hover:text-red-400 transition-colors p-2 hover:bg-red-400/10 rounded-lg z-10"
                                aria-label="Remove"
                                title="Remove"
                            >
                                <Trash2 size={16} />
                            </button>
                            <AnimationEditor
                                config={item}
                                onChange={(val) => updateItem(idx, val)}
                                availableAnimations={childAnims}
                                allAnimations={allAnimations}
                                isDeletable={true}
                            />
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addItem}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500/5 border border-teal-500/20 text-teal-500 text-[10px] font-black uppercase tracking-widest hover:bg-teal-500/10 transition-all active:scale-95 shadow-sm"
                    >
                        <Plus size={14} /> Add Animation
                    </button>
                </div>
            );
        }
    }

    // Case: Union of Color and Animation (e.g., for `dot` animation's `primary` param)
    if (
        isAnimation(param.type) &&
        isColor(param.type) &&
        isAnimation(param.type)
    ) {
        // Heuristic to determine if the current value is a color or an animation.
        const isValColor =
            value &&
            (typeof value.r === "number" || typeof value.g === "number");
        const mode = isValColor ? "color" : "anim";
        const childAnims = getChildAnimations();

        return (
            <div className="space-y-2">
                <div className="flex gap-2 text-xs">
                    <button
                        type="button"
                        onClick={() =>
                            onChange({ r: 255, g: 255, b: 255, cw: 0, ww: 0 })
                        }
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === "color" ? "bg-teal-600 text-white shadow-lg shadow-teal-900/20" : "bg-black/40 text-gray-500 hover:text-gray-300"}`}
                    >
                        COLOR
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            onChange({ [childAnims[0]?.name || "static"]: {} })
                        }
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === "anim" ? "bg-purple-600 text-white shadow-lg shadow-purple-900/20" : "bg-black/40 text-gray-500 hover:text-gray-300"}`}
                    >
                        Animation
                    </button>
                </div>
                {mode === "color" ? (
                    <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                        <ColorInputs value={value} onChange={onChange} />
                    </div>
                ) : (
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl py-2 shadow-sm">
                        <AnimationEditor
                            config={value || {}}
                            onChange={onChange}
                            availableAnimations={childAnims}
                            allAnimations={allAnimations}
                            presets={presets}
                        />
                    </div>
                )}
            </div>
        );
    }

    // Case: Preset Name Selection
    if (isPresetName()) {
        return (
            <select
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value)}
                className="bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:border-teal-500/50 outline-none w-full transition-all hover:bg-black/50 shadow-sm"
            >
                <option value="" disabled>
                    Select a preset...
                </option>
                {presets.map((p) => (
                    <option key={p} value={p}>
                        {p}
                    </option>
                ))}
            </select>
        );
    }

    // Case: Literal (dropdown for string options)
    if (isLiteral(param.type)) {
        const options = param.type.args.map((arg) => arg.name);
        return (
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:border-teal-500/50 outline-none w-full transition-all hover:bg-black/50 shadow-sm"
            >
                {options.map((opt) => (
                    <option key={opt} value={opt}>
                        {opt}
                    </option>
                ))}
            </select>
        );
    }

    // Case: Single Color
    if (isColor(param.type)) {
        return <ColorInputs value={value} onChange={onChange} />;
    }

    // Case: Boolean
    if (isBool(param.type)) {
        return (
            <button
                type="button"
                onClick={() => onChange(!value)}
                className={`w-12 h-6 rounded-full p-1 transition-all ${value ? "bg-teal-600 shadow-[0_0_10px_rgba(20,184,166,0.3)]" : "bg-black/40 border border-white/10"}`}
            >
                <div
                    className={`w-4 h-4 rounded-full bg-white transition-all transform ${value ? "translate-x-6" : "translate-x-0"}`}
                />
            </button>
        );
    }

    // Case: Time String (Heuristic)
    if (
        (param.type?.name === "str" || param.type === "str") &&
        (param.name === "start" ||
            param.name === "end" ||
            param.name.includes("time"))
    ) {
        return (
            <input
                type="time"
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:border-teal-500/50 outline-none transition-all [color-scheme:dark] hover:bg-black/50 shadow-sm"
            />
        );
    }

    // Case: Number (int or float)
    if (isNumber(param.type)) {
        const isInt = param.type.name === "int";
        const handleChange = (e) => {
            const val = isInt
                ? parseInt(e.target.value, 10)
                : parseFloat(e.target.value);
            onChange(isNaN(val) ? null : val);
        };

        const handleBlur = (e) => {
            let val = isInt
                ? parseInt(e.target.value, 10)
                : parseFloat(e.target.value);

            if (isNaN(val)) return;

            if (
                param.max !== undefined &&
                param.max !== null &&
                val > param.max
            ) {
                val = param.max;
            }
            if (
                param.min !== undefined &&
                param.min !== null &&
                val < param.min
            ) {
                val = param.min;
            }

            if (val !== value) {
                onChange(val);
            }
        };

        return (
            <input
                type="number"
                value={value ?? ""}
                onChange={handleChange}
                onBlur={handleBlur}
                className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:border-teal-500/50 outline-none transition-all hover:bg-black/50 shadow-sm invalid:!border-red-500/50"
                step={isInt ? "1" : "any"}
                {...(param.min !== null && { min: param.min })}
                {...(param.max !== null && { max: param.max })}
            />
        );
    }

    // Fallback: Text Input
    return (
        <input
            type="text"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:border-teal-500/50 outline-none transition-all hover:bg-black/50 shadow-sm"
        />
    );
}
