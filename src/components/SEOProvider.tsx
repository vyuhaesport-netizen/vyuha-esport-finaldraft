import { HelmetProvider } from 'react-helmet-async';
import { ReactNode } from 'react';

interface SEOProviderProps {
  children: ReactNode;
}

const SEOProvider = ({ children }: SEOProviderProps) => {
  return (
    <HelmetProvider>
      {children}
    </HelmetProvider>
  );
};

export default SEOProvider;
