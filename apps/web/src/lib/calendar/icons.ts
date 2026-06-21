import type { InterviewType } from "@job-tracker/shared";
import {
  Phone, PhoneCall, Home, Code2, Users, Layers,
  Network, MessageCircle, UsersRound, Flag, Circle,
  type LucideIcon,
} from "lucide-react";

export const INTERVIEW_TYPE_ICONS: Record<InterviewType, LucideIcon> = {
  "screening":           Phone,
  "technical-phone":     PhoneCall,
  "take-home":           Home,
  "coding":              Code2,
  "pair-programming":    Users,
  "technical-deep-dive": Layers,
  "system-design":       Network,
  "behavioral":          MessageCircle,
  "panel":               UsersRound,
  "final":               Flag,
  "other":               Circle,
};
