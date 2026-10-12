import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { Menu, X } from 'lucide-react';
import { brand } from '../config/brand';
import { mainNav, paths } from '../config/routes';
import { ButtonLink } from './Button';
import { Container } from './Container';
import { Wordmark } from './Wordmark';
import { ThemeToggle } from '../theme/ThemeToggle';
import { cn } from '../utils/cn';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-[var(--radius-control)] px-3 py-2 text-[0.95rem] font-medium transition-colors',
    isActive ? 'text-fg underline decoration-accent decoration-[3px] underline-offset-[10px]' : 'text-fg-muted hover:text-fg',
  );

export function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the mobile menu after navigating.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link to={paths.home} className="rounded-md" aria-label={`${brand.name} home`}>
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {mainNav.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <ButtonLink to={paths.products} size="sm">
            Explore products
          </ButtonLink>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] text-fg hover:bg-subtle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
        </div>
      </Container>

      {open ? (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-line bg-surface md:hidden">
          <Container className="flex flex-col py-3">
            {mainNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-12 items-center border-b border-line text-base font-medium last:border-0',
                    isActive ? 'text-fg' : 'text-fg-muted',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <ButtonLink to={paths.products} className="mt-4 mb-2 w-full">
              Explore products
            </ButtonLink>
          </Container>
        </nav>
      ) : null}
    </header>
  );
}
