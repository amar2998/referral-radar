import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { classify, companyMatches, loadConnections, scoreMatch } from "./connections.js";
import { toCsv } from "./csv.js";
import { connectionNote, directMessage, searchLinks } from "./messages.js";
import { addPerson, dueActions, loadTracker, saveTracker, setStatus } from "./tracker.js";
import { STATUSES } from "./types.js";
import type { AppConfig, Connection, Role, Status, TargetCompany } from "./types.js";

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;
const fullName = (c: Connection) => `${c.firstName} ${c.lastName}`.trim();

interface Match {
  conn: Connection;
  company: TargetCompany;
  role: Role;
  score: number;
}

function scan(args: string[]): void {
  const { values } = parseArgs({
    args,
    options: { file: { type: "string", default: "data/Connections.csv" } },
  });
  const { profile, settings } = readJson<AppConfig>("config/profile.json");
  const companies = readJson<TargetCompany[]>("config/companies.json");
  const connections = loadConnections(values.file as string);

  // 1) Match connections to target companies
  const matches: Match[] = [];
  for (const conn of connections) {
    const hits = companies.filter((c) => companyMatches(conn.company, c));
    if (!hits.length) continue;
    const company = hits.sort((a, b) => a.priority - b.priority)[0];
    const role = classify(conn.position);
    matches.push({ conn, company, role, score: scoreMatch(company.priority, role, conn.position) });
  }
  matches.sort((a, b) => b.score - a.score);
  const useful = matches.filter((m) => m.role !== "other");

  mkdirSync("output", { recursive: true });
  writeFileSync(
    "output/matches.csv",
    toCsv([
      ["Score", "Role", "Name", "Company", "Position", "Profile URL", "Email", "Connected On", "Draft message"],
      ...matches.map((m) => [
        m.score, m.role, fullName(m.conn), m.company.name, m.conn.position, m.conn.url,
        m.conn.email, m.conn.connectedOn, directMessage(m.role, fullName(m.conn), m.company.name, profile),
      ]),
    ])
  );

  // 2) Track them
  const tracker = loadTracker();
  let added = 0;
  for (const m of useful) {
    const p = addPerson(tracker, {
      name: fullName(m.conn), company: m.company.name, url: m.conn.url, role: m.role, alreadyConnected: true,
    });
    if (p) added++;
  }
  saveTracker(tracker);

  // 3) Work out where you still need new connections
  const has = (c: TargetCompany, r: Role) => matches.some((m) => m.company === c && m.role === r);
  const byPriority = [...companies].sort((a, b) => a.priority - b.priority);
  let slotNo = 0;
  const plan: string[] = [];
  const date = new Date().toISOString().slice(0, 10);

  plan.push(`# Outreach plan (${date})`, "");
  plan.push("## 1. Message people you're already connected to", "");
  plan.push("Free and unlimited. Do these first, since a referral beats a cold message.", "");
  if (!useful.length) plan.push("_No recruiters, managers or engineers found at your target companies in this export._", "");
  for (const m of useful) {
    plan.push(`### ${fullName(m.conn)} — ${m.company.name} (${m.role})`);
    plan.push(`${m.conn.position} · ${m.conn.url}`, "");
    plan.push(`> ${directMessage(m.role, fullName(m.conn), m.company.name, profile)}`, "");
  }

  plan.push("## 2. New people to connect with", "");
  plan.push(
    `Your personalized-note budget this month: **${settings.monthlyNoteBudget}**. ` +
      "Slots are ordered by company priority. Early slots get a personalized note; later ones get a blank request, then the longer message once accepted.",
    ""
  );
  for (const c of byPriority) {
    const kinds = (["recruiter", "engineer"] as const).filter((k) => !has(c, k));
    if (!kinds.length) continue;
    const links = searchLinks(c.name, profile);
    plan.push(`### ${c.name} (priority ${c.priority})`);
    plan.push(`Find people: [recruiters](${links.recruiters}) · [engineers](${links.engineers}) · [Google](${links.google}) · [open jobs](${links.jobs})`, "");
    for (const kind of kinds) {
      slotNo++;
      const withNote = slotNo <= settings.monthlyNoteBudget;
      plan.push(`**Slot ${slotNo}: ${kind}** — ${withNote ? "send a personalized note" : "send a BLANK request, then message after they accept"}`, "");
      if (withNote) {
        plan.push(`> ${connectionNote(kind, "[Name]", c.name, profile, settings.noteMaxChars)}`, "");
      } else {
        plan.push(`After they accept:`, `> ${directMessage(kind, "[Name]", c.name, profile)}`, "");
      }
    }
  }
  plan.push("## 3. Habits that work", "");
  plan.push(
    "- Keep it to about 15 to 20 new requests a day.",
    "- Record each one: `npm run track -- add --name ... --company ... --role recruiter`, then `npm run track -- set <id> note-sent`.",
    "- Run `npm run track -- due` every morning for follow-ups.",
    "- Ask engineers for a referral. It converts better than a cold message to HR.",
    ""
  );
  writeFileSync("output/plan.md", plan.join("\n"));

  const counts = (r: Role) => matches.filter((m) => m.role === r).length;
  console.log(`Read ${connections.length} connections. ${matches.length} work at your target companies:`);
  console.log(`  recruiters: ${counts("recruiter")} | managers: ${counts("manager")} | engineers: ${counts("engineer")} | other: ${counts("other")}`);
  console.log(`Added ${added} new people to your tracker.`);
  console.log(`Wrote output/matches.csv and output/plan.md. Open plan.md to start.`);
}

function draft(args: string[]): void {
  const { values } = parseArgs({
    args,
    options: {
      name: { type: "string" },
      company: { type: "string" },
      role: { type: "string", default: "recruiter" },
      connected: { type: "boolean", default: false },
    },
  });
  if (!values.company) throw new Error('Usage: npm run draft -- --company "Acme" [--name "Priya Sharma"] [--role recruiter|engineer|manager] [--connected]');
  const { profile, settings } = readJson<AppConfig>("config/profile.json");
  const role = values.role as Role;
  const name = values.name ?? "[Name]";
  console.log("\nConnection note (" + settings.noteMaxChars + " char limit):\n");
  const note = connectionNote(role, name, values.company, profile, settings.noteMaxChars);
  console.log(note + `\n(${note.length} chars)\n`);
  console.log("Message after they accept (or for existing connections):\n");
  console.log(directMessage(role, name, values.company, profile) + "\n");
}

function track(args: string[]): void {
  const [sub, ...rest] = args;
  const { settings } = readJson<AppConfig>("config/profile.json");
  const list = loadTracker();

  switch (sub) {
    case "list":
      console.table(list.map(({ id, name, company, role, status, updatedAt }) => ({ id, name, company, role, status, updatedAt })));
      break;
    case "set": {
      const status = rest[1] as Status;
      if (!STATUSES.includes(status)) throw new Error(`Status must be one of: ${STATUSES.join(", ")}`);
      const p = setStatus(list, Number(rest[0]), status);
      saveTracker(list);
      console.log(`#${p.id} ${p.name} (${p.company}) -> ${p.status}`);
      break;
    }
    case "add": {
      const { values } = parseArgs({
        args: rest,
        options: {
          name: { type: "string" }, company: { type: "string" }, url: { type: "string", default: "" },
          role: { type: "string", default: "recruiter" }, connected: { type: "boolean", default: false },
        },
      });
      if (!values.name || !values.company) throw new Error("Need --name and --company");
      const p = addPerson(list, {
        name: values.name, company: values.company, url: values.url ?? "",
        role: values.role as Role, alreadyConnected: values.connected ?? false,
      });
      saveTracker(list);
      console.log(p ? `Added #${p.id} ${p.name}` : "Already tracked.");
      break;
    }
    case "due": {
      const due = dueActions(list, settings.followUpAfterDays);
      if (!due.length) console.log("Nothing due. Nice.");
      for (const d of due) console.log(`#${d.person.id} ${d.person.name} (${d.person.company}): ${d.action}`);
      break;
    }
    default:
      console.log("track list | track set <id> <status> | track add --name --company [--url --role --connected] | track due");
  }
}

const [cmd, ...args] = process.argv.slice(2);
try {
  if (cmd === "scan") scan(args);
  else if (cmd === "draft") draft(args);
  else if (cmd === "track") track(args);
  else console.log("Commands: scan | draft | track\nStart with: npm run scan -- --file data/Connections.csv");
} catch (e) {
  console.error("Error:", e instanceof Error ? e.message : e);
  process.exit(1);
}
