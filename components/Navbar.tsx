"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  Home, Target, Map, BookOpen, Zap, Calendar, Award, Info
} from "lucide-react";

const navItems = [
  { name: "Home",        path: "/",           icon: Home },
  { name: "My Goals",    path: "/goals",      icon: Target },
  { name: "Roadmap",     path: "/roadmap",    icon: Map },
  { name: "Learning",    path: "/learning",   icon: BookOpen },
  { name: "Upskill",     path: "/upskill",    icon: Zap },
  { name: "Calendar",    path: "/calendar",   icon: Calendar },
  { name: "Credentials", path: "/credentials",icon: Award },
  { name: "About",       path: "/about",      icon: Info },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
          <span className="text-base font-semibold text-white tracking-tight">
            Saarthi AI
          </span>
        </div>

        {/* Nav Links */}
        <div className="flex gap-1 text-sm">
          {navItems.map(({ name, path, icon: Icon }) => {
            const isActive = pathname === path;
            return (
              <Link
                key={name}
                href={path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors duration-150
                  ${isActive
                    ? "bg-indigo-600/20 text-indigo-400"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
              >
                <Icon size={14} />
                {name}
              </Link>
            );
          })}
        </div>

        {/* Auth */}
        <div className="flex items-center gap-3">
          {session?.user ? (
            <>
              <img
                src={session.user.image || ""}
                alt="profile"
                className="w-8 h-8 rounded-full border border-zinc-700 hover:ring-2 hover:ring-indigo-500 transition"
              />
              <button
                onClick={() => signOut()}
                className="text-sm text-zinc-400 hover:text-white transition"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="text-sm border border-zinc-700 text-white px-4 py-1.5 rounded-lg hover:bg-zinc-800 transition"
            >
              Sign in
            </button>
          )}
        </div>

      </div>
    </nav>
  );
}
