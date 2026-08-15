import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
}

export const SEO: React.FC<SEOProps> = ({ title, description }) => {
  const location = useLocation();

  useEffect(() => {
    const defaultTitle = 'Shiv Stone Crusher | High-Quality Aggregates & Crushed Stone Supplier';
    const defaultDescription = 'Shiv Stone Crusher is a leading manufacturer & supplier of premium crushed stone, aggregates, blue metal (20mm, 10mm, 40mm), quarry dust, and construction materials.';

    document.title = title ? `${title} | Shiv Stone Crusher` : defaultTitle;

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description || defaultDescription);
    }
  }, [title, description, location.pathname]);

  return null;
};
