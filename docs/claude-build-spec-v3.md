Read docs/shared-api-contract.md first.
It defines the architecture, goals, and integration rules.
All backend and frontend implementations must follow this contract.
Operate in autonomous mode within this repository.
You may read, create, and modify files in this repo without asking for confirmation.
You may run local tests, linters, and non-destructive shell commands without asking.
Ask for confirmation only before:

deleting files
changing infra/secrets/config outside the repo
installing/upgrading packages
running destructive migrations
making network calls

# DataP.ai TinyFish Competition App
# Financial Signal Demo
# Repo: datapai-tinyfish

## Core Principle

This repo is the public competition-facing demo app.

Its role is to present TinyFish + DataP.ai as a professional financial intelligence system.

Positioning:
- TinyFish = web execution and browsing
- DataP.ai = financial intelligence and validation layer

This app must feel like an AI financial analyst, not just a website monitor.

---

## Product Message

Headline:
AI Agents Detect and Verify Financial Signals Before Markets React

Subtext:
TinyFish scans company websites.
DataP.ai detects language shifts, cross-validates them, and explains why they may matter.

Use simple but professional English.

---

## Repo Responsibility

This repo owns:
- public demo app
- branding and logos
- homepage narrative
- live scan UX
- alerts page
- ticker detail page
- run detail page
- direct paid-LLM UI summary where needed
- calling backend financial signal APIs from datapai-streamlit

This repo does NOT own:
- general AG2 framework logic
- reusable ETL framework logic
- broad private-LLM/RAG orchestration
- general financial signal backend internals

---

## Main UX Goal

A judge should understand the value in 5 seconds:

1. TinyFish observes the web
2. DataP.ai detects a financial signal
3. DataP.ai cross-validates it
4. User sees evidence + meaning + confidence

---

## Homepage Requirements

Homepage must include:

- correct logos
- clear headline
- one-sentence explanation
- Run Live Scan button
- last scan summary
- top alerts preview
- visible agent pipeline
- investor-value section

Pipeline example:
TinyFish Web Agent → Diff Engine → Financial Signal Agents → Cross-Validation Agent → AI Explanation

Small line:
Web execution by TinyFish • Financial intelligence by DataP.ai

---

## Investor Value Section

Add a homepage section:

Why This Matters

Example bullets:
- Detect forward guidance withdrawal early
- Detect new risk language before official filings
- Cross-check signals against filings and press releases
- Surface evidence that investors can review

This must make the product feel professional and useful.

---

## Alerts Page Requirements

Default view must show high-value signals only.

Show:
- ticker
- company
- signal type
- severity
- confidence
- validation status
- timestamp

Default filter:
- content signals only
- hide archive/layout noise by default

Allow toggle:
- Content Only
- All Signals

---

## Ticker Detail Requirements

Ticker detail page must show these blocks:

### 1. Financial Signal
- signal type
- severity
- confidence
- validation status

Example:
Forward Guidance Withdrawal
Severity: High
Validation: Not confirmed yet

### 2. Evidence
- source URL
- snapshot time
- TinyFish run reference if available
- diff snippet
- before/after text
- evidence quotes

### 3. Cross-Validation
Show:
- checked sources
- confirmed / partial / not confirmed
- validation summary
- supporting links/snippets if available

This section is critical.

### 4. AI Summary
Format:
- What changed
- Why it matters
- Evidence
- Validation result

### 5. Price Context
Show:
- latest close
- 1d move
- 5d range

### 6. Agent Flow
Display:
TinyFish fetch
→ diff
→ signal detection
→ cross-validation
→ explanation

This page must feel like a professional AI workflow.

---

## Run Detail Requirements

Show per-ticker scan process:

- queued
- scanning
- completed
- failed

Show steps:
- Fetching page
- Extracting content
- Cleaning text
- Computing diff
- Running financial signal agents
- Running cross-validation
- Generating AI explanation

Display TinyFish run reference when available.

---

## Scan Behavior Requirements

Scanning must be asynchronous.

User clicks once.
No repeated permission prompts.

POST /api/run returns:
{ runId }

UI polls run status every 2 seconds.

Button disables while running and shows:
Scanning...

---

## Gen-AI Requirement

This repo may continue using its existing paid-LLM helper for user-facing summaries.

Do not remove simple direct Gen-AI functionality that is already working.

Use backend financial-signal outputs plus frontend summary rendering when helpful.

The UI must clearly show more than "summary":
it must show reasoning, evidence, and validation.

---

## New Key UX Feature

Every useful signal must show a Cross-Validation result.

Possible statuses:
- Confirmed
- Partially Confirmed
- Not Confirmed Yet
- Source Unavailable

This is what makes the product look more serious than generic AI demos.

---

## Logo Requirements

Move all logos into:
/public/logos/

Use Next Image.

Do not use remote fetches or fragile relative paths.

---

## Safe Debug Endpoint

Add:
GET /api/debug

Return:
- hasTinyfishKey
- hasPaidLlmKey
- dbPath
- backendAgentApiReachable
- version

Never return secrets.

---

## Non-Goals

Do NOT:
- move AG2 internals into this repo
- recreate the general framework
- overcomplicate the demo with unnecessary platform language
- present the product as generic dashboard software

This repo is a focused, competition-facing app.

---

## Definition of Done

This repo is complete when:
- homepage clearly explains financial value
- cross-validation is visible in the UI
- TinyFish is visible and credited
- scan runs asynchronously
- alerts show signal type + validation status
- ticker detail page shows evidence + validation + AI explanation + price context
- app feels like a professional AI financial analyst
