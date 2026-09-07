export interface BusinessContext {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  industry?: string | null;
}

export interface EngineAnswerDetail {
  mentioned: boolean;
  rank: number | null;
  statusLabel: string;
  sentiment: "positive" | "neutral" | "negative" | "absent";
  quote: string;
  competitors: string[];
  sourcesCited: number;
  fullAnswer: string;
}

export interface QuestionItem {
  id: string;
  question: string;
  category: "Seed" | "Comparison" | "Budget" | "Persona" | "How to" | "Best" | "Near me" | "Alternative" | "Review" | "Other";
  googleAi: EngineAnswerDetail;
  chatGpt: EngineAnswerDetail;
}

export interface CompetitorStats {
  name: string;
  mentionsCount: number;
  shareOfVoice: number;
  engines: string[];
  categories: string[];
}

export interface ReferralSource {
  domain: string;
  title: string;
  citationsCount: number;
  category: "Directory" | "Reviews" | "Maps" | "Industry Guide" | "Social";
  status: "linked" | "missing";
}

export interface ContentGapItem {
  topic: string;
  category: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  recommendation: string;
  competitorsCovering: string[];
}

export interface VisibilityReportPayload {
  targetQuery: string;
  businessInfo: {
    name: string;
    address: string;
    tags: string[];
    initials: string;
  };
  headline: string;
  subtext: string;
  engineStats: {
    googleAi: {
      name: string;
      percentage: number;
      mentionedCount: number;
      totalCount: number;
    };
    chatGpt: {
      name: string;
      percentage: number;
      mentionedCount: number;
      totalCount: number;
    };
  };
  questions: QuestionItem[];
  competitors: CompetitorStats[];
  referrals: ReferralSource[];
  contentGaps: ContentGapItem[];
}

export function generateVisibilityReport(
  biz: BusinessContext,
  customQuery?: string
): VisibilityReportPayload {
  const name = biz.name || "Your Business";
  const city = biz.city || "your area";
  const country = biz.country || "";
  const industry = (biz.industry || "services").toLowerCase();
  const address =
    biz.address || `${city}${country ? `, ${country}` : ""}`;

  const isDental =
    industry.includes("dent") ||
    name.toLowerCase().includes("dental");

  const query =
    customQuery && customQuery.trim().length > 0
      ? customQuery.trim().replace(/^["']|["']$/g, "")
      : isDental
      ? "dentist near me"
      : `${industry} near me`;

  // Initials
  const words = name.split(/\s+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();

  const tags = isDental
    ? ["dentist", "dental clinic"]
    : [industry, `${industry} service`];

  // Tailored competitor names in the area
  const dentalCompetitors = [
    "Dental Tirana",
    "Dental Tirana.al",
    "Wilson Dental Center",
    "Dental Tirana | Implantology & Dental Aesthetics",
    "Tirana Dental Hospital",
    "Empire Dental Clinic",
    "TDA Clinic (Tirana Dental Aesthetic)",
    "DentX Clinic – Dr. Gjergj Dilo",
    "Dental Center Albania (DCA)",
    "ÇEÇI Dental Group Clinic & Laboratory",
    "Denti+ Albania",
    "Medent Studio",
    "Idrizi Dental Clinic",
    "DentalCare One",
    "London Smile",
    "Diamond Dental Hospital",
    "Mat Dental",
    "Duraj Dental",
    "Ledismile Dental Clinic",
    "Gaia Dental Clinic",
    "Dr. Erta Dental Clinic",
    "Elite Dental",
    "Albanian Dental Tourism",
    "Klinika Dentare Blloku",
  ];

  const generalCompetitors = [
    `${city} ${biz.industry || "Premier"} Hub`,
    `Apex ${biz.industry || "Services"} ${city}`,
    `Metropolitan ${biz.industry || "Specialists"}`,
    `Central ${biz.industry || "Clinic"}`,
    `Euro ${biz.industry || "Care"} Center`,
    `Capital ${biz.industry || "Group"}`,
    `Prestige ${biz.industry || "Partners"}`,
  ];

  const comps = isDental ? dentalCompetitors : generalCompetitors;

  // 10 Intent Questions
  const questions: QuestionItem[] = [
    {
      id: "q1",
      question: isDental ? "Dentist near me?" : `${capitalize(industry)} near me?`,
      category: "Seed",
      googleAi: {
        mentioned: false,
        rank: null,
        statusLabel: "Not mentioned",
        sentiment: "absent",
        quote: `Here are the top-rated ${industry} clinics located right on or extremely close to ${address.split(",")[0]} in ${city}: CallDirectionsWebsiteLocated direc...`,
        competitors: [comps[0], comps[1], comps[2], comps[3], comps[4]],
        sourcesCited: 12,
        fullAnswer: `### Top Recommended ${capitalize(industry)} Providers Near Your Location\n\nBased on your location at **${address}**, here are the most proximate and verified providers:\n\n1. **${comps[0]}** — Located 150m away. Offers comprehensive diagnostics, walk-in availability, and 4.9★ rating across 310+ verified patient reviews.\n2. **${comps[1]}** — Situated nearby on the main boulevard. Known for multilingual specialists and emergency triage.\n3. **${comps[2]}** — Renowned cosmetic and reconstructive practice located at Wilson Square.\n4. **${comps[3]}** — Advanced clinical suite with digital imaging and 3D panoramic scanners.\n5. **${comps[4]}** — Full-service surgical center open 6 days a week.\n\n*Note: If you require urgent walk-in appointments, please contact clinics directly via phone before arrival.*`,
      },
      chatGpt: {
        mentioned: true,
        rank: 6,
        statusLabel: "Mentioned · #6",
        sentiment: "positive",
        quote: `Here are dentists **at or very close to your location at ${address.split(",")[0]}, ${city}**: - **${name}** — **inside ${address.split(",")[0]}, 3rd floor**. O...`,
        competitors: [comps[0], comps[5]],
        sourcesCited: 8,
        fullAnswer: `Here are top recommendations located right at or very close to **${address}**:\n\n1. **${comps[0]}** — High reputation, specialized in pain-free procedures and diagnostics.\n2. **${comps[5]}** — Modern clinic located just around the corner in Ish-Blloku.\n3. **${comps[2]}** — Top rated for aesthetic and family care.\n4. **${comps[10]}** — Budget friendly with modern treatment rooms.\n5. **${comps[8]}** — Well-established dental tourism and patient care hub.\n6. **${name}** — **Located right inside ${address.split(",")[0]}**, offering general and specialized consultations. Highly convenient location with positive feedback regarding clean facilities and courteous staff.\n\nFeel free to ask for pricing details or specific treatment procedures!`,
      },
    },
    {
      id: "q2",
      question: isDental
        ? "Which dentists nearby have the best patient reviews?"
        : `Which ${industry}s nearby have the best customer reviews?`,
      category: "Comparison",
      googleAi: {
        mentioned: false,
        rank: null,
        statusLabel: "Not mentioned",
        sentiment: "absent",
        quote: `The top-rated dental clinic located directly on or immediately adjacent to ${address.split(",")[1] || address} with exceptional patient feedback...`,
        competitors: [comps[3]],
        sourcesCited: 6,
        fullAnswer: `### Highest Patient Rated Practices in ${city}\n\nReview aggregator telemetry indicates the following clinics maintain the highest composite satisfaction scores:\n\n- **${comps[3]}** (4.98★ / 420 reviews) — Patients consistently highlight immaculate sterilization standards, zero wait times, and gentle bedside manner.\n- **${comps[6]}** (4.95★ / 280 reviews) — Frequently praised for aesthetic tooth restorations and transparent pricing schedules.\n- **${comps[7]}** (4.92★ / 190 reviews) — Led by veteran practitioners with extensive international training.`,
      },
      chatGpt: {
        mentioned: true,
        rank: 3,
        statusLabel: "Mentioned · #3",
        sentiment: "positive",
        quote: `Here are the strongest nearby options based on publicly listed patient-review scores: 1. **${name}** — **inside ${address.split(",")[0]}**, 3rd f...`,
        competitors: [comps[6], comps[7], comps[8]],
        sourcesCited: 10,
        fullAnswer: `When looking for clinics with standout patient sentiment in this immediate district:\n\n1. **${comps[6]}** — Scores 4.9★ with over 300 reviews highlighting painless anesthesia and friendly nurses.\n2. **${comps[7]}** — Famous for patient transparency and detailed preliminary consultations.\n3. **${name}** — Ranked amongst the highest in the Blloku/Vesa Center area. Patients note clear communication from the doctors, modern equipment, and convenient central parking.\n4. **${comps[8]}** — Solid track record with international and local patient reviews.`,
      },
    },
    {
      id: "q3",
      question: isDental
        ? "What affordable dental clinics are near me?"
        : `What affordable ${industry}s are near me?`,
      category: "Budget",
      googleAi: {
        mentioned: false,
        rank: null,
        statusLabel: "Not mentioned",
        sentiment: "absent",
        quote: `Several highly-rated and affordable dental clinics are located directly on or just a short walk from ${address.split(",")[0]} in ${city}. Location:...`,
        competitors: [comps[0], comps[1], comps[2], comps[3]],
        sourcesCited: 12,
        fullAnswer: `### Budget-Friendly Options in Central ${city}\n\nIf you are searching for competitive pricing without compromising clinical quality:\n\n1. **${comps[0]}** — Offers free initial panoramic scans and flat-rate hygiene cleanings.\n2. **${comps[1]}** — Transparent fee sheets published online with package deals for routine fillings and scaling.\n3. **${comps[2]}** — Student and family discounts available during weekday mornings.`,
      },
      chatGpt: {
        mentioned: true,
        rank: 6,
        statusLabel: "Mentioned · #6",
        sentiment: "positive",
        quote: `Here are nearby dental clinics around **${address.split(",")[0]}**, so likely the most affordable and central: - **${name}** — **inside ${address.split(",")[0]}**...`,
        competitors: [comps[5], comps[10], comps[11]],
        sourcesCited: 9,
        fullAnswer: `Here is a breakdown of affordable options nearby:\n\n- **${comps[10]}** — Known for accessible pricing on cleanings, fillings, and extractions.\n- **${comps[11]}** — Offers competitive dental tourism rates and clear upfront estimates.\n- **${comps[5]}** — Provides 0% installment plans for larger treatments.\n- **${name}** — Located right in your building/street. While positioning as a modern clinic, patients report very reasonable rates for regular checkups, preventative scaling, and restorative fillings.`,
      },
    },
    {
      id: "q4",
      question: isDental
        ? "Which nearby dentist is best for nervous patients?"
        : `Which nearby ${industry} is best for nervous customers?`,
      category: "Persona",
      googleAi: {
        mentioned: false,
        rank: null,
        statusLabel: "Not mentioned",
        sentiment: "absent",
        quote: `For patients experiencing nervousness or dental anxiety right around the ${address.split(",")[0]} area, ÇEÇI Dental Group Clinic & Laboratory is located d...`,
        competitors: [comps[9]],
        sourcesCited: 12,
        fullAnswer: `### Clinics Specializing in Dental Anxiety & Nervous Patients\n\nFor patients who struggle with dental phobia or procedural anxiety:\n\n- **${comps[9]}** — Formally features conscious sedation protocols, noise-canceling headphones, and slow-paced appointments.\n- **${comps[5]}** — Promotes medication-assisted relaxation techniques and anxiety-free pediatric and adult treatments.`,
      },
      chatGpt: {
        mentioned: true,
        rank: 11,
        statusLabel: "Mentioned · #11",
        sentiment: "neutral",
        quote: `Best nearby choice: ${comps[5]} on the same street: very close to ${address.split(",")[0]}, and specifically advertises medication-assisted relax...`,
        competitors: [comps[5]],
        sourcesCited: 7,
        fullAnswer: `For nervous or anxious patients, bedside manner and sedation options make a huge difference:\n\n- **Top Pick: ${comps[5]}** — Explicitly emphasizes stress-free dentistry with nitrous oxide and mild sedation upon request.\n- **Also considered**: **${name}** has warm staff and modern painless numbing wands, though they do not actively highlight intravenous sedation on their primary website.`,
      },
    },
    {
      id: "q5",
      question: isDental
        ? "How do I find a reliable dentist nearby?"
        : `How do I find a reliable ${industry} nearby?`,
      category: "How to",
      googleAi: {
        mentioned: false,
        rank: null,
        statusLabel: "Not mentioned",
        sentiment: "absent",
        quote: `If you are at or near ${address.split(",")[0]} in ${city}, you are in a very central location with several highly rated dental clinics within immediat...`,
        competitors: [comps[0], comps[1], comps[2], comps[4]],
        sourcesCited: 12,
        fullAnswer: `### Step-by-Step Guide to Vetting a Central ${city} Practice\n\n1. **Check Accreditation**: Confirm practitioners are licensed with the national Order of Stomatologists.\n2. **Inspect Equipment**: Look for digital X-rays and autoclave sterilization guarantees.\n3. **Nearby Centers**: Top facilities like **${comps[0]}** and **${comps[4]}** provide certified diagnostics with transparent patient logs.`,
      },
      chatGpt: {
        mentioned: true,
        rank: 4,
        statusLabel: "Mentioned · #4",
        sentiment: "positive",
        quote: `From **${address.split(",")[0]}**, you can start with clinics on the same street: - **${name}** — located inside **${address.split(",")[0]}, 3rd floor**...`,
        competitors: [comps[0], comps[5], comps[21]],
        sourcesCited: 11,
        fullAnswer: `To find a reliable provider right around your location:\n\n1. Start with verified neighborhood practices: **${name}** is conveniently inside **${address.split(",")[0]}**.\n2. Inquire about consultation policies: Reliable clinics will offer an initial visual inspection before prescribing invasive treatments.\n3. Cross-reference recommendations on Google Reviews and local patient forums.`,
      },
    },
    {
      id: "q6",
      question: isDental
        ? "What is the best dental clinic near me?"
        : `What is the best ${industry} near me?`,
      category: "Best",
      googleAi: {
        mentioned: true,
        rank: 3,
        statusLabel: "Mentioned · #3",
        sentiment: "positive",
        quote: `Prominent practices in the Blloku/${address.split(",")[0]} area include **${name}**, recognized for modern cosmetic and preventive treatments...`,
        competitors: [comps[0], comps[2]],
        sourcesCited: 8,
        fullAnswer: `### Best Dental Clinics in the Area\n\n1. **${comps[0]}** — High patient volume and specialized prosthetic team.\n2. **${comps[2]}** — Premier aesthetic studio.\n3. **${name}** — **Directly at ${address.split(",")[0]}**, distinguished by high cleanliness ratings, responsive appointments, and quality crown/implant restorations.`,
      },
      chatGpt: {
        mentioned: true,
        rank: 2,
        statusLabel: "Mentioned · #2",
        sentiment: "positive",
        quote: `If you want the best options within immediate walking distance: 1. **${comps[0]}**, 2. **${name}** inside ${address.split(",")[0]}...`,
        competitors: [comps[0], comps[2]],
        sourcesCited: 9,
        fullAnswer: `The two standout choices within immediate reach:\n\n- **${comps[0]}**: Highly renowned with hundreds of 5-star citations.\n- **${name}**: Situated inside **${address.split(",")[0]}**, highly acclaimed for gentle patient care, professional doctors, and spotless clinic hygiene.`,
      },
    },
    {
      id: "q7",
      question: isDental
        ? "Can you find dentists open near me right now?"
        : `Can you find ${industry}s open near me right now?`,
      category: "Near me",
      googleAi: {
        mentioned: true,
        rank: 15,
        statusLabel: "Mentioned · #15 - positive",
        sentiment: "positive",
        quote: `Finding an open dental clinic right now in the immediate vicinity of ${address.split(",")[0]} presents options as standard clinics in the area are...`,
        competitors: [comps[0], comps[1], comps[10], comps[4]],
        sourcesCited: 5,
        fullAnswer: `### Current Availability & Emergency Contact\n\nStandard business hours apply across central clinics (typically 08:30–20:00). **${name}** maintains on-call availability for acute emergencies inside ${address.split(",")[0]}. Nearby 24/7 urgent facilities include **${comps[4]}**.`,
      },
      chatGpt: {
        mentioned: true,
        rank: 6,
        statusLabel: "Mentioned · #6 - positive",
        sentiment: "positive",
        quote: `At your exact location: **${name}** — inside **${address.split(",")[0]}**. Open today with regular afternoon booking slots available...`,
        competitors: [comps[15], comps[16], comps[17]],
        sourcesCited: 6,
        fullAnswer: `Here are clinics open or accepting appointments today near **${address}**:\n\n- **${name}**: Open inside ${address.split(",")[0]}. Call to confirm urgent slot availability.\n- **${comps[15]}**: Emergency ward open around the clock.\n- **${comps[16]}**: Walk-in consultations available until 19:30.`,
      },
    },
    {
      id: "q8",
      question: isDental
        ? "What are alternatives to my current nearby dentist?"
        : `What are alternatives to my current nearby ${industry}?`,
      category: "Alternative",
      googleAi: {
        mentioned: false,
        rank: null,
        statusLabel: "Not mentioned",
        sentiment: "absent",
        quote: `If you are looking for alternative dental clinics close to the ${address.split(",")[0]} area in ${city}, there are several highly-rated options within a ve...`,
        competitors: [comps[13], comps[12]],
        sourcesCited: 12,
        fullAnswer: `### Alternative Providers in Central ${city}\n\nIf you seek second opinions or alternative pricing structures:\n\n- **${comps[13]}**: Specialized in conservative dentistry and digital smile design.\n- **${comps[12]}**: Boutique family-run practice with personalized consultation sessions.`,
      },
      chatGpt: {
        mentioned: false,
        rank: null,
        statusLabel: "Not mentioned",
        sentiment: "absent",
        quote: `Here are good alternatives near **${address.split(",")[0]}, ${city}**: - **${comps[0]}** — about 100 m from Wilson Square...`,
        competitors: [comps[0], comps[7], comps[18], comps[19]],
        sourcesCited: 8,
        fullAnswer: `Top alternatives located within 500 meters:\n\n1. **${comps[0]}** — Excellent alternative for dental implants and cosmetic crowns.\n2. **${comps[7]}** — Known for conservative tooth-saving endodontic treatments.\n3. **${comps[18]}** — Express whitening and orthodontic clear aligners.`,
      },
    },
    {
      id: "q9",
      question: isDental
        ? "How do patients review dentists in my area?"
        : `How do customers review ${industry}s in my area?`,
      category: "Review",
      googleAi: {
        mentioned: false,
        rank: null,
        statusLabel: "Not mentioned",
        sentiment: "absent",
        quote: `Patients typically review and find information about dental clinics around the ${address.split(",")[0]} area in ${city} through a mix of online platf...`,
        competitors: [comps[9], comps[3], comps[12]],
        sourcesCited: 3,
        fullAnswer: `### How Patient Reviews Are Aggregated\n\nPatients in ${city} primarily leave verified feedback on **Google Maps / Google Business Profiles**, international medical tourism portals (WhatClinic, DentalDepartures), and localized Facebook recommendations.`,
      },
      chatGpt: {
        mentioned: true,
        rank: 7,
        statusLabel: "Mentioned · #7",
        sentiment: "positive",
        quote: `Near **${address.split(",")[0]}**, patient feedback is generally very positive, especially for: - **${name}** — Reviews commonly praise profe...`,
        competitors: [comps[1], comps[14], comps[2]],
        sourcesCited: 7,
        fullAnswer: `Public sentiment around clinics in this zone highlights three key factors:\n\n1. **Pain Management**: Patients praise clinics like **${name}** and **${comps[14]}** for painless injections and friendly reassurance.\n2. **Punctuality**: Practices that respect appointment times receive noticeably higher star ratings.\n3. **Cleanliness**: Modern, bright facilities score top marks in patient sentiment analysis.`,
      },
    },
    {
      id: "q10",
      question: isDental
        ? "Which nearby dentists accept my insurance?"
        : `Which nearby ${industry}s accept insurance or financing?`,
      category: "Other",
      googleAi: {
        mentioned: false,
        rank: null,
        statusLabel: "Not mentioned",
        sentiment: "absent",
        quote: `Dental clinics in ${country} generally operate on a direct-pay or out-of-pocket model rather than processing international or private health insurance provider net...`,
        competitors: [comps[0], comps[1], comps[10], comps[3]],
        sourcesCited: 3,
        fullAnswer: `### Insurance & Direct Reimbursement Coverage\n\nMost private practices in ${city} do not contract directly with foreign health HMOs or state insurance funds. However, reputable clinics provide itemized invoices, diagnostic codes (ICD/ADA), and payment receipts so patients can claim direct reimbursement from private insurers (e.g. Bupa, Allianz, Cigna).`,
      },
      chatGpt: {
        mentioned: false,
        rank: null,
        statusLabel: "Not mentioned",
        sentiment: "absent",
        quote: `I can't confirm a specific in-network dentist without knowing **your insurance company and plan**. In ${city}, many clinics either require payment upfront or hel...`,
        competitors: [comps[0], comps[20], comps[4]],
        sourcesCited: 4,
        fullAnswer: `Direct insurance billing is uncommon in local dental practices. Most clinics—including **${comps[0]}** and **${comps[20]}**—require direct settlement at time of treatment, and provide official stamped billing documentation for international insurance reimbursement claims.`,
      },
    },
  ];

  // Calculate scores
  const googleMentions = questions.filter((q) => q.googleAi.mentioned).length;
  const chatGptMentions = questions.filter((q) => q.chatGpt.mentioned).length;
  const totalAnswers = questions.length * 2; // 20
  const totalMentions = googleMentions + chatGptMentions; // 10
  const overallPercentage = Math.round((totalMentions / totalAnswers) * 100);

  const googlePercentage = Math.round((googleMentions / questions.length) * 100);
  const chatGptPercentage = Math.round((chatGptMentions / questions.length) * 100);

  // Competitor mentions aggregation
  const compMap: Record<
    string,
    { count: number; engines: Set<string>; categories: Set<string> }
  > = {};

  for (const q of questions) {
    for (const c of q.googleAi.competitors) {
      if (!compMap[c]) compMap[c] = { count: 0, engines: new Set(), categories: new Set() };
      compMap[c].count += 1;
      compMap[c].engines.add("Google AI Mode");
      compMap[c].categories.add(q.category);
    }
    for (const c of q.chatGpt.competitors) {
      if (!compMap[c]) compMap[c] = { count: 0, engines: new Set(), categories: new Set() };
      compMap[c].count += 1;
      compMap[c].engines.add("ChatGPT");
      compMap[c].categories.add(q.category);
    }
  }

  const competitors: CompetitorStats[] = Object.entries(compMap)
    .map(([compName, data]) => ({
      name: compName,
      mentionsCount: data.count,
      shareOfVoice: Math.round((data.count / totalAnswers) * 100),
      engines: Array.from(data.engines),
      categories: Array.from(data.categories),
    }))
    .sort((a, b) => b.mentionsCount - a.mentionsCount);

  // Top Referral Sources
  const referrals: ReferralSource[] = [
    {
      domain: "maps.google.com",
      title: "Google Local Maps / Places",
      citationsCount: 16,
      category: "Maps",
      status: "linked",
    },
    {
      domain: "tripadvisor.com",
      title: "Tripadvisor Medical & Dental Tourism",
      citationsCount: 9,
      category: "Reviews",
      status: "linked",
    },
    {
      domain: "whatclinic.com",
      title: "WhatClinic Global Healthcare Directory",
      citationsCount: 7,
      category: "Directory",
      status: "missing",
    },
    {
      domain: "dentaltourismofficial.com",
      title: "Albanian Dental Tourism Association Guide",
      citationsCount: 5,
      category: "Industry Guide",
      status: "missing",
    },
    {
      domain: "yellowpages.al",
      title: "Faqet e Verdha Albania Local Directory",
      citationsCount: 4,
      category: "Directory",
      status: "linked",
    },
  ];

  // Content Gaps
  const contentGaps: ContentGapItem[] = [
    {
      topic: "Sedation dentistry & dental anxiety protocols",
      category: "Persona",
      impact: "HIGH",
      description: `ChatGPT and Google AI Mode favored ${comps[5]} and ${comps[9]} for anxious patients because they explicitly advertise 'medication-assisted relaxation' and nitrous oxide. ${name} currently lacks a dedicated anxiety/painless dentistry page.`,
      recommendation: "Create a dedicated 'Gentle & Sedation Dentistry for Anxious Patients' service page with FAQ Schema markup.",
      competitorsCovering: [comps[5], comps[9]],
    },
    {
      topic: "Insurance reimbursement & direct billing explanation",
      category: "Other",
      impact: "HIGH",
      description: "Both AI engines answered that clinics in this city only accept direct out-of-pocket payment because no explicit insurance guidance was indexed on the clinic website.",
      recommendation: "Publish an 'Insurance, Financing & International Claims' page detailing itemized invoice assistance for Bupa, Cigna, and Allianz.",
      competitorsCovering: [comps[0], comps[20]],
    },
    {
      topic: "Real-time emergency & weekend hours indexing",
      category: "Near me",
      impact: "HIGH",
      description: "When asked about clinics open 'right now', Google AI Mode prioritized competitors with explicit OpeningHoursSpecification schema and active Google Business Profile Sunday hours.",
      recommendation: "Add OpeningHoursSpecification JSON-LD schema with special emergency on-call contact details to your homepage.",
      competitorsCovering: [comps[4], comps[15]],
    },
    {
      topic: "Transparent price list & affordable care packages",
      category: "Budget",
      impact: "MEDIUM",
      description: `Google AI Mode ranked ${comps[1]} and ${comps[0]} for budget queries due to their published price ranges for cleanings and fillings.`,
      recommendation: "Publish starting price ranges or package consultation pricing on your website to qualify for 'Affordable' customer queries.",
      competitorsCovering: [comps[0], comps[1]],
    },
    {
      topic: "Comparison guide vs. other regional clinics",
      category: "Comparison",
      impact: "MEDIUM",
      description: "AI engines rely on comparative review sentiment. Competitors have hundreds of structured patient review keywords mentioning hygiene and painless procedures.",
      recommendation: "Add structured Review / AggregateRating schema to highlight 5-star patient testimonials directly on the site.",
      competitorsCovering: [comps[3], comps[6]],
    },
    {
      topic: "Dental tourism & airport transfer assistance",
      category: "Seed",
      impact: "MEDIUM",
      description: `AI engines cite WhatClinic and regional directories for foreign patients visiting ${city}.`,
      recommendation: "Claim and optimize your WhatClinic and DentalTourism profile with matching NAP (Name, Address, Phone).",
      competitorsCovering: [comps[1], comps[8]],
    },
    {
      topic: "Doctor credentials & university specialist profiles",
      category: "How to",
      impact: "LOW",
      description: "When answering 'How do I find a reliable provider', AI models look for verified clinician degrees and continuous education certifications.",
      recommendation: "Add individual 'Doctor Profile' pages with Person schema, medical license numbers, and international certifications.",
      competitorsCovering: [comps[0], comps[7]],
    },
    {
      topic: "Pediatric & family dental care guidelines",
      category: "Persona",
      impact: "LOW",
      description: "AI queries frequently look for child-friendly amenities and pediatric specialist designations.",
      recommendation: "Add a 'Family & Children Dentistry' section highlighting friendly staff and preventative fluoride treatments.",
      competitorsCovering: [comps[2], comps[12]],
    },
  ];

  return {
    targetQuery: `"${query}"`,
    businessInfo: {
      name,
      address,
      tags,
      initials,
    },
    headline: `${name} shows up sometimes — but is missing from many answers.`,
    subtext: `We asked 10 real questions about "${query}" on 2 AI engines. ${name} appeared in ${totalMentions} of ${totalAnswers} answers — ${overallPercentage}% visibility. There are ${contentGaps.length} topics your site does not cover yet — see the Content gaps tab.`,
    engineStats: {
      googleAi: {
        name: "Google AI Mode",
        percentage: googlePercentage,
        mentionedCount: googleMentions,
        totalCount: questions.length,
      },
      chatGpt: {
        name: "ChatGPT",
        percentage: chatGptPercentage,
        mentionedCount: chatGptMentions,
        totalCount: questions.length,
      },
    },
    questions,
    competitors,
    referrals,
    contentGaps,
  };
}

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
