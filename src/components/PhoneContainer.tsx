/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ReactNode, useEffect, useState } from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';

interface PhoneContainerProps {
  children: ReactNode;
}

export function PhoneContainer({ children }: PhoneContainerProps) {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-0 md:p-8 font-sans overflow-hidden">
      {/* Phone outer frame - hidden on mobile, beautifully styled on desktop */}
      <div className="relative w-full max-w-md h-screen md:h-[860px] bg-slate-950 md:rounded-[48px] md:shadow-2xl md:border-8 md:border-slate-800 flex flex-col overflow-hidden">
        
        {/* Dynamic Notch / Camera Hole on desktop */}
        <div className="hidden md:block absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-7 bg-black rounded-b-2xl z-50 flex items-center justify-center">
          <div className="w-3 h-3 bg-slate-900 rounded-full mr-4"></div>
          <div className="w-16 h-1 bg-slate-800 rounded-full"></div>
        </div>

        {/* Status Bar */}
        <div className="h-10 bg-slate-950 text-white flex justify-between items-center px-6 pt-2 z-40 select-none text-[12px] font-medium font-mono">
          <span>{currentTime}</span>
          <div className="flex items-center space-x-1.5">
            <Signal size={13} className="text-slate-300" />
            <Wifi size={13} className="text-slate-300" />
            <div className="flex items-center space-x-0.5">
              <span className="text-[10px] text-slate-400">88%</span>
              <Battery size={14} className="text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Real App Screen area */}
        <div className="flex-1 overflow-y-auto bg-slate-950 flex flex-col relative">
          {children}
        </div>

        {/* Android Navigation bar - simulator */}
        <div className="h-12 bg-slate-950 flex justify-around items-center px-12 pb-2 border-t border-slate-900 z-40">
          {/* Back button */}
          <button className="p-2 text-slate-500 hover:text-slate-300 active:scale-90 transition-transform">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>
          {/* Home button */}
          <button className="p-2 text-slate-500 hover:text-slate-300 active:scale-90 transition-transform">
            <div className="w-4 h-4 rounded-full border-2 border-current"></div>
          </button>
          {/* Recent Apps button */}
          <button className="p-2 text-slate-500 hover:text-slate-300 active:scale-90 transition-transform">
            <div className="w-3.5 h-3.5 border-2 border-current rounded-sm"></div>
          </button>
        </div>
      </div>
    </div>
  );
}
