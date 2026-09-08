# ProofFix — Design System
## Product
ProofFix is a mobile-first community platform for reporting, confirming, discovering, and resolving real-world civic and environmental incidents using live evidence.
The interface must feel immediate, trustworthy, human, and easy to understand.
The product should NOT look like:
- a generic SaaS dashboard
- an enterprise admin portal
- a cybersecurity interface
- an AI chatbot
- a template full of cards, pills, metrics, and sidebars
The experience should feel like a polished consumer product that anyone can understand within seconds.
---
## Core UX Principle
One primary action per screen.
Users should never need to understand the system architecture.
The application should progressively reveal information instead of showing everything at once.
The citizen experience should feel:
See problem → Capture → Understand → Report → Help → Verify
Keep technical information hidden unless it is useful to the user.
---
## Visual Direction
Use a clean, modern, high-end consumer-product aesthetic.
Strong characteristics:
- large confident typography
- generous whitespace
- strong visual hierarchy
- minimal interface chrome
- meaningful full-width imagery
- location/map elements integrated naturally
- soft but purposeful transitions
- clear status communication
- minimal number of cards
- minimal borders
- minimal badges
- strong primary calls to action
- rounded elements only where appropriate
Avoid excessive gradients.
Avoid generic blue-purple AI styling.
Avoid making every section a card.
Avoid tiny uppercase labels.
Avoid dense dashboards on citizen-facing screens.
---
## Brand Personality
ProofFix should feel:
- trustworthy
- civic
- intelligent
- optimistic
- modern
- community-driven
- action-oriented
- calm during normal use
- urgent only when an incident genuinely requires attention
It should not feel governmental, bureaucratic, corporate, or intimidating.
---
## Color Philosophy
Use a neutral, warm, clean foundation.
Primary brand color should communicate trust and action without looking like generic enterprise blue.
Use incident colors semantically:
- Critical: red
- High: orange
- Medium: amber
- Low: green or muted neutral
- Resolved: positive green
Do not flood the interface with these colors.
Risk colors should appear only where meaningful.
---
## Typography
Use a modern sans-serif typeface.
Headlines should be large, bold, concise, and highly readable.
Body text should feel conversational.
Avoid excessive technical terminology.
Example:
Good:
"Fallen tree detected"
Bad:
"AI OBJECT CLASSIFICATION RESULT"
Good:
"Possible existing report nearby"
Bad:
"DUPLICATE INCIDENT CANDIDATE"
---
## Mobile First
Design primarily for smartphone screens.
The main action must be reachable easily with one hand.
Camera, location, reporting, and resolution flows are mobile-first.
Desktop versions can expand content naturally but should not become enterprise dashboards.
---
## Navigation
Keep navigation extremely simple.
Suggested primary destinations:
- Home
- Risks
- Report
- Activity/Profile
"Report" should be the most visually prominent action.
Do not create a large sidebar.
On mobile, prefer a minimal bottom navigation or context-aware navigation.
---
## Camera Experience
The live camera should feel like a core product experience, not a file-upload form.
Camera screen should:
- maximize the camera preview
- show location verification subtly
- have one obvious capture button
- provide minimal instructions
- avoid distracting UI
No gallery upload option.
---
## AI Experience
AI should feel invisible and helpful.
Avoid presenting ProofFix as a chatbot.
When AI analyzes an incident, use short progressive states such as:
"Understanding the scene…"
"Checking nearby reports…"
"Assessing risk…"
Then present the result in natural language.
Example:
"Fallen tree detected"
"Part of the road appears blocked."
"High public impact."
Let the user confirm before submitting.
---
## Incident Experience
Incident detail screens should prioritize:
1. Photo
2. What happened
3. Location
4. Risk
5. Number of independent confirmations
6. Current status
7. What the user can do next
The primary action might be:
"Confirm this issue"
or
"Help resolve"
Do not overwhelm the user with database fields.
---
## Risk Discovery
The Risks page should support city-based discovery.
Users should be able to search or select a city such as Chennai or Puducherry.
Show incidents using a clean list/map experience.
Useful filters:
- City
- Risk
- Issue type
- Status
The interface should make Critical and High incidents immediately understandable without becoming visually chaotic.
---
## Resolution Experience
Resolution should feel rewarding.
A user opens an incident and chooses:
"Help resolve"
After helping, they capture a new live photo.
ProofFix compares the original and new evidence.
Successful verification should have a strong, memorable state:
"Resolution verified"
Show:
- original evidence
- new evidence
- location match
- clear resolved status
The moment should feel satisfying and meaningful.
---
## Interaction Philosophy
Use motion purposefully.
Good uses:
- transitioning from camera to analysis
- revealing detected incident details
- map/list transitions
- risk-state changes
- successful resolution verification
Avoid unnecessary animation.
Every animation should communicate progress, hierarchy, or state.
---
## Accessibility
Maintain strong contrast.
Use readable font sizes.
Use clear tap targets.
Never rely only on color to communicate risk.
Use icons and text together where necessary.
---
## Overall Goal
A first-time user should understand within 3 seconds:
"What is ProofFix?"
"What can I do here?"
"What should I press next?"
The interface should feel designed by an experienced product design team rather than generated from a generic dashboard template.