export type Role = "recruiter" | "manager" | "engineer" | "other";

export type Status =
  | "planned"
  | "note-sent"
  | "accepted"
  | "messaged"
  | "replied"
  | "closed";

export const STATUSES: Status[] = [
  "planned",
  "note-sent",
  "accepted",
  "messaged",
  "replied",
  "closed",
];

export interface Connection {
  firstName: string;
  lastName: string;
  url: string;
  email: string;
  company: string;
  position: string;
  connectedOn: string;
}

export interface TargetCompany {
  name: string;
  /** 1 = dream company, 3 = nice to have */
  priority: 1 | 2 | 3;
  aliases?: string[];
}

export interface Profile {
  name: string;
  currentRole: string;
  yearsExperience: number;
  skills: string[];
  location: string;
  searchRegion: string;
  targetRole: string;
}

export interface Settings {
  monthlyNoteBudget: number;
  noteMaxChars: number;
  followUpAfterDays: number;
}

export interface AppConfig {
  profile: Profile;
  settings: Settings;
}

export interface TrackedPerson {
  id: number;
  name: string;
  company: string;
  url: string;
  role: Role;
  status: Status;
  alreadyConnected: boolean;
  updatedAt: string; // ISO date
}
