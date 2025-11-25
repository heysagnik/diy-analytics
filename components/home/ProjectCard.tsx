"use client";

import React from "react";
import { motion } from "framer-motion";

interface AnalyticsType {
  views?: number;
  users?: number;
  growth?: number;
}

export interface ProjectType {
  _id?: string;          // some APIs use _id
  id?: string;           // some APIs use id
  studio: string;
  description: string;
  type: string;
  analytics?: AnalyticsType;
  // allow any extra fields without TS complaining
  [key: string]: any;
}

const ProjectCard = ({ project }: { project: ProjectType }) => {
  const views = project.analytics?.views ?? 0;
  const users = project.analytics?.users ?? 0;
  const growth = project.analytics?.growth ?? 0;

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-500 p-[1px] shadow-lg"
    >
      {/* glowing border on hover */}
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-60 blur-2xl transition duration-500 bg-gradient-to-r from-white/40 via-transparent to-white/30" />

      {/* inner card */}
      <div className="relative z-10 h-full w-full rounded-2xl bg-white/95 px-5 py-4 flex flex-col gap-3">
        {/* title + type badge */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-900">
              {project.studio}
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 line-clamp-2">
              {project.description}
            </p>
          </div>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] sm:text-xs font-medium text-slate-600">
            {project.type}
          </span>
        </div>

        {/* stats row */}
        <div className="mt-1 flex items-center justify-between text-xs sm:text-sm">
          <span className="flex items-center gap-1 text-slate-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live analytics
          </span>

          <div className="flex items-center gap-3 text-slate-600">
            <span className="text-[11px] sm:text-xs opacity-80">
              👁 {views} views
            </span>
            <span className="text-[11px] sm:text-xs opacity-80">
              👤 {users} users
            </span>
          </div>
        </div>

        {/* growth circle + button */}
        <div className="mt-1 flex items-end justify-between gap-4">
          <div className="relative flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <div className="h-11 w-11 rounded-full bg-slate-100 flex items-center justify-center">
                <span className="text-xs font-semibold text-indigo-600">
                  {growth}%
                </span>
              </div>
              <div className="pointer-events-none absolute inset-0 rounded-full border border-indigo-500/60 animate-pulse" />
            </div>
            <span className="text-[11px] sm:text-xs text-slate-500 max-w-[120px]">
              Weekly growth across key metrics
            </span>
          </div>

          <button className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-900 text-white px-3.5 py-1.5 text-[11px] sm:text-xs font-medium shadow-md shadow-slate-900/30 transition group-hover:bg-slate-800">
            <span>View details</span>
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/15">
              →
            </span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProjectCard;
