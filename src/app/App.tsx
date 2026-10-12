import { BrowserRouter, Route, Routes } from 'react-router';
import { SiteLayout } from './SiteLayout';
import { ScrollToTop } from './ScrollToTop';
import { HomePage } from '../pages/HomePage';
import { ProductsPage } from '../pages/ProductsPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { ProductDemoPage } from '../pages/ProductDemoPage';
import { ServicesPage } from '../pages/ServicesPage';
import { HowItWorksPage } from '../pages/HowItWorksPage';
import { InquiryPage } from '../pages/InquiryPage';
import { InquiryThanksPage } from '../pages/InquiryThanksPage';
import { PrivacyPage } from '../pages/PrivacyPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Demos render as a full-screen app with their own top bar. */}
        <Route path="/products/:slug/try" element={<ProductDemoPage />} />
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:slug" element={<ProductDetailPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="how-it-works" element={<HowItWorksPage />} />
          <Route path="workflow" element={<InquiryPage />} />
          <Route path="workflow/thanks" element={<InquiryThanksPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
