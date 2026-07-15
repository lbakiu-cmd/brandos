"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

type Step = "organization" | "selector" | "business" | "workspace";

type Organization = {
  id: string;
  name: string;
  slug: string;
};

type Business = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  category: string | null;
  country: string | null;
  city: string | null;
};

type Website = {
  id: string;
  businessId: string;
  url: string;
  normalizedUrl: string;
  domain: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

type WebsiteCrawl = {
  id: string;
  websiteId: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  metadata: CrawlMetadata | null;
  createdAt: string;
  updatedAt: string;
};

type GoogleBusinessProfile = {
  id: string;
  businessId: string;
  profileUrl: string;
  placeId: string | null;
  businessName: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  websiteUrl: string | null;
  status: "NOT_CONNECTED" | "MANUAL_CONNECTED" | "VERIFIED";
  createdAt: string;
  updatedAt: string;
};

type SocialProfilePlatform =
  "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "LINKEDIN" | "YOUTUBE" | "X" | "OTHER";

type SocialProfile = {
  id: string;
  businessId: string;
  platform: SocialProfilePlatform;
  profileUrl: string;
  handle: string | null;
  displayName: string | null;
  status: "MANUAL_CONNECTED" | "VERIFIED" | "DISCONNECTED";
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

type WebsiteAuditFinding = {
  id: string;
  websiteId: string;
  crawlId: string | null;
  category: "TECHNICAL" | "CONTENT" | "SCHEMA" | "LOCAL_SEO" | "AI_VISIBILITY";
  severity: "INFO" | "LOW" | "MEDIUM" | "HIGH";
  status: "OPEN" | "RESOLVED" | "IGNORED";
  code: string;
  title: string;
  description: string;
  recommendation: string | null;
  evidence: unknown;
  createdAt: string;
  updatedAt: string;
};

type VisibilityBreakdownSection = {
  key: string;
  label: string;
  earned: number;
  possible: number;
  details: Record<string, unknown>;
};

type BusinessVisibilityScore = {
  id: string;
  businessId: string;
  score: number;
  grade: string | null;
  summary: string | null;
  inputs: {
    rawScore?: number;
    cappedScore?: number;
    finalScore?: number;
    capAdjustment?: number;
    isMvpCapped?: boolean;
    mvpScoreCap?: number;
    advancedVisibilityChecksAvailable?: boolean;
  } | null;
  breakdown: Record<string, VisibilityBreakdownSection>;
  calculatedAt: string;
  createdAt: string;
  updatedAt: string;
};

type BusinessRecommendation = {
  id: string;
  businessId: string;
  sourceType:
    | "WEBSITE"
    | "GOOGLE_BUSINESS"
    | "SOCIAL"
    | "AUDIT_FINDING"
    | "AI_VISIBILITY";
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "OPEN" | "DONE" | "IGNORED";
  code: string;
  title: string;
  description: string;
  impact: string | null;
  actionLabel: string | null;
  evidence: unknown;
  createdAt: string;
  updatedAt: string;
};

type RecommendationStatusFilter = BusinessRecommendation["status"];

type CrawlMetadata = {
  finalUrl: string;
  httpStatus: number;
  pageTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  robotsMeta: string | null;
  language: string | null;
  h1Count: number;
  h1Texts: string[];
  schemaTypes: string[];
  fetchedAt: string;
  responseContentType: string | null;
};

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
    statusCode?: number;
  };
};

type OrganizationForm = {
  name: string;
  slug: string;
};

type BusinessForm = {
  name: string;
  slug: string;
  websiteUrl: string;
  category: string;
  country: string;
  city: string;
};

type WebsiteForm = {
  url: string;
};

type GoogleBusinessProfileForm = {
  profileUrl: string;
  businessName: string;
  address: string;
  city: string;
  country: string;
  phone: string;
};

type SocialProfileForm = {
  platform: SocialProfilePlatform;
  profileUrl: string;
  handle: string;
  displayName: string;
};

const selectedOrganizationStorageKey = "brandos.selectedOrganizationId";
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const initialOrganizationForm: OrganizationForm = {
  name: "",
  slug: "",
};

const initialBusinessForm: BusinessForm = {
  name: "",
  slug: "",
  websiteUrl: "",
  category: "",
  country: "",
  city: "",
};

const initialWebsiteForm: WebsiteForm = {
  url: "",
};

const initialGoogleBusinessProfileForm: GoogleBusinessProfileForm = {
  profileUrl: "",
  businessName: "",
  address: "",
  city: "",
  country: "",
  phone: "",
};

const initialSocialProfileForm: SocialProfileForm = {
  platform: "INSTAGRAM",
  profileUrl: "",
  handle: "",
  displayName: "",
};

const socialPlatforms: SocialProfilePlatform[] = [
  "INSTAGRAM",
  "FACEBOOK",
  "TIKTOK",
  "LINKEDIN",
  "YOUTUBE",
  "X",
  "OTHER",
];

export function OnboardingFlow() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
  const [step, setStep] = useState<Step>("organization");
  const [organizationForm, setOrganizationForm] = useState<OrganizationForm>(
    initialOrganizationForm,
  );
  const [businessForm, setBusinessForm] =
    useState<BusinessForm>(initialBusinessForm);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [availableOrganizations, setAvailableOrganizations] = useState<
    Organization[]
  >([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [googleBusinessProfile, setGoogleBusinessProfile] =
    useState<GoogleBusinessProfile | null>(null);
  const [socialProfiles, setSocialProfiles] = useState<SocialProfile[]>([]);
  const [latestCrawls, setLatestCrawls] = useState<
    Record<string, WebsiteCrawl>
  >({});
  const [auditFindings, setAuditFindings] = useState<
    Record<string, WebsiteAuditFinding[]>
  >({});
  const [visibilityScore, setVisibilityScore] =
    useState<BusinessVisibilityScore | null>(null);
  const [recommendations, setRecommendations] = useState<
    BusinessRecommendation[]
  >([]);
  const [websiteForm, setWebsiteForm] =
    useState<WebsiteForm>(initialWebsiteForm);
  const [googleBusinessProfileForm, setGoogleBusinessProfileForm] =
    useState<GoogleBusinessProfileForm>(initialGoogleBusinessProfileForm);
  const [socialProfileForm, setSocialProfileForm] = useState<SocialProfileForm>(
    initialSocialProfileForm,
  );
  const [editingSocialProfileId, setEditingSocialProfileId] = useState<
    string | null
  >(null);
  const [isAddWebsiteFormVisible, setIsAddWebsiteFormVisible] = useState(false);
  const [
    isGoogleBusinessProfileFormVisible,
    setIsGoogleBusinessProfileFormVisible,
  ] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWebsiteSubmitting, setIsWebsiteSubmitting] = useState(false);
  const [isWebsiteLoading, setIsWebsiteLoading] = useState(false);
  const [ignoredFindingId, setIgnoredFindingId] = useState<string | null>(null);
  const [
    isGoogleBusinessProfileSubmitting,
    setIsGoogleBusinessProfileSubmitting,
  ] = useState(false);
  const [isSocialProfileSubmitting, setIsSocialProfileSubmitting] =
    useState(false);
  const [isVisibilityScoreCalculating, setIsVisibilityScoreCalculating] =
    useState(false);
  const [isRecommendationsGenerating, setIsRecommendationsGenerating] =
    useState(false);
  const [updatingRecommendationId, setUpdatingRecommendationId] = useState<
    string | null
  >(null);
  const [queuedCrawlWebsiteId, setQueuedCrawlWebsiteId] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const organizationValidation = useMemo(
    () => validateOrganization(organizationForm),
    [organizationForm],
  );
  const businessValidation = useMemo(
    () => validateBusiness(businessForm),
    [businessForm],
  );

  useEffect(() => {
    let isMounted = true;

    async function restoreWorkspace() {
      if (!apiBaseUrl) {
        if (isMounted) {
          setError("NEXT_PUBLIC_API_URL is not configured.");
          setIsRestoring(false);
        }
        return;
      }

      const organizations = await getJson<Organization[]>(
        `${apiBaseUrl}/organizations`,
      );
      const selectedOrganizationId = window.localStorage.getItem(
        selectedOrganizationStorageKey,
      );
      const selectedOrganization =
        organizations.find(
          (organization) => organization.id === selectedOrganizationId,
        ) ?? null;

      if (selectedOrganizationId && !selectedOrganization) {
        window.localStorage.removeItem(selectedOrganizationStorageKey);
      }

      const onlyOrganization =
        organizations.length === 1 ? organizations[0] : null;

      if (!selectedOrganizationId && onlyOrganization) {
        window.localStorage.setItem(
          selectedOrganizationStorageKey,
          onlyOrganization.id,
        );
      }

      const organizationToRestore =
        selectedOrganization ??
        (!selectedOrganizationId ? onlyOrganization : null);

      if (!organizationToRestore) {
        if (isMounted) {
          setAvailableOrganizations(organizations);
          setStep(organizations.length > 1 ? "selector" : "organization");
          setIsRestoring(false);
        }
        return;
      }

      try {
        const restoredOrganization = await getJson<Organization>(
          `${apiBaseUrl}/organizations/${organizationToRestore.id}`,
        );
        const restoredBusinesses = await getJson<Business[]>(
          `${apiBaseUrl}/organizations/${organizationToRestore.id}/businesses`,
        );
        const restoredBusiness = restoredBusinesses[0] ?? null;
        const restoredWebsites = restoredBusiness
          ? await getJson<Website[]>(
              `${apiBaseUrl}/organizations/${organizationToRestore.id}/businesses/${restoredBusiness.id}/websites`,
            )
          : [];
        const restoredCrawls =
          restoredBusiness === null
            ? {}
            : await loadLatestCrawls(
                apiBaseUrl,
                organizationToRestore.id,
                restoredBusiness.id,
                restoredWebsites,
              );
        const restoredAuditFindings =
          restoredBusiness === null
            ? {}
            : await loadAuditFindings(
                apiBaseUrl,
                organizationToRestore.id,
                restoredBusiness.id,
                restoredWebsites,
              );
        const restoredGoogleBusinessProfile = restoredBusiness
          ? await loadGoogleBusinessProfile(
              apiBaseUrl,
              organizationToRestore.id,
              restoredBusiness.id,
            )
          : null;
        const restoredSocialProfiles = restoredBusiness
          ? await loadSocialProfiles(
              apiBaseUrl,
              organizationToRestore.id,
              restoredBusiness.id,
            )
          : [];
        const restoredVisibilityScore = restoredBusiness
          ? await loadVisibilityScore(
              apiBaseUrl,
              organizationToRestore.id,
              restoredBusiness.id,
            )
          : null;
        const restoredRecommendations = restoredBusiness
          ? await loadRecommendations(
              apiBaseUrl,
              organizationToRestore.id,
              restoredBusiness.id,
            )
          : [];

        if (!isMounted) {
          return;
        }

        setOrganization(restoredOrganization);
        setAvailableOrganizations(organizations);
        setBusinesses(restoredBusinesses);
        setBusiness(restoredBusiness);
        setWebsites(restoredWebsites);
        setGoogleBusinessProfile(restoredGoogleBusinessProfile);
        setSocialProfiles(restoredSocialProfiles);
        setVisibilityScore(restoredVisibilityScore);
        setRecommendations(restoredRecommendations);
        setIsAddWebsiteFormVisible(false);
        setIsGoogleBusinessProfileFormVisible(false);
        setEditingSocialProfileId(null);
        setLatestCrawls(restoredCrawls);
        setAuditFindings(restoredAuditFindings);
        setStep(restoredBusinesses.length > 0 ? "workspace" : "business");
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        window.localStorage.removeItem(selectedOrganizationStorageKey);
        setOrganization(null);
        setBusiness(null);
        setBusinesses([]);
        setWebsites([]);
        setGoogleBusinessProfile(null);
        setSocialProfiles([]);
        setVisibilityScore(null);
        setRecommendations([]);
        setIsAddWebsiteFormVisible(false);
        setIsGoogleBusinessProfileFormVisible(false);
        setEditingSocialProfileId(null);
        setLatestCrawls({});
        setAuditFindings({});
        setStep("organization");
        setError(
          `Could not restore the saved workspace. ${getErrorMessage(
            requestError,
          )}`,
        );
      } finally {
        if (isMounted) {
          setIsRestoring(false);
        }
      }
    }

    void restoreWorkspace();

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl]);

  async function handleOrganizationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!apiBaseUrl) {
      setError("NEXT_PUBLIC_API_URL is not configured.");
      return;
    }

    const validationError = validateOrganization(organizationForm);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const createdOrganization = await postJson<Organization>(
        `${apiBaseUrl}/organizations`,
        {
          name: organizationForm.name.trim(),
          slug: organizationForm.slug.trim(),
        },
      );
      window.localStorage.setItem(
        selectedOrganizationStorageKey,
        createdOrganization.id,
      );
      setOrganization(createdOrganization);
      setAvailableOrganizations((current) => [createdOrganization, ...current]);
      setBusinesses([]);
      setBusiness(null);
      setWebsites([]);
      setGoogleBusinessProfile(null);
      setSocialProfiles([]);
      setVisibilityScore(null);
      setRecommendations([]);
      setLatestCrawls({});
      setAuditFindings({});
      setStep("business");
      setSuccess("Organization created. Add your first business.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBusinessSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!apiBaseUrl) {
      setError("NEXT_PUBLIC_API_URL is not configured.");
      return;
    }

    if (!organization) {
      setError("Create an organization before adding a business.");
      return;
    }

    const validationError = validateBusiness(businessForm);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const createdBusiness = await postJson<Business>(
        `${apiBaseUrl}/organizations/${organization.id}/businesses`,
        compactPayload({
          name: businessForm.name.trim(),
          slug: businessForm.slug.trim(),
          websiteUrl: businessForm.websiteUrl.trim(),
          category: businessForm.category.trim(),
          country: businessForm.country.trim(),
          city: businessForm.city.trim(),
        }),
      );
      const createdWebsites = await getJson<Website[]>(
        `${apiBaseUrl}/organizations/${organization.id}/businesses/${createdBusiness.id}/websites`,
      );
      const createdCrawls = await loadLatestCrawls(
        apiBaseUrl,
        organization.id,
        createdBusiness.id,
        createdWebsites,
      );
      const createdAuditFindings = await loadAuditFindings(
        apiBaseUrl,
        organization.id,
        createdBusiness.id,
        createdWebsites,
      );
      setBusiness(createdBusiness);
      setBusinesses((current) => [createdBusiness, ...current]);
      setWebsites(createdWebsites);
      setGoogleBusinessProfile(null);
      setSocialProfiles([]);
      setVisibilityScore(null);
      setRecommendations([]);
      setIsAddWebsiteFormVisible(false);
      setIsGoogleBusinessProfileFormVisible(false);
      setEditingSocialProfileId(null);
      setLatestCrawls(createdCrawls);
      setAuditFindings(createdAuditFindings);
      setBusinessForm(initialBusinessForm);
      setStep("workspace");
      setSuccess("Business workspace created.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateOrganizationName(name: string) {
    setOrganizationForm((current) => ({
      name,
      slug: current.slug || slugify(name),
    }));
  }

  function updateBusinessName(name: string) {
    setBusinessForm((current) => ({
      ...current,
      name,
      slug: current.slug || slugify(name),
    }));
  }

  function switchWorkspace() {
    window.localStorage.removeItem(selectedOrganizationStorageKey);
    setOrganization(null);
    setBusiness(null);
    setBusinesses([]);
    setWebsites([]);
    setGoogleBusinessProfile(null);
    setSocialProfiles([]);
    setVisibilityScore(null);
    setRecommendations([]);
    setIsAddWebsiteFormVisible(false);
    setIsGoogleBusinessProfileFormVisible(false);
    setEditingSocialProfileId(null);
    setLatestCrawls({});
    setAuditFindings({});
    setWebsiteForm(initialWebsiteForm);
    setOrganizationForm(initialOrganizationForm);
    setBusinessForm(initialBusinessForm);
    setStep(availableOrganizations.length > 1 ? "selector" : "organization");
    setError(null);
    setSuccess("Workspace selection cleared.");
  }

  async function selectWorkspace(organizationId: string) {
    setError(null);
    setSuccess(null);

    if (!apiBaseUrl) {
      setError("NEXT_PUBLIC_API_URL is not configured.");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedOrganization = await getJson<Organization>(
        `${apiBaseUrl}/organizations/${organizationId}`,
      );
      const selectedBusinesses = await getJson<Business[]>(
        `${apiBaseUrl}/organizations/${organizationId}/businesses`,
      );
      const selectedBusiness = selectedBusinesses[0] ?? null;
      const selectedWebsites = selectedBusiness
        ? await getJson<Website[]>(
            `${apiBaseUrl}/organizations/${organizationId}/businesses/${selectedBusiness.id}/websites`,
          )
        : [];
      const selectedCrawls =
        selectedBusiness === null
          ? {}
          : await loadLatestCrawls(
              apiBaseUrl,
              organizationId,
              selectedBusiness.id,
              selectedWebsites,
            );
      const selectedAuditFindings =
        selectedBusiness === null
          ? {}
          : await loadAuditFindings(
              apiBaseUrl,
              organizationId,
              selectedBusiness.id,
              selectedWebsites,
            );
      const selectedGoogleBusinessProfile = selectedBusiness
        ? await loadGoogleBusinessProfile(
            apiBaseUrl,
            organizationId,
            selectedBusiness.id,
          )
        : null;
      const selectedSocialProfiles = selectedBusiness
        ? await loadSocialProfiles(
            apiBaseUrl,
            organizationId,
            selectedBusiness.id,
          )
        : [];
      const selectedVisibilityScore = selectedBusiness
        ? await loadVisibilityScore(
            apiBaseUrl,
            organizationId,
            selectedBusiness.id,
          )
        : null;
      const selectedRecommendations = selectedBusiness
        ? await loadRecommendations(apiBaseUrl, organizationId, selectedBusiness.id)
        : [];

      window.localStorage.setItem(
        selectedOrganizationStorageKey,
        selectedOrganization.id,
      );
      setOrganization(selectedOrganization);
      setBusinesses(selectedBusinesses);
      setBusiness(selectedBusiness);
      setWebsites(selectedWebsites);
      setGoogleBusinessProfile(selectedGoogleBusinessProfile);
      setSocialProfiles(selectedSocialProfiles);
      setVisibilityScore(selectedVisibilityScore);
      setRecommendations(selectedRecommendations);
      setIsAddWebsiteFormVisible(false);
      setIsGoogleBusinessProfileFormVisible(false);
      setEditingSocialProfileId(null);
      setLatestCrawls(selectedCrawls);
      setAuditFindings(selectedAuditFindings);
      setStep(selectedBusiness ? "workspace" : "business");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function createAnotherBusiness() {
    setBusinessForm(initialBusinessForm);
    setBusiness(null);
    setWebsites([]);
    setGoogleBusinessProfile(null);
    setSocialProfiles([]);
    setVisibilityScore(null);
    setRecommendations([]);
    setIsAddWebsiteFormVisible(false);
    setIsGoogleBusinessProfileFormVisible(false);
    setEditingSocialProfileId(null);
    setLatestCrawls({});
    setAuditFindings({});
    setWebsiteForm(initialWebsiteForm);
    setStep("business");
    setError(null);
    setSuccess(null);
  }

  async function handleWebsiteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!apiBaseUrl) {
      setError("NEXT_PUBLIC_API_URL is not configured.");
      return;
    }

    if (!organization || !business) {
      setError("Create a business before adding websites.");
      return;
    }

    const websiteUrl = websiteForm.url.trim();
    if (!websiteUrl) {
      setError("Website URL is required.");
      return;
    }

    if (!isValidUrl(websiteUrl)) {
      setError("Website URL must include http:// or https://.");
      return;
    }

    setIsWebsiteSubmitting(true);
    try {
      const createdWebsite = await postJson<Website>(
        `${apiBaseUrl}/organizations/${organization.id}/businesses/${business.id}/websites`,
        {
          url: websiteUrl,
          isPrimary: websites.length === 0,
        },
      );
      setWebsites((current) =>
        sortWebsites([
          createdWebsite,
          ...current.map((website) =>
            createdWebsite.isPrimary
              ? { ...website, isPrimary: false }
              : website,
          ),
        ]),
      );
      setLatestCrawls((current) => removeKey(current, createdWebsite.id));
      setAuditFindings((current) => removeKey(current, createdWebsite.id));
      setWebsiteForm(initialWebsiteForm);
      setIsAddWebsiteFormVisible(false);
      setSuccess("Website saved.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsWebsiteSubmitting(false);
    }
  }

  async function makePrimaryWebsite(websiteId: string) {
    await updateWebsite(
      websiteId,
      { isPrimary: true },
      "Primary website updated.",
    );
  }

  async function deleteWebsite(websiteId: string) {
    setError(null);
    setSuccess(null);

    if (!apiBaseUrl || !organization || !business) {
      setError("Workspace is not ready.");
      return;
    }

    setIsWebsiteLoading(true);
    try {
      const deletedWebsite = await deleteJson<Website>(
        `${apiBaseUrl}/organizations/${organization.id}/businesses/${business.id}/websites/${websiteId}`,
      );
      if (deletedWebsite.isPrimary) {
        const remainingWebsites = await getJson<Website[]>(
          `${apiBaseUrl}/organizations/${organization.id}/businesses/${business.id}/websites`,
        );
        setWebsites(remainingWebsites);
        setBusiness((current) =>
          current ? { ...current, websiteUrl: null } : current,
        );
      } else {
        setWebsites((current) =>
          current.filter((website) => website.id !== deletedWebsite.id),
        );
      }
      setLatestCrawls((current) => removeKey(current, deletedWebsite.id));
      setAuditFindings((current) => removeKey(current, deletedWebsite.id));
      setSuccess("Website deleted.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsWebsiteLoading(false);
    }
  }

  async function queueWebsiteCrawl(websiteId: string) {
    setError(null);
    setSuccess(null);

    if (!apiBaseUrl || !organization || !business) {
      setError("Workspace is not ready.");
      return;
    }

    setQueuedCrawlWebsiteId(websiteId);
    try {
      const crawl = await postJson<WebsiteCrawl>(
        `${apiBaseUrl}/organizations/${organization.id}/businesses/${business.id}/websites/${websiteId}/crawls`,
        {},
      );
      setLatestCrawls((current) => ({ ...current, [websiteId]: crawl }));
      setSuccess(
        "Website crawl queued. The worker will pick it up when running.",
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setQueuedCrawlWebsiteId(null);
    }
  }

  async function ignoreAuditFinding(websiteId: string, findingId: string) {
    setError(null);
    setSuccess(null);

    if (!apiBaseUrl || !organization || !business) {
      setError("Workspace is not ready.");
      return;
    }

    setIgnoredFindingId(findingId);
    try {
      const updatedFinding = await patchJson<WebsiteAuditFinding>(
        `${apiBaseUrl}/organizations/${organization.id}/businesses/${business.id}/websites/${websiteId}/audit-findings/${findingId}`,
        { status: "IGNORED" },
      );
      setAuditFindings((current) => ({
        ...current,
        [websiteId]: (current[websiteId] ?? []).map((finding) =>
          finding.id === updatedFinding.id ? updatedFinding : finding,
        ),
      }));
      setSuccess("Audit finding ignored.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIgnoredFindingId(null);
    }
  }

  async function calculateVisibilityScore() {
    setError(null);
    setSuccess(null);

    if (!apiBaseUrl || !organization || !business) {
      setError("Workspace is not ready.");
      return;
    }

    setIsVisibilityScoreCalculating(true);
    try {
      const score = await postJson<BusinessVisibilityScore>(
        `${apiBaseUrl}/organizations/${organization.id}/businesses/${business.id}/visibility-score/calculate`,
        {},
      );
      const generatedRecommendations = await postJson<BusinessRecommendation[]>(
        `${apiBaseUrl}/organizations/${organization.id}/businesses/${business.id}/recommendations/generate`,
        {},
      );
      setVisibilityScore(score);
      setRecommendations(generatedRecommendations);
      setSuccess("AI Visibility Score calculated and recommendations updated.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsVisibilityScoreCalculating(false);
    }
  }

  async function generateRecommendations() {
    setError(null);
    setSuccess(null);

    if (!apiBaseUrl || !organization || !business) {
      setError("Workspace is not ready.");
      return;
    }

    setIsRecommendationsGenerating(true);
    try {
      const generatedRecommendations = await postJson<BusinessRecommendation[]>(
        `${apiBaseUrl}/organizations/${organization.id}/businesses/${business.id}/recommendations/generate`,
        {},
      );
      setRecommendations(generatedRecommendations);
      setSuccess("Recommendations updated.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsRecommendationsGenerating(false);
    }
  }

  async function updateRecommendationStatus(
    recommendationId: string,
    status: BusinessRecommendation["status"],
  ) {
    setError(null);
    setSuccess(null);

    if (!apiBaseUrl || !organization || !business) {
      setError("Workspace is not ready.");
      return;
    }

    setUpdatingRecommendationId(recommendationId);
    try {
      const updatedRecommendation = await patchJson<BusinessRecommendation>(
        `${apiBaseUrl}/organizations/${organization.id}/businesses/${business.id}/recommendations/${recommendationId}`,
        { status },
      );
      setRecommendations((current) =>
        sortRecommendations(
          current.map((recommendation) =>
            recommendation.id === updatedRecommendation.id
              ? updatedRecommendation
              : recommendation,
          ),
        ),
      );
      setSuccess("Recommendation updated.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setUpdatingRecommendationId(null);
    }
  }

  async function updateWebsite(
    websiteId: string,
    body: JsonBody,
    successMessage: string,
  ) {
    setError(null);
    setSuccess(null);

    if (!apiBaseUrl || !organization || !business) {
      setError("Workspace is not ready.");
      return;
    }

    setIsWebsiteLoading(true);
    try {
      const updatedWebsite = await patchJson<Website>(
        `${apiBaseUrl}/organizations/${organization.id}/businesses/${business.id}/websites/${websiteId}`,
        body,
      );
      setWebsites((current) =>
        sortWebsites(
          current.map((website) => {
            if (website.id === updatedWebsite.id) {
              return updatedWebsite;
            }

            return updatedWebsite.isPrimary
              ? { ...website, isPrimary: false }
              : website;
          }),
        ),
      );
      setSuccess(successMessage);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsWebsiteLoading(false);
    }
  }

  function editGoogleBusinessProfile() {
    if (!googleBusinessProfile) {
      return;
    }

    setGoogleBusinessProfileForm({
      profileUrl: googleBusinessProfile.profileUrl,
      businessName: googleBusinessProfile.businessName ?? "",
      address: googleBusinessProfile.address ?? "",
      city: googleBusinessProfile.city ?? "",
      country: googleBusinessProfile.country ?? "",
      phone: googleBusinessProfile.phone ?? "",
    });
    setIsGoogleBusinessProfileFormVisible(true);
    setError(null);
    setSuccess(null);
  }

  async function handleGoogleBusinessProfileSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!apiBaseUrl || !organization || !business) {
      setError("Workspace is not ready.");
      return;
    }

    const profileUrl = googleBusinessProfileForm.profileUrl.trim();
    if (!profileUrl) {
      setError("Google Business Profile URL is required.");
      return;
    }

    if (!isGoogleBusinessProfileUrl(profileUrl)) {
      setError("Enter a Google Maps or Google Business Profile URL.");
      return;
    }

    setIsGoogleBusinessProfileSubmitting(true);
    try {
      const endpoint = `${apiBaseUrl}/organizations/${organization.id}/businesses/${business.id}/google-business-profile`;
      const body = compactPayload({
        profileUrl,
        businessName: googleBusinessProfileForm.businessName.trim(),
        address: googleBusinessProfileForm.address.trim(),
        city: googleBusinessProfileForm.city.trim(),
        country: googleBusinessProfileForm.country.trim(),
        phone: googleBusinessProfileForm.phone.trim(),
      });
      const savedProfile = googleBusinessProfile
        ? await patchJson<GoogleBusinessProfile>(endpoint, body)
        : await postJson<GoogleBusinessProfile>(endpoint, body);

      setGoogleBusinessProfile(savedProfile);
      setGoogleBusinessProfileForm(initialGoogleBusinessProfileForm);
      setIsGoogleBusinessProfileFormVisible(false);
      setSuccess("Google Business Profile saved.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsGoogleBusinessProfileSubmitting(false);
    }
  }

  async function disconnectGoogleBusinessProfile() {
    setError(null);
    setSuccess(null);

    if (!apiBaseUrl || !organization || !business) {
      setError("Workspace is not ready.");
      return;
    }

    setIsGoogleBusinessProfileSubmitting(true);
    try {
      await deleteJson<GoogleBusinessProfile>(
        `${apiBaseUrl}/organizations/${organization.id}/businesses/${business.id}/google-business-profile`,
      );
      setGoogleBusinessProfile(null);
      setGoogleBusinessProfileForm(initialGoogleBusinessProfileForm);
      setIsGoogleBusinessProfileFormVisible(false);
      setSuccess("Google Business Profile disconnected.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsGoogleBusinessProfileSubmitting(false);
    }
  }

  function editSocialProfile(profile: SocialProfile) {
    setSocialProfileForm({
      platform: profile.platform,
      profileUrl: profile.profileUrl,
      handle: profile.handle ?? "",
      displayName: profile.displayName ?? "",
    });
    setEditingSocialProfileId(profile.id);
    setError(null);
    setSuccess(null);
  }

  function cancelSocialProfileEdit() {
    setSocialProfileForm(initialSocialProfileForm);
    setEditingSocialProfileId(null);
  }

  async function handleSocialProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!apiBaseUrl || !organization || !business) {
      setError("Workspace is not ready.");
      return;
    }

    const profileUrl = socialProfileForm.profileUrl.trim();
    if (!profileUrl) {
      setError("Social profile URL is required.");
      return;
    }

    if (!isSocialProfileUrl(socialProfileForm.platform, profileUrl)) {
      setError("Social profile URL does not match the selected platform.");
      return;
    }

    setIsSocialProfileSubmitting(true);
    try {
      const endpoint = `${apiBaseUrl}/organizations/${organization.id}/businesses/${business.id}/social-profiles`;
      const body = compactPayload({
        platform: socialProfileForm.platform,
        profileUrl,
        handle: socialProfileForm.handle.trim(),
        displayName: socialProfileForm.displayName.trim(),
      });
      const savedProfile = editingSocialProfileId
        ? await patchJson<SocialProfile>(
            `${endpoint}/${editingSocialProfileId}`,
            body,
          )
        : await postJson<SocialProfile>(endpoint, body);

      setSocialProfiles((current) =>
        sortSocialProfiles(
          editingSocialProfileId
            ? current.map((profile) =>
                profile.id === savedProfile.id ? savedProfile : profile,
              )
            : [savedProfile, ...current],
        ),
      );
      setSocialProfileForm(initialSocialProfileForm);
      setEditingSocialProfileId(null);
      setSuccess("Social profile saved.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSocialProfileSubmitting(false);
    }
  }

  async function deleteSocialProfile(socialProfileId: string) {
    setError(null);
    setSuccess(null);

    if (!apiBaseUrl || !organization || !business) {
      setError("Workspace is not ready.");
      return;
    }

    setIsSocialProfileSubmitting(true);
    try {
      const deletedProfile = await deleteJson<SocialProfile>(
        `${apiBaseUrl}/organizations/${organization.id}/businesses/${business.id}/social-profiles/${socialProfileId}`,
      );
      const remainingProfiles = await loadSocialProfiles(
        apiBaseUrl,
        organization.id,
        business.id,
      );
      setSocialProfiles(remainingProfiles);
      if (editingSocialProfileId === deletedProfile.id) {
        setSocialProfileForm(initialSocialProfileForm);
        setEditingSocialProfileId(null);
      }
      setSuccess("Social profile deleted.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSocialProfileSubmitting(false);
    }
  }

  if (isRestoring) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/10 px-6 py-5 text-sm text-slate-200">
          Loading your BrandOS workspace...
        </div>
      </main>
    );
  }

  if (step === "workspace" && organization && business) {
    return (
      <main className="min-h-screen bg-slate-100 text-slate-950">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <WorkspaceSidebar organization={organization} business={business} />
          <section className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl space-y-5">
              {error ? <Alert tone="error" message={error} /> : null}
              {success ? <Alert tone="success" message={success} /> : null}
              <WorkspaceDashboard
                business={business}
                businessCount={businesses.length}
                websiteForm={websiteForm}
                websites={websites}
                googleBusinessProfile={googleBusinessProfile}
                googleBusinessProfileForm={googleBusinessProfileForm}
                socialProfiles={socialProfiles}
                socialProfileForm={socialProfileForm}
                editingSocialProfileId={editingSocialProfileId}
                visibilityScore={visibilityScore}
                recommendations={recommendations}
                latestCrawls={latestCrawls}
                auditFindings={auditFindings}
                isWebsiteSubmitting={isWebsiteSubmitting}
                isWebsiteLoading={isWebsiteLoading}
                isGoogleBusinessProfileSubmitting={
                  isGoogleBusinessProfileSubmitting
                }
                isSocialProfileSubmitting={isSocialProfileSubmitting}
                isVisibilityScoreCalculating={isVisibilityScoreCalculating}
                isRecommendationsGenerating={isRecommendationsGenerating}
                isAddWebsiteFormVisible={isAddWebsiteFormVisible}
                isGoogleBusinessProfileFormVisible={
                  isGoogleBusinessProfileFormVisible
                }
                queuedCrawlWebsiteId={queuedCrawlWebsiteId}
                ignoredFindingId={ignoredFindingId}
                updatingRecommendationId={updatingRecommendationId}
                onCreateAnotherBusiness={createAnotherBusiness}
                onWebsiteUrlChange={(url) => setWebsiteForm({ url })}
                onGoogleBusinessProfileFieldChange={(field, value) =>
                  setGoogleBusinessProfileForm((current) => ({
                    ...current,
                    [field]: value,
                  }))
                }
                onSocialProfileFieldChange={(field, value) =>
                  setSocialProfileForm((current) => ({
                    ...current,
                    [field]: value,
                  }))
                }
                onWebsiteSubmit={handleWebsiteSubmit}
                onGoogleBusinessProfileSubmit={
                  handleGoogleBusinessProfileSubmit
                }
                onSocialProfileSubmit={handleSocialProfileSubmit}
                onShowAddWebsiteForm={() => setIsAddWebsiteFormVisible(true)}
                onShowGoogleBusinessProfileForm={() =>
                  setIsGoogleBusinessProfileFormVisible(true)
                }
                onCancelAddWebsite={() => {
                  setWebsiteForm(initialWebsiteForm);
                  setIsAddWebsiteFormVisible(false);
                }}
                onCancelGoogleBusinessProfileEdit={() => {
                  setGoogleBusinessProfileForm(
                    initialGoogleBusinessProfileForm,
                  );
                  setIsGoogleBusinessProfileFormVisible(false);
                }}
                onMakePrimaryWebsite={makePrimaryWebsite}
                onDeleteWebsite={deleteWebsite}
                onEditGoogleBusinessProfile={editGoogleBusinessProfile}
                onDisconnectGoogleBusinessProfile={
                  disconnectGoogleBusinessProfile
                }
                onEditSocialProfile={editSocialProfile}
                onDeleteSocialProfile={deleteSocialProfile}
                onCancelSocialProfileEdit={cancelSocialProfileEdit}
                onCalculateVisibilityScore={calculateVisibilityScore}
                onGenerateRecommendations={generateRecommendations}
                onUpdateRecommendationStatus={updateRecommendationStatus}
                onQueueWebsiteCrawl={queueWebsiteCrawl}
                onIgnoreAuditFinding={ignoreAuditFinding}
                onSwitchWorkspace={switchWorkspace}
              />
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
            BrandOS
          </p>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Set up your AI Visibility workspace.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
            Create an organization, add your first business, and prepare the
            workspace where visibility scores and prioritized tasks will live.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-slate-300">
            <ProgressItem
              active={step === "organization" || step === "selector"}
              done={Boolean(organization)}
            >
              Create organization
            </ProgressItem>
            <ProgressItem
              active={step === "business"}
              done={businesses.length > 0}
            >
              Add first business
            </ProgressItem>
            <ProgressItem
              active={step === "workspace"}
              done={step === "workspace"}
            >
              Review workspace dashboard
            </ProgressItem>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white p-6 text-slate-950 shadow-2xl shadow-cyan-950/30 sm:p-8">
          {error ? <Alert tone="error" message={error} /> : null}
          {success ? <Alert tone="success" message={success} /> : null}

          {step === "organization" ? (
            <OrganizationStep
              form={organizationForm}
              isSubmitting={isSubmitting}
              validationError={organizationValidation}
              onNameChange={updateOrganizationName}
              onSlugChange={(slug) =>
                setOrganizationForm((current) => ({ ...current, slug }))
              }
              onSubmit={handleOrganizationSubmit}
            />
          ) : null}

          {step === "selector" ? (
            <WorkspaceSelector
              organizations={availableOrganizations}
              isSubmitting={isSubmitting}
              onSelect={selectWorkspace}
              onCreateNew={() => setStep("organization")}
            />
          ) : null}

          {step === "business" && organization ? (
            <BusinessStep
              form={businessForm}
              isSubmitting={isSubmitting}
              organization={organization}
              validationError={businessValidation}
              hasExistingBusinesses={businesses.length > 0}
              onFieldChange={(field, value) =>
                setBusinessForm((current) => ({ ...current, [field]: value }))
              }
              onNameChange={updateBusinessName}
              onSubmit={handleBusinessSubmit}
              onSwitchWorkspace={switchWorkspace}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}

function WorkspaceSidebar({
  organization,
  business,
}: {
  organization: Organization;
  business: Business;
}) {
  const items = [
    "Dashboard",
    "Business Profile",
    "Website",
    "Google Business",
    "Social Profiles",
    "Audits",
    "Settings",
  ];

  return (
    <aside className="bg-slate-950 px-4 py-5 text-white lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:px-5">
      <div className="flex items-start justify-between gap-4 lg:block">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
            BrandOS
          </p>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              Workspace
            </p>
            <p className="mt-2 font-semibold text-white">{organization.name}</p>
            <p className="mt-1 text-sm text-slate-400">{business.name}</p>
          </div>
        </div>
      </div>
      <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {items.map((item) => {
          const isActive = item === "Dashboard";

          return (
            <button
              key={item}
              type="button"
              className={`whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm font-semibold transition lg:w-full ${
                isActive
                  ? "bg-cyan-300 text-slate-950"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function OrganizationStep({
  form,
  isSubmitting,
  validationError,
  onNameChange,
  onSlugChange,
  onSubmit,
}: {
  form: OrganizationForm;
  isSubmitting: boolean;
  validationError: string | null;
  onNameChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <FormHeader
        eyebrow="Step 1"
        title="Create your organization"
        description="This is the tenant boundary for businesses, members, scores, and tasks."
      />
      <TextField
        label="Organization name"
        value={form.name}
        placeholder="Acme Growth Studio"
        onChange={onNameChange}
      />
      <TextField
        label="Organization slug"
        value={form.slug}
        placeholder="acme-growth-studio"
        help="Lowercase letters, numbers, and hyphens."
        onChange={(value) => onSlugChange(slugify(value))}
      />
      <SubmitButton
        disabled={Boolean(validationError) || isSubmitting}
        loading={isSubmitting}
      >
        Create organization
      </SubmitButton>
    </form>
  );
}

function WorkspaceSelector({
  organizations,
  isSubmitting,
  onSelect,
  onCreateNew,
}: {
  organizations: Organization[];
  isSubmitting: boolean;
  onSelect: (organizationId: string) => void;
  onCreateNew: () => void;
}) {
  return (
    <div className="space-y-5">
      <FormHeader
        eyebrow="Workspace"
        title="Choose a workspace"
        description="Select an existing organization or create a new one."
      />
      <div className="space-y-3">
        {organizations.map((organization) => (
          <button
            key={organization.id}
            type="button"
            disabled={isSubmitting}
            onClick={() => onSelect(organization.id)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-cyan-300 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="block font-semibold text-slate-950">
              {organization.name}
            </span>
            <span className="mt-1 block text-sm text-slate-500">
              {organization.slug}
            </span>
          </button>
        ))}
      </div>
      <SecondaryButton onClick={onCreateNew}>
        Create new organization
      </SecondaryButton>
    </div>
  );
}

function BusinessStep({
  form,
  isSubmitting,
  organization,
  validationError,
  hasExistingBusinesses,
  onFieldChange,
  onNameChange,
  onSubmit,
  onSwitchWorkspace,
}: {
  form: BusinessForm;
  isSubmitting: boolean;
  organization: Organization;
  validationError: string | null;
  hasExistingBusinesses: boolean;
  onFieldChange: (field: keyof BusinessForm, value: string) => void;
  onNameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSwitchWorkspace: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <FormHeader
        eyebrow="Step 2"
        title={
          hasExistingBusinesses
            ? "Create another business"
            : "Add your first business"
        }
        description={`Organization: ${organization.name}`}
      />
      {!hasExistingBusinesses ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This organization has no businesses yet. Add one to open the dashboard
          workspace.
        </p>
      ) : null}
      <TextField
        label="Business name"
        value={form.name}
        placeholder="Acme Cafe"
        onChange={onNameChange}
      />
      <TextField
        label="Business slug"
        value={form.slug}
        placeholder="acme-cafe"
        help="Unique inside this organization."
        onChange={(value) => onFieldChange("slug", slugify(value))}
      />
      <TextField
        label="Website URL"
        value={form.websiteUrl}
        placeholder="https://example.com"
        help="Optional, but needed before website intelligence audits."
        onChange={(value) => onFieldChange("websiteUrl", value)}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Category"
          value={form.category}
          placeholder="Restaurant"
          onChange={(value) => onFieldChange("category", value)}
        />
        <TextField
          label="Country"
          value={form.country}
          placeholder="US"
          onChange={(value) => onFieldChange("country", value)}
        />
        <TextField
          label="City"
          value={form.city}
          placeholder="New York"
          onChange={(value) => onFieldChange("city", value)}
        />
      </div>
      <SubmitButton
        disabled={Boolean(validationError) || isSubmitting}
        loading={isSubmitting}
      >
        Create workspace
      </SubmitButton>
      <SecondaryButton onClick={onSwitchWorkspace}>
        Switch workspace
      </SecondaryButton>
    </form>
  );
}

function WorkspaceDashboard({
  business,
  businessCount,
  websiteForm,
  websites,
  googleBusinessProfile,
  googleBusinessProfileForm,
  socialProfiles,
  socialProfileForm,
  editingSocialProfileId,
  visibilityScore,
  recommendations,
  latestCrawls,
  auditFindings,
  isWebsiteSubmitting,
  isWebsiteLoading,
  isGoogleBusinessProfileSubmitting,
  isSocialProfileSubmitting,
  isVisibilityScoreCalculating,
  isRecommendationsGenerating,
  isAddWebsiteFormVisible,
  isGoogleBusinessProfileFormVisible,
  queuedCrawlWebsiteId,
  ignoredFindingId,
  updatingRecommendationId,
  onCreateAnotherBusiness,
  onWebsiteUrlChange,
  onGoogleBusinessProfileFieldChange,
  onSocialProfileFieldChange,
  onWebsiteSubmit,
  onGoogleBusinessProfileSubmit,
  onSocialProfileSubmit,
  onShowAddWebsiteForm,
  onShowGoogleBusinessProfileForm,
  onCancelAddWebsite,
  onCancelGoogleBusinessProfileEdit,
  onMakePrimaryWebsite,
  onDeleteWebsite,
  onEditGoogleBusinessProfile,
  onDisconnectGoogleBusinessProfile,
  onEditSocialProfile,
  onDeleteSocialProfile,
  onCancelSocialProfileEdit,
  onCalculateVisibilityScore,
  onGenerateRecommendations,
  onUpdateRecommendationStatus,
  onQueueWebsiteCrawl,
  onIgnoreAuditFinding,
  onSwitchWorkspace,
}: {
  business: Business;
  businessCount: number;
  websiteForm: WebsiteForm;
  websites: Website[];
  googleBusinessProfile: GoogleBusinessProfile | null;
  googleBusinessProfileForm: GoogleBusinessProfileForm;
  socialProfiles: SocialProfile[];
  socialProfileForm: SocialProfileForm;
  editingSocialProfileId: string | null;
  visibilityScore: BusinessVisibilityScore | null;
  recommendations: BusinessRecommendation[];
  latestCrawls: Record<string, WebsiteCrawl>;
  auditFindings: Record<string, WebsiteAuditFinding[]>;
  isWebsiteSubmitting: boolean;
  isWebsiteLoading: boolean;
  isGoogleBusinessProfileSubmitting: boolean;
  isSocialProfileSubmitting: boolean;
  isVisibilityScoreCalculating: boolean;
  isRecommendationsGenerating: boolean;
  isAddWebsiteFormVisible: boolean;
  isGoogleBusinessProfileFormVisible: boolean;
  queuedCrawlWebsiteId: string | null;
  ignoredFindingId: string | null;
  updatingRecommendationId: string | null;
  onCreateAnotherBusiness: () => void;
  onWebsiteUrlChange: (url: string) => void;
  onGoogleBusinessProfileFieldChange: (
    field: keyof GoogleBusinessProfileForm,
    value: string,
  ) => void;
  onSocialProfileFieldChange: (
    field: keyof SocialProfileForm,
    value: string,
  ) => void;
  onWebsiteSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onGoogleBusinessProfileSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSocialProfileSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onShowAddWebsiteForm: () => void;
  onShowGoogleBusinessProfileForm: () => void;
  onCancelAddWebsite: () => void;
  onCancelGoogleBusinessProfileEdit: () => void;
  onMakePrimaryWebsite: (websiteId: string) => void;
  onDeleteWebsite: (websiteId: string) => void;
  onEditGoogleBusinessProfile: () => void;
  onDisconnectGoogleBusinessProfile: () => void;
  onEditSocialProfile: (profile: SocialProfile) => void;
  onDeleteSocialProfile: (socialProfileId: string) => void;
  onCancelSocialProfileEdit: () => void;
  onCalculateVisibilityScore: () => void;
  onGenerateRecommendations: () => void;
  onUpdateRecommendationStatus: (
    recommendationId: string,
    status: BusinessRecommendation["status"],
  ) => void;
  onQueueWebsiteCrawl: (websiteId: string) => void;
  onIgnoreAuditFinding: (websiteId: string, findingId: string) => void;
  onSwitchWorkspace: () => void;
}) {
  const primaryWebsite = websites.find((website) => website.isPrimary) ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {business.name}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Monitor the foundations BrandOS will use for AI visibility: website
            health, local presence, social profiles, and audit readiness.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-slate-600">
          {business.category ? <Pill>{business.category}</Pill> : null}
          {business.city ? <Pill>{business.city}</Pill> : null}
          {business.country ? <Pill>{business.country}</Pill> : null}
          <Pill>
            {businessCount} {businessCount === 1 ? "business" : "businesses"}
          </Pill>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <AiVisibilityScoreCard
          score={visibilityScore}
          isCalculating={isVisibilityScoreCalculating}
          onCalculate={onCalculateVisibilityScore}
        />
        <BusinessProfileCard
          business={business}
          primaryWebsite={primaryWebsite}
        />
      </div>

      <RecommendationsSection
        recommendations={recommendations}
        isGenerating={isRecommendationsGenerating}
        updatingRecommendationId={updatingRecommendationId}
        onGenerate={onGenerateRecommendations}
        onUpdateStatus={onUpdateRecommendationStatus}
      />

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <WebsiteSection
          form={websiteForm}
          websites={websites}
          latestCrawls={latestCrawls}
          auditFindings={auditFindings}
          isSubmitting={isWebsiteSubmitting}
          isLoading={isWebsiteLoading}
          isAddWebsiteFormVisible={isAddWebsiteFormVisible}
          queuedCrawlWebsiteId={queuedCrawlWebsiteId}
          ignoredFindingId={ignoredFindingId}
          onUrlChange={onWebsiteUrlChange}
          onSubmit={onWebsiteSubmit}
          onShowAddWebsiteForm={onShowAddWebsiteForm}
          onCancelAddWebsite={onCancelAddWebsite}
          onMakePrimary={onMakePrimaryWebsite}
          onDelete={onDeleteWebsite}
          onQueueCrawl={onQueueWebsiteCrawl}
          onIgnoreFinding={onIgnoreAuditFinding}
        />

        <NextVisibilitySteps
          hasPrimaryWebsite={Boolean(primaryWebsite)}
          googleBusinessProfile={googleBusinessProfile}
          form={googleBusinessProfileForm}
          isFormVisible={isGoogleBusinessProfileFormVisible}
          isSubmitting={isGoogleBusinessProfileSubmitting}
          onFieldChange={onGoogleBusinessProfileFieldChange}
          onSubmit={onGoogleBusinessProfileSubmit}
          onShowForm={onShowGoogleBusinessProfileForm}
          onCancelEdit={onCancelGoogleBusinessProfileEdit}
          onEdit={onEditGoogleBusinessProfile}
          onDisconnect={onDisconnectGoogleBusinessProfile}
          socialProfiles={socialProfiles}
          socialProfileForm={socialProfileForm}
          editingSocialProfileId={editingSocialProfileId}
          isSocialProfileSubmitting={isSocialProfileSubmitting}
          onSocialProfileFieldChange={onSocialProfileFieldChange}
          onSocialProfileSubmit={onSocialProfileSubmit}
          onEditSocialProfile={onEditSocialProfile}
          onDeleteSocialProfile={onDeleteSocialProfile}
          onCancelSocialProfileEdit={onCancelSocialProfileEdit}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-950">
          Workspace actions
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Settings-style actions for managing multiple businesses or changing
          the active workspace.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <SecondaryButton onClick={onCreateAnotherBusiness}>
            Create another business
          </SecondaryButton>
          <SecondaryButton onClick={onSwitchWorkspace}>
            Switch workspace
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}

function AiVisibilityScoreCard({
  score,
  isCalculating,
  onCalculate,
}: {
  score: BusinessVisibilityScore | null;
  isCalculating: boolean;
  onCalculate: () => void;
}) {
  const foundationChecks = score ? orderedVisibilityBreakdown(score) : [];
  const rawScore = score ? visibilityRawScore(score) : null;
  const cappedScore = score ? visibilityCappedScore(score) : null;
  const capAdjustment =
    rawScore !== null && cappedScore !== null ? cappedScore - rawScore : null;
  const capNote =
    score?.inputs?.isMvpCapped === true
      ? "Current foundation checks are complete. The final score is capped until advanced AI-answer visibility checks are implemented."
      : null;

  return (
    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-cyan-700">
            AI Visibility Score
          </p>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-6xl font-semibold text-slate-950">
              {score ? score.score : "--"}
            </span>
            <span className="pb-2 text-sm font-medium text-slate-500">
              {score ? `/100 ${score.grade ?? ""}` : "not calculated yet"}
            </span>
          </div>
        </div>
        <button
          type="button"
          disabled={isCalculating}
          onClick={onCalculate}
          className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isCalculating ? "Calculating..." : "Calculate visibility score"}
        </button>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">
        {score?.summary ??
          "Calculate an explainable score from website health, local presence, social profiles, and open audit findings."}
      </p>
      {score ? (
        <>
          {capNote ? (
            <p className="mt-3 rounded-xl border border-cyan-200 bg-white/70 px-3 py-2 text-xs leading-5 text-cyan-800">
              {capNote}
            </p>
          ) : null}
          <div className="mt-4 rounded-xl border border-cyan-100 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-semibold text-slate-700">
                Foundation readiness
              </span>
              <span className="font-semibold text-slate-950">
                {rawScore ?? score.score}/100
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4 text-sm">
              <span className="font-semibold text-slate-700">
                MVP confidence cap
              </span>
              <span className="font-semibold text-cyan-700">
                {capAdjustment !== null && capAdjustment < 0
                  ? capAdjustment
                  : "0"}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4 border-t border-slate-100 pt-2 text-sm">
              <span className="font-semibold text-slate-700">
                Displayed score
              </span>
              <span className="font-semibold text-slate-950">
                {cappedScore ?? score.score}/100 {score.grade ?? ""}
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Last calculated {formatDateTime(score.calculatedAt)}
          </p>
          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-950">
              Foundation checks
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              These are readiness inputs from deterministic checks, not the
              final AI Visibility Score. The displayed score remains capped
              until advanced AI-answer visibility checks are available.
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {foundationChecks.map((section) => (
              <div
                key={section.key}
                className="rounded-xl border border-cyan-100 bg-white px-3 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {section.label}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Readiness input
                    </p>
                  </div>
                  <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700">
                    {section.earned}/{section.possible}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-cyan-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((section.earned / section.possible) * 100),
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            <div className="rounded-xl border border-slate-300 bg-slate-950 px-3 py-3 text-white sm:col-span-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    Advanced AI visibility checks
                  </p>
                  <p className="mt-1 text-xs font-medium text-cyan-200">
                    Not available yet
                  </p>
                </div>
                <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                  MVP cap applied:{" "}
                  {capAdjustment !== null && capAdjustment < 0
                    ? capAdjustment
                    : "0"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Future checks include LLM answer presence, brand recognition,
                share of voice, sentiment, citations, reviews, and competitor
                comparison.
              </p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function BusinessProfileCard({
  business,
  primaryWebsite,
}: {
  business: Business;
  primaryWebsite: Website | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium uppercase tracking-[0.14em] text-slate-500">
        Business Profile
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">
        {business.name}
      </h2>
      {primaryWebsite ? (
        <a
          href={primaryWebsite.normalizedUrl}
          className="mt-2 inline-block break-all text-sm font-medium text-cyan-700"
          target="_blank"
          rel="noreferrer"
        >
          {primaryWebsite.normalizedUrl}
        </a>
      ) : business.websiteUrl ? (
        <p className="mt-2 text-sm text-slate-500">
          Website setup pending for {business.websiteUrl}.
        </p>
      ) : (
        <p className="mt-2 text-sm text-slate-500">No website added yet.</p>
      )}
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <ProfileFact label="Category" value={business.category ?? "Not set"} />
        <ProfileFact label="City" value={business.city ?? "Not set"} />
        <ProfileFact label="Country" value={business.country ?? "Not set"} />
      </div>
    </div>
  );
}

function RecommendationsSection({
  recommendations,
  isGenerating,
  updatingRecommendationId,
  onGenerate,
  onUpdateStatus,
}: {
  recommendations: BusinessRecommendation[];
  isGenerating: boolean;
  updatingRecommendationId: string | null;
  onGenerate: () => void;
  onUpdateStatus: (
    recommendationId: string,
    status: BusinessRecommendation["status"],
  ) => void;
}) {
  const [statusFilter, setStatusFilter] =
    useState<RecommendationStatusFilter>("OPEN");
  const openRecommendations = recommendations.filter(
    (recommendation) => recommendation.status === "OPEN",
  );
  const filteredRecommendations = sortRecommendations(
    recommendations.filter(
      (recommendation) => recommendation.status === statusFilter,
    ),
  );
  const recommendationCounts = {
    OPEN: openRecommendations.length,
    DONE: recommendations.filter(
      (recommendation) => recommendation.status === "DONE",
    ).length,
    IGNORED: recommendations.filter(
      (recommendation) => recommendation.status === "IGNORED",
    ).length,
  } satisfies Record<RecommendationStatusFilter, number>;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-slate-500">
            Recommended next actions
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Prioritized visibility tasks
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Deterministic recommendations based on website scans, audit
            findings, local profile readiness, social presence, and AI
            visibility foundations.
          </p>
        </div>
        <button
          type="button"
          disabled={isGenerating}
          onClick={onGenerate}
          className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isGenerating ? "Generating..." : "Generate recommendations"}
        </button>
      </div>

      {recommendations.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-600">
          Calculate the visibility score or generate recommendations to create
          the first set of prioritized tasks.
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {(["OPEN", "DONE", "IGNORED"] as const).map((status) => {
                const isActive = statusFilter === status;

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      isActive
                        ? "bg-cyan-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {formatEnumLabel(status)} {recommendationCounts[status]}
                  </button>
                );
              })}
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {recommendations.length} total
            </span>
          </div>
          {filteredRecommendations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-600">
              No {formatEnumLabel(statusFilter).toLowerCase()} recommendations
              right now.
            </div>
          ) : (
            filteredRecommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                isUpdating={updatingRecommendationId === recommendation.id}
                onUpdateStatus={onUpdateStatus}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}

function RecommendationCard({
  recommendation,
  isUpdating,
  onUpdateStatus,
}: {
  recommendation: BusinessRecommendation;
  isUpdating: boolean;
  onUpdateStatus: (
    recommendationId: string,
    status: BusinessRecommendation["status"],
  ) => void;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        recommendation.status === "OPEN"
          ? "border-slate-200 bg-slate-50"
          : "border-slate-200 bg-white opacity-75"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${recommendationPriorityClass(
                recommendation.priority,
              )}`}
            >
              {formatEnumLabel(recommendation.priority)}
            </span>
            <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600">
              {formatEnumLabel(recommendation.sourceType)}
            </span>
            <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600">
              {formatEnumLabel(recommendation.status)}
            </span>
          </div>
          <h3 className="mt-3 font-semibold text-slate-950">
            {recommendation.title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {recommendation.description}
          </p>
          {recommendation.impact ? (
            <p className="mt-2 text-sm leading-6 text-slate-700">
              <span className="font-semibold">Impact: </span>
              {recommendation.impact}
            </p>
          ) : null}
          {recommendation.actionLabel ? (
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">
              {recommendation.actionLabel}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {recommendation.status !== "DONE" ? (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onUpdateStatus(recommendation.id, "DONE")}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUpdating ? "Saving..." : "Done"}
            </button>
          ) : null}
          {recommendation.status !== "IGNORED" ? (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onUpdateStatus(recommendation.id, "IGNORED")}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Ignore
            </button>
          ) : null}
          {recommendation.status !== "OPEN" ? (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onUpdateStatus(recommendation.id, "OPEN")}
              className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reopen
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ProfileFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-medium text-slate-800">{value}</p>
    </div>
  );
}

function WebsiteSection({
  form,
  websites,
  latestCrawls,
  auditFindings,
  isSubmitting,
  isLoading,
  isAddWebsiteFormVisible,
  queuedCrawlWebsiteId,
  ignoredFindingId,
  onUrlChange,
  onSubmit,
  onShowAddWebsiteForm,
  onCancelAddWebsite,
  onMakePrimary,
  onDelete,
  onQueueCrawl,
  onIgnoreFinding,
}: {
  form: WebsiteForm;
  websites: Website[];
  latestCrawls: Record<string, WebsiteCrawl>;
  auditFindings: Record<string, WebsiteAuditFinding[]>;
  isSubmitting: boolean;
  isLoading: boolean;
  isAddWebsiteFormVisible: boolean;
  queuedCrawlWebsiteId: string | null;
  ignoredFindingId: string | null;
  onUrlChange: (url: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onShowAddWebsiteForm: () => void;
  onCancelAddWebsite: () => void;
  onMakePrimary: (websiteId: string) => void;
  onDelete: (websiteId: string) => void;
  onQueueCrawl: (websiteId: string) => void;
  onIgnoreFinding: (websiteId: string, findingId: string) => void;
}) {
  const hasPrimaryWebsite = websites.some((website) => website.isPrimary);
  const isWebsiteManagementVisible =
    !hasPrimaryWebsite || isAddWebsiteFormVisible;
  const visibleWebsites = isWebsiteManagementVisible
    ? websites
    : websites.filter((website) => website.isPrimary);
  const shouldShowWebsiteForm = isWebsiteManagementVisible;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-slate-500">
            Websites
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">
            Audit-ready web presence
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Your primary website is the starting point for AI Visibility audits.
          </p>
        </div>
        {websites.length > 0 ? (
          <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
            {websites.length} saved
          </span>
        ) : null}
      </div>

      {websites.length === 0 ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No website exists yet. Add a website to prepare this business for its
          first audit.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {visibleWebsites.map((website) => (
            <div
              key={website.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              {(() => {
                const latestCrawl = latestCrawls[website.id];
                const websiteFindings = auditFindings[website.id] ?? [];

                return (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={website.normalizedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-slate-950 hover:text-cyan-700"
                          >
                            {website.domain}
                          </a>
                          {website.isPrimary ? (
                            <span className="rounded-full bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-800">
                              Primary
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 break-all text-sm text-slate-500">
                          {website.normalizedUrl}
                        </p>
                        <p className="mt-2 text-xs font-medium text-slate-500">
                          Latest crawl:{" "}
                          <span className="text-slate-700">
                            {latestCrawl
                              ? formatCrawlStatus(latestCrawl.status)
                              : "Not queued yet"}
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={
                            isLoading || queuedCrawlWebsiteId === website.id
                          }
                          onClick={() => onQueueCrawl(website.id)}
                          className="rounded-lg border border-cyan-200 px-3 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {queuedCrawlWebsiteId === website.id
                            ? "Starting scan..."
                            : latestCrawl
                              ? "Refresh website scan"
                              : "Scan website"}
                        </button>
                        {isWebsiteManagementVisible && !website.isPrimary ? (
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => onMakePrimary(website.id)}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Make primary
                          </button>
                        ) : null}
                        {isWebsiteManagementVisible ? (
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => onDelete(website.id)}
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <CrawlDetails crawl={latestCrawl} />
                    <AuditFindingsSection
                      websiteId={website.id}
                      findings={websiteFindings}
                      ignoredFindingId={ignoredFindingId}
                      onIgnoreFinding={onIgnoreFinding}
                    />
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {shouldShowWebsiteForm ? (
        <form
          onSubmit={onSubmit}
          className="mt-5 flex flex-col gap-3 sm:flex-row"
        >
          <label className="flex-1">
            <span className="text-sm font-medium text-slate-800">
              {websites.length === 0 ? "Add website" : "Add another website"}
            </span>
            <input
              value={form.url}
              placeholder="https://example.com"
              onChange={(event) => onUrlChange(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            />
          </label>
          <div className="flex gap-2 sm:mt-7">
            <button
              disabled={isSubmitting}
              type="submit"
              className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? "Saving..." : "Save website"}
            </button>
            {hasPrimaryWebsite ? (
              <button
                type="button"
                onClick={onCancelAddWebsite}
                className="h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={onShowAddWebsiteForm}
          className="mt-4 text-sm font-semibold text-slate-500 hover:text-cyan-700"
        >
          Manage websites
        </button>
      )}
    </div>
  );
}

function NextVisibilitySteps({
  hasPrimaryWebsite,
  googleBusinessProfile,
  form,
  isFormVisible,
  isSubmitting,
  onFieldChange,
  onSubmit,
  onShowForm,
  onCancelEdit,
  onEdit,
  onDisconnect,
  socialProfiles,
  socialProfileForm,
  editingSocialProfileId,
  isSocialProfileSubmitting,
  onSocialProfileFieldChange,
  onSocialProfileSubmit,
  onEditSocialProfile,
  onDeleteSocialProfile,
  onCancelSocialProfileEdit,
}: {
  hasPrimaryWebsite: boolean;
  googleBusinessProfile: GoogleBusinessProfile | null;
  form: GoogleBusinessProfileForm;
  isFormVisible: boolean;
  isSubmitting: boolean;
  onFieldChange: (
    field: keyof GoogleBusinessProfileForm,
    value: string,
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onShowForm: () => void;
  onCancelEdit: () => void;
  onEdit: () => void;
  onDisconnect: () => void;
  socialProfiles: SocialProfile[];
  socialProfileForm: SocialProfileForm;
  editingSocialProfileId: string | null;
  isSocialProfileSubmitting: boolean;
  onSocialProfileFieldChange: (
    field: keyof SocialProfileForm,
    value: string,
  ) => void;
  onSocialProfileSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEditSocialProfile: (profile: SocialProfile) => void;
  onDeleteSocialProfile: (socialProfileId: string) => void;
  onCancelSocialProfileEdit: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-slate-500">
            Next visibility steps
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">
            Finish the core business profile
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            BrandOS will combine website, local profile, and social signals
            before the first visibility score.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        <VisibilityStep
          title="Website connected"
          description={
            hasPrimaryWebsite
              ? "Primary website is ready for crawl preparation."
              : "Add the main website for this business."
          }
          state={hasPrimaryWebsite ? "complete" : "todo"}
        />
        <GoogleBusinessProfileSection
          profile={googleBusinessProfile}
          form={form}
          isFormVisible={isFormVisible}
          isSubmitting={isSubmitting}
          onFieldChange={onFieldChange}
          onSubmit={onSubmit}
          onShowForm={onShowForm}
          onCancelEdit={onCancelEdit}
          onEdit={onEdit}
          onDisconnect={onDisconnect}
        />
        <SocialProfilesSection
          profiles={socialProfiles}
          form={socialProfileForm}
          editingSocialProfileId={editingSocialProfileId}
          isSubmitting={isSocialProfileSubmitting}
          onFieldChange={onSocialProfileFieldChange}
          onSubmit={onSocialProfileSubmit}
          onEdit={onEditSocialProfile}
          onDelete={onDeleteSocialProfile}
          onCancelEdit={onCancelSocialProfileEdit}
        />
        <VisibilityStep
          title="Run first visibility audit"
          description="Audit scoring will unlock after the crawl and profile foundations land."
          state="disabled"
        />
      </div>
    </div>
  );
}

function GoogleBusinessProfileSection({
  profile,
  form,
  isFormVisible,
  isSubmitting,
  onFieldChange,
  onSubmit,
  onShowForm,
  onCancelEdit,
  onEdit,
  onDisconnect,
}: {
  profile: GoogleBusinessProfile | null;
  form: GoogleBusinessProfileForm;
  isFormVisible: boolean;
  isSubmitting: boolean;
  onFieldChange: (
    field: keyof GoogleBusinessProfileForm,
    value: string,
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onShowForm: () => void;
  onCancelEdit: () => void;
  onEdit: () => void;
  onDisconnect: () => void;
}) {
  if (profile && !isFormVisible) {
    return (
      <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-slate-950">
                Google Business Profile
              </p>
              <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">
                Manual connected
              </span>
            </div>
            {profile.businessName ? (
              <p className="mt-2 text-sm font-medium text-slate-800">
                {profile.businessName}
              </p>
            ) : null}
            <a
              href={profile.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block break-all text-sm font-medium text-cyan-700"
            >
              {profile.profileUrl}
            </a>
            {profile.address || profile.city || profile.country ? (
              <p className="mt-2 text-sm text-slate-600">
                {[profile.address, profile.city, profile.country]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            ) : null}
            {profile.phone ? (
              <p className="mt-1 text-sm text-slate-600">{profile.phone}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg border border-cyan-200 px-3 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-50"
            >
              Edit profile
            </button>
            <button
              type="button"
              onClick={onDisconnect}
              disabled={isSubmitting}
              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isFormVisible) {
    return (
      <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-semibold text-slate-950">
              Connect Google Business Profile
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Add a Google Maps or Google Business Profile URL manually. OAuth
              and live sync are coming later.
            </p>
          </div>
          <button
            type="button"
            onClick={onShowForm}
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Add profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-slate-950">
            {profile
              ? "Edit Google Business Profile"
              : "Add Google Business Profile"}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Save manual profile details for local visibility setup. This does
            not verify ownership or sync with Google.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        <InlineInput
          label="Google Business / Maps URL"
          value={form.profileUrl}
          placeholder="https://maps.google.com/..."
          onChange={(value) => onFieldChange("profileUrl", value)}
        />
        <InlineInput
          label="Business name"
          value={form.businessName}
          placeholder="Nobel Dental Clinic"
          onChange={(value) => onFieldChange("businessName", value)}
        />
        <InlineInput
          label="Address"
          value={form.address}
          placeholder="Street address"
          onChange={(value) => onFieldChange("address", value)}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <InlineInput
            label="City"
            value={form.city}
            placeholder="Berlin"
            onChange={(value) => onFieldChange("city", value)}
          />
          <InlineInput
            label="Country"
            value={form.country}
            placeholder="Germany"
            onChange={(value) => onFieldChange("country", value)}
          />
          <InlineInput
            label="Phone"
            value={form.phone}
            placeholder="+49..."
            onChange={(value) => onFieldChange("phone", value)}
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSubmitting ? "Saving..." : "Save profile"}
        </button>
        <button
          type="button"
          onClick={onCancelEdit}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function InlineInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
      />
    </label>
  );
}

function SocialProfilesSection({
  profiles,
  form,
  editingSocialProfileId,
  isSubmitting,
  onFieldChange,
  onSubmit,
  onEdit,
  onDelete,
  onCancelEdit,
}: {
  profiles: SocialProfile[];
  form: SocialProfileForm;
  editingSocialProfileId: string | null;
  isSubmitting: boolean;
  onFieldChange: (field: keyof SocialProfileForm, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEdit: (profile: SocialProfile) => void;
  onDelete: (socialProfileId: string) => void;
  onCancelEdit: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-slate-950">Social profiles</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Add optional public profile URLs manually. Posting, inbox, OAuth,
            and live sync are coming later.
          </p>
        </div>
        {profiles.length > 0 ? (
          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {profiles.length} saved
          </span>
        ) : null}
      </div>

      {profiles.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">
                      {formatSocialPlatform(profile.platform)}
                    </p>
                    <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700">
                      Manual connected
                    </span>
                    {profile.isPrimary ? (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        Primary
                      </span>
                    ) : null}
                  </div>
                  {profile.displayName ? (
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {profile.displayName}
                    </p>
                  ) : null}
                  {profile.handle ? (
                    <p className="mt-1 text-sm text-slate-500">
                      {profile.handle}
                    </p>
                  ) : null}
                  <a
                    href={profile.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block break-all text-sm font-medium text-cyan-700"
                  >
                    {profile.profileUrl}
                  </a>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(profile)}
                    className="rounded-lg border border-cyan-200 px-3 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => onDelete(profile.id)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-4 rounded-xl bg-white p-3">
        <p className="text-sm font-semibold text-slate-950">
          {editingSocialProfileId
            ? "Edit social profile"
            : "Add social profile"}
        </p>
        <div className="mt-3 grid gap-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Platform
            </span>
            <select
              value={form.platform}
              onChange={(event) =>
                onFieldChange(
                  "platform",
                  event.target.value as SocialProfilePlatform,
                )
              }
              className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            >
              {socialPlatforms.map((platform) => (
                <option key={platform} value={platform}>
                  {formatSocialPlatform(platform)}
                </option>
              ))}
            </select>
          </label>
          <InlineInput
            label="Profile URL"
            value={form.profileUrl}
            placeholder={socialProfilePlaceholder(form.platform)}
            onChange={(value) => onFieldChange("profileUrl", value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <InlineInput
              label="Handle"
              value={form.handle}
              placeholder="@brand"
              onChange={(value) => onFieldChange("handle", value)}
            />
            <InlineInput
              label="Display name"
              value={form.displayName}
              placeholder="Brand profile"
              onChange={(value) => onFieldChange("displayName", value)}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? "Saving..." : "Save social profile"}
          </button>
          {editingSocialProfileId ? (
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

function VisibilityStep({
  title,
  description,
  state,
  isPrimary = false,
}: {
  title: string;
  description: string;
  state: "complete" | "todo" | "coming-soon" | "optional" | "disabled";
  isPrimary?: boolean;
}) {
  const badgeByState = {
    complete: "Complete",
    todo: "Needed",
    "coming-soon": "Coming soon",
    optional: "Optional",
    disabled: "Coming later",
  } satisfies Record<typeof state, string>;
  const badgeClass =
    state === "complete"
      ? "bg-emerald-50 text-emerald-700"
      : isPrimary
        ? "bg-cyan-50 text-cyan-700"
        : "bg-slate-100 text-slate-600";

  return (
    <div
      className={`rounded-xl border p-4 ${
        isPrimary
          ? "border-cyan-200 bg-cyan-50/50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}
        >
          {badgeByState[state]}
        </span>
      </div>
    </div>
  );
}

function CrawlDetails({ crawl }: { crawl: WebsiteCrawl | undefined }) {
  if (!crawl) {
    return null;
  }

  if (crawl.status === "FAILED") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Crawl failed:{" "}
        {crawl.errorMessage ?? "The worker could not fetch this homepage."}
      </div>
    );
  }

  if (crawl.status !== "COMPLETED") {
    return null;
  }

  if (!crawl.metadata) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Crawl completed, but no homepage metadata was returned.
      </div>
    );
  }

  return <HomepageSignalsPanel metadata={crawl.metadata} />;
}

function AuditFindingsSection({
  websiteId,
  findings,
  ignoredFindingId,
  onIgnoreFinding,
}: {
  websiteId: string;
  findings: WebsiteAuditFinding[];
  ignoredFindingId: string | null;
  onIgnoreFinding: (websiteId: string, findingId: string) => void;
}) {
  const openFindings = findings.filter((finding) => finding.status === "OPEN");

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-950">Audit findings</p>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {openFindings.length} open
        </span>
      </div>
      {openFindings.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">
          No open findings yet. Run or refresh a website scan to generate
          deterministic homepage findings.
        </p>
      ) : (
        <div className="mt-3 grid gap-3">
          {openFindings.map((finding) => (
            <div
              key={finding.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${severityClass(
                        finding.severity,
                      )}`}
                    >
                      {formatEnumLabel(finding.severity)}
                    </span>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                      {formatEnumLabel(finding.category)}
                    </span>
                  </div>
                  <p className="mt-3 font-semibold text-slate-950">
                    {finding.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {finding.description}
                  </p>
                  {finding.recommendation ? (
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      <span className="font-semibold">Recommendation: </span>
                      {finding.recommendation}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={ignoredFindingId === finding.id}
                  onClick={() => onIgnoreFinding(websiteId, finding.id)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {ignoredFindingId === finding.id ? "Ignoring..." : "Ignore"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HomepageSignalsPanel({ metadata }: { metadata: CrawlMetadata }) {
  return (
    <div className="rounded-xl border border-cyan-100 bg-white px-4 py-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-950">Homepage signals</p>
        <span className="text-xs text-slate-500">
          Last fetched {formatDateTime(metadata.fetchedAt)}
        </span>
      </div>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <SignalItem label="Title" value={metadata.pageTitle ?? "Not found"} />
        <SignalItem label="HTTP status" value={String(metadata.httpStatus)} />
        <SignalItem
          label="Meta description"
          value={metadata.metaDescription ?? "Not found"}
        />
        <SignalItem label="H1 count" value={String(metadata.h1Count)} />
        <SignalItem
          label="Schema types"
          value={
            metadata.schemaTypes.length > 0
              ? metadata.schemaTypes.join(", ")
              : "None detected"
          }
        />
        <SignalItem label="Final URL" value={metadata.finalUrl} isBreakable />
      </dl>
    </div>
  );
}

function SignalItem({
  label,
  value,
  isBreakable = false,
}: {
  label: string;
  value: string;
  isBreakable?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </dt>
      <dd className={`mt-1 text-slate-700 ${isBreakable ? "break-all" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function FormHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function TextField({
  label,
  value,
  placeholder,
  help,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  help?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
      />
      {help ? (
        <span className="mt-1 block text-xs text-slate-500">{help}</span>
      ) : null}
    </label>
  );
}

function SubmitButton({
  children,
  disabled,
  loading,
}: {
  children: string;
  disabled: boolean;
  loading: boolean;
}) {
  return (
    <button
      disabled={disabled}
      type="submit"
      className="h-11 w-full rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      {loading ? "Saving..." : children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

function ProgressItem({
  active,
  done,
  children,
}: {
  active: boolean;
  done: boolean;
  children: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
        active
          ? "border-cyan-300/40 bg-cyan-300/10 text-white"
          : "border-white/10 bg-white/5"
      }`}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
          done ? "bg-cyan-300 text-slate-950" : "bg-white/10 text-slate-300"
        }`}
      >
        {done ? "OK" : ""}
      </span>
      <span>{children}</span>
    </div>
  );
}

function Alert({
  tone,
  message,
}: {
  tone: "error" | "success";
  message: string;
}) {
  const classes =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div className={`mb-5 rounded-xl border px-4 py-3 text-sm ${classes}`}>
      {message}
    </div>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-600">
      {children}
    </span>
  );
}

async function getJson<TResponse>(url: string): Promise<TResponse> {
  const response = await fetch(url);
  return parseJsonResponse<TResponse>(response);
}

type JsonBody = Record<string, string | boolean>;

async function postJson<TResponse>(
  url: string,
  body: JsonBody,
): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return parseJsonResponse<TResponse>(response);
}

async function patchJson<TResponse>(
  url: string,
  body: JsonBody,
): Promise<TResponse> {
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return parseJsonResponse<TResponse>(response);
}

async function deleteJson<TResponse>(url: string): Promise<TResponse> {
  const response = await fetch(url, {
    method: "DELETE",
  });

  return parseJsonResponse<TResponse>(response);
}

async function loadLatestCrawls(
  apiBaseUrl: string,
  organizationId: string,
  businessId: string,
  websites: Website[],
) {
  const entries = await Promise.all(
    websites.map(async (website) => {
      const crawls = await getJson<WebsiteCrawl[]>(
        `${apiBaseUrl}/organizations/${organizationId}/businesses/${businessId}/websites/${website.id}/crawls`,
      );

      return [website.id, crawls[0]] as const;
    }),
  );

  return Object.fromEntries(
    entries.filter(
      (entry): entry is readonly [string, WebsiteCrawl] =>
        entry[1] !== undefined,
    ),
  );
}

async function loadAuditFindings(
  apiBaseUrl: string,
  organizationId: string,
  businessId: string,
  websites: Website[],
) {
  const entries = await Promise.all(
    websites.map(async (website) => {
      const findings = await getJson<WebsiteAuditFinding[]>(
        `${apiBaseUrl}/organizations/${organizationId}/businesses/${businessId}/websites/${website.id}/audit-findings`,
      );

      return [website.id, findings] as const;
    }),
  );

  return Object.fromEntries(entries);
}

async function loadGoogleBusinessProfile(
  apiBaseUrl: string,
  organizationId: string,
  businessId: string,
) {
  return getJson<GoogleBusinessProfile | null>(
    `${apiBaseUrl}/organizations/${organizationId}/businesses/${businessId}/google-business-profile`,
  );
}

async function loadSocialProfiles(
  apiBaseUrl: string,
  organizationId: string,
  businessId: string,
) {
  return getJson<SocialProfile[]>(
    `${apiBaseUrl}/organizations/${organizationId}/businesses/${businessId}/social-profiles`,
  );
}

async function loadVisibilityScore(
  apiBaseUrl: string,
  organizationId: string,
  businessId: string,
) {
  return getJson<BusinessVisibilityScore | null>(
    `${apiBaseUrl}/organizations/${organizationId}/businesses/${businessId}/visibility-score`,
  );
}

async function loadRecommendations(
  apiBaseUrl: string,
  organizationId: string,
  businessId: string,
) {
  const recommendations = await getJson<BusinessRecommendation[]>(
    `${apiBaseUrl}/organizations/${organizationId}/businesses/${businessId}/recommendations`,
  );

  return sortRecommendations(recommendations);
}

async function parseJsonResponse<TResponse>(
  response: Response,
): Promise<TResponse> {
  const payload = (await response.json()) as TResponse | ApiErrorResponse;

  if (!response.ok) {
    throw new Error(readApiError(payload));
  }

  return payload as TResponse;
}

function compactPayload(values: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value.length > 0),
  );
}

function validateOrganization(form: OrganizationForm) {
  if (!form.name.trim()) {
    return "Organization name is required.";
  }

  return validateSlug(form.slug, "Organization slug");
}

function validateBusiness(form: BusinessForm) {
  if (!form.name.trim()) {
    return "Business name is required.";
  }

  const slugError = validateSlug(form.slug, "Business slug");
  if (slugError) {
    return slugError;
  }

  if (form.websiteUrl.trim() && !isValidUrl(form.websiteUrl.trim())) {
    return "Website URL must include a valid protocol, for example https://example.com.";
  }

  return null;
}

function validateSlug(value: string, label: string) {
  const slug = value.trim();

  if (!slug) {
    return `${label} is required.`;
  }

  if (!slugPattern.test(slug)) {
    return `${label} can use lowercase letters, numbers, and single hyphens only.`;
  }

  return null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isGoogleBusinessProfileUrl(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    const pathname = url.pathname.toLowerCase();

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }

    if (hostname === "maps.app.goo.gl") {
      return pathname.length > 1;
    }

    if (hostname === "goo.gl") {
      return pathname.startsWith("/maps/");
    }

    if (hostname === "maps.google.com") {
      return true;
    }

    if (hostname === "business.google.com") {
      return true;
    }

    if (hostname === "google.com") {
      return (
        pathname === "/maps" ||
        pathname.startsWith("/maps/") ||
        (pathname === "/search" && url.searchParams.has("q"))
      );
    }

    return false;
  } catch {
    return false;
  }
}

function isSocialProfileUrl(platform: SocialProfilePlatform, value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (!isSafePublicHttpUrl(url)) {
    return false;
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

  return (
    platform === "OTHER" ||
    (platform === "INSTAGRAM" && hostname === "instagram.com") ||
    (platform === "FACEBOOK" &&
      (hostname === "facebook.com" || hostname === "fb.com")) ||
    (platform === "TIKTOK" && hostname === "tiktok.com") ||
    (platform === "LINKEDIN" && hostname === "linkedin.com") ||
    (platform === "YOUTUBE" &&
      (hostname === "youtube.com" || hostname === "youtu.be")) ||
    (platform === "X" && (hostname === "x.com" || hostname === "twitter.com"))
  );
}

function isSafePublicHttpUrl(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    hostname.length > 0 &&
    hostname !== "localhost" &&
    !hostname.endsWith(".localhost") &&
    !hostname.endsWith(".local") &&
    !hostname.endsWith(".internal") &&
    !isPrivateIp(hostname)
  );
}

function isPrivateIp(hostname: string) {
  const ipv4Match = /^(\d{1,3})(?:\.(\d{1,3})){3}$/.test(hostname);
  if (!ipv4Match) {
    return (
      hostname === "::" || hostname === "::1" || hostname.startsWith("fe80:")
    );
  }

  const octets = hostname.split(".").map(Number);
  const [first = 0, second = 0] = octets;

  return (
    octets.some((octet) => octet < 0 || octet > 255) ||
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

function sortWebsites(items: Website[]) {
  return [...items].sort((left, right) => {
    if (left.isPrimary !== right.isPrimary) {
      return left.isPrimary ? -1 : 1;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
}

function sortSocialProfiles(items: SocialProfile[]) {
  return [...items].sort((left, right) => {
    if (left.isPrimary !== right.isPrimary) {
      return left.isPrimary ? -1 : 1;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
}

function sortRecommendations(items: BusinessRecommendation[]) {
  const priorityRank = {
    HIGH: 0,
    MEDIUM: 1,
    LOW: 2,
  } satisfies Record<BusinessRecommendation["priority"], number>;
  const statusRank = {
    OPEN: 0,
    DONE: 1,
    IGNORED: 2,
  } satisfies Record<BusinessRecommendation["status"], number>;

  return [...items].sort((left, right) => {
    const statusDifference = statusRank[left.status] - statusRank[right.status];
    if (statusDifference !== 0) {
      return statusDifference;
    }

    const priorityDifference =
      priorityRank[left.priority] - priorityRank[right.priority];
    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
}

function formatSocialPlatform(platform: SocialProfilePlatform) {
  const labels = {
    INSTAGRAM: "Instagram",
    FACEBOOK: "Facebook",
    TIKTOK: "TikTok",
    LINKEDIN: "LinkedIn",
    YOUTUBE: "YouTube",
    X: "X / Twitter",
    OTHER: "Other",
  } satisfies Record<SocialProfilePlatform, string>;

  return labels[platform];
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.replace(/^\w/, (letter) => letter.toUpperCase()))
    .join(" ");
}

function orderedVisibilityBreakdown(score: BusinessVisibilityScore) {
  const order = [
    "websiteFoundation",
    "localPresence",
    "socialPresence",
    "auditHealth",
  ];

  return order
    .map((key) => score.breakdown[key])
    .filter(
      (section): section is VisibilityBreakdownSection =>
        section !== undefined,
    );
}

function visibilityRawScore(score: BusinessVisibilityScore) {
  if (typeof score.inputs?.rawScore === "number") {
    return score.inputs.rawScore;
  }

  return orderedVisibilityBreakdown(score).reduce(
    (total, section) => total + section.earned,
    0,
  );
}

function visibilityCappedScore(score: BusinessVisibilityScore) {
  if (typeof score.inputs?.cappedScore === "number") {
    return score.inputs.cappedScore;
  }

  if (typeof score.inputs?.finalScore === "number") {
    return score.inputs.finalScore;
  }

  return score.score;
}

function severityClass(severity: WebsiteAuditFinding["severity"]) {
  const classes = {
    HIGH: "bg-red-50 text-red-700",
    MEDIUM: "bg-amber-50 text-amber-700",
    LOW: "bg-cyan-50 text-cyan-700",
    INFO: "bg-slate-100 text-slate-600",
  } satisfies Record<WebsiteAuditFinding["severity"], string>;

  return classes[severity];
}

function recommendationPriorityClass(
  priority: BusinessRecommendation["priority"],
) {
  const classes = {
    HIGH: "bg-red-50 text-red-700",
    MEDIUM: "bg-amber-50 text-amber-700",
    LOW: "bg-cyan-50 text-cyan-700",
  } satisfies Record<BusinessRecommendation["priority"], string>;

  return classes[priority];
}

function socialProfilePlaceholder(platform: SocialProfilePlatform) {
  const placeholders = {
    INSTAGRAM: "https://instagram.com/brand",
    FACEBOOK: "https://facebook.com/brand",
    TIKTOK: "https://tiktok.com/@brand",
    LINKEDIN: "https://linkedin.com/company/brand",
    YOUTUBE: "https://youtube.com/@brand",
    X: "https://x.com/brand",
    OTHER: "https://example.com/profile",
  } satisfies Record<SocialProfilePlatform, string>;

  return placeholders[platform];
}

function removeKey<TValue>(record: Record<string, TValue>, key: string) {
  const nextRecord = { ...record };
  delete nextRecord[key];
  return nextRecord;
}

function formatCrawlStatus(status: WebsiteCrawl["status"]) {
  return status.toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function readApiError(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }

  return "The API could not complete the request.";
}
