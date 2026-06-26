import { useThemeStore } from '@/store/useThemeStore';
import logoBlack from '@/assets/logo-black.png';
import logoWhite from '@/assets/logo-white.png';

/**
 * Decorative background: a single horizontal band of the brand logo, repeated
 * and slowly scrolling, vertically centered and fixed behind all page content.
 * Black logo on light mode, white on dark (the white PNG is invisible on a
 * light background and vice-versa). Purely cosmetic — aria-hidden, no pointer
 * events — so it never interferes with content or assistive tech.
 *
 * The strip is rendered twice back-to-back; translating it by exactly -50%
 * (one copy's width) loops seamlessly. See `.animate-marquee` in index.css.
 */
const LOGOS_PER_STRIP = 24;

export function MarqueeBackground() {
  const theme = useThemeStore((s) => s.theme);
  const src = theme === 'dark' ? logoWhite : logoBlack;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 flex items-center overflow-hidden"
    >
      <div className="flex w-max animate-marquee will-change-transform" style={{ opacity: 0.1 }}>
        {[0, 1].map((strip) => (
          <div key={strip} className="flex shrink-0">
            {Array.from({ length: LOGOS_PER_STRIP }).map((_, i) => (
              <img
                key={i}
                src={src}
                alt=""
                draggable={false}
                className="h-20 w-auto shrink-0 select-none px-4 sm:px-5"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
