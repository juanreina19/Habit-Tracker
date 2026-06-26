export const MOTION = {
  spring: {
    default: { type: "spring" as const, stiffness: 400, damping: 30 },
    bouncy:  { type: "spring" as const, stiffness: 500, damping: 25 },
    gentle:  { type: "spring" as const, stiffness: 300, damping: 30 },
  },
  duration: {
    instant: 0.1,
    fast:    0.15,
    normal:  0.2,
    slow:    0.3,
  },
  ease: [0.16, 1, 0.3, 1] as const,
  easeIn: [0.4, 0, 1, 1] as const,
  stagger: {
    fast:   0.03,
    normal: 0.04,
  },
} as const;
