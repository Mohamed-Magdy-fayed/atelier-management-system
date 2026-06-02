import { caseStudyPublishedEvent, inngest } from "../client";

export const onCaseStudyPublished = inngest.createFunction(
  { id: "on-case-study-published", triggers: [caseStudyPublishedEvent] },
  async ({ event }) => {
    const url = `https://gateling.com/work/${event.data.slug}`;
    try {
      await fetch(
        `https://api.indexnow.org/indexnow?url=${encodeURIComponent(url)}&key=gateling`,
      );
    } catch {
      // Non-fatal
    }
    return { pinged: url };
  },
);
