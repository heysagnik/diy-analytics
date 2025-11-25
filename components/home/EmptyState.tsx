"use client";

import React from "react";
import { motion } from "framer-motion";
import { Theme } from "@/utils/theme";

interface EmptyStateProps {
  searchQuery: string;
  onNewSiteClick: () => void;
  theme: Theme;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  searchQuery,
  onNewSiteClick,
  theme,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex flex-col items-center justify-center py-20 px-6 text-center rounded-2xl shadow-xl"
      style={{
        background: `linear-gradient(135deg, ${theme.cardBg}, ${theme.primary}22, ${theme.accent}33)`,
        border: `1px solid ${theme.cardBorder}`,
      }}
    >
      <motion.div
        initial={{ scale: 0.7, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke={theme.accent}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-6 opacity-80"
        >
          <rect x="3" y="3" width="18" height="18" rx="4"></rect>
          <path d="M8 12h8M12 8v8" />
        </svg>
      </motion.div>

      <h3
        className="text-xl font-bold mb-2 tracking-wide"
        style={{ color: theme.accent }}
      >
        No projects yet
      </h3>

      <p
        className="mb-6 max-w-md text-sm"
        style={{ color: theme.textLight }}
      >
        {searchQuery
          ? "No matches found. Try adjusting your search filters."
          : "Start by creating your first analytics project with rich insights."}
      </p>

      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        onClick={onNewSiteClick}
        className="flex items-center gap-2 px-6 py-3 text-white rounded-full font-medium text-sm shadow-lg transition-all"
        style={{
          background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          fill="currentColor"
          viewBox="0 0 256 256"
        >
          <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"></path>
        </svg>
        Create New Project
      </motion.button>
    </motion.div>
  );
};
