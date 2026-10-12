import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Role, Status, TrackedPerson } from "./types.js";

const FILE = "data/tracker.json";
const today = () => new Date().toISOString().slice(0, 10);

export function loadTracker(): TrackedPerson[] {
  return existsSync(FILE) ? (JSON.parse(readFileSync(FILE, "utf8")) as TrackedPerson[]) : [];
}

export function saveTracker(list: TrackedPerson[]): void {
  mkdirSync("data", { recursive: true });
  writeFileSync(FILE, JSON.stringify(list, null, 2));
}

interface NewPerson {
  name: string;
  company: string;
  url: string;
  role: Role;
  alreadyConnected: boolean;
}

/** Adds a person unless they're already tracked (matched by profile URL, else name + company). */
export function addPerson(list: TrackedPerson[], p: NewPerson): TrackedPerson | null {
  const dup = list.some((x) =>
    p.url ? x.url === p.url : x.name === p.name && x.company === p.company
  );
  if (dup) return null;
  const person: TrackedPerson = {
    ...p,
    id: list.reduce((m, x) => Math.max(m, x.id), 0) + 1,
    status: "planned",
    updatedAt: today(),
  };
  list.push(person);
  return person;
}

export function setStatus(list: TrackedPerson[], id: number, status: Status): TrackedPerson {
  const person = list.find((x) => x.id === id);
  if (!person) throw new Error(`No tracked person with id ${id}`);
  person.status = status;
  person.updatedAt = today();
  return person;
}

const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

export function dueActions(list: TrackedPerson[], followUpDays: number) {
  const out: { person: TrackedPerson; action: string }[] = [];
  for (const person of list) {
    const age = daysSince(person.updatedAt);
    if (person.status === "accepted" && age >= 1) {
      out.push({ person, action: "They accepted. Send your message now." });
    } else if (person.status === "note-sent" && age >= followUpDays) {
      out.push({ person, action: `Request pending ${age} days. Move on, or try another contact there.` });
    } else if (person.status === "messaged" && age >= followUpDays) {
      out.push({ person, action: `No reply for ${age} days. Send one polite follow-up.` });
    }
  }
  return out;
}
