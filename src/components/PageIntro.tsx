import type { ReactNode } from 'react';
import { Container } from './Container';

interface PageIntroProps {
  title: string;
  lead: ReactNode;
  children?: ReactNode;
}

/** Standard top-of-page heading block used by inner pages. */
export function PageIntro({ title, lead, children }: PageIntroProps) {
  return (
    <header className="border-b border-line bg-surface">
      <Container className="py-14 sm:py-20">
        <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.03em] text-balance sm:text-5xl">{title}</h1>
        <div className="mt-5 max-w-[62ch] text-lg leading-relaxed text-fg-muted">{lead}</div>
        {children ? <div className="mt-8 flex flex-wrap gap-3">{children}</div> : null}
      </Container>
    </header>
  );
}
