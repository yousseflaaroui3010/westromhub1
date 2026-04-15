# Westrom Owner Advisory Hub - Product Requirements Document (PRD)

## 1. Overview
The Westrom Owner Advisory Hub is a specialized, self-service web application designed specifically for Texas rental property owners. Its primary goal is to help landlords protect and maximize the return on their investments by focusing on two critical areas of property management: Property Taxes and Insurance. The platform offers AI-driven document analysis to automatically assess property tax notices and insurance declaration pages, instantly identifying potential savings, coverage gaps, or legal entitlements (such as the Texas 20% cap rule for non-homestead properties). 

## 2. Detailed Description
The application serves as a "Lobby" that cleanly branches into two focused workspaces: the **Tax Hub** and the **Insurance Hub**. 
In the Tax Hub, property owners can upload their county appraisal notices. The system uses the Google Gemini AI to extract key values (current and prior appraisal) and runs a rule engine to calculate the year-over-year increase and compare it against market values (Zillow/Realtor.com). The engine then generates plain-English recommendations on whether the owner should protest their taxes, providing both DIY instructions and professional firm referrals.
In the Insurance Hub, owners can upload their insurance declaration pages. The Gemini AI extracts policy details (type, deductibles, Loss of Rent, Water Backup). A rule engine flags critical issues (such as having an HO-3 homeowners policy instead of a DP-3 landlord policy) and identifies missing coverages or opportunities to lower premiums by adjusting deductibles.
The entire application is built using React, TypeScript, Vite, and TailwindCSS, emphasizing a frictionless, easy-to-understand user interface.

## 3. Design
- **Architecture**: Single Page Application (SPA) using React, Vite, and TailwindCSS.
- **State Management**: Lightweight state-based routing (`activeView`) switching between 'home', 'taxes', and 'insurance'. No complex router libraries are used to keep the app lightweight.
- **UI/UX**: 
  - **Frictionless Entry**: The landing page displays the mission statement ("We are FOR you and With you!") and two distinct pathway cards without overwhelming forms or tools.
  - **Focused Workspaces**: The Tax and Insurance hubs are isolated views to prevent cognitive overload.
  - **Component Reusability**: Common UI elements like `VideoEmbed`, `ResourceCard`, and analysis sections (`TaxAnalysis`, `InsuranceAnalysis`).
  - **Color Palette & Styling**: Uses a professional color scheme (primary, secondary, tertiary variables) with gradients, glassmorphism (`backdrop-blur`), and clear typography (`font-heading`).

## 4. Features
- **Pathway Selection (Home View)**: Clear routing to either Taxes or Insurance from the landing page.
- **Tax Analysis Tool**: AI extraction of address, current value, and prior value from uploaded tax notices.
- **Tax Rule Engine**: Logic evaluating YoY increase (>20% triggers automatic reduction alert) and market value gaps.
- **Protest Options Directory**: Educational breakdown of DIY protesting vs. Professional Help, including a directory of county links and recommended firms.
- **Insurance Analysis Tool**: AI extraction of policy type, deductibles, Loss of Rent, and Water Backup coverage from declaration pages.
- **Insurance Rule Engine**: Logic evaluating policy suitability (HO-3 vs DP-1/DP-3), missing coverages, and deductible optimization.
- **Broker Referral Section**: Direct contacts to recommended independent insurance brokers for policy shopping.

## 5. Functionalities
- **State-Based Navigation**: Switch seamlessly between Home, Taxes, and Insurance.
- **Document Upload & Parsing**: Accept PDF/JPG/PNG files, convert to Base64, and pass to Gemini 3.1 Pro Vision for structured JSON extraction.
- **AI Recommendation Generation**: Pass rule-engine results to Gemini 3 Flash to generate formatted, plain-English advice in HTML.
- **API Key Management**: Prompt users for a Gemini API key if not provided in the environment.

## 6. Use Cases and User Stories

### Use Case 1: Tax Protest Discovery
- **User Story 1.1**: As a property owner, I want to upload my tax appraisal notice so that the AI can extract my current and prior values.
- **User Story 1.2**: As a property owner in Texas, I want to be alerted if my non-homestead property tax increased by more than 20% so that I can claim an automatic reduction.
- **User Story 1.3**: As a property owner, I want to compare my appraised value against Zillow/Realtor estimates so that I know if a tax protest is worth my time.
- **User Story 1.4**: As a property owner, I want to see a list of professional tax protest firms and my local county appraisal district link so I can take immediate action.

### Use Case 2: Insurance Policy Optimization
- **User Story 2.1**: As a property owner, I want to upload my insurance declaration page so the system can verify if I have the correct type of policy for a rental.
- **User Story 2.2**: As a property owner, I want to be warned if I am missing critical coverages like Loss of Rent or Water Backup so that I can contact my broker to add them.
- **User Story 2.3**: As a property owner, I want to know if my flat-rate wind/hail deductible is costing me too much so that I can switch to a percentage-based deductible to lower my premium.
- **User Story 2.4**: As a property owner, I want the contact information for trusted insurance brokers so that I can easily shop around for better rates.

### Use Case 3: Seamless Onboarding
- **User Story 3.1**: As a user, I want a clear, jargon-free landing page with two distinct paths (Taxes vs. Insurance) so that I immediately understand what actions I can take.

## 7. Acceptance Criteria

- **AC 1 (Tax Engine)**: If YoY increase is > 20%, the system MUST display an "AUTOMATIC_REDUCTION" status and generate prose explaining the Texas 20% cap rule.
- **AC 2 (Tax Engine)**: If market gap is > 5%, the system MUST display "PROTEST_RECOMMENDED" and generate prose advising a protest.
- **AC 3 (Insurance Engine)**: If an "HO-3" policy is detected, the system MUST display a "CRITICAL_WARNING" explaining that the policy excludes rental activity and claims may be denied.
- **AC 4 (Insurance Engine)**: If Loss of Rent is missing, the system MUST flag it as a coverage gap.
- **AC 5 (UI/Navigation)**: The application must not use a complex router, but instead manage `activeView` state to swap between Home, Tax, and Insurance views.
- **AC 6 (AI Processing)**: The application MUST validate that an uploaded document is a valid tax or insurance document before performing calculations. If invalid, a helpful error message must be shown.

## 8. Story Points

| Feature / User Story | Story Points |
| :--- | :--- |
| **Epic 1: Home View (Lobby Experience)** | |
| Landing Page UI & Pathway Cards | 3 |
| State-based Navigation | 2 |
| API Key Prompt Modal | 2 |
| **Epic 2: Tax Hub** | |
| Tax View UI & Educational Content | 3 |
| Document Upload & Gemini Extraction Logic | 5 |
| Tax Rule Engine Logic (20% cap, Market gap) | 3 |
| AI Prose Recommendation Generation | 3 |
| **Epic 3: Insurance Hub** | |
| Insurance View UI & Educational Content | 3 |
| Document Upload & Gemini Extraction Logic | 5 |
| Insurance Rule Engine Logic (Policy types, gaps) | 3 |
| AI Prose Recommendation Generation | 3 |

## 9. Priority

| Feature | Priority |
| :--- | :--- |
| **Document Upload & AI Extraction (Tax & Insurance)** | High (P0) |
| **Rule Engine Logic (Tax & Insurance)** | High (P0) |
| **AI Recommendation Generation** | High (P0) |
| **State-Based Navigation** | High (P0) |
| **Home View (Lobby)** | Medium (P1) |
| **Educational Content & Broker Contacts** | Medium (P1) |
| **County Links & Directory** | Low (P2) |
# WESTROM OWNER ADVISORY HUB - Product Requirements Document

**Product Name:** Westrom Owner Advisory Hub  
**Version:** 1.0  
**Status:** Phase 1 (Discovery & Development)  
**Last Updated:** 2026-04-15  
**Target Users:** Texas rental property owners  

---

## 1. EXECUTIVE SUMMARY

Westrom Owner Advisory Hub is a self-service AI-powered platform designed to help Texas rental property owners optimize property taxes and insurance. The platform provides:
- **Tax Analysis:** Automated property tax appraisal review with AI-driven recommendations for protest opportunities
- **Insurance Advisory:** Policy analysis with coverage gap identification and optimization suggestions
- **Educational Resources:** County-specific links, seasonal guidance, and actionable steps

**Mission Statement:** "We are FOR you and With you!" — protecting and maximizing the return on investment for property owners.

---

## 2. BUSINESS CONTEXT & MARKET OPPORTUNITY

### Problem Statement
Texas rental property owners face:
1. **Tax Burden:** Rising property appraisals annually, often inflated compared to market values
2. **Regulatory Complexity:** Understanding Texas' 20% cap rule on non-homestead property appraisal increases
3. **Insurance Gaps:** Confusion about appropriate coverage (HO-3 vs DP-1 vs DP-3 policies) and deductible optimization
4. **Knowledge Gap:** Lack of accessible, personalized guidance on when/how to protest taxes and optimize insurance

### Market Seasonality
- **Tax Season (Feb-May):** Focus on property tax protests and appraisal challenges
- **Insurance Season (Oct-Dec):** Focus on policy renewal and shopping

### Westrom's Value Proposition
- **Immediate actionability:** Owners get clear recommendations within minutes
- **Professional backup:** Access to DIY methods AND professional protest services
- **Personalized analysis:** AI-powered document analysis tailored to individual properties
- **Educational focus:** Clear explanations in plain English, not legal jargon

---

## 3. PRODUCT VISION & DESIGN PHILOSOPHY

### Core Principles
1. **Frictionless Entry:** Users understand the purpose and pathways in under 3 seconds
2. **Focused Workspaces:** Separate Tax and Insurance hubs prevent cognitive overload
3. **AI as Translator:** LLM converts structured data into clear, actionable prose
4. **Human Oversight:** Professional recommendations augment AI analysis
5. **No Jargon:** Plain English explanations; avoid legal or technical terminology

### User Journey Flow
```
Landing → Mission Understanding → Pathway Selection → Focused Hub → 
Document Upload → AI Analysis → Actionable Recommendation → Next Steps
```

---

## 4. FEATURES & FUNCTIONALITIES

### 4.1 Landing Page (Lobby Experience)
**Purpose:** Communicate mission and clearly present two pathways

**Components:**
- **Hero Section** featuring exact mission statement: "We are FOR you and With you!"
- **Seasonal Context:** Brief explanation of current focus (e.g., "Protesting taxes and shopping insurance")
- **Pathway Cards:** Two distinct cards for "Taxes" and "Insurance" with clear descriptions
- **Clean Design:** No forms, videos, or complex tools on landing

**User Flows:**
- View mission and understand purpose
- Select either Tax or Insurance pathway
- Navigate back to home at any time

---

### 4.2 Tax Hub

**Objective:** Provide focused, linear workspace for property tax analysis

#### Tax View Components

**a) Educational Section**
- **Video Embed:** County-specific or general tax protest educational content
- **Hot Tip Banner:** "20% Rule" highlight (contextual, not dominating)
  - Context: Texas law caps non-homestead property appraisal increases at 20% annually
  - Call-to-Action: "Is your increase over 20%? You may be entitled to an automatic reduction."
- **Protest Options:** Curated list of DIY methods and professional protest companies
  - DIY: Online county portals, appraisal review guidelines
  - Professional: O'Connor & Associates, Property Tax Protest, Texas Tax Protest
- **County Resources:** Resource cards with direct links to appraisal districts

**b) Tax Document Analyzer** (`TaxAnalysis` Component)
- **File Upload:** Accept PDF/JPG/PNG property tax notices and appraisal documents
- **AI Extraction:** Use Gemini Vision API to extract:
  - Property address
  - Current year appraised value
  - Prior year appraised value
  - Validation: Confirm document is a legitimate tax notice
- **Rule Engine Analysis:** Calculate:
  - Year-over-year (YoY) increase percentage
  - Market value gap (vs. Zillow/Realtor estimates if provided)
  - Recommendation status (AUTOMATIC_REDUCTION | PROTEST_RECOMMENDED | NO_ACTION | CONTACT_WESTROM)
- **AI Recommendation:** Generate personalized, actionable advice:
  - If YoY > 20%: Flag automatic reduction entitlement
  - If market gap > 5%: Recommend protest with DIY + professional options
  - If market gap 0-5%: Suggest professional review
  - If no gap: Confirm no action needed

---

### 4.3 Insurance Hub

**Objective:** Provide focused workspace for insurance policy analysis and optimization

#### Insurance View Components

**a) Educational Section**
- **Policy Type Guidelines:** Quick reference for DP-1, DP-3, HO-3, and Landlord policies
  - HO-3 (Homeowners): NOT suitable for rentals — claims may be denied
  - DP-1 (Basic): Limited coverage, Actual Cash Value (ACV) payouts
  - DP-3 (Preferred): Replacement Cost coverage recommended for rentals
- **Shopping Tips:** Deductible optimization, coverage gap insights
- **Loss of Rent & Water Backup:** Explanations of critical endorsements for rental properties

**b) Insurance Document Analyzer** (`InsuranceAnalysis` Component)
- **File Upload:** Accept PDF/JPG of insurance declaration pages
- **AI Extraction:** Use Gemini Vision API to extract:
  - Policy type (HO-3, DP-1, DP-3, Landlord, etc.)
  - Wind/Hail deductible (e.g., $1000, 1%, 2%)
  - All Other Perils (AOP) deductible
  - Loss of Rent/Fair Rental Value coverage (boolean)
  - Water Backup/Sewer Backup coverage (boolean)
  - Annual premium (if visible)
  - Validation: Confirm document is an insurance policy
- **Rule Engine Analysis:** Assess:
  - Policy type appropriateness for rental use
  - Coverage gaps (missing Loss of Rent, Water Backup, etc.)
  - Deductible optimization opportunities
  - Status: CRITICAL_WARNING | UPGRADE_RECOMMENDED | OPTIMIZATION_POSSIBLE | GOOD_STANDING
- **AI Recommendation:** Generate personalized advice:
  - If HO-3 detected: CRITICAL_WARNING — immediate upgrade needed
  - If DP-1 detected: UPGRADE_RECOMMENDED to DP-3 for Replacement Cost
  - If gaps identified: List specific coverage to add and why
  - If deductibles optimizable: Suggest switching from flat to percentage-based

---

### 4.4 Navigation & State Management
- **Header Component:** Logo (links to home), breadcrumb or view indicator, navigation menu
- **Back/Switch Options:** Buttons to navigate between Tax ↔ Insurance and back to Home
- **API Key Management:** Initial prompt for Gemini API key setup (required for AI features)

---

## 5. USER STORIES & ACCEPTANCE CRITERIA

### EPIC 1: Landing Page ("Lobby") Experience

**US 1.1:** Mission Understanding
- **As a** property owner
- **I want to** see the exact mission statement and goal immediately upon loading
- **So that** I feel supported and understand the site's purpose
- **Acceptance Criteria:**
  - Hero section displays "We are FOR you and With you!" within 1 second of page load
  - Goal statement: "protect and maximize the return on your investment" is clearly visible
  - No form fields, videos, or complex tools on landing page

**US 1.2:** Seasonal Context
- **As a** property owner
- **I want to** see the current seasonal focus (taxes or insurance)
- **So that** I understand why action is needed now
- **Acceptance Criteria:**
  - Seasonal message is displayed (e.g., "Currently focusing on tax protest season")
  - Message can be updated dynamically based on date/season

**US 1.3:** Pathway Selection
- **As a** user
- **I want to** select between Tax and Insurance pathways via distinct cards
- **So that** I know which section addresses my needs
- **Acceptance Criteria:**
  - Two large, visually distinct cards labeled "Taxes" and "Insurance"
  - Each card has a brief description (1-2 sentences)
  - Clicking a card navigates to the respective hub
  - Each card has an associated icon or color for quick recognition

**US 1.4:** Cognitive Clarity
- **As a** user
- **I want to** understand the site's purpose within 3 seconds
- **So that** I'm not overwhelmed or confused
- **Acceptance Criteria:**
  - Landing page loads in < 2 seconds
  - No scrolling required to see mission + pathways
  - Font sizes and contrast meet WCAG AA accessibility standards
  - Mobile-responsive design

---

### EPIC 2: Tax Hub

**US 2.1:** Focused Tax Workspace
- **As a** user focused on taxes
- **I want to** see ONLY tax-related content
- **So that** I'm not distracted by insurance information
- **Acceptance Criteria:**
  - Tax hub displays: Hot Tip, Video, Protest Options, Counties, Tax Analyzer
  - Insurance content is hidden or unavailable in Tax hub
  - Navigation header shows "Taxes" as active view

**US 2.2:** Tax Analysis
- **As a** property owner
- **I want to** upload my tax notice and receive AI-powered analysis
- **So that** I know whether to protest and what steps to take
- **Acceptance Criteria:**
  - Upload accepts PDF, JPG, PNG formats
  - Extraction extracts: address, current value, prior value, document type validation
  - Analysis calculates: YoY increase %, market gap %
  - Recommendation is one of: AUTOMATIC_REDUCTION, PROTEST_RECOMMENDED, NO_ACTION, CONTACT_WESTROM
  - If extraction fails or document is invalid, error message explains why (e.g., "Not a tax notice")
  - AI recommendation is 2-3 paragraphs of plain English prose with HTML formatting
  - **Success Metrics:**
    - If YoY > 20%: Automatic reduction flag is explicit
    - If market gap > 5%: Protest recommended with DIY + 3 professional services listed
    - If market gap 0-5%: Contact Westrom suggestion
    - If no gap: Clear confirmation no action needed

**US 2.3:** Protest Resources
- **As a** property owner
- **I want to** see my county's appraisal district link
- **So that** I can file a protest online or contact them directly
- **Acceptance Criteria:**
  - County links are organized and clearly labeled
  - Each link includes county name and appraisal district name
  - Links are functional and tested quarterly

**US 2.4:** Hot Tip (20% Rule)
- **As a** property owner
- **I want to** see the 20% rule explained contextually
- **So that** I know this is a major opportunity without being alarmed
- **Acceptance Criteria:**
  - Hot Tip card appears in Tax hub (not as a global alert)
  - Explains: "In Texas, non-homestead properties are capped at 20% annual increase"
  - Includes Call-to-Action: "Upload your notice to check if you qualify"
  - Styling is distinct but not alarming

---

### EPIC 3: Insurance Hub

**US 3.1:** Focused Insurance Workspace
- **As a** user focused on insurance
- **I want to** see ONLY insurance-related content
- **So that** I can focus on policy optimization
- **Acceptance Criteria:**
  - Insurance hub displays: Guidelines, Shopping Tips, Insurance Analyzer
  - Tax content is hidden or unavailable
  - Navigation header shows "Insurance" as active view

**US 3.2:** Insurance Policy Analysis
- **As a** property owner
- **I want to** upload my insurance declaration page and receive analysis
- **So that** I can identify coverage gaps and optimization opportunities
- **Acceptance Criteria:**
  - Upload accepts PDF, JPG, PNG formats
  - Extraction extracts: policy type, deductibles, coverage flags (Loss of Rent, Water Backup), premium
  - Document validation confirms it's an insurance policy (not a tax notice or unrelated doc)
  - Analysis calculates:
    - Policy appropriateness for rental use
    - Coverage gaps (list of missing coverages)
    - Optimization opportunities (deductible changes, endorsement suggestions)
  - Status is one of: CRITICAL_WARNING, UPGRADE_RECOMMENDED, OPTIMIZATION_POSSIBLE, GOOD_STANDING
  - AI recommendation is 2-3 paragraphs with specific questions to ask insurer
  - **Success Metrics:**
    - HO-3 detected → CRITICAL_WARNING with "upgrade to DP policy" message
    - DP-1 detected → UPGRADE_RECOMMENDED to DP-3
    - Missing Loss of Rent → Gap flagged with explanation
    - Missing Water Backup → Gap flagged as "common in Texas"

**US 3.3:** Policy Guidelines
- **As a** property owner
- **I want to** understand DP-1 vs DP-3 vs HO-3 policies
- **So that** I can make informed coverage decisions
- **Acceptance Criteria:**
  - Guidelines section explains each policy type in plain English
  - Includes: coverage scope, payout method (ACV vs Replacement Cost), typical use case
  - No legal jargon; examples are Texas-specific

---

## 6. LLM & PROMPT STRATEGY

### 6.1 LLM Selection
**Model:** Google Gemini API
- **For Document Extraction:** `gemini-3.1-pro-preview` (vision-capable, structured JSON output)
- **For Recommendation Generation:** `gemini-3-flash-preview` (fast, deterministic prose generation)

### 6.2 Document Extraction Prompts

#### Tax Document Extraction
```
Extract the property tax information from this document.
FIRST, verify if this document is actually a Property Tax Notice, Appraisal Notice, or related property tax document.
If it is NOT a tax/appraisal notice, return an object with ONLY the 'error' field set to a descriptive message 
(e.g., "This document does not appear to be a Property Tax Notice. Please upload a valid tax document.").
If it IS a tax notice but the required values cannot be found, omit those fields from the JSON response.

Return a JSON object with the following exact keys (omit any keys where the value is not found):
- address (string)
- currentValue (number, just the integer value, no commas or $)
- priorValue (number, just the integer value, no commas or $)
- error (string, optional, only if the document is invalid or not a tax notice)
```

**System Instruction (Extraction):**
```
You are a document analyzer. Extract structured data from property tax documents.
- Be precise: Extract exact values shown, no rounding
- Be strict: Validate document type before extracting
- Be helpful: If document is invalid, explain why
- Return only valid JSON
```

#### Insurance Document Extraction
```
Extract the insurance policy information from this declaration page.
FIRST, verify if this document is actually an Insurance Declaration Page, Policy Document, or related insurance document.
If it is NOT an insurance document, return an object with ONLY the 'error' field set to a descriptive message 
(e.g., "This document does not appear to be an Insurance Policy. Please upload a valid declaration page.").
If it IS an insurance document but the required values cannot be found, omit those fields from the JSON response.

Return a JSON object with the following exact keys (omit any keys where the value is not found):
- policyType (string, e.g., "HO-3", "DP-1", "DP-3", "Landlord", "Homeowners")
- windHailDeductible (string, e.g., "$1000", "1%", "2%")
- aopDeductible (string, e.g., "$1000", "$2500")
- hasLossOfRent (boolean, true if Loss of Use / Fair Rental Value is present)
- hasWaterBackup (boolean, true if Water Backup / Sewer Backup is present)
- annualPremium (number, just the integer value)
- error (string, optional, only if the document is invalid or not an insurance policy)
```

---

### 6.3 Recommendation Generation Prompts

#### Tax Recommendation
```
You are a property tax advisor for Westrom Property Management.

YOUR ROLE: Translate structured JSON analysis into clear, actionable prose.

DO: 
- Use provided numbers exactly
- Be direct; plain English
- Format using HTML tags (e.g., <strong>, <br/>, <ul>, <li>) for readability

CRITICAL RULES:
1. If the year-over-year increase is > 20%, explicitly state that in Texas, non-homestead 
   properties are capped at a 20% increase. State that an increase over 20% is against the law 
   and they are entitled to an automatic free reduction.
2. If the county appraisal is higher than Zillow or Realtor.com estimates, explicitly state 
   that they should file a protest because the county value is higher than market estimates.
3. If a protest is recommended, ALWAYS provide a DIY method (e.g., filing online via the county 
   portal) AND recommend three professional tax protest companies as solutions 
   (e.g., O'Connor & Associates, Property Tax Protest, Texas Tax Protest).

NEVER: 
- Invent/round numbers
- Hallucinate data
- Mention AI
- Give legal advice

OUTPUT: 2-3 paragraphs. Format using HTML tags for readability. Do NOT use markdown.

---
Generate a recommendation for this owner.
ANALYSIS DATA: {analysis JSON}
COUNTY LINK: {county_appraisal_link}
STATUS CONTEXT: {status_explanation}
```

#### Insurance Recommendation
```
You are an insurance advisor for Westrom Property Management.

YOUR ROLE: Translate structured JSON insurance analysis into clear, actionable prose.

DO: 
- Use provided data exactly
- Be direct; plain English
- Format using HTML tags (e.g., <strong>, <br/>, <ul>, <li>) for readability

CRITICAL RULES:
1. State whether the policy is typical and standard based on the values.
2. Explicitly mention where they are lacking coverage (e.g., missing Loss of Rent, wrong policy type).
3. Suggest specific questions or ideas they should call and ask their insurance company about 
   (e.g., optimizing deductibles, adding specific endorsements).

NEVER: 
- Invent data
- Hallucinate coverages
- Mention AI
- Give legal advice

OUTPUT: 2-3 paragraphs. Format using HTML tags for readability. Do NOT use markdown.

---
Generate an insurance recommendation for this owner.
ANALYSIS DATA: {insurance analysis JSON}
STATUS CONTEXT: {status_explanation}
```

---

## 7. RULE ENGINE & ANALYSIS LOGIC

### 7.1 Tax Analysis Rule Engine
**Input:** PropertyData { address, currentValue, priorValue, zillowValue?, realtorValue?, county }

**Output:** AnalysisResult { status, yoyIncreasePct, marketGapPct, data }

**Decision Tree:**
```
IF yoyIncrease > 20%
  → Status = AUTOMATIC_REDUCTION
ELSE IF marketValue exists
  → marketGapPct = (currentValue - min(zillow, realtor)) / marketValue
  → IF marketGapPct > 5%
       → Status = PROTEST_RECOMMENDED
    ELSE IF marketGapPct > 0%
       → Status = CONTACT_WESTROM
    ELSE
       → Status = NO_ACTION
ELSE (No market data)
  → IF yoyIncrease > 10%
       → Status = PROTEST_RECOMMENDED
    ELSE IF yoyIncrease > 5%
       → Status = CONTACT_WESTROM
    ELSE
       → Status = NO_ACTION
```

### 7.2 Insurance Analysis Rule Engine
**Input:** InsuranceData { policyType?, windHailDeductible?, aopDeductible?, hasLossOfRent?, hasWaterBackup?, annualPremium? }

**Output:** InsuranceAnalysisResult { status, gaps[], optimizations[], data }

**Decision Tree:**
```
gaps = []
optimizations = []
status = GOOD_STANDING

IF policyType includes (HO-3 | HOMEOWNER)
  → gaps.push("HO-3 not suitable for rentals—claims may be denied. Need Landlord (DP) policy.")
  → status = CRITICAL_WARNING

ELSE IF policyType includes (DP-1 | BASIC)
  → gaps.push("DP-1 uses Actual Cash Value (depreciated). Upgrade to DP-3 for Replacement Cost.")
  → status = UPGRADE_RECOMMENDED

IF hasLossOfRent == false
  → gaps.push("Missing Loss of Rental Income coverage.")

IF hasWaterBackup == false
  → gaps.push("Missing Sewer & Drain Backup coverage (common in Texas).")

IF windHailDeductible is flat-rate AND amount <= $2000
  → optimizations.push("Switch to 1% or 2% Wind/Hail deductible to lower premium.")
  → IF status == GOOD_STANDING → status = OPTIMIZATION_POSSIBLE

IF gaps.length > 0 AND status == GOOD_STANDING
  → status = UPGRADE_RECOMMENDED

RETURN { status, gaps, optimizations, data }
```

---

## 8. SUCCESS METRICS & KPIs

### User Engagement
- Time to first recommendation: < 2 minutes
- Conversion (home → hub): > 70%
- Return visits within 30 days: > 40%

### Recommendation Quality
- User satisfaction with tax recommendations: > 4.5/5
- User satisfaction with insurance recommendations: > 4.5/5
- Document extraction accuracy: > 95%

### Business Metrics
- Leads generated for Westrom services: > 200/month (Q2+)
- Tax protest conversions: > 20% of "PROTEST_RECOMMENDED" users
- Insurance upgrade recommendations: > 30% acceptance rate

---

## 9. CONSTRAINTS & ASSUMPTIONS

### Constraints
1. **API Keys:** Requires valid Gemini API key (no fallback LLM currently)
2. **Document Quality:** Extraction accuracy depends on clear, legible PDFs
3. **Market Data:** Zillow/Realtor estimates must be manually provided (not auto-fetched)
4. **Texas-Specific:** Rules engine assumes Texas property tax law (20% cap rule)

### Assumptions
1. Users have access to their property tax notices and insurance declaration pages
2. Users understand basic property tax and insurance terminology
3. County appraisal district websites remain accessible and functional
4. Gemini API remains available and stable

---

## 10. OUT OF SCOPE (Phase 1)

- Form-based data entry (phase 2+)
- Market value lookups from Zillow/Realtor APIs (manual entry only)
- Legal document generation or electronic filing
- Multi-property portfolio management
- Non-Texas jurisdictions
- Property insurance claims filing
- Mortgage/financing guidance

---

## 11. ROADMAP & FUTURE FEATURES

### Phase 2 (Q3 2026)
- Form-based data entry for users without documents
- Integration with Zillow/Realtor APIs for automatic market value lookups
- Tax protest filing templates (DIY guidance)
- Insurance quote comparison tool

### Phase 3 (Q4 2026)
- Multi-property portfolio dashboard
- Automated annual renewal reminders
- Integration with professional tax protest services (API)
- Email/SMS notifications for action items

### Phase 4 (2027+)
- Expansion to other states (California, Florida, New York)
- Mobile app (iOS/Android)
- Real estate agent integrations
- Property management company partnerships

---

## 12. COMPLIANCE & LEGAL NOTES

### Disclaimers
- Not a substitute for professional legal or tax advice
- Recommendations are informational, not legal opinions
- Always consult with a qualified tax professional before filing protests
- Insurance information is based on provided document data only

### Data Privacy
- API keys stored in client-side environment (no server storage)
- Documents uploaded are processed by Gemini API; no storage on Westrom servers
- Compliance with GDPR and CCPA (no PII retention)

---

## 13. DOCUMENT SIGN-OFF

**Prepared By:** Claude Code (AI)  
**Date:** 2026-04-15  
**Version:** 1.0  
**Status:** Final Review  

**Next Steps:**
1. Verify against CLIENT.txt requirements
2. Phase 2 architecture planning
3. Sprint planning and task breakdown (Phase 4)
4. Development sprint initiation (Phase 5)
