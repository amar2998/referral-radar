import type { Profile, Role } from "./types.js";

const firstName = (full: string) => full.trim().split(/\s+/)[0] || "there";
const skillsShort = (p: Profile) => p.skills.slice(0, 2).join(" / ");

function experience(p: Profile): string {
  const n = p.yearsExperience;
  return n > 0 ? ` with ~${n} year${n === 1 ? "" : "s"} of experience` : "";
}

/** Connection-request note. Always fits within `max` characters (LinkedIn free limit is ~200). */
export function connectionNote(role: Role, fullName: string, company: string, p: Profile, max: number): string {
  const first = firstName(fullName);
  const s = skillsShort(p);
  const yrs = p.yearsExperience > 0 ? `${p.yearsExperience}-yr ` : "";

  const candidates =
    role === "recruiter"
      ? [
          `Hi ${first}, I'm ${p.name}, a ${yrs}${s} engineer. I'm interested in ${company} roles and would love to connect and share my resume if you're hiring. Thanks!`,
          `Hi ${first}, I'm ${p.name}, a ${s} engineer interested in ${company}. Would love to connect and share my resume if you're hiring.`,
          `Hi ${first}, I'm a ${s} engineer interested in ${company}. Would love to connect!`,
        ]
      : [
          `Hi ${first}, I'm ${p.name}, a ${s} engineer exploring roles at ${company}. Would love to connect and hear about your experience there.`,
          `Hi ${first}, I'm a ${s} engineer exploring ${company}. Would love to connect!`,
        ];

  const fit = candidates.find((c) => c.length <= max);
  return fit ?? candidates[candidates.length - 1].slice(0, max - 1).trimEnd() + "…";
}

/** Longer message: for existing connections, or after a new request is accepted. */
export function directMessage(role: Role, fullName: string, company: string, p: Profile): string {
  const first = firstName(fullName);
  const intro = `I'm ${p.name}, currently working as ${p.currentRole}${experience(p)} in ${p.skills.slice(0, 3).join(", ")}.`;

  if (role === "recruiter") {
    return `Hi ${first}, hope you're doing well. ${intro} I'm exploring ${p.targetRole} roles and ${company} is high on my list. Are there any openings on your radar that might fit? Happy to share my resume. Thank you!`;
  }
  if (role === "manager") {
    return `Hi ${first}, hope you're doing well. ${intro} I'm exploring ${p.targetRole} roles and admire the work at ${company}. Is your team hiring, or could you point me to the right person? Happy to share my resume. Thanks!`;
  }
  return `Hi ${first}, hope you're doing well! ${intro} I'm exploring ${p.targetRole} roles and noticed you're at ${company}. Could you share a bit about the team and tech, and whether there's an opening I could be referred to? Happy to send my resume. Thanks!`;
}

const q = encodeURIComponent;

/** Ready-made search URLs that YOU open in your browser (no scraping). */
export function searchLinks(company: string, p: Profile) {
  return {
    recruiters: `https://www.linkedin.com/search/results/people/?keywords=${q(`${company} recruiter OR "talent acquisition"`)}`,
    engineers: `https://www.linkedin.com/search/results/people/?keywords=${q(`${company} backend engineer`)}`,
    jobs: `https://www.linkedin.com/jobs/search/?keywords=${q(`${p.targetRole} ${company}`)}&location=${q(p.searchRegion)}`,
    google: `https://www.google.com/search?q=${q(`site:linkedin.com/in "${company}" ("talent acquisition" OR recruiter) ${p.searchRegion}`)}`,
  };
}
