"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarNavButtonsProps {
  onPrev: () => void;
  onNext: () => void;
}

export function CalendarNavButtons({ onPrev, onNext }: CalendarNavButtonsProps) {
  return (
    <div className="fixed bottom-6 right-6 z-10 flex gap-2">
      <button
        onClick={onPrev}
        className="w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        aria-label="Previous"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={onNext}
        className="w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        aria-label="Next"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
