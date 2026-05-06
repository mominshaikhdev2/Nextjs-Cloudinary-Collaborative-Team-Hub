"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      await login(form);
      router.replace("/dashboard");
    } catch (err) {
      let msg = err.response?.data?.error || "Login failed";

      const isSystemError =
        msg.toLowerCase().includes("prisma") ||
        msg.toLowerCase().includes("invocation") ||
        msg.includes(":\\") ||
        msg.length > 100;

      if (isSystemError) {
        msg = "Internal server error. Please try again later.";
      }

      toast.error(msg);
      if (!isSystemError) {
        if (msg.toLowerCase().includes("password")) {
          setErrors({ password: msg });
        } else if (
          msg.toLowerCase().includes("email") ||
          msg.toLowerCase().includes("user")
        ) {
          setErrors({ email: msg });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Mobile logo */}
      <div className="flex items-center gap-3 mb-8 lg:hidden">
        <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
          <span className="text-white font-display font-bold">T</span>
        </div>
        <span className="font-display font-bold text-xl text-white">
          Team Hub
        </span>
      </div>

      <div className="mb-8">
        <h2 className="font-display text-3xl font-bold text-white">
          Welcome back
        </h2>
        <p className="text-zinc-400 mt-2">Sign in to your workspace</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className={`input ${errors.email ? "border-red-500" : ""}`}
            placeholder="you@company.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          {errors.email && (
            <p className="text-red-400 text-xs mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="label">Password</label>
          <input
            type="password"
            className={`input ${errors.password ? "border-red-500" : ""}`}
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          {errors.password && (
            <p className="text-red-400 text-xs mt-1">{errors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full justify-center py-2.5"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Signing in…
            </span>
          ) : (
            "Sign in"
          )}
        </button>

        <div className="relative my-4">
          <div className="border-t border-zinc-800" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-zinc-950 px-3 text-zinc-600 text-xs">or</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setForm({ email: "alice@demo.com", password: "password123" })
          }
          className="btn-secondary w-full justify-center"
        >
          Use demo account
        </button>
      </form>

      <p className="text-center text-zinc-500 text-sm mt-8">
        Don't have an account?{" "}
        <Link
          href="/register"
          className="text-violet-400 hover:text-violet-300 font-medium"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
