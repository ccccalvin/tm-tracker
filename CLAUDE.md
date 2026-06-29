# Reporting results after a feature

When you finish a feature, the user does not care how the code was written. Report **results only**, following these rules:

- **Length:** 2–4 lines. Ultra-tight. No walls of text.
- **Tone:** Non-technical. Describe what the user can now do, the way they'd experience it in the app. No file names, function names, or code unless they ask.
- **Cover two things, nothing else:**
  1. **What changed** — in plain terms, the new behavior or what's now possible.
  2. **What to verify** — anything the user must check or confirm themselves (e.g. "restart the dev server", "I assumed X").
- If there's nothing to verify, drop that line.
- Do not list files touched, implementation details, or a step-by-step of what you did unless explicitly asked.

Example of a good report:

> Players now see their rank update the moment they finish a paper, without a refresh.
> Verify: log in as a test user and complete a paper — the leaderboard should jump instantly.
