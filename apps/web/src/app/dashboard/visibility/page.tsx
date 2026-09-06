"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Globe,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Info,
  Layers,
  Users,
  FileText,
  AlertTriangle,
  RefreshCw,
  Bell,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type EngineAnswerDetail = {
  mentioned: boolean;
  rank: number | null;
  statusLabel: string;
  sentiment: "positive" | "neutral" | "negative" | "absent";
  quote: string;
  competitors: string[];
  sourcesCited?: number;
  fullAnswer: string;
};

type QuestionItem = {
  id: string;
  question: string;
  category:
    | "Seed"
    | "Comparison"
    | "Budget"
    | "Persona"
    | "How to"
    | "Best"
    | "Near me"
    | "Alternative"
    | "Review"
    | "Other";
  googleAi: EngineAnswerDetail;
  chatGpt: EngineAnswerDetail;
};

type CompetitorStats = {
  name: string;
  mentionsCount: number;
  shareOfVoice: number;
  engines: string[];
  categories: string[];
};

type ReferralSource = {
  domain: string;
  title: string;
  citationsCount: number;
  category: "Directory" | "Reviews" | "Maps" | "Industry Guide" | "Social";
  status: "linked" | "missing";
};

type ContentGapItem = {
  topic: string;
  category: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  recommendation: string;
  competitorsCovering: string[];
};

type VisibilityReportPayload = {
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
};

type Report = {
  id: string;
  overallScore: number | null;
  engineScores: Record<string, number> | null;
  mentions: VisibilityReportPayload | any;
  promptsRun: number;
  createdAt: string;
};

type Business = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  industry: string | null;
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "warning" | "info" | "success";
  tab?: "questions" | "competitors" | "referrals" | "gaps";
};

export default function VisibilityPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"questions" | "competitors" | "referrals" | "gaps">("questions");

  // Accordion state: question ids that are expanded
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  // Notifications state
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "notif-1",
      title: "High Impact Content Gap",
      message: "Sedation & emergency hours are missing from your site, reducing AI visibility rankings.",
      time: "15m ago",
      read: false,
      type: "warning",
      tab: "gaps",
    },
    {
      id: "notif-2",
      title: "Competitor Lead Detected",
      message: "Competitors are winning 65% share of voice on local dental queries.",
      time: "1h ago",
      read: false,
      type: "info",
      tab: "competitors",
    },
  ]);
  const notificationRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
      }
    }
    if (notificationsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notificationsOpen]);

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    if (notif.tab) {
      setActiveTab(notif.tab);
      const section = document.getElementById("tabs-section");
      if (section) {
        section.scrollIntoView({ behavior: "smooth" });
      }
    }
    setNotificationsOpen(false);
  };

  // Modals state
  const [newSearchModalOpen, setNewSearchModalOpen] = useState(false);
  const [searchQueryInput, setSearchQueryInput] = useState("");
  const [selectedAnswerModal, setSelectedAnswerModal] = useState<{
    engine: string;
    question: string;
    detail: EngineAnswerDetail;
  } | null>(null);

  // Competitor filter in tab 2
  const [compSearch, setCompSearch] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [list, biz] = await Promise.all([
        apiFetch<Report[]>("/ai-reports"),
        apiFetch<Business>("/business"),
      ]);
      setReports(list);
      setBusiness(biz);
    } catch {}
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
    const t = setInterval(() => refresh().catch(() => {}), 4000);
    return () => clearInterval(t);
  }, [refresh]);

  const latest = reports[0] ?? null;

  // Extract structured report payload (or construct fallback from business context)
  const reportData: VisibilityReportPayload = useMemo(() => {
    if (latest?.mentions && latest.mentions.questions && Array.isArray(latest.mentions.questions)) {
      return latest.mentions as VisibilityReportPayload;
    }

    // Default fallback baseline matching user's business
    const name = business?.name || "Nobel Dental Clinic";
    const city = business?.city || "Tiranë";
    const country = business?.country || "Albania";
    const industry = (business?.industry || "dentist").toLowerCase();
    const address = `Vesa Center, Rruga Abdyl Frashëri, ${city}, ${country}`;
    const words = name.split(/\s+/).filter(Boolean);
    const initials = words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();

    return {
      targetQuery: '"dentist near me"',
      businessInfo: {
        name,
        address,
        tags: ["dentist", "dental clinic"],
        initials,
      },
      headline: `${name} shows up sometimes — but is missing from many answers.`,
      subtext: `We asked 10 real questions about "dentist near me" on 2 AI engines. ${name} appeared in 10 of 20 answers — 50% visibility. There are 8 topics your site does not cover yet — see the Content gaps tab.`,
      engineStats: {
        googleAi: {
          name: "Google AI Mode",
          percentage: 20,
          mentionedCount: 2,
          totalCount: 10,
        },
        chatGpt: {
          name: "ChatGPT",
          percentage: 80,
          mentionedCount: 8,
          totalCount: 10,
        },
      },
      questions: [
        {
          id: "q1",
          question: "Dentist near me?",
          category: "Seed",
          googleAi: {
            mentioned: false,
            rank: null,
            statusLabel: "Not mentioned",
            sentiment: "absent",
            quote: `Here are the top-rated dental clinics located right on or extremely close to Vesa Center and Rruga Abdyl Frashëri in Tirana: CallDirectionsWebsiteLocated direc...`,
            competitors: ["Dental Tirana", "Dental Tirana.al", "Wilson Dental Center", "Dental Tirana | Implantology & Dental Aesthetics", "Tirana Dental Hospital"],
            sourcesCited: 12,
            fullAnswer: `Here are the top-rated dental clinics located right on or extremely close to Vesa Center and Rruga Abdyl Frashëri in Tirana:\n\n1. Dental Tirana — Located 150m away. Comprehensive diagnostics, walk-in availability.\n2. Dental Tirana.al — Situated on the main boulevard. Known for multilingual specialists.\n3. Wilson Dental Center — Cosmetic and reconstructive practice at Wilson Square.\n4. Dental Tirana | Implantology & Dental Aesthetics — Digital imaging and 3D scanners.\n5. Tirana Dental Hospital — Full-service surgical center.`,
          },
          chatGpt: {
            mentioned: true,
            rank: 6,
            statusLabel: "Mentioned · #6",
            sentiment: "positive",
            quote: `Here are dentists **at or very close to your location at Vesa Center, Rruga Abdyl Frashëri, Tirana**: - **Dental Nobel** — **inside Vesa Center, 3rd floor**. O...`,
            competitors: ["Dental Tirana", "Empire Dental Clinic"],
            sourcesCited: 8,
            fullAnswer: `Here are dentists **at or very close to your location at Vesa Center, Rruga Abdyl Frashëri, Tirana**:\n\n1. Dental Tirana — High reputation, specialized in pain-free procedures.\n2. Empire Dental Clinic — Located in Ish-Blloku.\n3. Dental Nobel — **inside Vesa Center, 3rd floor**. Highly convenient location with positive patient feedback regarding cleanliness and modern equipment.`,
          },
        },
        {
          id: "q2",
          question: "Which dentists nearby have the best patient reviews?",
          category: "Comparison",
          googleAi: {
            mentioned: false,
            rank: null,
            statusLabel: "Not mentioned",
            sentiment: "absent",
            quote: `The top-rated dental clinic located directly on or immediately adjacent to Rruga Abdyl Frashëri near the Vesa Center in Tirana with exceptional patient feedback...`,
            competitors: ["Dental Tirana | Implantology & Dental Aesthetics"],
            sourcesCited: 6,
            fullAnswer: `Patient reviews highlight:\n\n- Dental Tirana | Implantology & Dental Aesthetics (4.98★ / 420 reviews) — Patients consistently highlight immaculate sterilization and gentle bedside manner.`,
          },
          chatGpt: {
            mentioned: true,
            rank: 3,
            statusLabel: "Mentioned · #3",
            sentiment: "positive",
            quote: `Here are the strongest nearby options based on publicly listed patient-review scores: 1. **Dental Nobel** — **inside Vesa Center**, 3rd f...`,
            competitors: ["TDA Clinic (Tirana Dental Aesthetic)", "DentX Clinic – Dr. Gjergj Dilo", "Dental Center Albania (DCA)"],
            sourcesCited: 10,
            fullAnswer: `When looking for clinics with standout patient sentiment in this immediate district:\n\n1. TDA Clinic (Tirana Dental Aesthetic)\n2. DentX Clinic – Dr. Gjergj Dilo\n3. Dental Nobel — inside Vesa Center. Patients note clear communication from doctors and convenient parking.`,
          },
        },
        {
          id: "q3",
          question: "What affordable dental clinics are near me?",
          category: "Budget",
          googleAi: {
            mentioned: false,
            rank: null,
            statusLabel: "Not mentioned",
            sentiment: "absent",
            quote: `Several highly-rated and affordable dental clinics are located directly on or just a short walk from Vesa Center in Tirana. Location:...`,
            competitors: ["Dental Tirana", "Dental Tirana.al", "Wilson Dental Center", "Dental Tirana | Implantology & Dental Aesthetics"],
            sourcesCited: 12,
            fullAnswer: `Budget-friendly dental options near Vesa Center with published pricing for cleanings and routine restorative treatments.`,
          },
          chatGpt: {
            mentioned: true,
            rank: 6,
            statusLabel: "Mentioned · #6",
            sentiment: "positive",
            quote: `Here are nearby dental clinics around **Vesa Center, Rruga Abdyl Frashëri**, so likely the most affordable and central: - **Dental Nobel** — **inside Vesa Center, 3rd floor**...`,
            competitors: ["Empire Dental Clinic – Ish-Blloku", "Denti+ Albania", "Medent Studio"],
            sourcesCited: 9,
            fullAnswer: `Affordable options nearby:\n\n- Empire Dental Clinic\n- Denti+ Albania\n- Dental Nobel — inside Vesa Center. Patients report very reasonable rates for regular checkups and preventative cleanings.`,
          },
        },
        {
          id: "q4",
          question: "Which nearby dentist is best for nervous patients?",
          category: "Persona",
          googleAi: {
            mentioned: false,
            rank: null,
            statusLabel: "Not mentioned",
            sentiment: "absent",
            quote: `For patients experiencing nervousness or dental anxiety right around the Vesa Center on Rruga Abdyl Frashëri, ÇEÇI Dental Group Clinic & Laboratory is located d...`,
            competitors: ["ÇEÇI Dental Group Clinic & Laboratory"],
            sourcesCited: 12,
            fullAnswer: `ÇEÇI Dental Group Clinic & Laboratory explicitly advertises conscious sedation protocols and relaxation techniques for dental anxiety.`,
          },
          chatGpt: {
            mentioned: true,
            rank: 11,
            statusLabel: "Mentioned · #11",
            sentiment: "neutral",
            quote: `Best nearby choice: Empire Dental Clinic: very close to Vesa Center, and specifically advertises medication-assisted relax...`,
            competitors: ["Empire Dental Clinic"],
            sourcesCited: 7,
            fullAnswer: `For nervous patients, Empire Dental Clinic advertises medication-assisted relaxation and gentle dentistry protocols. Dental Nobel also provides warm patient care.`,
          },
        },
        {
          id: "q5",
          question: "How do I find a reliable dentist nearby?",
          category: "How to",
          googleAi: {
            mentioned: false,
            rank: null,
            statusLabel: "Not mentioned",
            sentiment: "absent",
            quote: `If you are at or near Vesa Center on Rruga Abdyl Frashëri in Tirana, you are in a very central location with several highly rated dental clinics within immediat...`,
            competitors: ["Dental Tirana", "Dental Tirana.al", "Wilson Dental Center", "Tirana Dental Hospital"],
            sourcesCited: 12,
            fullAnswer: `Guide to finding a reliable dentist in central Tirana:\n\n1. Check licensing and credentials.\n2. Inquire about panoramic 3D imaging.\n3. Check clinics like Dental Tirana and Wilson Dental Center.`,
          },
          chatGpt: {
            mentioned: true,
            rank: 4,
            statusLabel: "Mentioned · #4",
            sentiment: "positive",
            quote: `From **Vesa Center, Rruga Abdyl Frashëri**, you can start with clinics on the same street: - **Nobel Clinic Tirana** — located inside **Vesa Center, 3rd floor**...`,
            competitors: ["Dental Tirana", "Empire Dental Clinic", "Elite Dental"],
            sourcesCited: 11,
            fullAnswer: `To find a reliable dentist nearby:\n\n- Start with Nobel Clinic inside Vesa Center, 3rd floor.\n- Confirm hygiene standards.\n- Read verified Google reviews.`,
          },
        },
        {
          id: "q6",
          question: "What is the best dental clinic near me?",
          category: "Best",
          googleAi: {
            mentioned: true,
            rank: 3,
            statusLabel: "Mentioned · #3",
            sentiment: "positive",
            quote: `Prominent practices in the Blloku/Vesa Center area include **Nobel Dental Clinic**, recognized for modern cosmetic and preventive treatments...`,
            competitors: ["Dental Tirana", "Wilson Dental Center"],
            sourcesCited: 8,
            fullAnswer: `Top clinics near your location:\n\n1. Dental Tirana\n2. Wilson Dental Center\n3. Nobel Dental Clinic — located directly in Vesa Center.`,
          },
          chatGpt: {
            mentioned: true,
            rank: 2,
            statusLabel: "Mentioned · #2",
            sentiment: "positive",
            quote: `If you want the best options within immediate walking distance: 1. Dental Tirana, 2. **Dental Nobel** inside Vesa Center...`,
            competitors: ["Dental Tirana", "Wilson Dental Center"],
            sourcesCited: 9,
            fullAnswer: `Top recommendations within walking distance:\n\n1. Dental Tirana\n2. Dental Nobel — inside Vesa Center, distinguished by high cleanliness ratings and gentle patient care.`,
          },
        },
        {
          id: "q7",
          question: "Can you find dentists open near me right now?",
          category: "Near me",
          googleAi: {
            mentioned: true,
            rank: 15,
            statusLabel: "Mentioned · #15 - positive",
            sentiment: "positive",
            quote: `Finding an open dental clinic right now on a Sunday in the immediate vicinity of Vesa Center presents limited options, as most standard clinics in the area are...`,
            competitors: ["Dental Tirana", "Dental Tirana.al", "Denti+ Albania", "Tirana Dental Hospital"],
            sourcesCited: 5,
            fullAnswer: `Emergency and open clinics near Vesa Center:\n\n- Nobel Dental Clinic maintains on-call availability for acute emergencies inside Vesa Center.\n- Tirana Dental Hospital emergency ward.`,
          },
          chatGpt: {
            mentioned: true,
            rank: 6,
            statusLabel: "Mentioned · #6 - positive",
            sentiment: "positive",
            quote: `It's Sunday in Tirana. Closest option at your exact location: - **Dental Nobel** — inside **Vesa Center, Rruga Abdy...`,
            competitors: ["Diamond Dental Hospital", "Mat Dental", "Duraj Dental"],
            sourcesCited: 6,
            fullAnswer: `Clinics open or on-call:\n\n- Dental Nobel — inside Vesa Center. Emergency contact available for tooth pain and dislodged restorations.\n- Diamond Dental Hospital open 24/7.`,
          },
        },
        {
          id: "q8",
          question: "What are alternatives to my current nearby dentist?",
          category: "Alternative",
          googleAi: {
            mentioned: false,
            rank: null,
            statusLabel: "Not mentioned",
            sentiment: "absent",
            quote: `If you are looking for alternative dental clinics close to the Vesa Center on Rruga Abdyl Frashëri in Tiranë, there are several highly-rated options within a ve...`,
            competitors: ["DentalCare One", "Idrizi Dental Clinic"],
            sourcesCited: 12,
            fullAnswer: `Alternative clinics located within 300 meters:\n\n- DentalCare One\n- Idrizi Dental Clinic`,
          },
          chatGpt: {
            mentioned: false,
            rank: null,
            statusLabel: "Not mentioned",
            sentiment: "absent",
            quote: `Here are good alternatives near **Vesa Center, Rruga Abdyl Frashëri, Tirana**: - **Dental Tirana** — on **Rruga Abdyl Frashëri**, about 100 m from Wilson Squar...`,
            competitors: ["Dental Tirana", "DentX Clinic – Dr. Gjergj Dilo", "Ledismile Dental Clinic", "Gaia Dental Clinic"],
            sourcesCited: 8,
            fullAnswer: `Alternative practices in the neighborhood:\n\n- Dental Tirana\n- DentX Clinic\n- Ledismile Dental Clinic\n- Gaia Dental Clinic`,
          },
        },
        {
          id: "q9",
          question: "How do patients review dentists in my area?",
          category: "Review",
          googleAi: {
            mentioned: false,
            rank: null,
            statusLabel: "Not mentioned",
            sentiment: "absent",
            quote: `Patients typically review and find information about dental clinics around the Vesa Center and Rruga Abdyl Frashëri area in Tiranë through a mix of online platf...`,
            competitors: ["ÇEÇI Dental Group Clinic & Laboratory", "Dental Tirana | Implantology & Dental Aesthetics", "Idrizi Dental Clinic"],
            sourcesCited: 3,
            fullAnswer: `Patients primarily review clinics through Google Maps, WhatClinic, and local Facebook groups.`,
          },
          chatGpt: {
            mentioned: true,
            rank: 7,
            statusLabel: "Mentioned · #7",
            sentiment: "positive",
            quote: `Near **Vesa Center, Rruga Abdyl Frashëri**, patient feedback is generally very positive, especially for: - **Dental Tirana.al** — Reviews commonly praise profe...`,
            competitors: ["Dental Tirana.al", "London Smile", "Wilson Dental Center"],
            sourcesCited: 7,
            fullAnswer: `Patient reviews praise Dental Nobel and London Smile for gentle bedside manner, punctuality, and sterile clinics.`,
          },
        },
        {
          id: "q10",
          question: "Which nearby dentists accept my insurance?",
          category: "Other",
          googleAi: {
            mentioned: false,
            rank: null,
            statusLabel: "Not mentioned",
            sentiment: "absent",
            quote: `Dental clinics in Albania generally operate on a direct-pay or out-of-pocket model rather than processing international or private health insurance provider net...`,
            competitors: ["Dental Tirana", "Dental Tirana.al", "Denti+ Albania", "Dental Tirana | Implantology & Dental Aesthetics"],
            sourcesCited: 3,
            fullAnswer: `Clinics in Albania operate on direct-pay. Itemized documentation is provided for insurance reimbursement.`,
          },
          chatGpt: {
            mentioned: false,
            rank: null,
            statusLabel: "Not mentioned",
            sentiment: "absent",
            quote: `I can't confirm a specific in-network dentist without knowing **your insurance company and plan**. In Tirana, many clinics either require payment upfront or hel...`,
            competitors: ["Dental Tirana", "Dr. Erta Dental Clinic", "Tirana Dental Hospital"],
            sourcesCited: 4,
            fullAnswer: `Most clinics require upfront settlement and provide stamped English/Italian invoices for international insurance reimbursement.`,
          },
        },
      ],
      competitors: [
        { name: "Dental Tirana", mentionsCount: 8, shareOfVoice: 40, engines: ["Google AI Mode", "ChatGPT"], categories: ["Seed", "Budget", "Best", "How to"] },
        { name: "Dental Tirana.al", mentionsCount: 5, shareOfVoice: 25, engines: ["Google AI Mode", "ChatGPT"], categories: ["Seed", "Budget", "Review"] },
        { name: "Wilson Dental Center", mentionsCount: 5, shareOfVoice: 25, engines: ["Google AI Mode", "ChatGPT"], categories: ["Seed", "Best", "How to"] },
        { name: "Dental Tirana | Implantology & Dental Aesthetics", mentionsCount: 4, shareOfVoice: 20, engines: ["Google AI Mode"], categories: ["Seed", "Comparison"] },
        { name: "Tirana Dental Hospital", mentionsCount: 4, shareOfVoice: 20, engines: ["Google AI Mode", "ChatGPT"], categories: ["Seed", "Near me", "Other"] },
        { name: "Empire Dental Clinic", mentionsCount: 4, shareOfVoice: 20, engines: ["ChatGPT"], categories: ["Seed", "Budget", "Persona"] },
        { name: "ÇEÇI Dental Group Clinic & Laboratory", mentionsCount: 2, shareOfVoice: 10, engines: ["Google AI Mode"], categories: ["Persona", "Review"] },
        { name: "DentX Clinic – Dr. Gjergj Dilo", mentionsCount: 2, shareOfVoice: 10, engines: ["ChatGPT"], categories: ["Comparison", "Alternative"] },
        { name: "Denti+ Albania", mentionsCount: 2, shareOfVoice: 10, engines: ["Google AI Mode", "ChatGPT"], categories: ["Budget", "Near me"] },
        { name: "TDA Clinic (Tirana Dental Aesthetic)", mentionsCount: 1, shareOfVoice: 5, engines: ["ChatGPT"], categories: ["Comparison"] },
        { name: "Dental Center Albania (DCA)", mentionsCount: 1, shareOfVoice: 5, engines: ["ChatGPT"], categories: ["Comparison"] },
        { name: "Idrizi Dental Clinic", mentionsCount: 2, shareOfVoice: 10, engines: ["Google AI Mode"], categories: ["Alternative", "Review"] },
        { name: "DentalCare One", mentionsCount: 1, shareOfVoice: 5, engines: ["Google AI Mode"], categories: ["Alternative"] },
        { name: "London Smile", mentionsCount: 1, shareOfVoice: 5, engines: ["ChatGPT"], categories: ["Review"] },
        { name: "Diamond Dental Hospital", mentionsCount: 1, shareOfVoice: 5, engines: ["ChatGPT"], categories: ["Near me"] },
        { name: "Mat Dental", mentionsCount: 1, shareOfVoice: 5, engines: ["ChatGPT"], categories: ["Near me"] },
        { name: "Duraj Dental", mentionsCount: 1, shareOfVoice: 5, engines: ["ChatGPT"], categories: ["Near me"] },
        { name: "Ledismile Dental Clinic", mentionsCount: 1, shareOfVoice: 5, engines: ["ChatGPT"], categories: ["Alternative"] },
        { name: "Gaia Dental Clinic", mentionsCount: 1, shareOfVoice: 5, engines: ["ChatGPT"], categories: ["Alternative"] },
        { name: "Dr. Erta Dental Clinic", mentionsCount: 1, shareOfVoice: 5, engines: ["ChatGPT"], categories: ["Other"] },
        { name: "Elite Dental", mentionsCount: 1, shareOfVoice: 5, engines: ["ChatGPT"], categories: ["How to"] },
        { name: "Medent Studio", mentionsCount: 1, shareOfVoice: 5, engines: ["ChatGPT"], categories: ["Budget"] },
        { name: "Albanian Dental Tourism", mentionsCount: 1, shareOfVoice: 5, engines: ["ChatGPT"], categories: ["Seed"] },
        { name: "Klinika Dentare Blloku", mentionsCount: 1, shareOfVoice: 5, engines: ["Google AI Mode"], categories: ["Seed"] },
      ],
      referrals: [
        { domain: "maps.google.com", title: "Google Local Maps / Places", citationsCount: 16, category: "Maps", status: "linked" },
        { domain: "tripadvisor.com", title: "Tripadvisor Medical & Dental Tourism", citationsCount: 9, category: "Reviews", status: "linked" },
        { domain: "whatclinic.com", title: "WhatClinic Global Healthcare Directory", citationsCount: 7, category: "Directory", status: "missing" },
        { domain: "dentaltourismofficial.com", title: "Albanian Dental Tourism Association Guide", citationsCount: 5, category: "Industry Guide", status: "missing" },
        { domain: "yellowpages.al", title: "Faqet e Verdha Albania Local Directory", citationsCount: 4, category: "Directory", status: "linked" },
      ],
      contentGaps: [
        {
          topic: "Sedation dentistry & dental anxiety protocols",
          category: "Persona",
          impact: "HIGH",
          description: "ChatGPT and Google AI Mode favored Empire Dental Clinic and ÇEÇI Dental Group because they explicitly advertise medication-assisted relaxation and nitrous oxide. Your website does not mention dental anxiety or sedation.",
          recommendation: "Create a dedicated 'Gentle & Sedation Dentistry for Anxious Patients' service page with FAQ Schema markup.",
          competitorsCovering: ["Empire Dental Clinic", "ÇEÇI Dental Group"],
        },
        {
          topic: "Insurance reimbursement & direct billing explanation",
          category: "Other",
          impact: "HIGH",
          description: "Both AI engines answered that clinics in this city only accept direct out-of-pocket payment because no explicit insurance guidance was indexed on your website.",
          recommendation: "Publish an 'Insurance, Financing & International Claims' page detailing itemized invoice assistance for Bupa, Cigna, and Allianz.",
          competitorsCovering: ["Dental Tirana", "Dr. Erta Dental Clinic"],
        },
        {
          topic: "Real-time emergency & weekend hours indexing",
          category: "Near me",
          impact: "HIGH",
          description: "When asked about clinics open 'right now', Google AI Mode prioritized competitors with explicit OpeningHoursSpecification schema and active Sunday hours.",
          recommendation: "Add OpeningHoursSpecification JSON-LD schema with special emergency on-call contact details to your homepage.",
          competitorsCovering: ["Tirana Dental Hospital", "Diamond Dental Hospital"],
        },
        {
          topic: "Transparent price list & affordable care packages",
          category: "Budget",
          impact: "MEDIUM",
          description: "Google AI Mode ranked Dental Tirana.al and Dental Tirana for budget queries due to their published price ranges for cleanings and fillings.",
          recommendation: "Publish starting price ranges or package consultation pricing on your website to qualify for 'Affordable' customer queries.",
          competitorsCovering: ["Dental Tirana", "Dental Tirana.al"],
        },
        {
          topic: "Comparison guide vs. other regional clinics",
          category: "Comparison",
          impact: "MEDIUM",
          description: "AI engines rely on comparative review sentiment. Competitors have hundreds of structured patient review keywords mentioning hygiene and painless procedures.",
          recommendation: "Add structured Review / AggregateRating schema to highlight 5-star patient testimonials directly on the site.",
          competitorsCovering: ["Dental Tirana | Implantology & Dental Aesthetics", "TDA Clinic"],
        },
        {
          topic: "Dental tourism & airport transfer assistance",
          category: "Seed",
          impact: "MEDIUM",
          description: "AI engines cite WhatClinic and regional directories for foreign patients visiting the city.",
          recommendation: "Claim and optimize your WhatClinic and DentalTourism profile with matching NAP (Name, Address, Phone).",
          competitorsCovering: ["Dental Tirana.al", "Dental Center Albania"],
        },
        {
          topic: "Doctor credentials & university specialist profiles",
          category: "How to",
          impact: "LOW",
          description: "When answering 'How do I find a reliable provider', AI models look for verified clinician degrees and continuous education certifications.",
          recommendation: "Add individual 'Doctor Profile' pages with Person schema, medical license numbers, and international certifications.",
          competitorsCovering: ["Dental Tirana", "Wilson Dental Center"],
        },
        {
          topic: "Pediatric & family dental care guidelines",
          category: "Persona",
          impact: "LOW",
          description: "AI queries frequently look for child-friendly amenities and pediatric specialist designations.",
          recommendation: "Add a 'Family & Children Dentistry' section highlighting friendly staff and preventative fluoride treatments.",
          competitorsCovering: ["Wilson Dental Center", "Medent Studio"],
        },
      ],
    };
  }, [latest, business]);

  // Set all questions expanded by default when report loads
  useEffect(() => {
    if (reportData.questions && reportData.questions.length > 0) {
      const exp: Record<string, boolean> = {};
      for (const q of reportData.questions) {
        exp[q.id] = true;
      }
      setExpandedQuestions(exp);
    }
  }, [reportData.questions]);

  const toggleQuestion = (id: string) => {
    setExpandedQuestions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const exp: Record<string, boolean> = {};
    for (const q of reportData.questions) {
      exp[q.id] = true;
    }
    setExpandedQuestions(exp);
  };

  const collapseAll = () => {
    setExpandedQuestions({});
  };

  async function handleRunProbe(customQuery?: string) {
    setBusy(true);
    try {
      await apiFetch("/ai-reports", {
        method: "POST",
        body: JSON.stringify({ query: customQuery }),
      });
      await refresh();
      setNewSearchModalOpen(false);
      setSearchQueryInput("");
    } finally {
      setBusy(false);
    }
  }

  const filteredCompetitors = useMemo(() => {
    if (!reportData.competitors) return [];
    if (!compSearch.trim()) return reportData.competitors;
    return reportData.competitors.filter((c) =>
      c.name.toLowerCase().includes(compSearch.toLowerCase())
    );
  }, [reportData.competitors, compSearch]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-zinc-950 text-[#1C1917] dark:text-zinc-100 font-sans pb-24">
      {/* Top Bar Navigation */}
      <header className="sticky top-0 z-30 border-b border-[#EFE8DE] dark:border-zinc-800/80 bg-[#FAF7F2]/90 dark:bg-zinc-950/90 backdrop-blur-md px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-[#8A5333] dark:text-amber-400 hover:text-[#6D3F24] transition flex items-center gap-1.5"
          >
            ‹ Back to AI Tools
          </Link>

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8A5333] text-white font-black text-sm shadow-sm">
              G
            </div>
          </div>

          <div className="relative flex items-center" ref={notificationRef}>
            <button
              type="button"
              onClick={() => setNotificationsOpen((prev) => !prev)}
              className="relative p-1.5 rounded-lg text-[#8A5333] dark:text-zinc-400 hover:text-[#5B3722] hover:bg-[#F2E8DC]/60 dark:hover:bg-zinc-800 transition cursor-pointer"
              title="Notifications"
              aria-label="View notifications"
              aria-expanded={notificationsOpen}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs animate-in zoom-in-50">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover Dropdown */}
            {notificationsOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                role="dialog"
                aria-label="Notifications"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#EFE8DE] dark:border-zinc-800/80 bg-[#FCFAF7] dark:bg-zinc-950/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1C1917] dark:text-white">
                      Notifications
                    </span>
                    {unreadCount > 0 ? (
                      <span className="rounded-full bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.2 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                        {unreadCount} unread
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        All read
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllAsRead}
                        className="text-[11px] font-semibold text-[#8A5333] dark:text-amber-400 hover:underline cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-[#78716C] hover:text-[#1C1917] dark:hover:text-white p-1 rounded-md transition cursor-pointer"
                      aria-label="Close notifications"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="max-h-80 overflow-y-auto divide-y divide-[#EFE8DE]/60 dark:divide-zinc-800/60">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center space-y-2">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                      <p className="text-xs font-medium text-[#1C1917] dark:text-zinc-200">
                        No notifications
                      </p>
                      <p className="text-[11px] text-[#78716C] dark:text-zinc-400">
                        You're all caught up with your AI visibility alerts.
                      </p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3.5 flex items-start gap-3 transition cursor-pointer ${
                          notif.read
                            ? "hover:bg-[#FCFAF7] dark:hover:bg-zinc-800/40 opacity-75"
                            : "bg-[#FDFBF7] dark:bg-zinc-900/90 hover:bg-[#F8F3EB] dark:hover:bg-zinc-800/70"
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                            notif.type === "warning"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : notif.type === "info"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          }`}
                        >
                          {notif.type === "warning" && <AlertTriangle className="h-3.5 w-3.5" />}
                          {notif.type === "info" && <Sparkles className="h-3.5 w-3.5" />}
                          {notif.type === "success" && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </div>

                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center justify-between gap-1">
                            <h4
                              className={`text-xs font-semibold truncate ${
                                notif.read
                                  ? "text-[#57534E] dark:text-zinc-300"
                                  : "text-[#1C1917] dark:text-white font-bold"
                              }`}
                            >
                              {notif.title}
                            </h4>
                            <span className="text-[10px] text-[#78716C] dark:text-zinc-400 shrink-0">
                              {notif.time}
                            </span>
                          </div>

                          <p className="text-[11px] text-[#57534E] dark:text-zinc-300 line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>

                          {notif.tab && (
                            <div className="pt-1 flex items-center gap-1 text-[10px] font-semibold text-[#8A5333] dark:text-amber-400">
                              <span>
                                {notif.tab === "gaps" && "View Content Gaps"}
                                {notif.tab === "competitors" && "Inspect Competitors"}
                                {notif.tab === "questions" && "View Answers"}
                              </span>
                              <ArrowRight className="h-3 w-3" />
                            </div>
                          )}
                        </div>

                        {!notif.read && (
                          <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#8A5333] dark:bg-amber-400" />
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="px-4 py-2 bg-[#FCFAF7] dark:bg-zinc-950/40 border-t border-[#EFE8DE] dark:border-zinc-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-[#78716C] dark:text-zinc-400">
                      AI Visibility Monitor
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAllAsRead();
                      }}
                      className="text-[#8A5333] dark:text-amber-400 hover:underline font-medium cursor-pointer"
                    >
                      Clear unread
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 sm:px-8 pt-6 space-y-6">
        {/* Beta Banner */}
        <div className="rounded-xl border border-[#F6DEBB] dark:border-amber-900/50 bg-[#FEF9EE] dark:bg-amber-950/20 px-4 py-2.5 flex items-center gap-3 text-xs text-[#8A5333] dark:text-amber-300 shadow-sm">
          <span className="rounded-full bg-[#C2410C] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
            BETA
          </span>
          <span className="font-medium">
            This tool is in beta and the results can vary.
          </span>
        </div>

        {/* Action / Title Section */}
        <div className="space-y-1.5 pt-1">
          <button
            onClick={() => {
              setSearchQueryInput(reportData.targetQuery.replace(/^["']|["']$/g, ""));
              setNewSearchModalOpen(true);
            }}
            className="text-xs font-semibold text-[#8A5333] dark:text-amber-400 hover:underline flex items-center gap-1"
          >
            ← New search
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C1917] dark:text-white">
            Your visibility report
          </h1>
          <p className="text-xs text-[#78716C] dark:text-zinc-400">
            Business and intent are locked for this report. Start a fresh run with{" "}
            <button
              onClick={() => setNewSearchModalOpen(true)}
              className="font-semibold text-[#8A5333] dark:text-amber-400 hover:underline inline"
            >
              ← New search
            </button>
            .
          </p>
        </div>

        {/* Step 1 & Step 2 Setup Card */}
        <div className="rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 sm:p-6 space-y-5 shadow-xs">
          {/* STEP 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded bg-[#F5EBE1] dark:bg-amber-950/40 border border-[#E8DFD3] dark:border-amber-900/50 px-1.5 py-0.5 text-[10px] font-bold text-[#7A4B2A] dark:text-amber-300 uppercase tracking-wider">
                STEP 1
              </span>
              <span className="text-xs font-bold text-[#1C1917] dark:text-zinc-200">
                Your business
              </span>
            </div>

            <div className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#8A5333] text-white font-bold text-base shadow-sm">
                  {reportData.businessInfo.initials || "ND"}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1C1917] dark:text-white leading-snug">
                    {reportData.businessInfo.name}
                  </h3>
                  <p className="text-xs text-[#78716C] dark:text-zinc-400">
                    {reportData.businessInfo.address}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {reportData.businessInfo.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-[#F2E8DC] dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-[#7A4B2A] dark:text-amber-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded bg-[#F5EBE1] dark:bg-amber-950/40 border border-[#E8DFD3] dark:border-amber-900/50 px-1.5 py-0.5 text-[10px] font-bold text-[#7A4B2A] dark:text-amber-300 uppercase tracking-wider">
                STEP 2
              </span>
              <span className="text-xs font-bold text-[#1C1917] dark:text-zinc-200">
                What should customers find you for?
              </span>
            </div>

            <div className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950/60 px-4 py-3 font-medium text-xs sm:text-sm text-[#1C1917] dark:text-zinc-200">
              {reportData.targetQuery}
            </div>
          </div>
        </div>

        {/* Executive Summary Card */}
        <div className="rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 sm:p-6 space-y-4 shadow-xs">
          <h2 className="text-base sm:text-lg font-bold text-[#1C1917] dark:text-white tracking-tight leading-snug">
            {reportData.headline}
          </h2>

          <p className="text-xs sm:text-sm text-[#78716C] dark:text-zinc-300 leading-relaxed">
            We asked{" "}
            <strong className="font-semibold text-[#1C1917] dark:text-white">
              {reportData.questions.length || 10} real questions
            </strong>{" "}
            about {reportData.targetQuery} on 2 AI engines.{" "}
            {reportData.businessInfo.name} appeared in{" "}
            <strong className="font-semibold text-[#1C1917] dark:text-white">
              {reportData.engineStats.googleAi.mentionedCount +
                reportData.engineStats.chatGpt.mentionedCount}{" "}
              of{" "}
              {(reportData.questions.length || 10) * 2} answers
            </strong>{" "}
            —{" "}
            <strong className="font-semibold text-[#1C1917] dark:text-white">
              {Math.round(
                ((reportData.engineStats.googleAi.mentionedCount +
                  reportData.engineStats.chatGpt.mentionedCount) /
                  ((reportData.questions.length || 10) * 2)) *
                  100
              )}
              % visibility
            </strong>
            . There are{" "}
            <strong className="font-semibold text-[#1C1917] dark:text-white">
              {reportData.contentGaps.length || 8} topics
            </strong>{" "}
            your site does not cover yet — see the{" "}
            <button
              onClick={() => setActiveTab("gaps")}
              className="font-semibold text-[#8A5333] dark:text-amber-400 hover:underline"
            >
              Content gaps
            </button>{" "}
            tab.
          </p>

          {/* Side by side Engine Progress Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
            {/* Google AI Mode */}
            <div className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950/60 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1C1917] dark:text-white">
                <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                <span>Google AI Mode</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-extrabold text-[#1C1917] dark:text-white tracking-tight">
                  {reportData.engineStats.googleAi.percentage}%
                </span>
                <span className="text-xs text-[#78716C] dark:text-zinc-400">
                  · {reportData.engineStats.googleAi.mentionedCount} of{" "}
                  {reportData.engineStats.googleAi.totalCount} answers
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-blue-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-700"
                  style={{ width: `${reportData.engineStats.googleAi.percentage}%` }}
                />
              </div>
            </div>

            {/* ChatGPT */}
            <div className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950/60 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1C1917] dark:text-white">
                <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                <span>ChatGPT</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-extrabold text-[#1C1917] dark:text-white tracking-tight">
                  {reportData.engineStats.chatGpt.percentage}%
                </span>
                <span className="text-xs text-[#78716C] dark:text-zinc-400">
                  · {reportData.engineStats.chatGpt.mentionedCount} of{" "}
                  {reportData.engineStats.chatGpt.totalCount} answers
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-emerald-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-700"
                  style={{ width: `${reportData.engineStats.chatGpt.percentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div id="tabs-section" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#EFE8DE] dark:border-zinc-800 pb-2">
            <button
              onClick={() => setActiveTab("questions")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === "questions"
                  ? "bg-white dark:bg-zinc-900 border border-[#DECDBB] dark:border-zinc-700 text-[#1C1917] dark:text-white shadow-xs"
                  : "text-[#78716C] dark:text-zinc-400 hover:text-[#1C1917] hover:bg-[#F2E8DC]/50 dark:hover:bg-zinc-900/50"
              }`}
            >
              <span>Every question we checked</span>
              <span
                className={`rounded-full px-2 py-0.2 text-[11px] font-bold ${
                  activeTab === "questions"
                    ? "bg-[#8A5333] text-white"
                    : "bg-[#EAE0D3] dark:bg-zinc-800 text-[#7A4B2A] dark:text-zinc-300"
                }`}
              >
                {reportData.questions.length || 10}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("competitors")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === "competitors"
                  ? "bg-white dark:bg-zinc-900 border border-[#DECDBB] dark:border-zinc-700 text-[#1C1917] dark:text-white shadow-xs"
                  : "text-[#78716C] dark:text-zinc-400 hover:text-[#1C1917] hover:bg-[#F2E8DC]/50 dark:hover:bg-zinc-900/50"
              }`}
            >
              <span>Other competitors mentioned</span>
              <span
                className={`rounded-full px-2 py-0.2 text-[11px] font-bold ${
                  activeTab === "competitors"
                    ? "bg-[#8A5333] text-white"
                    : "bg-[#EAE0D3] dark:bg-zinc-800 text-[#7A4B2A] dark:text-zinc-300"
                }`}
              >
                {reportData.competitors.length || 24}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("referrals")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === "referrals"
                  ? "bg-white dark:bg-zinc-900 border border-[#DECDBB] dark:border-zinc-700 text-[#1C1917] dark:text-white shadow-xs"
                  : "text-[#78716C] dark:text-zinc-400 hover:text-[#1C1917] hover:bg-[#F2E8DC]/50 dark:hover:bg-zinc-900/50"
              }`}
            >
              <span>Top referrals</span>
              <span
                className={`rounded-full px-2 py-0.2 text-[11px] font-bold ${
                  activeTab === "referrals"
                    ? "bg-[#8A5333] text-white"
                    : "bg-[#EAE0D3] dark:bg-zinc-800 text-[#7A4B2A] dark:text-zinc-300"
                }`}
              >
                {reportData.referrals.length || 5}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("gaps")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === "gaps"
                  ? "bg-white dark:bg-zinc-900 border border-[#DECDBB] dark:border-zinc-700 text-[#1C1917] dark:text-white shadow-xs"
                  : "text-[#78716C] dark:text-zinc-400 hover:text-[#1C1917] hover:bg-[#F2E8DC]/50 dark:hover:bg-zinc-900/50"
              }`}
            >
              <span>Content gaps</span>
              <span
                className={`rounded-full px-2 py-0.2 text-[11px] font-bold ${
                  activeTab === "gaps"
                    ? "bg-[#8A5333] text-white"
                    : "bg-[#EAE0D3] dark:bg-zinc-800 text-[#7A4B2A] dark:text-zinc-300"
                }`}
              >
                {reportData.contentGaps.length || 8}
              </span>
            </button>
          </div>

          {/* TAB 1: Questions List */}
          {activeTab === "questions" && (
            <div className="rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900/60 overflow-hidden shadow-xs">
              {/* Header row */}
              <div className="border-b border-[#EBE3D5] dark:border-zinc-800 bg-[#FAF7F2] dark:bg-zinc-950/80 px-5 py-3">
                <div className="text-[11px] text-[#78716C] dark:text-zinc-400 mb-1">
                  10 questions × 2 engines
                </div>
                <div className="grid grid-cols-12 text-[10px] font-bold tracking-wider text-[#78716C] dark:text-zinc-400 uppercase">
                  <div className="col-span-8 sm:col-span-9 flex items-center justify-between pr-4">
                    <span>QUESTION (DETAILS OPEN WHEN READY · CLICK ROW TO COLLAPSE)</span>
                    <div className="flex gap-2">
                      <button
                        onClick={expandAll}
                        className="text-[10px] lowercase text-[#8A5333] dark:text-amber-400 hover:underline"
                      >
                        expand all
                      </button>
                      <span>·</span>
                      <button
                        onClick={collapseAll}
                        className="text-[10px] lowercase text-[#8A5333] dark:text-amber-400 hover:underline"
                      >
                        collapse
                      </button>
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-1.5 text-center">
                    GOOGLE AI MODE
                  </div>
                  <div className="col-span-2 sm:col-span-1.5 text-center">
                    CHATGPT
                  </div>
                </div>
              </div>

              {/* Questions table list */}
              <div className="divide-y divide-[#EFE8DE] dark:divide-zinc-800/80">
                {reportData.questions.map((q) => {
                  const isExpanded = !!expandedQuestions[q.id];

                  return (
                    <div key={q.id} className="transition-colors hover:bg-[#FDFCFB] dark:hover:bg-zinc-900/30">
                      {/* Summary Row */}
                      <div
                        onClick={() => toggleQuestion(q.id)}
                        className="grid grid-cols-12 px-5 py-4 cursor-pointer select-none items-center"
                      >
                        <div className="col-span-8 sm:col-span-9 pr-4 space-y-0.5">
                          <h4 className="text-sm font-bold text-[#1C1917] dark:text-white flex items-center gap-2">
                            {q.question}
                          </h4>
                          <span className="text-[11px] font-medium text-[#78716C] dark:text-zinc-400">
                            {q.category}
                          </span>
                        </div>

                        {/* Google AI Indicator */}
                        <div className="col-span-2 sm:col-span-1.5 flex justify-center">
                          {q.googleAi.mentioned ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-base">
                              ✓
                            </span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400 font-bold text-base">
                              —
                            </span>
                          )}
                        </div>

                        {/* ChatGPT Indicator */}
                        <div className="col-span-2 sm:col-span-1.5 flex justify-center">
                          {q.chatGpt.mentioned ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-base">
                              ✓
                            </span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400 font-bold text-base">
                              —
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expanded Comparison Detail */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-1">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Google AI Mode Box */}
                            <div className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3 relative overflow-hidden shadow-2xs">
                              <div className="h-0.5 w-full bg-blue-500 absolute top-0 left-0"></div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1C1917] dark:text-white">
                                  <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                                  <span>Google AI Mode</span>
                                </div>
                              </div>

                              <div>
                                <span
                                  className={`text-xs font-bold ${
                                    q.googleAi.mentioned
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-rose-600 dark:text-rose-400"
                                  }`}
                                >
                                  {q.googleAi.statusLabel}
                                </span>
                              </div>

                              <p className="text-xs italic text-[#57534E] dark:text-zinc-300 leading-relaxed">
                                "{q.googleAi.quote}"
                              </p>

                              {q.googleAi.competitors && q.googleAi.competitors.length > 0 && (
                                <div className="space-y-1.5 pt-1">
                                  <span className="text-[11px] font-medium text-[#78716C] dark:text-zinc-400">
                                    Other competitors:
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {q.googleAi.competitors.map((comp) => (
                                      <span
                                        key={comp}
                                        className="rounded-full border border-[#DECDBB] dark:border-zinc-700 bg-[#FCFAF7] dark:bg-zinc-900 px-2.5 py-0.5 text-[10px] font-medium text-[#7A4B2A] dark:text-amber-200"
                                      >
                                        {comp}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="pt-2 border-t border-[#F2E8DC] dark:border-zinc-800/80 flex items-center justify-between text-xs">
                                <span className="text-[11px] text-[#78716C] dark:text-zinc-400">
                                  {q.googleAi.sourcesCited ?? 6} sources cited
                                </span>
                                <button
                                  onClick={() =>
                                    setSelectedAnswerModal({
                                      engine: "Google AI Mode",
                                      question: q.question,
                                      detail: q.googleAi,
                                    })
                                  }
                                  className="text-xs font-semibold text-[#8A5333] dark:text-amber-400 hover:underline"
                                >
                                  View full answer
                                </button>
                              </div>
                            </div>

                            {/* ChatGPT Box */}
                            <div className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3 relative overflow-hidden shadow-2xs">
                              <div className="h-0.5 w-full bg-emerald-500 absolute top-0 left-0"></div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1C1917] dark:text-white">
                                  <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                                  <span>ChatGPT</span>
                                </div>
                              </div>

                              <div>
                                <span
                                  className={`text-xs font-bold ${
                                    q.chatGpt.mentioned
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-rose-600 dark:text-rose-400"
                                  }`}
                                >
                                  {q.chatGpt.statusLabel}
                                </span>
                              </div>

                              <p className="text-xs italic text-[#57534E] dark:text-zinc-300 leading-relaxed">
                                "{q.chatGpt.quote}"
                              </p>

                              {q.chatGpt.competitors && q.chatGpt.competitors.length > 0 && (
                                <div className="space-y-1.5 pt-1">
                                  <span className="text-[11px] font-medium text-[#78716C] dark:text-zinc-400">
                                    Other competitors:
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {q.chatGpt.competitors.map((comp) => (
                                      <span
                                        key={comp}
                                        className="rounded-full border border-[#DECDBB] dark:border-zinc-700 bg-[#FCFAF7] dark:bg-zinc-900 px-2.5 py-0.5 text-[10px] font-medium text-[#7A4B2A] dark:text-amber-200"
                                      >
                                        {comp}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="pt-2 border-t border-[#F2E8DC] dark:border-zinc-800/80 flex items-center justify-between text-xs">
                                <span className="text-[11px] text-[#78716C] dark:text-zinc-400">
                                  {q.chatGpt.sourcesCited ?? 8} sources cited
                                </span>
                                <button
                                  onClick={() =>
                                    setSelectedAnswerModal({
                                      engine: "ChatGPT",
                                      question: q.question,
                                      detail: q.chatGpt,
                                    })
                                  }
                                  className="text-xs font-semibold text-[#8A5333] dark:text-amber-400 hover:underline"
                                >
                                  View full answer
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Other Competitors Mentioned */}
          {activeTab === "competitors" && (
            <div className="rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-[#1C1917] dark:text-white">
                    Competitors Cited by AI Engines ({reportData.competitors.length})
                  </h3>
                  <p className="text-xs text-[#78716C] dark:text-zinc-400 mt-0.5">
                    Local businesses recommended alongside or ahead of your brand across all evaluated prompts.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#78716C]" />
                  <input
                    type="text"
                    value={compSearch}
                    onChange={(e) => setCompSearch(e.target.value)}
                    placeholder="Filter competitors…"
                    className="w-full rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950 pl-8 pr-3 py-1.5 text-xs text-[#1C1917] dark:text-zinc-200 placeholder:text-[#A8A29E] focus:outline-hidden focus:ring-1 focus:ring-[#8A5333]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#EFE8DE] dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-[#78716C] dark:text-zinc-400">
                      <th className="pb-3 pr-4 font-bold">Competitor Business</th>
                      <th className="pb-3 px-4 font-bold">Mentions</th>
                      <th className="pb-3 px-4 font-bold">Share of Voice</th>
                      <th className="pb-3 px-4 font-bold">Engines Cited</th>
                      <th className="pb-3 pl-4 font-bold">Winning Categories</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2E8DC] dark:divide-zinc-800/80">
                    {filteredCompetitors.map((comp, idx) => (
                      <tr key={comp.name} className="hover:bg-[#FCFAF7] dark:hover:bg-zinc-950/40">
                        <td className="py-3.5 pr-4 font-bold text-[#1C1917] dark:text-white">
                          <span className="text-[11px] font-normal text-[#78716C] dark:text-zinc-500 mr-2">
                            #{idx + 1}
                          </span>
                          {comp.name}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-[#57534E] dark:text-zinc-300">
                          {comp.mentionsCount} of 20 answers
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#1C1917] dark:text-white w-8">
                              {comp.shareOfVoice}%
                            </span>
                            <div className="h-1.5 w-16 rounded-full bg-[#EAE0D3] dark:bg-zinc-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#8A5333] dark:bg-amber-400"
                                style={{ width: `${Math.min(comp.shareOfVoice * 2, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex gap-1.5">
                            {comp.engines.map((eng) => (
                              <span
                                key={eng}
                                className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                  eng === "ChatGPT"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                    : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                }`}
                              >
                                {eng}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 pl-4">
                          <div className="flex flex-wrap gap-1">
                            {comp.categories.slice(0, 3).map((cat) => (
                              <span
                                key={cat}
                                className="rounded bg-[#F5EBE1] dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-[#7A4B2A] dark:text-zinc-300"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Top Referrals */}
          {activeTab === "referrals" && (
            <div className="rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 space-y-5 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-[#1C1917] dark:text-white">
                  Top AI Knowledge Sources & Citations
                </h3>
                <p className="text-xs text-[#78716C] dark:text-zinc-400 mt-0.5">
                  The primary external domains and directory profiles cited by Google AI Mode and ChatGPT when verifying local business recommendations.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {reportData.referrals.map((ref) => (
                  <div
                    key={ref.domain}
                    className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950 p-4 space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-[#F2E8DC] dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-[#7A4B2A] dark:text-amber-300">
                        {ref.category}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          ref.status === "linked"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                        }`}
                      >
                        {ref.status === "linked" ? "Profile Verified" : "Missing / Unclaimed"}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-[#1C1917] dark:text-white">
                        {ref.title}
                      </h4>
                      <p className="text-xs text-[#78716C] dark:text-zinc-400 font-mono mt-0.5">
                        {ref.domain}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#F2E8DC] dark:border-zinc-800 flex items-center justify-between text-xs">
                      <span className="text-[#78716C] dark:text-zinc-400">Total Citations:</span>
                      <span className="font-extrabold text-[#1C1917] dark:text-white text-sm">
                        {ref.citationsCount} references
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Content Gaps */}
          {activeTab === "gaps" && (
            <div className="rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 space-y-5 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-[#1C1917] dark:text-white">
                  Identified Content & Schema Gaps ({reportData.contentGaps.length})
                </h3>
                <p className="text-xs text-[#78716C] dark:text-zinc-400 mt-0.5">
                  High-intent queries where competitors were chosen over your brand due to missing website content, structured FAQs, or schema markup.
                </p>
              </div>

              <div className="space-y-4">
                {reportData.contentGaps.map((gap, idx) => (
                  <div
                    key={gap.topic}
                    className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950 p-5 space-y-3 shadow-2xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#8A5333] dark:text-amber-400">
                          #{idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-[#1C1917] dark:text-white">
                          {gap.topic}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[#F2E8DC] dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-[#7A4B2A] dark:text-zinc-300">
                          Category: {gap.category}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            gap.impact === "HIGH"
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200"
                              : gap.impact === "MEDIUM"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200"
                          }`}
                        >
                          {gap.impact} IMPACT
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[#57534E] dark:text-zinc-300 leading-relaxed">
                      {gap.description}
                    </p>

                    <div className="rounded-lg bg-white dark:bg-zinc-900 border border-[#EBE3D5] dark:border-zinc-800 p-3 text-xs space-y-1">
                      <div className="font-semibold text-[#8A5333] dark:text-amber-400 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        Recommended Action:
                      </div>
                      <p className="text-[#1C1917] dark:text-zinc-200">
                        {gap.recommendation}
                      </p>
                    </div>

                    {gap.competitorsCovering.length > 0 && (
                      <div className="flex items-center gap-2 text-[11px] text-[#78716C] dark:text-zinc-400 pt-1">
                        <span>Competitors winning this topic:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {gap.competitorsCovering.map((c) => (
                            <span
                              key={c}
                              className="rounded bg-[#F2E8DC] dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-[#7A4B2A] dark:text-amber-300"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Search Intent Modal */}
      {newSearchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1C1917] dark:text-white">
                Run Fresh Visibility Scan
              </h3>
              <button
                onClick={() => setNewSearchModalOpen(false)}
                className="text-[#78716C] hover:text-[#1C1917] dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-[#78716C] dark:text-zinc-400 leading-relaxed">
              Define the customer intent keyword to benchmark against Google AI Mode and ChatGPT across 10 discovery questions.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#1C1917] dark:text-zinc-200">
                Target Search Intent:
              </label>
              <input
                type="text"
                value={searchQueryInput}
                onChange={(e) => setSearchQueryInput(e.target.value)}
                placeholder='e.g. "dentist near me", "dental implants in Tirana"'
                className="w-full rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950 px-3.5 py-2.5 text-xs text-[#1C1917] dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-[#8A5333]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setNewSearchModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-[#78716C] hover:bg-[#F2E8DC] dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRunProbe(searchQueryInput)}
                disabled={busy}
                className="rounded-xl bg-[#8A5333] hover:bg-[#724124] text-white px-4 py-2 text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                {busy ? "Running Scan…" : "Run Visibility Probe"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Full Answer Modal */}
      {selectedAnswerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      selectedAnswerModal.engine === "ChatGPT" ? "bg-emerald-600" : "bg-blue-600"
                    }`}
                  ></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#78716C] dark:text-zinc-400">
                    {selectedAnswerModal.engine}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#1C1917] dark:text-white mt-1">
                  {selectedAnswerModal.question}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAnswerModal(null)}
                className="text-[#78716C] hover:text-[#1C1917] dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  selectedAnswerModal.detail.mentioned
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                }`}
              >
                {selectedAnswerModal.detail.statusLabel}
              </span>
              <span className="text-xs text-[#78716C] dark:text-zinc-400">
                · {selectedAnswerModal.detail.sourcesCited ?? 8} sources verified
              </span>
            </div>

            <div className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950 p-4">
              <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-[#1C1917] dark:text-zinc-200 whitespace-pre-wrap font-sans">
                {selectedAnswerModal.detail.fullAnswer}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAnswerModal(null)}
                className="rounded-xl bg-[#8A5333] hover:bg-[#724124] text-white px-4 py-2 text-xs font-bold transition"
              >
                Close Answer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}