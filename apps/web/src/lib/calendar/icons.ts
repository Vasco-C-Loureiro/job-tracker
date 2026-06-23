import type { InterviewType } from "@job-tracker/shared";
import {
  Phone, PhoneCall, Home, Code2, Users, Layers,
  Network, MessageCircle, UsersRound, Flag, Circle,
  type LucideIcon,
} from "lucide-react";
import { interviewTypeLabel } from "@/lib/calendar/labels";

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

export const INTERVIEW_TYPE_OPTIONS: { value: InterviewType; label: string }[] = [
  "screening", "technical-phone", "take-home", "coding",
  "pair-programming", "technical-deep-dive", "system-design",
  "behavioral", "panel", "final", "other",
].map((value) => ({
  value: value as InterviewType,
  label: interviewTypeLabel(value as InterviewType),
}));
