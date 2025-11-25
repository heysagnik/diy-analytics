"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Projects", href: "/projects" },
  { name: "Analytics", href: "/analytics" },
  { name: "Settings", href: "/settings" },
];

export default function Navigation() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [search, setSearch] = useState("");

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);
  const toggleProfile = () => setIsProfileOpen((prev) => !prev);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 w-full z-50 shadow-lg"
    >
      {/* Gradient / glass background */}
      <div className="bg-gradient-to-r from-[#7f5cff] via-[#4e94ff] to-[#00e1ff] bg-opacity-95 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <motion.button
            whileHover={{ scale: 1.06 }}
            className="flex items-center gap-2"
          >
            <span className="h-8 w-8 rounded-xl bg-white/15 flex items-center justify-center text-sm font-bold text-white">
              DA
            </span>
            <span className="hidden sm:block text-white font-semibold text-sm sm:text-base tracking-wide">
              DIY Analytics
            </span>
          </motion.button>

          {/* Center search (desktop) */}
          <div className="hidden md:flex flex-1 justify-center">
            <div className="relative w-full max-w-sm">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects, dashboards..."
                className="w-full rounded-full bg-white/90 border border-white/40 text-sm px-4 py-1.5 pr-9 outline-none placeholder:text-slate-400 focus:border-white focus:ring-2 focus:ring-white/40"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                ⌘K
              </span>
            </div>
          </div>

          {/* Right side (desktop) */}
          <div className="hidden md:flex items-center gap-4">
            {/* Menu links */}
            <div className="flex items-center gap-4">
              {navLinks.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link key={link.name} href={link.href}>
                    <span
                      className={`text-xs font-medium text-white transition-all cursor-pointer ${
                        active
                          ? "opacity-100 border-b border-white/80 pb-0.5"
                          : "opacity-70 hover:opacity-100"
                      }`}
                    >
                      {link.name}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* New project button */}
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => alert("Hook this to New Project modal")}
              className="px-4 py-1.5 rounded-full text-xs font-semibold shadow-md text-white bg-black/30 hover:bg-black/55 transition flex items-center gap-1.5"
            >
              <span className="text-sm">＋</span>
              <span>New Project</span>
            </motion.button>

            {/* Profile avatar */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleProfile}
                className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-semibold text-white shadow-md"
              >
                M
              </motion.button>
              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 mt-2 w-40 rounded-xl bg-white text-slate-800 shadow-lg py-2 text-xs"
                  >
                    <button
                      className="w-full px-3 py-2 text-left hover:bg-slate-100"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      Profile
                    </button>
                    <button
                      className="w-full px-3 py-2 text-left hover:bg-slate-100"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      Settings
                    </button>
                    <div className="border-t my-1" />
                    <button
                      className="w-full px-3 py-2 text-left text-red-500 hover:bg-red-50"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      Log out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile right side: search icon + hamburger */}
          <div className="flex md:hidden items-center gap-3">
            {/* simple small search button to maybe open global cmd-k later */}
            <button
              className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center text-[13px] text-white"
              onClick={() => alert("Search action coming soon")}
            >
              🔍
            </button>

            {/* Hamburger */}
            <button
              className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center text-white"
              onClick={toggleMenu}
            >
              {isMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile slide-in menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="md:hidden fixed top-12 right-3 left-3 z-40 rounded-2xl bg-slate-900/95 text-white shadow-2xl border border-white/10 overflow-hidden"
          >
            <div className="px-4 pt-3 pb-4 flex flex-col gap-3">
              {/* Search in mobile menu */}
              <div className="relative">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full rounded-full bg-slate-800/80 border border-slate-600 text-xs px-3 py-1.5 pr-7 outline-none placeholder:text-slate-400"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                  🔍
                </span>
              </div>

              {/* nav links */}
              <div className="flex flex-col gap-1 mt-1">
                {navLinks.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <Link key={link.name} href={link.href}>
                      <button
                        onClick={() => setIsMenuOpen(false)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium ${
                          active
                            ? "bg-slate-100 text-slate-900"
                            : "text-slate-200 hover:bg-slate-800"
                        }`}
                      >
                        {link.name}
                      </button>
                    </Link>
                  );
                })}
              </div>

              {/* New project CTA */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  alert("Hook this to New Project modal");
                }}
                className="mt-2 w-full px-3 py-2 rounded-full bg-white text-xs font-semibold text-slate-900"
              >
                ＋ New Project
              </button>

              {/* Profile shortcuts */}
              <div className="mt-2 border-t border-slate-700 pt-2 flex justify-between text-[11px] text-slate-300">
                <button
                  className="hover:text-white"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Profile
                </button>
                <button
                  className="hover:text-white"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Settings
                </button>
                <button
                  className="hover:text-red-400 text-red-300"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Logout
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
