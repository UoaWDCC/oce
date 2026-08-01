export type SiteGuideEntry = {
  id: string;
  keywords: string[];
  title: string;
  path?: string;
  access?: string;
  steps: string[];
  notes?: string[];
};

export const SITE_GUIDE: SiteGuideEntry[] = [];
