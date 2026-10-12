# LinkedIn Recruiter Finder

Matches your LinkedIn connections export to your target companies, finds recruiters
and referral contacts, drafts messages, and tracks your outreach.
It does NOT scrape LinkedIn, so your account stays safe.

## Setup (once)
1. Install Node 18+.
2. `npm install`
3. LinkedIn -> Settings -> Data privacy -> Get a copy of your data -> select **Connections**.
   Save the file as `data/Connections.csv`.
4. Edit `config/companies.json` (your target companies, priority 1 = dream, 3 = nice to have).
5. Edit `config/profile.json` (your details and monthly personalized-note budget).

## Use
- `npm run scan` : creates `output/plan.md` (messages + search links) and `output/matches.csv`.
  Try it first with: `npm run scan -- --file data/sample-Connections.csv`
- `npm run draft -- --company "Acme" --name "Priya Sharma" --role recruiter`
  : one-off connection note + follow-up message for a person you found.
- `npm run track -- list`
- `npm run track -- add --name "Priya Sharma" --company Acme --role recruiter --url <profile url>`
- `npm run track -- set <id> note-sent|accepted|messaged|replied|closed`
- `npm run track -- due` : who needs a follow-up today.

## Tips
- Keep to ~15-20 new connection requests a day.
- Free LinkedIn gives few personalized notes per month; `plan.md` spends them on your highest-priority companies first.
- Referrals from engineers convert better than cold messages to HR.
