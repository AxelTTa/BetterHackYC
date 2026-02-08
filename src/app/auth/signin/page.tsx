import { SignInForm } from "@/components/auth";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      <nav className="border-b border-gray-700 px-4 py-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-8 h-8 bg-amber-600 rounded-none flex items-center justify-center font-bold text-white">
            3D
          </div>
          <span className="text-xl font-bold text-white">TrainSpace</span>
        </Link>
      </nav>
      <div className="flex-1 flex items-center justify-center">
        <SignInForm />
      </div>
    </div>
  );
}
