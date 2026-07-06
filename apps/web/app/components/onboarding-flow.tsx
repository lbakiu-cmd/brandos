"use client";

import { FormEvent, useMemo, useState } from "react";

type Step = "organization" | "business" | "workspace";

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

export function OnboardingFlow() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
  const [step, setStep] = useState<Step>("organization");
  const [organizationForm, setOrganizationForm] = useState<OrganizationForm>(
    initialOrganizationForm,
  );
  const [businessForm, setBusinessForm] =
    useState<BusinessForm>(initialBusinessForm);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      setOrganization(createdOrganization);
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
              active={step === "organization"}
              done={Boolean(organization)}
            >
              Create organization
            </ProgressItem>
            <ProgressItem active={step === "business"} done={Boolean(business)}>
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

          {step === "business" && organization ? (
            <BusinessStep
              form={businessForm}
              isSubmitting={isSubmitting}
              organization={organization}
              validationError={businessValidation}
              onFieldChange={(field, value) =>
                setBusinessForm((current) => ({ ...current, [field]: value }))
              }
              onNameChange={updateBusinessName}
              onSubmit={handleBusinessSubmit}
            />
          ) : null}

          {step === "workspace" && organization && business ? (
            <WorkspaceDashboard
              organization={organization}
              business={business}
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

function BusinessStep({
  form,
  isSubmitting,
  organization,
  validationError,
  onFieldChange,
  onNameChange,
  onSubmit,
}: {
  form: BusinessForm;
  isSubmitting: boolean;
  organization: Organization;
  validationError: string | null;
  onFieldChange: (field: keyof BusinessForm, value: string) => void;
  onNameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <FormHeader
        eyebrow="Step 2"
        title="Add your first business"
        description={`Organization: ${organization.name}`}
      />
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
    </form>
  );
}

function WorkspaceDashboard({
  organization,
  business,
}: {
  organization: Organization;
  business: Business;
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
        </div>
      </div>

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
        {done ? "✓" : ""}
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

function Pill({ children }: { children: string }) {
  return (
    <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-600">
      {children}
    </span>
  );
}

async function postJson<TResponse extends object>(
  url: string,
  body: Record<string, string>,
): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function readApiError(payload: TResponseOrError) {
  if (
    typeof payload === "object" &&
    payload !== null &&
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

type TResponseOrError = ApiErrorResponse | object;
