"use client";

import React, { useEffect, useState } from "react";
import { Select } from "@/components/ui/select";
import { applyTheme, getThemePreference, setThemePreference, ThemePreference } from "@/lib/theme";

interface ThemeSelectorProps {
    id?: string;
    className?: string;
}

const options = [
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
];

export default function ThemeSelector({ id = "theme-select", className }: ThemeSelectorProps) {
    const [theme, setTheme] = useState<ThemePreference>(() => {
        if (typeof window === "undefined") return "system";
        return getThemePreference();
    });

    useEffect(() => {
        applyTheme(getThemePreference());

        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const onMediaChange = () => {
            if (getThemePreference() === "system") {
                applyTheme("system");
            }
        };

        const onStorage = () => {
            const nextPreference = getThemePreference();
            setTheme(nextPreference);
            applyTheme(nextPreference);
        };

        media.addEventListener("change", onMediaChange);
        window.addEventListener("storage", onStorage);
        return () => {
            media.removeEventListener("change", onMediaChange);
            window.removeEventListener("storage", onStorage);
        };
    }, []);

    const onChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const nextTheme = event.target.value as ThemePreference;
        setTheme(nextTheme);
        setThemePreference(nextTheme);
    };

    return (
        <Select
            id={id}
            value={theme}
            onChange={onChange}
            options={options}
            className={className}
            aria-label="Theme"
        />
    );
}
