"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { announcementApi } from "@/lib/api";
import { useWorkspaceStore } from "@/store/workspaceStore";
import AnnouncementCard from "@/components/announcements/AnnouncementCard";
import AnnouncementForm from "@/components/announcements/AnnouncementForm";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { getSocket } from "@/lib/socket";
import toast from "react-hot-toast";

export default function AnnouncementsPage() {
  const { workspaceId } = useParams();
  const { currentRole } = useWorkspaceStore();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const cursorRef = useRef(null);

  const fetchAnnouncements = useCallback(
    async (reset = false) => {
      setLoading(true);
      try {
        const { data } = await announcementApi.list(workspaceId, {
          limit: 10,
          ...(cursorRef.current && !reset ? { cursor: cursorRef.current } : {}),
        });
        setAnnouncements((prev) =>
          reset ? data.announcements : [...prev, ...data.announcements],
        );
        setHasMore(data.hasMore);
        cursorRef.current = data.nextCursor;
      } finally {
        setLoading(false);
      }
    },
    [workspaceId],
  );

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchAnnouncements(true);
    });

    const socket = getSocket();
    if (socket) {
      socket.on("announcement:created", (a) =>
        setAnnouncements((prev) => [a, ...prev]),
      );
      socket.on("announcement:updated", (a) =>
        setAnnouncements((prev) => prev.map((x) => (x.id === a.id ? a : x))),
      );
      socket.on("announcement:deleted", ({ id }) =>
        setAnnouncements((prev) => prev.filter((x) => x.id !== id)),
      );
      socket.on("announcement:reaction", ({ announcementId, reactions }) => {
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === announcementId ? { ...a, reactions } : a)),
        );
      });
      socket.on("announcement:comment", ({ announcementId, comment }) => {
        setAnnouncements((prev) =>
          prev.map((a) =>
            a.id === announcementId
              ? {
                  ...a,
                  _count: {
                    ...a._count,
                    comments: (a._count?.comments || 0) + 1,
                  },
                }
              : a,
          ),
        );
      });
    }
    return () => {
      const s = getSocket();
      [
        "announcement:created",
        "announcement:updated",
        "announcement:deleted",
        "announcement:reaction",
        "announcement:comment",
      ].forEach((e) => s?.off(e));
    };
  }, [workspaceId, fetchAnnouncements]);

  const handleDelete = async (id) => {
    try {
      await announcementApi.delete(workspaceId, id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success("Announcement deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleTogglePin = async (id) => {
    try {
      const { data } = await announcementApi.togglePin(workspaceId, id);
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? data.announcement : a)),
      );
    } catch {
      toast.error("Failed to toggle pin");
    }
  };

  const handleReact = async (id, emoji) => {
    try {
      const { data } = await announcementApi.addReaction(workspaceId, id, {
        emoji,
      });
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, reactions: data.reactions } : a,
        ),
      );
    } catch {
      toast.error("Failed to react");
    }
  };

  const pinned = announcements.filter((a) => a.isPinned);
  const unpinned = announcements.filter((a) => !a.isPinned);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-header">Announcements</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Team-wide updates and news
          </p>
        </div>
        {currentRole === "ADMIN" && (
          <button
            onClick={() => {
              setEditItem(null);
              setShowForm(true);
            }}
            className="btn-primary"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Post announcement
          </button>
        )}
      </div>

      {loading && announcements.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6 space-y-3 animate-pulse">
              <div className="h-4 w-1/3 bg-zinc-800 rounded" />
              <div className="h-3 w-full bg-zinc-800 rounded" />
              <div className="h-3 w-2/3 bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <EmptyState
          icon="◉"
          title="No announcements yet"
          description={
            currentRole === "ADMIN"
              ? "Post the first announcement to your team"
              : "Admins will post announcements here"
          }
          action={
            currentRole === "ADMIN" && (
              <button onClick={() => setShowForm(true)} className="btn-primary">
                Post announcement
              </button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {pinned.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-zinc-600 font-semibold uppercase tracking-wide">
                <span>📌</span> Pinned
              </div>
              {pinned.map((a) => (
                <AnnouncementCard
                  key={a.id}
                  announcement={a}
                  workspaceId={workspaceId}
                  role={currentRole}
                  onEdit={(item) => {
                    setEditItem(item);
                    setShowForm(true);
                  }}
                  onDelete={handleDelete}
                  onPin={handleTogglePin}
                  onReact={handleReact}
                />
              ))}
            </div>
          )}

          {unpinned.map((a) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              workspaceId={workspaceId}
              role={currentRole}
              onEdit={(item) => {
                setEditItem(item);
                setShowForm(true);
              }}
              onDelete={handleDelete}
              onPin={handleTogglePin}
              onReact={handleReact}
            />
          ))}

          {hasMore && (
            <button
              onClick={() => fetchAnnouncements()}
              className="btn-secondary w-full justify-center"
              disabled={loading}
            >
              {loading ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditItem(null);
        }}
        title={editItem ? "Edit announcement" : "New announcement"}
        size="lg"
      >
        <AnnouncementForm
          workspaceId={workspaceId}
          initial={editItem}
          onSuccess={(item) => {
            if (editItem) {
              setAnnouncements((prev) =>
                prev.map((a) => (a.id === item.id ? item : a)),
              );
            } else {
              setAnnouncements((prev) => [item, ...prev]);
            }
            setShowForm(false);
            setEditItem(null);
          }}
          onCancel={() => {
            setShowForm(false);
            setEditItem(null);
          }}
        />
      </Modal>
    </div>
  );
}
