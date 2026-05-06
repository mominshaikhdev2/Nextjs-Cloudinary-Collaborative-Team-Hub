"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useThemeStore } from "@/store/themeStore";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import CommandPalette from "@/components/ui/CommandPalette";
import { useUIStore } from "@/store/uiStore";

export default function AppLayout({ children }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, initialize, user } = useAuthStore();
  const { fetchWorkspaces } = useWorkspaceStore();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const initialized = useRef(false);

  let initTheme, toggleTheme;
  try {
    const themeStore = useThemeStore();
    initTheme = themeStore.initTheme;
    toggleTheme = themeStore.toggleTheme;
  } catch (_) {
    initTheme = () => {};
    toggleTheme = () => {};
  }

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Initialize theme
    initTheme?.();

    // If Zustand already has authenticated state (e.g. just logged in and
    // navigated here), skip the full initialize() and go directly to
    // fetching workspaces. initialize() is still called to refresh the token
    // and re-hydrate the user object from the server.
    const { isAuthenticated: alreadyAuth, user: alreadyUser } =
      useAuthStore.getState();

    if (alreadyAuth && alreadyUser) {
      // Already authenticated — fetch workspaces and return.
      // initialize() will still run in the background to refresh the token
      // silently
      fetchWorkspaces();
      initialize();
      return;
    }

    // Not yet authenticated
    initialize().then(() => {
      const { isAuthenticated: authAfterInit } = useAuthStore.getState();
      if (!authAfterInit) {
        router.replace("/login");
      } else {
        fetchWorkspaces();
      }
    });
  }, [fetchWorkspaces, initTheme, initialize, router]);

  // Watch isAuthenticated — if it drops to false after we are mounted,
  // redirect to login (handles token expiry mid-session)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      const meta = e.metaKey || e.ctrlKey;

      // ⌘K — Command Palette
      if (meta && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }

      // Don't fire shortcuts when typing in inputs
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (document.activeElement?.contentEditable === "true") return;

      if (e.key === "t" || e.key === "T") toggleTheme?.();
      if (e.key === "?") setPaletteOpen(true);
    };

    let pending = null;
    let pendingTimer = null;

    const handleSequence = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (pending === "g") {
        clearTimeout(pendingTimer);
        pending = null;
        const workspaceId = useWorkspaceStore.getState().currentWorkspace?.id;
        switch (e.key) {
          case "d":
            router.push("/dashboard");
            break;
          case "g":
            if (workspaceId) router.push(`/workspaces/${workspaceId}/goals`);
            break;
          case "k":
            if (workspaceId)
              router.push(`/workspaces/${workspaceId}/action-items`);
            break;
          case "a":
            if (workspaceId)
              router.push(`/workspaces/${workspaceId}/announcements`);
            break;
          case "n":
            if (workspaceId)
              router.push(`/workspaces/${workspaceId}/analytics`);
            break;
          case "s":
            if (workspaceId) router.push(`/workspaces/${workspaceId}/settings`);
            break;
          case "p":
            router.push("/profile");
            break;
        }
        return;
      }

      if (e.key === "g" && !e.metaKey && !e.ctrlKey) {
        pending = "g";
        pendingTimer = setTimeout(() => {
          pending = null;
        }, 1000);
      }
    };

    window.addEventListener("keydown", handleKey);
    window.addEventListener("keydown", handleSequence);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keydown", handleSequence);
      clearTimeout(pendingTimer);
    };
  }, [toggleTheme, router]);

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--th-bg, #09090b)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center animate-pulse">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <div className="text-sm text-zinc-500">Loading…</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--th-bg, #09090b)" }}
    >
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Header onPaletteOpen={() => setPaletteOpen(true)} />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </div>
  );
}
