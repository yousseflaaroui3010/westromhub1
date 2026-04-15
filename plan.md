# Execution Plan: Westrom Owner Advisory Hub Redesign

## EPIC 1: The "Lobby" Experience (Mission & Routing)
*Objective: Create a frictionless, instantly comprehensible landing page that communicates the company's mission and clearly presents the two primary pathways (Taxes and Insurance) without overwhelming the user.*

### User Stories
*   **US 1.1:** As a property owner, I want to see the exact mission statement ("We are FOR you and With you!") and the goal ("protect and maximize the return on your investment") immediately upon loading the site, so I feel supported and understand the site's purpose.
*   **US 1.2:** As a property owner, I want to read a brief explanation of the current seasonal focus (protesting taxes and shopping insurance) so I understand why I need to take action now.
*   **US 1.3:** As a user, I want to see two clear, distinct pathways (Cards/Doors) for "Taxes" and "Insurance" that explain what I will do in each section, so I am guided but not forced into a specific action.
*   **US 1.4:** As a user, I want the landing page to be free of complex forms, videos, and detailed tools, so I can understand the site's purpose within 3 seconds without cognitive overload.

### Features & Functionalities
*   **F 1.1: State-Based Routing:** Implement a simple view-switching mechanism in `App.tsx` (e.g., `currentView = 'home' | 'taxes' | 'insurance'`) to handle navigation without needing a full router library, keeping the app lightweight.
*   **F 1.2: Redesigned Hero Component:** Create a new Hero section featuring the exact client copy.
*   **F 1.3: Pathway Selection Cards:** Build two large, visually distinct cards on the home view that act as the entry points to the specific hubs.

---

## EPIC 2: The Tax Hub (Focused Workspace)
*Objective: Create an isolated workspace dedicated entirely to property taxes, presenting information in a logical, linear flow.*

### User Stories
*   **US 2.1:** As a user focusing on taxes, I want to see *only* tax-related content (videos, protest options, county links, AI analyzer) so I am not distracted by insurance information.
*   **US 2.2:** As a user, I want the 20% automatic reduction rule presented as a contextual "Hot Tip" rather than a global alert, so I know it's something to watch out for without it dominating the page.
*   **US 2.3:** As a user, I want a clear "Back to Home" or "Switch to Insurance" navigation option so I can easily change tasks.

### Features & Functionalities
*   **F 2.1: Tax View Component:** Create a new `TaxView.tsx` component that aggregates all tax-related sections (`VideoEmbed`, Protest Options, `ResourceCard`s for counties).
*   **F 2.2: "Hot Tip" UI:** Refactor the `CTABanner` into a smaller, stylized `HotTipCard` component integrated specifically into the Tax View.
*   **F 2.3: Isolated Tax AI Tool:** Extract the tax document upload and analysis logic from the blended `AnalysisSection` into a dedicated `TaxAnalysis` component.

---

## EPIC 3: The Insurance Hub (Focused Workspace)
*Objective: Create an isolated workspace dedicated entirely to property insurance.*

### User Stories
*   **US 3.1:** As a user focusing on insurance, I want to see *only* insurance-related content (guidelines, shopping tips, AI analyzer) so I am not distracted by tax information.

### Features & Functionalities
*   **F 3.1: Insurance View Component:** Create a new `InsuranceView.tsx` component that aggregates all insurance-related sections.
*   **F 3.2: Isolated Insurance AI Tool:** Extract the insurance document upload and analysis logic from the blended `AnalysisSection` into a dedicated `InsuranceAnalysis` component.

---

## Execution Steps (Technical Plan)

1.  **Step 1: Component Splitting (The AI Tools)**
    *   Break down `AnalysisSection.tsx` into `TaxAnalysis.tsx` and `InsuranceAnalysis.tsx`.
2.  **Step 2: Create the Hub Views**
    *   Create `TaxView.tsx` (assembling the Hot Tip, Video, Protest Options, Counties, and `TaxAnalysis`).
    *   Create `InsuranceView.tsx` (assembling the Insurance guidelines and `InsuranceAnalysis`).
3.  **Step 3: Build the "Lobby" (Home View)**
    *   Create `HomeView.tsx` with the new Hero messaging and the two Pathway Cards.
4.  **Step 4: Wire it up in App.tsx**
    *   Implement the state (`activeView`) and a simple navigation bar/header to allow switching between Home, Taxes, and Insurance.
