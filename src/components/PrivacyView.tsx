import { useEffect, type ReactNode } from 'react';

// Plain-language notice describing what this site actually does with data.
// Every statement here was written from the code paths in this repository and
// the wgc-lead-pipeline repository. If a data flow changes, update this page in
// the same pull request. Reviewed wording from counsel replaces this text as-is.

const UPDATED = 'November 10, 2026';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-heading text-xl font-bold text-ink">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-on-surface-variant">{children}</div>
    </section>
  );
}

export function PrivacyView() {
  useEffect(() => {
    document.title = 'Privacy Notice | Westrom Owner Advisory Hub';
  }, []);

  return (
    <div className="container-page flex-grow py-12 md:py-16">
      <article className="card mx-auto max-w-3xl p-6 md:p-12">
        <p className="eyebrow">Privacy</p>
        <h1 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Privacy notice</h1>
        <p className="mb-10 mt-2 text-sm text-on-surface-variant">Last updated {UPDATED}</p>

        <Section title="Who we are">
          <p>
            This site (wgcassetguide.com) is operated by Westrom Group, a property management company serving
            Dallas&ndash;Fort Worth rental owners. This notice explains what information the site&rsquo;s tools use,
            who processes it, and how long it is kept.
          </p>
        </Section>

        <Section title="Property tax and insurance tools">
          <p>
            When you upload an appraisal notice or insurance declarations page, PDFs are converted to an image in
            your own browser first. The image is sent to our server and to an AI document-reading service
            (currently Google Gemini, with OpenRouter as a backup) to read the values on the page. To write the
            short recommendation, the numbers and policy details from your analysis (not the document itself, and not your address)
            are sent to an AI text service (Google Gemini or Groq).
          </p>
          <p>
            If you type a property address, we use it to look up the public appraisal record for that property from
            the county appraisal district or a property-data provider (ATTOM).
          </p>
          <p>
            We do not save your uploaded documents, addresses or results in a database. Our servers keep short
            technical logs (such as your IP address, the time of the request and an error reference) for security
            and troubleshooting. These logs do not contain your documents or addresses.
          </p>
        </Section>

        <Section title="Free rental analysis form">
          <p>
            The rent estimate uses only your ZIP code, square footage and bedroom count. The estimate is calculated
            from Westrom Group&rsquo;s own lease records and, when we have none nearby, from ZIP-level market
            statistics (RentCast). No address or contact information is used for the estimate.
          </p>
          <p>
            If you tick the box to receive our free guide, we also collect your email address and a record of your
            consent (the consent wording version, the time, your IP address and your browser type). We then: email
            you the guide, create a lead in our customer-management system (LeadSimple) so a team member can follow up,
            and notify our team by email. Emails are delivered by our email provider (Brevo). The form is processed
            by our workflow automation service (n8n), which keeps records of each run for a limited period and then
            deletes them automatically.
          </p>
        </Section>

        <Section title="Bot protection and analytics">
          <p>
            We use Cloudflare to protect and speed up this site. Cloudflare Turnstile may run a brief, usually
            invisible check to confirm a visitor is not an automated bot, and Cloudflare Web Analytics measures page
            visits without using cookies. Requests are rate limited by IP address to prevent abuse.
          </p>
        </Section>

        <Section title="What we do not do">
          <ul className="list-disc pl-6 space-y-2">
            <li>We do not sell your personal information.</li>
            <li>We do not use your uploaded documents to train AI models.</li>
            <li>We do not place advertising or cross-site tracking cookies.</li>
          </ul>
        </Section>

        <Section title="Your choices">
          <p>
            You can use the tax and insurance tools without giving us any contact information, and the rental form
            works without an email address. To ask what information we hold about you, to correct it, or to have it
            deleted, or to stop receiving emails from us, contact us at{' '}
            <a className="text-link" href="mailto:info@westromgroup.com">info@westromgroup.com</a> or
            through{' '}
            <a className="text-link" href="https://westromgroup.com/contact-us/" rel="noopener noreferrer">
              westromgroup.com/contact-us
            </a>.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            If we change how these tools use information, we will update this page and the date above.
          </p>
        </Section>
      </article>
    </div>
  );
}
