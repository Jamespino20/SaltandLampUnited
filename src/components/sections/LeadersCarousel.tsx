"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CaretLeft, CaretRight, CaretDown } from "@phosphor-icons/react";

export interface LeaderCard {
  id: string;
  name: string;
  role: string;
  description?: string | null;
  imageUrl?: string | null;
}

interface LeadersCarouselProps {
  leaders: LeaderCard[];
  title: string;
  subtitle?: string;
}

const PLACEHOLDER = "/images/leads/placeholder.png";

export function LeadersCarousel({ leaders, title, subtitle }: LeadersCarouselProps) {
  const [index, setIndex] = useState(0);
  const [perView, setPerView] = useState(1);

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      setPerView(w >= 1024 ? 3 : w >= 640 ? 2 : 1);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  const maxIndex = Math.max(0, leaders.length - perView);

  useEffect(() => {
    setIndex((i) => Math.min(i, maxIndex));
  }, [maxIndex, perView]);

  if (leaders.length === 0) return null;

  const goTo = (i: number) => {
    setIndex(Math.max(0, Math.min(i, maxIndex)));
  };

  const shift = 100 / perView;

  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      goTo(index + (diff > 0 ? 1 : -1));
    }
    touchStartX.current = null;
  };

  return (
    <div className="mx-auto mb-16 max-w-7xl last:mb-0">
      <div className="mb-8 text-center">
        <h3 className="text-2xl font-bold text-slu-black sm:text-3xl">{title}</h3>
        {subtitle ? (
          <p className="mt-2 text-slu-gray-500">{subtitle}</p>
        ) : null}
      </div>

      <div className="relative">
        {maxIndex > 0 && (
          <>
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              aria-label="Previous leaders"
              className="absolute -left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 text-slu-gray-600 shadow-lg transition-all hover:bg-slu-blue hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slu-gray-600 sm:-left-3 sm:p-3"
            >
              <CaretLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              disabled={index === maxIndex}
              aria-label="Next leaders"
              className="absolute -right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 text-slu-gray-600 shadow-lg transition-all hover:bg-slu-blue hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slu-gray-600 sm:-right-3 sm:p-3"
            >
              <CaretRight size={20} />
            </button>
          </>
        )}

        <div
          className="overflow-hidden px-8 sm:px-10"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${index * shift}%)` }}
          >
            {leaders.map((leader) => (
              <div
                key={leader.id}
                className="shrink-0 px-2 sm:px-3"
                style={{ width: `${shift}%` }}
              >
                <div className="flex h-full flex-col items-center rounded-2xl border border-slu-gray-200 bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-md sm:p-8">
                  <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full ring-4 ring-slu-blue/20 ring-offset-2 ring-offset-white sm:h-32 sm:w-32">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={leader.imageUrl || PLACEHOLDER}
                      alt={leader.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const el = e.currentTarget;
                        if (el.src !== window.location.origin + PLACEHOLDER) {
                          el.src = PLACEHOLDER;
                        }
                      }}
                    />
                  </div>
                  <h4 className="mt-4 text-lg font-bold text-slu-black">
                    {leader.name}
                  </h4>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-slu-blue">
                    {leader.role}
                  </p>
                  {leader.description ? (
                    <p className="mt-3 text-sm leading-relaxed text-slu-gray-500">
                      {leader.description}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {maxIndex > 0 && (
          <div className="mt-6 flex items-center justify-center gap-1.5">
            {Array.from({ length: maxIndex + 1 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to leaders page ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === index ? "w-6 bg-slu-blue" : "w-2 bg-slu-blue/30"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 flex items-center justify-center gap-1 text-xs text-slu-gray-400 sm:hidden">
        <CaretDown size={12} className="rotate-90" />
        Swipe or use arrows to explore
      </p>
    </div>
  );
}
