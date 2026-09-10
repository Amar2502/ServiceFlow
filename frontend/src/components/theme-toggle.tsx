"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 bg-background border-border"
      >
        <Sun className="h-4 w-4 text-amber-600" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 bg-background border-border text-foreground transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Moon className="h-4 w-4 text-blue-400" />
          ) : theme === "light" ? (
            <Sun className="h-4 w-4 text-amber-600" />
          ) : (
            <Monitor className="h-4 w-4 text-indigo-500" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover border-border">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="cursor-pointer text-xs flex items-center gap-2"
        >
          <Sun className="h-4 w-4 text-amber-600" /> Light Theme
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="cursor-pointer text-xs flex items-center gap-2"
        >
          <Moon className="h-4 w-4 text-blue-400" /> Dark Theme
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="cursor-pointer text-xs flex items-center gap-2"
        >
          <Monitor className="h-4 w-4 text-indigo-500" /> System Default
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
