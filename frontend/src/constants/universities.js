/**
 * Shared university list used by ProductForm (seller) and ProductList (buyer filter).
 * `label` is what gets stored in Product.university and shown in UI.
 * `domain` is used to auto-select the university from the logged-in user's email.
 */
export const UNIVERSITIES = [
  { label: 'BRAC University',                    domain: 'g.bracu.ac.bd' },
  { label: 'North South University',             domain: 'northsouth.edu' },
  { label: 'University of Dhaka',                domain: 'du.ac.bd' },
  { label: 'BUET',                               domain: 'buet.ac.bd' },
  { label: 'Independent University Bangladesh',  domain: 'iub.edu.bd' },
  { label: 'Daffodil International University',  domain: 'diu.edu.bd' },
  { label: 'American International University',  domain: 'aiub.edu' },
  { label: 'East West University',               domain: 'ewubd.edu' },
  { label: 'United International University',    domain: 'uiu.ac.bd' },
  { label: 'Bangladesh University of Engineering & Technology', domain: 'buet.ac.bd' },
];

/**
 * Given an email domain, returns the matching university label.
 * e.g. 'g.bracu.ac.bd' → 'BRAC University'
 */
export const domainToLabel = (domain) => {
  const match = UNIVERSITIES.find(u => u.domain === domain);
  return match ? match.label : domain;
};
