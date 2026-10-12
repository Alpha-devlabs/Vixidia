import { usePageMeta } from '../hooks/usePageMeta';
import { ButtonLink } from '../components/Button';
import { Container } from '../components/Container';
import { paths } from '../config/routes';

interface NotFoundContentProps {
  title?: string;
  message?: string;
}

export function NotFoundContent({
  title = 'This page doesn’t exist',
  message = 'The link may be mistyped, or the page may have moved. Try one of these instead.',
}: NotFoundContentProps) {
  return (
    <Container className="py-20 sm:py-28">
      <p className="tabular text-6xl font-bold tracking-[-0.04em] text-line-strong sm:text-7xl" aria-hidden="true">
        404
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-[-0.02em] sm:text-4xl">{title}</h1>
      <p className="mt-4 max-w-[52ch] text-lg text-fg-muted">{message}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink to={paths.products}>See all products</ButtonLink>
        <ButtonLink to={paths.home} variant="secondary">
          Go to the homepage
        </ButtonLink>
      </div>
    </Container>
  );
}

export function NotFoundPage() {
  usePageMeta('Page not found');
  return <NotFoundContent />;
}
