import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'event';
  noIndex?: boolean;
}

const defaultMeta = {
  title: "Vyuha Esport | India's #1 BGMI & Free Fire Tournament Platform",
  description: "Join Vyuha Esport - India's premier esports tournament platform. Compete in BGMI, Free Fire, COD Mobile tournaments. Win real cash prizes up to ₹1 Lakh!",
  keywords: "BGMI tournament, Free Fire tournament India, esports India, gaming tournaments, BGMI competition, Free Fire contest, COD Mobile tournament, online gaming India, esports platform, Vyuha Esport",
  image: "https://vyuhaesport.in/favicon.png",
  url: "https://vyuhaesport.in",
};

const SEOHead = ({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  noIndex = false,
}: SEOHeadProps) => {
  const fullTitle = title 
    ? `${title} | Vyuha Esport` 
    : defaultMeta.title;
  const metaDescription = description || defaultMeta.description;
  const metaKeywords = keywords || defaultMeta.keywords;
  const metaImage = image || defaultMeta.image;
  const canonicalUrl = url || defaultMeta.url;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={metaKeywords} />
      
      {/* Robots */}
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large" />
      )}
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:site_name" content="Vyuha Esport" />
      <meta property="og:locale" content="en_IN" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage} />
    </Helmet>
  );
};

export default SEOHead;
