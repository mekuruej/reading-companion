export type JapaneseLearningBookHubCta = {
  label: string;
  href: string;
};

export function getJapaneseLearningBookHubCta({
  hasAccess,
  canSubscribe,
  requiresApproval,
}: {
  hasAccess: boolean;
  canSubscribe: boolean | null;
  requiresApproval: boolean;
}): JapaneseLearningBookHubCta {
  if (hasAccess) {
    return { label: "Open Japanese Learning", href: "/library-study" };
  }

  if (!requiresApproval && canSubscribe !== false) {
    return { label: "Get Japanese Learning access", href: "/reading-access" };
  }

  return {
    label: "Request Japanese Learning access",
    href: "/japanese-learning?source=book_hub",
  };
}
