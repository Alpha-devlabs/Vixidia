import { useEffect } from 'react';
import { brand, pageTitle } from '../config/brand';

const defaultDescription = brand.shortDescription;

/** Sets the document title and meta description for the current route. */
export function usePageMeta(title: string | undefined, description: string = defaultDescription): void {
  useEffect(() => {
    document.title = pageTitle(title);
    let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = 'description';
      document.head.appendChild(tag);
    }
    tag.content = description;
  }, [title, description]);
}
