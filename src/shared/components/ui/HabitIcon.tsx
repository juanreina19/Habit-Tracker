"use client";

import {
  Dumbbell, Bike, Activity, Timer, Flame,
  Heart, Apple, Droplets, Pill, Leaf,
  Moon, Coffee, Bed, Sun,
  Brain, BookOpen, Pencil, Lightbulb, Target,
  Home, Music, Star, Smile, Zap, Code,
  Briefcase, Calendar, CheckSquare, ClipboardList, Mail, Laptop, FileText, Rocket,
  ShoppingCart, Car, Plane, Gift, Camera, Palette, Gamepad2, TreePine,
  type LucideProps,
} from "lucide-react";
import type { FC } from "react";

type IconComp = FC<LucideProps>;

export const LUCIDE_ICON_MAP: Record<string, IconComp> = {
  Dumbbell, Bike, Activity, Timer, Flame,
  Heart, Apple, Droplets, Pill, Leaf,
  Moon, Coffee, Bed, Sun,
  Brain, BookOpen, Pencil, Lightbulb, Target,
  Home, Music, Star, Smile, Zap, Code,
  Briefcase, Calendar, CheckSquare, ClipboardList, Mail, Laptop, FileText, Rocket,
  ShoppingCart, Car, Plane, Gift, Camera, Palette, Gamepad2, TreePine,
};

export const LUCIDE_CATEGORIES = [
  { label: "Fitness",  icons: ["Dumbbell", "Bike", "Activity", "Timer", "Flame"] },
  { label: "Salud",    icons: ["Heart", "Apple", "Droplets", "Pill", "Leaf"] },
  { label: "Descanso", icons: ["Moon", "Coffee", "Bed", "Sun"] },
  { label: "Mente",    icons: ["Brain", "BookOpen", "Pencil", "Lightbulb", "Target"] },
  { label: "Vida",     icons: ["Home", "Music", "Star", "Smile", "Zap", "Code"] },
  { label: "Trabajo",  icons: ["Briefcase", "Calendar", "CheckSquare", "ClipboardList", "Mail", "Laptop", "FileText", "Rocket"] },
  { label: "Extra",    icons: ["ShoppingCart", "Car", "Plane", "Gift", "Camera", "Palette", "Gamepad2", "TreePine"] },
];

interface Props {
  icon?: string | null;
  size?: number;
  color?: string;
  className?: string;
}

export function HabitIcon({ icon, size = 20, color, className }: Props) {
  if (!icon) return null;

  if (icon.startsWith("lucide:")) {
    const name = icon.slice(7);
    const Icon = LUCIDE_ICON_MAP[name];
    if (!Icon) return null;
    return <Icon size={size} color={color} className={className} />;
  }

  return <span className={`leading-none select-none ${className ?? ""}`} style={{ fontSize: size }}>{icon}</span>;
}
