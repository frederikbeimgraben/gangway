"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

/**
 * A recursive component to edit an animation and its parameters.
 */
export default function AnimationEditor({
    config, // The current configuration for this animation, e.g., { "strobo": { "frequency": 10 } }
    onChange, // Callback when the configuration changes
    availableAnimations, // The list of animations to show in the dropdown
    allAnimations, // The complete list of all animations (for nested editors)
    isRoot = false, // Flag to indicate if this is a top-level editor
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
            className={`space-y-4 ${!isRoot ? "border-l-2 border-gray-700 pl-4 mt-2" : ""}`}
        >
            {/* Animation Selector Dropdown */}
            <div>
                <select
                    value={selectedAnimName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-[calc(100%-2.5rem)] bg-gray-700 text-white rounded px-3 py-2 outline-none text-sm focus:ring-0"
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
                    <p className="mt-2 text-gray-400 text-xs italic">
                        {currentAnimDef.description}
                    </p>
                )}
            </div>

            {/* Parameters Editor */}
            {currentAnimDef && (
                <div className="space-y-4 pt-2">
                    {currentAnimDef.params.map((param) => (
                        <div key={param.name}>
                            <label className="block text-gray-400 text-xs uppercase font-bold mb-1">
                                {param.name}
                            </label>
                            <ParamInput
                                param={param}
                                value={params[param.name]}
                                onChange={(val) =>
                                    handleParamChange(param.name, val)
                                }
                                allAnimations={allAnimations}
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
    // Ensure we have a valid object to work with, even for null/undefined input.
    const c =
        typeof colorValue === "object" && colorValue !== null
            ? colorValue
            : { r: 0, g: 0, b: 0, cw: 0, ww: 0 };

    const updateColor = (channel, val) => {
        if (val === "") {
            // If the input is cleared, pass an empty string to allow the input field to be empty.
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
        r: "border-red-500/50 focus:border-red-500",
        g: "border-green-500/50 focus:border-green-500",
        b: "border-blue-500/50 focus:border-blue-500",
        cw: "border-cyan-300/50 focus:border-cyan-300",
        ww: "border-yellow-300/50 focus:border-yellow-300",
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
        <div className="flex items-center gap-2 w-[calc(100%-2.5rem)]">
            {/* Color Picker Button */}
            <div className="relative w-8 h-8 shrink-0">
                <input
                    type="color"
                    value={rgbToHex(c.r, c.g, c.b)}
                    onChange={handleColorPick}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div
                    className="w-full h-full rounded border border-gray-600 shadow-sm"
                    style={{
                        backgroundColor: `rgb(${c.r || 0}, ${c.g || 0}, ${c.b || 0})`,
                    }}
                />
            </div>

            {/* Numeric Inputs */}
            <div className="grid grid-cols-5 gap-1 flex-1 w-[calc(100%-2.5rem)]">
                {["r", "g", "b", "cw", "ww"].map((chan) => (
                    <input
                        key={chan}
                        type="number"
                        min="0"
                        max="255"
                        placeholder={chan.toUpperCase()}
                        value={c[chan]}
                        onChange={(e) => updateColor(chan, e.target.value)}
                        onBlur={(e) => {
                            // On blur, normalize empty or invalid values to 0-255
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
                        className={`w-full bg-gray-800 border-2 rounded px-1 py-1 text-center text-xs text-gray-300 outline-none focus:ring-0 ${channelColors[chan]}`}
                    />
                ))}
            </div>
        </div>
    );
};

function ParamInput({ param, value, onChange, allAnimations }) {
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
                        className="bg-gray-800 rounded relative py-1"
                    >
                        <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="absolute top-5 right-2 text-red-400 hover:text-red-300"
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
                        />
                    </div>
                ))}
                <button
                    type="button"
                    onClick={addItem}
                    className="text-teal-400 text-xs hover:text-teal-300"
                >
                    + Add Animation
                </button>
            </div>
        );
    }

    // Case: List of items (e.g., List[RGBCCT] or List[Animation])
    if (isList(param.type)) {
        const list = Array.isArray(value) ? value : [];
        const innerType = param.type.args?.[0];

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
                        className="text-teal-400 text-xs hover:text-teal-300"
                    >
                        + Add Color
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
                            className="bg-gray-800 rounded relative py-1"
                        >
                            <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                className="absolute top-5 right-2 text-red-400 hover:text-red-300"
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
                            />
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addItem}
                        className="text-teal-400 text-xs hover:text-teal-300"
                    >
                        + Add Animation
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
                        className={`px-2 py-1 rounded ${mode === "color" ? "bg-teal-600 text-white" : "bg-gray-700 text-gray-400"}`}
                    >
                        Color
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            onChange({ [childAnims[0]?.name || "static"]: {} })
                        }
                        className={`px-2 py-1 rounded ${mode === "anim" ? "bg-pink-600 text-white" : "bg-gray-700 text-gray-400"}`}
                    >
                        Animation
                    </button>
                </div>
                {mode === "color" ? (
                    <ColorInputs value={value} onChange={onChange} />
                ) : (
                    <div className="bg-gray-800 rounded py-1">
                        <AnimationEditor
                            config={value || {}}
                            onChange={onChange}
                            availableAnimations={childAnims}
                            allAnimations={allAnimations}
                        />
                    </div>
                )}
            </div>
        );
    }

    // Case: Literal (dropdown for string options)
    if (isLiteral(param.type)) {
        const options = param.type.args.map((arg) => arg.name);
        return (
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 focus:border-teal-500 outline-none w-[calc(100%-2.5rem)]"
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
            <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => onChange(e.target.checked)}
                className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-teal-600 focus:ring-teal-500"
            />
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
                className="w-[calc(100%-2.5rem)] bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 focus:border-teal-500 outline-none [color-scheme:dark]"
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
                className="w-[calc(100%-2.5rem)] bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 focus:border-teal-500 outline-none invalid:!border-red-500 invalid:!text-red-500"
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
            className="w-[calc(100%-2.5rem)] bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 focus:border-teal-500 outline-none"
        />
    );
}
