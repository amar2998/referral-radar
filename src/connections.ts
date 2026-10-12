import { readFileSync } from "node:fs";
import { parseCsv } from "./csv.js";
import type { Connection, Role, TargetCompany } from "./types.js";

/** Reads LinkedIn's "Connections.csv" export (it has a few note lines before the header). */
export function loadConnections(path: string): Connection[] {
  const text = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  const rows = parseCsv(text);
  const headerIdx = rows.findIndex((r) => r[0]?.trim().toLowerCase() === "first name");
  if (headerIdx === -1) {
    throw new Error(
      "Couldn't find the header row (First Name, Last Name, ...). Is this LinkedIn's Connections.csv?"
    );
  }
  const header = rows[headerIdx].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const get = (r: string[], name: string) => (r[col(name)] ?? "").trim();

  return rows
    .slice(headerIdx + 1)
    .filter((r) => r.length > 1)
    .map((r) => ({
      firstName: get(r, "first name"),
      lastName: get(r, "last name"),
      url: get(r, "url"),
      email: get(r, "email address"),
      company: get(r, "company"),
      position: get(r, "position"),
      connectedOn: get(r, "connected on"),
    }));
}

const NOISE = new Set([
  "inc", "ltd", "limited", "pvt", "private", "llp", "llc", "corp", "corporation",
  "co", "technologies", "technology", "solutions", "services", "india", "software", "the",
]);

export function normalizeCompany(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const kept = words.filter((w) => !NOISE.has(w));
  return (kept.length ? kept : words).join(" ");
}

export function companyMatches(connectionCompany: string, target: TargetCompany): boolean {
  const c = normalizeCompany(connectionCompany);
  if (c.length < 3) return false;
  const padded = ` ${c} `;
  return [target.name, ...(target.aliases ?? [])].some((n) => {
    const t = normalizeCompany(n);
    return t.length >= 3 && (padded.includes(` ${t} `) || ` ${t} `.includes(padded));
  });
}

const RECRUITER = /\b(recruit\w*|talent|sourcer|sourcing|hr|human resources|people operations|people partner|hiring)\b/i;
const MANAGER = /\b(manager|director|head|vp|vice president|cto|founder|co-founder)\b/i;
const ENGINEER = /\b(engineer|developer|sde|swe|architect|programmer|tech lead)\b/i;

export function classify(position: string): Role {
  if (RECRUITER.test(position)) return "recruiter";
  if (MANAGER.test(position)) return "manager";
  if (ENGINEER.test(position)) return "engineer";
  return "other";
}

const ROLE_WEIGHT: Record<Role, number> = { recruiter: 20, engineer: 15, manager: 12, other: 0 };

export function scoreMatch(priority: number, role: Role, position: string): number {
  const base = (4 - priority) * 10;
  const backendBonus =
    role === "engineer" && /(java|backend|back-end|spring|cloud|aws|platform)/i.test(position) ? 5 : 0;
  return base + ROLE_WEIGHT[role] + backendBonus;
}
