import { Eye, Gauge, Scissors, TrendingUp, Wallet } from "lucide-react";
import type { ComponentType } from "react";
import type { RoleId, TeamId } from "@/lib/match/types";

/**
 * One colour per team and one per seat, used everywhere a team or a role is
 * named. Consistent colour is how a competitive screen stays readable at a
 * glance — you should know whose row you are looking at before you read it.
 */
export const TEAM_ACCENT: Record<TeamId, string> = {
  a: "#2f6b62",
  b: "#c45045",
  c: "#8a5a2a",
};

export const TEAM_SOFT: Record<TeamId, string> = {
  a: "#d7ebe6",
  b: "#f7ddd8",
  c: "#f0e2cc",
};

export const ROLE_ACCENT: Record<RoleId, string> = {
  analyst: "#3d5a80",
  trader: "#2a7a55",
  risk: "#c45045",
  desk: "#c98f2b",
  pm: "#6b4a8a",
};

/**
 * One glyph per seat. Paired with `ROLE_ACCENT`, this is what lets a player
 * recognise who is talking in the chatter feed without reading the label.
 */
export const ROLE_ICON: Record<RoleId, ComponentType<{ className?: string }>> = {
  analyst: Eye,
  trader: TrendingUp,
  risk: Scissors,
  desk: Gauge,
  pm: Wallet,
};
