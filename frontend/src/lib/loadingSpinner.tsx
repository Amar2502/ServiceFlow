// File: components/ui/loading-spinner.tsx
"use client";

import { motion } from "framer-motion";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  text?: string;
}

export function LoadingSpinner({ 
  size = "md", 
  showText = true,
  text = "Loading..." 
}: LoadingSpinnerProps) {
  // Size variants
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16"
  };
  
  // Inner spinner sizes
  const innerSizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };
  
  // Text size variants
  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  // Theme colors from your project
  const primaryColor = "#c9a382";
  const secondaryColor = "#b08e70";
  const tertiaryColor = "#EED9C4";
  
  // Animation variants - fixed type issues
  const containerVariants = {
    animate: {
      rotate: 360,
      transition: {
        duration: 2,
        ease: "linear" as const,
        repeat: Infinity
      }
    }
  };
  
  const innerVariants = {
    animate: {
      rotate: -720,
      transition: {
        duration: 3,
        ease: "linear" as const,
        repeat: Infinity
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative">
        {/* Outer spinner */}
        <motion.div
          className={`${sizeClasses[size]} rounded-full border-4 border-t-transparent`}
          style={{ borderTopColor: 'transparent', borderColor: tertiaryColor }}
          variants={containerVariants}
          animate="animate"
        />
        
        {/* Middle spinner */}
        <motion.div
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${sizeClasses[size]} rounded-full border-4 border-r-transparent border-l-transparent`}
          style={{ 
            borderRightColor: 'transparent', 
            borderLeftColor: 'transparent',
            borderTopColor: primaryColor,
            borderBottomColor: secondaryColor
          }}
          variants={containerVariants}
          animate="animate"
        />
        
        {/* Inner spinner */}
        <motion.div
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${innerSizeClasses[size]} rounded-full border-4 border-b-transparent`}
          style={{ 
            borderBottomColor: 'transparent',
            borderTopColor: secondaryColor,
            borderLeftColor: primaryColor,
            borderRightColor: primaryColor
          }}
          variants={innerVariants}
          animate="animate"
        />
      </div>
      
      {showText && (
        <motion.p
          className={`${textSizeClasses[size]} font-medium`}
          style={{ color: secondaryColor }}
          initial={{ opacity: 0.6 }}
          animate={{ 
            opacity: 1,
            transition: { 
              duration: 0.8, 
              repeat: Infinity, 
              repeatType: "reverse" 
            }
          }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}