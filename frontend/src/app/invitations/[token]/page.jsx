"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";;
import toast from "react-hot-toast";

export default function InvitationPage() {
  const { token } = useParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/api/workspaces/invitations/${token}/accept`)
      .then(({ data }) => setInvitation(data.invitation))
      .catch((err) =>
        setError(err.response?.data?.error || "Invalid invitation"),
      )
      .finally(() => setLoading(false));
  }, [token]);

  const accept = async () => {
    if (!isAuthenticated) {
      sessionStorage.setItem("pendingInvite", token);
      router.push(`/register?invite=${token}`);
      return;
    }

    if (invitation.email !== user?.email) {
      toast.error(
        `This invitation is for ${invitation.email}. Please log in with that account.`,
      );
      return;
    }

    setAccepting(true);
    try {
      router.push(`/workspaces/${invitation.workspaceId}`);
      toast.success("Invitation accepted!");
    } catch {
      toast.error("Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Checking invitation…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="card p-8 text-center max-w-sm w-full mx-4">
          <div className="text-3xl mb-3">⚠</div>
          <h2 className="font-display font-bold text-white mb-2">
            Invalid Invitation
          </h2>
          <p className="text-zinc-400 text-sm mb-6">{error}</p>
          <Link href="/login" className="btn-primary justify-center w-full">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="card p-8 text-center max-w-sm w-full mx-4 animate-scale-in">
        <div className="w-14 h-14 rounded-2xl bg-violet-600 mx-auto flex items-center justify-center shadow-lg shadow-violet-500/30 mb-4">
          <span className="text-white font-display font-bold text-xl">T</span>
        </div>
        <h2 className="font-display font-bold text-white text-xl mb-2">
          You're invited!
        </h2>
        <p className="text-zinc-400 text-sm mb-1">
          You've been invited to join as{" "}
          <span className="text-violet-400 font-medium">{invitation.role}</span>
        </p>
        <p className="text-zinc-500 text-xs mb-8">
          Invitation for{" "}
          <span className="text-zinc-300">{invitation.email}</span>
        </p>

        <button
          onClick={accept}
          disabled={accepting}
          className="btn-primary w-full justify-center py-2.5 mb-3"
        >
          {accepting ? "Joining…" : "Accept invitation"}
        </button>

        {!isAuthenticated && (
          <p className="text-xs text-zinc-600">
            Don't have an account?{" "}
            <Link
              href={`/register`}
              className="text-violet-400 hover:text-violet-300"
            >
              Sign up
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
