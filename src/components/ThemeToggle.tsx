import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { motion } from "framer-motion";

export const ThemeToggle = () => {
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme } = useTheme();

    // useEffect only runs on the client, so now we can safely show the UI
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="w-8 h-8 rounded-md bg-transparent" />;
    }

    // Next theme cycle
    const toggleTheme = () => {
        if (theme === "light") {
            setTheme("dark");
        } else if (theme === "dark") {
            setTheme("system");
        } else {
            setTheme("light");
        }
    };

    const IconToRender = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

    return (
        <button
            onClick={toggleTheme}
            className="relative flex items-center justify-center w-8 h-8 ml-2 rounded-md hover:surface-3 text-muted-foreground hover:text-foreground transition-colors overflow-hidden border border-border"
            title={`Current theme: ${theme === "system" ? "System Default" : theme === "light" ? "Light" : "Dark"}`}
        >
            <motion.div
                key={theme}
                initial={{ y: -20, opacity: 0, rotate: -90 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                exit={{ y: 20, opacity: 0, rotate: 90 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
            >
                <IconToRender className="w-4 h-4" />
            </motion.div>
        </button>
    );
};
