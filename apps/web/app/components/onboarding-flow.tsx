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
  const [latestCrawls, setLatestCrawls] = useState<
    Record<string, WebsiteCrawl>
  >({});
  const [websiteForm, setWebsiteForm] =
    useState<WebsiteForm>(initialWebsiteForm);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWebsiteSubmitting, setIsWebsiteSubmitting] = useState(false);
  const [isWebsiteLoading, setIsWebsiteLoading] = useState(false);
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
              `${apiBaseUrl}/organizations/${selectedOrganizationId}/businesses/${restoredBusiness.id}/websites`,
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

        if (!isMounted) {
          return;
        }

        setOrganization(restoredOrganization);
        setAvailableOrganizations(organizations);
        setBusinesses(restoredBusinesses);
        setBusiness(restoredBusiness);
        setWebsites(restoredWebsites);
        setLatestCrawls(restoredCrawls);
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
        setLatestCrawls({});
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
      setLatestCrawls({});
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
      setBusiness(createdBusiness);
      setBusinesses((current) => [createdBusiness, ...current]);
      setWebsites([]);
      setLatestCrawls({});
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
    setLatestCrawls({});
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

      window.localStorage.setItem(
        selectedOrganizationStorageKey,
        selectedOrganization.id,
      );
      setOrganization(selectedOrganization);
      setBusinesses(selectedBusinesses);
      setBusiness(selectedBusiness);
      setWebsites(selectedWebsites);
      setLatestCrawls(selectedCrawls);
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
    setLatestCrawls({});
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
      setWebsiteForm(initialWebsiteForm);
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
      setWebsites((current) =>
        current.filter((website) => website.id !== deletedWebsite.id),
      );
      setLatestCrawls((current) => removeKey(current, deletedWebsite.id));
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

  if (isRestoring) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/10 px-6 py-5 text-sm text-slate-200">
          Loading your BrandOS workspace...
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

          {step === "workspace" && organization && business ? (
            <WorkspaceDashboard
              organization={organization}
              business={business}
              businessCount={businesses.length}
              websiteForm={websiteForm}
              websites={websites}
              latestCrawls={latestCrawls}
              isWebsiteSubmitting={isWebsiteSubmitting}
              isWebsiteLoading={isWebsiteLoading}
              queuedCrawlWebsiteId={queuedCrawlWebsiteId}
              onCreateAnotherBusiness={createAnotherBusiness}
              onWebsiteUrlChange={(url) => setWebsiteForm({ url })}
              onWebsiteSubmit={handleWebsiteSubmit}
              onMakePrimaryWebsite={makePrimaryWebsite}
              onDeleteWebsite={deleteWebsite}
              onQueueWebsiteCrawl={queueWebsiteCrawl}
              onSwitchWorkspace={switchWorkspace}
            />
          ) : null}
        </div>
      </section>
    </main>
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
  organization,
  business,
  businessCount,
  websiteForm,
  websites,
  latestCrawls,
  isWebsiteSubmitting,
  isWebsiteLoading,
  queuedCrawlWebsiteId,
  onCreateAnotherBusiness,
  onWebsiteUrlChange,
  onWebsiteSubmit,
  onMakePrimaryWebsite,
  onDeleteWebsite,
  onQueueWebsiteCrawl,
  onSwitchWorkspace,
}: {
  organization: Organization;
  business: Business;
  businessCount: number;
  websiteForm: WebsiteForm;
  websites: Website[];
  latestCrawls: Record<string, WebsiteCrawl>;
  isWebsiteSubmitting: boolean;
  isWebsiteLoading: boolean;
  queuedCrawlWebsiteId: string | null;
  onCreateAnotherBusiness: () => void;
  onWebsiteUrlChange: (url: string) => void;
  onWebsiteSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onMakePrimaryWebsite: (websiteId: string) => void;
  onDeleteWebsite: (websiteId: string) => void;
  onQueueWebsiteCrawl: (websiteId: string) => void;
  onSwitchWorkspace: () => void;
}) {
  return (
    <div className="space-y-6">
      <FormHeader
        eyebrow="Workspace"
        title={organization.name}
        description="Your business workspace is ready for the first visibility audit."
      />
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-slate-500">
          Business
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          {business.name}
        </h2>
        {business.websiteUrl ? (
          <a
            href={business.websiteUrl}
            className="mt-2 inline-block text-sm font-medium text-cyan-700"
            target="_blank"
            rel="noreferrer"
          >
            {business.websiteUrl}
          </a>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No website added yet.</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-600">
          {business.category ? <Pill>{business.category}</Pill> : null}
          {business.city ? <Pill>{business.city}</Pill> : null}
          {business.country ? <Pill>{business.country}</Pill> : null}
          <Pill>
            {businessCount} {businessCount === 1 ? "business" : "businesses"}
          </Pill>
        </div>
      </div>

      <WebsiteSection
        form={websiteForm}
        websites={websites}
        latestCrawls={latestCrawls}
        isSubmitting={isWebsiteSubmitting}
        isLoading={isWebsiteLoading}
        queuedCrawlWebsiteId={queuedCrawlWebsiteId}
        onUrlChange={onWebsiteUrlChange}
        onSubmit={onWebsiteSubmit}
        onMakePrimary={onMakePrimaryWebsite}
        onDelete={onDeleteWebsite}
        onQueueCrawl={onQueueWebsiteCrawl}
      />

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5">
          <p className="text-sm font-medium text-cyan-700">
            AI Visibility Score
          </p>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-5xl font-semibold text-slate-950">--</span>
            <span className="pb-2 text-sm font-medium text-slate-500">
              pending first audit
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Scores will become explainable once website intelligence, local
            profile, reviews, and recommendation signals are connected.
          </p>
        </div>
        <button
          disabled
          className="rounded-2xl bg-slate-200 px-6 py-4 text-sm font-semibold text-slate-500"
          type="button"
        >
          Run first audit
          <span className="block text-xs font-normal">Coming next</span>
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <SecondaryButton onClick={onCreateAnotherBusiness}>
          Create another business
        </SecondaryButton>
        <SecondaryButton onClick={onSwitchWorkspace}>
          Switch workspace
        </SecondaryButton>
      </div>
    </div>
  );
}

function WebsiteSection({
  form,
  websites,
  latestCrawls,
  isSubmitting,
  isLoading,
  queuedCrawlWebsiteId,
  onUrlChange,
  onSubmit,
  onMakePrimary,
  onDelete,
  onQueueCrawl,
}: {
  form: WebsiteForm;
  websites: Website[];
  latestCrawls: Record<string, WebsiteCrawl>;
  isSubmitting: boolean;
  isLoading: boolean;
  queuedCrawlWebsiteId: string | null;
  onUrlChange: (url: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onMakePrimary: (websiteId: string) => void;
  onDelete: (websiteId: string) => void;
  onQueueCrawl: (websiteId: string) => void;
}) {
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
            Add the domains BrandOS will later use for AI Visibility audits.
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
          {websites.map((website) => (
            <div
              key={website.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              {(() => {
                const latestCrawl = latestCrawls[website.id];

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
                            ? "Queueing..."
                            : "Queue crawl"}
                        </button>
                        {!website.isPrimary ? (
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => onMakePrimary(website.id)}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Make primary
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => onDelete(website.id)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <CrawlDetails crawl={latestCrawl} />
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

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
        <button
          disabled={isSubmitting}
          type="submit"
          className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:mt-7"
        >
          {isSubmitting ? "Saving..." : "Save website"}
        </button>
      </form>
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

async function getJson<TResponse extends object>(
  url: string,
): Promise<TResponse> {
  const response = await fetch(url);
  return parseJsonResponse<TResponse>(response);
}

type JsonBody = Record<string, string | boolean>;

async function postJson<TResponse extends object>(
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

async function patchJson<TResponse extends object>(
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

async function deleteJson<TResponse extends object>(
  url: string,
): Promise<TResponse> {
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

async function parseJsonResponse<TResponse extends object>(
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

function sortWebsites(items: Website[]) {
  return [...items].sort((left, right) => {
    if (left.isPrimary !== right.isPrimary) {
      return left.isPrimary ? -1 : 1;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
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

function readApiError(payload: ApiErrorResponse | object) {
  if (
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
