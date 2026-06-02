import { onBlogPostPublished } from "./on-blog-post-published";
import { onCaseStudyPublished } from "./on-case-study-published";
import { onLeadStatusChanged } from "./on-lead-status-changed";
import { onLeadSubmitted } from "./on-lead-submitted";
import { onSubscriberCreated } from "./on-subscriber-created";
import { onUserRegistered } from "./on-user-registered";

export const functions = [
  onLeadSubmitted,
  onSubscriberCreated,
  onCaseStudyPublished,
  onBlogPostPublished,
  onUserRegistered,
  onLeadStatusChanged,
];
