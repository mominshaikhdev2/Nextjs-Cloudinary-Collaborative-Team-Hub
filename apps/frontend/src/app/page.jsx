'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function HomePage() {
  const router = useRouter();
  const { initialize } = useAuthStore();

  useEffect(() => {
    // Wrapping the logic in an async function to handle the promise correctly[cite: 6]
    const checkAuth = async () => {
      await initialize();
      
      // Access the latest state directly from the store to determine redirect path[cite: 6]
      const { isAuthenticated } = useAuthStore.getState();
      router.replace(isAuthenticated ? '/dashboard' : '/login');
    };

    checkAuth();
  }, [initialize, router]); // Dependencies included to satisfy ESLint[cite: 6]

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center animate-pulse">
          <span className="text-white font-display font-bold text-lg">T</span>
        </div>
        <div className="text-zinc-500 text-sm">Loading…</div>
      </div>
    </div>
  );
}