/** Static site paths. Product paths are built from the registry in utils/products. */
export const paths = {
  home: '/',
  products: '/products',
  services: '/services',
  howItWorks: '/how-it-works',
  inquiry: '/workflow',
  inquiryThanks: '/workflow/thanks',
  privacy: '/privacy',
} as const;

export const mainNav = [
  { label: 'Solutions', to: paths.products },
  { label: 'Services', to: paths.services },
  { label: 'How it works', to: paths.howItWorks },
] as const;
