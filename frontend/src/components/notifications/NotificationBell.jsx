"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { notificationApi } from "@/lib/api";
import { useUIStore } from "@/store/uiStore";
import { getSocket } from "@/lib/socket";
import { formatDistanceToNow } from "date-fns";

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    setNotifications,
    addNotification,
    setUnreadCount,
    decrementUnread,
  } = useUIStore();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef();

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await notificationApi.list({ limit: 20 });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } finally {
      setLoading(false);
    }
  }, [setNotifications, setUnreadCount]);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      if (isMounted) {
        await loadNotifications();
      }
    };

    initialize();

    const socket = getSocket();
    if (socket) {
      socket.on("notification:new", (n) => {
        addNotification(n);
      });
    }

    return () => {
      isMounted = false;
      getSocket()?.off("notification:new");
    };
  }, [loadNotifications, addNotification]);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markRead = async (id) => {
    const n = notifications.find((n) => n.id === id);
    if (n && !n.isRead) {
      await notificationApi.markRead(id);
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      decrementUnread();
    }
  };

  const markAllRead = async () => {
    await notificationApi.markAllRead();
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="btn-ghost p-2 relative"
        aria-label="Notifications"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-violet-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 card shadow-2xl shadow-black/50 animate-slide-down z-50">
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <h3 className="font-display font-semibold text-white text-sm">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-violet-400 hover:text-violet-300"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-zinc-800 rounded shimmer" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 text-sm">
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left flex gap-3 p-4 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-0 ${
                    !n.isRead ? "bg-violet-500/5" : ""
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.isRead ? "bg-violet-500" : "bg-transparent"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 leading-snug">
                      {n.content}
                    </p>
                    <p className="text-xs text-zinc-600 mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
