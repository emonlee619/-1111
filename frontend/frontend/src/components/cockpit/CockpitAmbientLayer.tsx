import { cn } from "@/lib/cn";
import type { CSSProperties } from "react";

export type CockpitAmbientVariant = "featured" | "standard" | "subdued";

type ParticleTone = "cyan" | "blue" | "white" | "amber";

type Particle = {
  x: number;
  y: number;
  size: number;
  delay: string;
  duration: string;
  tone: ParticleTone;
  hideOnMobile?: boolean;
};

type ParticleStyle = CSSProperties &
  Record<
    "--particle-x" | "--particle-y" | "--particle-size" | "--particle-delay" | "--particle-duration",
    string
  >;

const particles: Particle[] = [
  { x: 5, y: 18, size: 2, delay: "-4s", duration: "34s", tone: "cyan" },
  { x: 11, y: 72, size: 1, delay: "-17s", duration: "41s", tone: "white" },
  { x: 16, y: 35, size: 2, delay: "-8s", duration: "38s", tone: "blue" },
  { x: 21, y: 88, size: 1, delay: "-21s", duration: "44s", tone: "cyan", hideOnMobile: true },
  { x: 27, y: 12, size: 2, delay: "-13s", duration: "36s", tone: "white" },
  { x: 31, y: 58, size: 2, delay: "-2s", duration: "42s", tone: "cyan" },
  { x: 36, y: 78, size: 1, delay: "-19s", duration: "39s", tone: "blue", hideOnMobile: true },
  { x: 42, y: 24, size: 2, delay: "-10s", duration: "45s", tone: "cyan" },
  { x: 48, y: 66, size: 1, delay: "-6s", duration: "33s", tone: "white" },
  { x: 53, y: 15, size: 2, delay: "-24s", duration: "40s", tone: "blue", hideOnMobile: true },
  { x: 58, y: 82, size: 1, delay: "-15s", duration: "37s", tone: "cyan" },
  { x: 64, y: 39, size: 2, delay: "-5s", duration: "43s", tone: "amber" },
  { x: 69, y: 68, size: 1, delay: "-18s", duration: "35s", tone: "white", hideOnMobile: true },
  { x: 74, y: 22, size: 2, delay: "-9s", duration: "46s", tone: "cyan" },
  { x: 79, y: 51, size: 1, delay: "-27s", duration: "39s", tone: "blue" },
  { x: 84, y: 84, size: 2, delay: "-11s", duration: "44s", tone: "cyan", hideOnMobile: true },
  { x: 91, y: 29, size: 1, delay: "-20s", duration: "36s", tone: "white" },
  { x: 96, y: 62, size: 2, delay: "-7s", duration: "41s", tone: "cyan" },
  { x: 8, y: 47, size: 1, delay: "-25s", duration: "38s", tone: "blue", hideOnMobile: true },
  { x: 14, y: 7, size: 2, delay: "-12s", duration: "43s", tone: "cyan" },
  { x: 24, y: 44, size: 1, delay: "-29s", duration: "34s", tone: "white" },
  { x: 33, y: 91, size: 2, delay: "-16s", duration: "45s", tone: "cyan", hideOnMobile: true },
  { x: 45, y: 5, size: 1, delay: "-22s", duration: "40s", tone: "blue" },
  { x: 57, y: 47, size: 2, delay: "-3s", duration: "37s", tone: "cyan" },
  { x: 67, y: 9, size: 1, delay: "-14s", duration: "46s", tone: "white", hideOnMobile: true },
  { x: 72, y: 74, size: 2, delay: "-31s", duration: "39s", tone: "amber" },
  { x: 88, y: 43, size: 1, delay: "-26s", duration: "42s", tone: "cyan" },
  { x: 94, y: 11, size: 2, delay: "-1s", duration: "35s", tone: "blue", hideOnMobile: true },
  { x: 3, y: 82, size: 1, delay: "-28s", duration: "44s", tone: "white", hideOnMobile: true },
  { x: 18, y: 62, size: 2, delay: "-32s", duration: "40s", tone: "cyan" },
  { x: 29, y: 27, size: 1, delay: "-23s", duration: "36s", tone: "blue", hideOnMobile: true },
  { x: 39, y: 53, size: 2, delay: "-30s", duration: "45s", tone: "cyan" },
  { x: 51, y: 93, size: 1, delay: "-34s", duration: "37s", tone: "white", hideOnMobile: true },
  { x: 62, y: 31, size: 2, delay: "-33s", duration: "41s", tone: "cyan" },
  { x: 76, y: 6, size: 1, delay: "-35s", duration: "38s", tone: "blue", hideOnMobile: true },
  { x: 82, y: 67, size: 2, delay: "-36s", duration: "43s", tone: "cyan" },
  { x: 98, y: 88, size: 1, delay: "-37s", duration: "39s", tone: "white", hideOnMobile: true },
  { x: 7, y: 28, size: 2, delay: "-38s", duration: "46s", tone: "cyan", hideOnMobile: true },
  { x: 22, y: 96, size: 1, delay: "-39s", duration: "35s", tone: "blue", hideOnMobile: true },
  { x: 35, y: 17, size: 2, delay: "-40s", duration: "42s", tone: "white", hideOnMobile: true },
  { x: 47, y: 73, size: 1, delay: "-41s", duration: "44s", tone: "cyan", hideOnMobile: true },
  { x: 55, y: 60, size: 2, delay: "-42s", duration: "36s", tone: "blue", hideOnMobile: true },
  { x: 66, y: 95, size: 1, delay: "-43s", duration: "40s", tone: "cyan", hideOnMobile: true },
  { x: 87, y: 18, size: 2, delay: "-44s", duration: "45s", tone: "white", hideOnMobile: true },
];

const particleCount: Record<CockpitAmbientVariant, number> = {
  featured: 44,
  standard: 32,
  subdued: 16,
};

const particleToneClass: Record<ParticleTone, string> = {
  cyan: "mine-particle--cyan",
  blue: "mine-particle--blue",
  white: "mine-particle--white",
  amber: "mine-particle--amber",
};

type CockpitAmbientLayerProps = {
  variant?: CockpitAmbientVariant;
  className?: string;
};

export function CockpitAmbientLayer({ variant = "standard", className }: CockpitAmbientLayerProps) {
  const visibleParticles = particles.slice(0, particleCount[variant]);

  return (
    <div
      aria-hidden="true"
      className={cn("cockpit-ambient pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}
      data-variant={variant}
    >
      <div className="cockpit-ambient__wash" />
      <div className="cockpit-ambient__grid" />
      <svg className="cockpit-ambient__mesh" viewBox="0 0 1200 520" preserveAspectRatio="none" focusable="false">
        <path d="M0 390 C220 318 356 462 554 366 C748 272 902 332 1200 238" />
        <path d="M0 176 C162 108 326 138 486 188 C674 248 842 178 1200 112" />
        <path d="M116 520 C208 356 344 248 552 244 C780 240 912 168 1096 0" />
      </svg>
      <div className="cockpit-ambient__particles">
        {visibleParticles.map((particle, index) => {
          const style: ParticleStyle = {
            "--particle-x": `${particle.x}%`,
            "--particle-y": `${particle.y}%`,
            "--particle-size": `${particle.size}px`,
            "--particle-delay": particle.delay,
            "--particle-duration": particle.duration,
          };

          return (
            <span
              key={`${particle.x}-${particle.y}-${index}`}
              className={cn("mine-particle", particleToneClass[particle.tone], particle.hideOnMobile && "max-sm:hidden")}
              style={style}
            />
          );
        })}
      </div>
    </div>
  );
}
