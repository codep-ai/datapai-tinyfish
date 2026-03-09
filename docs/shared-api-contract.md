# Shared API Contract
# DataP.ai + TinyFish Financial Signal System

Used by:
- datapai-tinyfish (competition demo app)
- datapai-streamlit (DataP.ai AI/ETL/Agent framework)

---

# Background and Purpose

This API contract defines how two repositories communicate:

1. datapai-tinyfish  
   - Next.js web application  
   - public demo for the TinyFish accelerator  
   - integrates TinyFish web browsing infrastructure  
   - displays financial signals and AI explanations  

2. datapai-streamlit  
   - general DataP.ai framework  
   - supports ETL agents, AG2 orchestration, LLM routing, RAG, guardrails, and unstructured data processing  
   - extended with TinyFish-specific financial signal agents  

The goal of this architecture is to combine:

TinyFish → autonomous web browsing and execution  
AG2 (formerly AutoGen) → multi-agent orchestration  
DataP.ai → data + AI platform for ETL, reasoning, and financial analysis  

Together they form a system that can:

Detect meaningful corporate language changes  
Cross-validate them against public filings  
Explain their financial significance  

---

# Strategic Goal

This system is being built for the **TinyFish 9-week accelerator competition**.

The objective is to demonstrate a powerful real-world use case of TinyFish:

AI agents that detect and verify financial signals before markets react.

The system should clearly demonstrate:

- autonomous web observation (TinyFish)
- multi-agent reasoning (AG2)
- financial domain intelligence (DataP.ai)
- practical value for investors and analysts

The output should resemble the work of a **financial research assistant or analyst**, not a generic AI summary tool.

---

# Architecture Overview

The system is intentionally split into two repositories.

TinyFish  
↓  
datapai-tinyfish (Next.js demo app)  
↓  
datapai-streamlit (AG2 + DataP.ai framework)

---

## datapai-tinyfish responsibilities

- public UI
- TinyFish scanning
- displaying signals
- displaying cross-validation results
- lightweight Gen-AI explanations
- competition-facing demo

---

## datapai-streamlit responsibilities

- agent workflows
- financial signal detection
- cross-validation logic
- AG2 orchestration
- ETL + reasoning pipelines
- integration with filings / press releases
- advanced AI reasoning

---

# Why This Contract Exists

This contract ensures that:

1. The frontend demo app remains simple and stable.
2. The DataP.ai framework remains reusable and modular.
3. Both repos evolve independently without breaking integration.
4. AI reasoning logic stays in the framework layer.
5. The demo UI focuses on storytelling and clarity.

Claude Code and other contributors must follow this contract to prevent architectural drift.

---

# Port Configuration

Ports may differ depending on environment.

Typical development setup:

datapai-tinyfish  
Next.js dev server  
Default port: **3000**

datapai-streamlit  
Agent backend service  
Typical local port: **8000**

Example environment variable:

AGENT_BACKEND_BASE_URL=http://localhost:8000

The frontend should **not assume fixed ports**.

Claude Code may update configuration if the environment changes.

---

# Design Philosophy

The system should prioritize:

- financial insight
- evidence-based signals
- cross-validation
- explainable AI
- professional analyst tone

The system must **never provide buy/sell advice**.

Instead it should surface signals and context that help analysts investigate further.

---

# Signal Philosophy

Signals should represent meaningful financial changes such as:

- forward guidance withdrawal
- expansion of risk disclosures
- tone softening in corporate language

Signals should be:

- explainable
- supported by evidence
- cross-validated when possible

---

# Key Differentiator

Many AI systems summarize documents.

This system should do more:

observe  
→ detect signal  
→ cross-validate  
→ explain financial significance  

This demonstrates the power of:

TinyFish + AG2 + DataP.ai working together.

---

# Versioning

If the API contract changes:

- update this file in **both repositories**
- keep backward compatibility when possible
- update the contract version in `/agent/health`

Example:

"contract_version": "v1"

---

# Security Rules

The API contract must never expose:

- API keys
- private model credentials
- database credentials
- stack traces

Errors must return safe messages.

---

# Definition of Success

The system should clearly demonstrate:

AI agents that detect and verify financial signals before markets react.

The final demo should feel like a **professional financial intelligence system** rather than a generic AI summarization tool.

---

# API Contract

All responses must follow this structure.

Success:

{
  "ok": true,
  "data": { ... },
  "error": null
}

Failure:

{
  "ok": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}

---

# Endpoint: GET /agent/health

Response:

{
  "ok": true,
  "data": {
    "service": "datapai-streamlit",
    "ag2_enabled": true,
    "paid_llm_enabled": true,
    "private_llm_enabled": false,
    "rag_enabled": false,
    "version": "v1"
  },
  "error": null
}

---

# Endpoint: POST /agent/detect-financial-signal

Purpose:
Detect meaningful financial language changes.

Input:

{
  "ticker": "GATO",
  "company_name": "Gatos Silver",
  "source_url": "https://example.com/investors",
  "old_text": "previous cleaned text",
  "new_text": "current cleaned text",
  "changed_snippet": "diff snippet"
}

Response:

{
  "ok": true,
  "data": {
    "signal_type": "GUIDANCE_WITHDRAWAL",
    "severity": "HIGH",
    "confidence": 0.84,
    "financial_relevance": "The company appears to have removed explicit forward-looking guidance language.",
    "evidence_quotes": [
      "We expect revenue growth of 25% in FY2026.",
      "We continue to pursue long-term growth opportunities."
    ]
  },
  "error": null
}

---

# Endpoint: POST /agent/cross-validate-signal

Purpose:
Verify signal across other sources.

Input:

{
  "ticker": "GATO",
  "company_name": "Gatos Silver",
  "signal_type": "GUIDANCE_WITHDRAWAL"
}

Response:

{
  "ok": true,
  "data": {
    "validation_status": "NOT_CONFIRMED_YET",
    "validation_summary": "Signal visible on company website but not yet in filings or press releases.",
    "validation_evidence": []
  },
  "error": null
}

Possible validation_status:

- CONFIRMED
- PARTIALLY_CONFIRMED
- NOT_CONFIRMED_YET
- SOURCE_UNAVAILABLE

---

# Endpoint: POST /agent/generate-signal-summary

Purpose:
Generate investor-friendly explanation.

Response example:

{
  "ok": true,
  "data": {
    "what_changed": "Forward guidance language was softened.",
    "why_it_matters": "Removal of concrete guidance can signal lower confidence in future performance.",
    "evidence": [
      "old quote",
      "new quote"
    ]
  },
  "error": null
}

Rules:

- professional tone
- plain English
- no investment advice

---

# Endpoint: POST /agent/run-financial-signal-pipeline

Purpose:
Run full signal detection pipeline.

Output includes:

- signal_type
- severity
- confidence
- evidence
- validation_status
- explanation

---

# Signal Types

Expected signal types:

GUIDANCE_WITHDRAWAL  
RISK_DISCLOSURE_EXPANSION  
TONE_SOFTENING  

---

# Frontend Rendering Rules

The frontend must:

- display financial signals clearly
- show validation status
- show evidence supporting the signal

If backend fails:

display raw diff + price context  
show message:

"AI analysis temporarily unavailable"

---

# Security Requirements

Never expose:

- API keys
- internal credentials
- private model access
- stack traces

---

# End of Contract
