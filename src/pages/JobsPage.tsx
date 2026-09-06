import { SectionPage } from "./SectionPage";
import { CATEGORIES } from "@/lib/categories";

export function JobsPage() {
  return <SectionPage category={CATEGORIES[0]} />;
}