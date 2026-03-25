export interface Concept {
  id: string;
  title: string;
  description: string;
  brand: string;
  status: "draft" | "review" | "approved" | "published";
  tags: string[];
  created_at: string;
  updated_at: string;
}
