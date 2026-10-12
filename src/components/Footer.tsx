import { Link } from 'react-router';
import { brand } from '../config/brand';
import { paths } from '../config/routes';
import { ButtonLink } from './Button';
import { Container } from './Container';
import { Wordmark } from './Wordmark';

const links = [
  { label: 'Products', to: paths.products },
  { label: 'Services', to: paths.services },
  { label: 'How it works', to: paths.howItWorks },
  { label: 'Privacy policy', to: paths.privacy },
];

export function Footer() {
  return (
    <footer className="on-inverse bg-inverse text-on-inverse">
      <Container className="grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Wordmark inverse />
          <p className="mt-4 max-w-sm leading-relaxed text-on-inverse-muted">{brand.shortDescription}</p>
        </div>
        <nav aria-label="Footer">
          <h2 className="text-sm font-semibold text-on-inverse-muted">Explore</h2>
          <ul className="mt-3 space-y-1">
            {links.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="inline-flex min-h-9 items-center text-on-inverse hover:underline hover:decoration-accent hover:decoration-2 hover:underline-offset-4">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="text-sm font-semibold text-on-inverse-muted">Have a workflow problem?</h2>
          <p className="mt-3 text-on-inverse">Tell us what slows your business down.</p>
          <ButtonLink to={paths.inquiry} size="sm" className="mt-4">
            Start an inquiry
          </ButtonLink>
        </div>
      </Container>
      <Container className="border-t border-inverse-line py-6 text-sm text-on-inverse-muted">
        <p>
          © {new Date().getFullYear()} {brand.name}. Products shown are in development or planned; demos use sample data.
        </p>
      </Container>
    </footer>
  );
}
