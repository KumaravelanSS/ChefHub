import React from 'react';
import { ChefHat, Flame, Sparkles, Database, RefreshCw, UtensilsCrossed } from 'lucide-react';

/**
 * Fullscreen or overlay Kitchen DBMS Loading Screen
 */
export function KitchenLoadingScreen({ 
  message = 'Connecting to ChefHub Relational DBMS Engine...', 
  subMessage = 'Synchronizing PostgreSQL & MongoDB schemas with zero-delay caching' 
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 transition-all duration-300">
      <div className="glass-card max-w-md w-full p-8 rounded-3xl border border-orange-500/20 text-center relative overflow-hidden shadow-2xl shadow-orange-500/10">
        
        {/* Ambient Culinary Glow */}
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Animated Kitchen Art */}
        <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center">
          
          {/* Steam Puffs */}
          <div className="absolute -top-4 left-6 w-3 h-3 rounded-full bg-slate-300/60 dark:bg-white/40 blur-[1px] animate-steam-1" />
          <div className="absolute -top-6 left-12 w-3.5 h-3.5 rounded-full bg-slate-300/60 dark:bg-white/40 blur-[1px] animate-steam-2" />
          <div className="absolute -top-3 left-18 w-2.5 h-2.5 rounded-full bg-slate-300/60 dark:bg-white/40 blur-[1px] animate-steam-3" />

          {/* Sizzling Pan Base & Chef Toque */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-orange-500/20 via-amber-500/20 to-orange-600/30 border border-orange-500/30 flex items-center justify-center animate-pan-simmer shadow-lg">
            <div className="relative flex flex-col items-center justify-center">
              <ChefHat className="w-10 h-10 text-orange-500 animate-chef-hat drop-shadow-[0_2px_8px_rgba(249,115,22,0.4)]" />
              <UtensilsCrossed className="w-4 h-4 text-amber-400 -mt-1 opacity-80" />
            </div>
          </div>

          {/* Sizzling Flame Base */}
          <div className="absolute -bottom-1 flex items-center justify-center gap-1">
            <Flame className="w-4 h-4 text-orange-500 animate-flame-flicker" />
            <Flame className="w-5 h-5 text-amber-400 animate-flame-flicker delay-75" />
            <Flame className="w-4 h-4 text-orange-600 animate-flame-flicker delay-150" />
          </div>
        </div>

        {/* Loading Titles */}
        <div className="space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-600 dark:text-orange-400 text-[11px] font-black uppercase tracking-wider">
            <Database className="w-3 h-3 text-orange-500 animate-pulse" />
            <span>DBMS Live Query</span>
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {message}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
            {subMessage}
          </p>
        </div>

        {/* Smooth Shimmer Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 rounded-full animate-pulse w-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Tab/Card Level Kitchen Data Loader
 */
export function KitchenDataLoader({ 
  message = 'Simmering queries...', 
  subText = 'Retrieving fresh kitchen records' 
}) {
  return (
    <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
      <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
        {/* Steam */}
        <div className="absolute -top-2 left-3 w-2 h-2 rounded-full bg-slate-400/50 dark:bg-white/40 blur-[1px] animate-steam-1" />
        <div className="absolute -top-3 left-7 w-2.5 h-2.5 rounded-full bg-slate-400/50 dark:bg-white/40 blur-[1px] animate-steam-2" />
        
        {/* Center Icon with pan simmer */}
        <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center animate-pan-simmer">
          <ChefHat className="w-7 h-7 text-orange-500 animate-chef-hat" />
        </div>

        {/* Small Flame */}
        <Flame className="w-3.5 h-3.5 text-amber-500 absolute -bottom-1 animate-flame-flicker" />
      </div>

      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        <span>{message}</span>
      </h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        {subText}
      </p>
    </div>
  );
}

/**
 * Shimmer Table Skeleton
 */
export function KitchenSkeletonRows({ rows = 4, cols = 4 }) {
  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-800 w-full">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="py-4 px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl skeleton-shimmer shrink-0" />
            <div className="space-y-1.5 flex-1 max-w-xs">
              <div className="h-3.5 rounded-md skeleton-shimmer w-3/4" />
              <div className="h-2.5 rounded-md skeleton-shimmer w-1/2" />
            </div>
          </div>
          <div className="h-4 rounded-md skeleton-shimmer w-20 hidden sm:block" />
          <div className="h-4 rounded-md skeleton-shimmer w-16" />
          <div className="h-7 rounded-xl skeleton-shimmer w-24 hidden md:block" />
        </div>
      ))}
    </div>
  );
}
