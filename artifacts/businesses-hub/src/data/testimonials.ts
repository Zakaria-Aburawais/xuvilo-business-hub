export interface ApiTestimonial {
  id: number;
  name: string;
  quoteEn: string;
  quoteAr: string;
  roleEn: string;
  roleAr: string;
  stars: number;
}

// Empty by default — only real, consented testimonials added via the admin panel
// should be stored in the database and displayed here.
export const FALLBACK_TESTIMONIALS: ApiTestimonial[] = [];
