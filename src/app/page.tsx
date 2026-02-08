"use client";

import { useSession } from "@/lib/auth-client";
import type { AppUser } from "@/lib/auth-client";
import { UserButton } from "@/components/auth";
import Link from "next/link";

export default function LandingPage() {
  const { data: session, isPending } = useSession();
  const user = session?.user as AppUser | undefined;

  return (
    <div className="min-h-screen text-white">
      {/* Navigation */}
      <nav className="border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-600 rounded-none flex items-center justify-center font-bold shadow-[0_0_12px_rgba(245,158,11,0.5)] text-black">
              3D
            </div>
            <span className="text-xl font-bold tracking-tight">TrainSpace</span>
          </div>
          
          <div className="flex items-center gap-6">

            {!isPending && (
              session ? (
                <UserButton />
              ) : (
                <div className="flex gap-3">
                  <Link
                    href="/auth/signin"
                    className="px-4 py-2 text-[var(--text-secondary)] hover:text-white transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="px-4 py-2 btn-primary transition-all"
                  >
                    Get Started
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </nav>

      {/* Hero – one clear block: headline → subtitle → CTA, left-anchored */}
      <section className="max-w-7xl mx-auto px-4 py-20 md:py-28 relative">
        <div className="absolute left-0 top-1/3 w-[400px] h-[400px] bg-amber-500/10 rounded-none blur-[120px] -z-10 pointer-events-none" />

        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1]">
            3D Training for the{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-300">Modern Workforce</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-[var(--text-secondary)] leading-relaxed">
            Create immersive 3D training tutorials for blue collar workers. Annotate real environments, track progress, and onboard faster.
          </p>
          <div className="mt-10">
            {session ? (
              <Link href="/dashboard" className="inline-block px-8 py-3 btn-primary text-lg transition-all">
                Go to Dashboard
              </Link>
            ) : (
              <Link href="/auth/signup" className="inline-block px-8 py-3 btn-primary text-lg transition-all">
                Start Free Trial
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-16 tracking-tight">How It Works</h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="glass-card p-8">
            <div className="w-14 h-14 bg-amber-500/10 rounded-none flex items-center justify-center mb-6 border border-amber-500/30">
              <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">1. Capture Your Space</h3>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Upload photos or use our AI to generate 3D models of your workspace, equipment, or facility.
            </p>
          </div>

          <div className="glass-card p-8">
            <div className="w-14 h-14 bg-amber-500/10 rounded-none flex items-center justify-center mb-6 border border-amber-500/30">
              <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">2. Add Annotations</h3>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Place 3D annotations directly in the scene. Add instructions, safety warnings, and step-by-step guides.
            </p>
          </div>

          <div className="glass-card p-8">
            <div className="w-14 h-14 bg-purple-500/10 rounded-none flex items-center justify-center mb-6 border border-purple-500/20">
              <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">3. Track Progress</h3>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Share tutorials with employees and monitor their completion. See who&apos;s trained and who needs help.
            </p>
          </div>
        </div>
      </section>

      {/* Role-based CTA */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="glass-card p-10 border-t-4 border-t-amber-500">
            <h3 className="text-2xl font-bold mb-6">For Managers</h3>
            <ul className="space-y-4 text-[var(--text-secondary)] mb-8">
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-none bg-amber-500/20 flex items-center justify-center text-amber-400 text-sm">✓</div>
                Create unlimited workspaces
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-none bg-amber-500/20 flex items-center justify-center text-amber-400 text-sm">✓</div>
                Build interactive tutorials
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-none bg-amber-500/20 flex items-center justify-center text-amber-400 text-sm">✓</div>
                Monitor team progress
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-none bg-amber-500/20 flex items-center justify-center text-amber-400 text-sm">✓</div>
                Share via unique links
              </li>
            </ul>
            <Link
              href="/auth/signup"
              className="inline-block px-6 py-3 btn-primary w-full text-center"
            >
              Sign Up as Manager
            </Link>
          </div>

          <div className="glass-card p-10 border-t-4 border-t-amber-500">
            <h3 className="text-2xl font-bold mb-6">For Employees</h3>
            <ul className="space-y-4 text-[var(--text-secondary)] mb-8">
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-none bg-amber-500/20 flex items-center justify-center text-amber-400 text-sm">✓</div>
                Interactive 3D walkthroughs
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-none bg-amber-500/20 flex items-center justify-center text-amber-400 text-sm">✓</div>
                Learn at your own pace
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-none bg-amber-500/20 flex items-center justify-center text-amber-400 text-sm">✓</div>
                Track your progress
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-none bg-amber-500/20 flex items-center justify-center text-amber-400 text-sm">✓</div>
                Access from any device
              </li>
            </ul>
            <Link
              href="/auth/signup"
              className="inline-block px-6 py-3 glass-button w-full text-center hover:bg-amber-500/20 hover:border-amber-500/50 hover:text-amber-200"
            >
              Sign Up as Employee
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)] mt-16 bg-[var(--bg-panel)] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-amber-600 rounded-none flex items-center justify-center font-bold text-sm shadow-lg text-black">
              3D
            </div>
            <span className="font-semibold tracking-tight">TrainSpace</span>
          </div>
          <div className="flex gap-8 text-[var(--text-secondary)] text-sm">
            <Link href="/auth/signin" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/auth/signup" className="hover:text-white transition-colors">Sign Up</Link>
          </div>
          <p className="text-[var(--text-muted)] text-sm">
            © 2026 TrainSpace. Built for Better Hack YC.
          </p>
        </div>
      </footer>
    </div>
  );
}
