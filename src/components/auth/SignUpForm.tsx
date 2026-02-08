"use client";

import { useState } from "react";
import { signUp } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"manager" | "employee">("employee");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signUp.email(
        {
          email,
          password,
          name,
          role,
        },
        {
          onSuccess: async () => {
            router.push("/dashboard");
            router.refresh();
          },
        }
      );

      if (result.error) {
        setError(result.error.message || "Sign up failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 glass-card">
      <h1 className="text-2xl font-bold mb-6 text-center text-white">Create Account</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-none backdrop-blur-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1 text-[var(--text-secondary)]">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 glass-input placeholder-[var(--text-muted)]"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1 text-[var(--text-secondary)]">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 glass-input placeholder-[var(--text-muted)]"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1 text-[var(--text-secondary)]">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-3 py-2 glass-input placeholder-[var(--text-muted)]"
            placeholder="••••••••"
          />
          <p className="text-xs text-[var(--text-muted)] mt-1">Minimum 8 characters</p>
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium mb-1 text-[var(--text-secondary)]">
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as "manager" | "employee")}
            className="w-full px-3 py-2 glass-input text-white appearance-none"
          >
            <option value="employee" className="bg-gray-900">Employee</option>
            <option value="manager" className="bg-gray-900">Manager</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 btn-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-[var(--text-secondary)]">
        Already have an account?{" "}
        <a href="/auth/signin" className="text-amber-400 hover:text-amber-300 hover:underline transition-colors">
          Sign in
        </a>
      </p>
    </div>
  );
}
