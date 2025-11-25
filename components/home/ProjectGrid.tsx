"use client";

import React from "react";
import { motion } from "framer-motion";
import ProjectCard, { ProjectType } from "./ProjectCard";

interface ProjectGridProps {
  projects: ProjectType[];
}

const containerVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.12,
      ease: "easeOut",
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.94 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
    },
  },
};

const ProjectGrid: React.FC<ProjectGridProps> = ({ projects }) => {
  if (!projects || projects.length === 0) return null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mt-6"
    >
      {projects.map((project, index) => (
        <motion.div
          key={project._id ?? project.id ?? index}
          variants={itemVariants}
        >
          <ProjectCard project={project} />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default ProjectGrid;
