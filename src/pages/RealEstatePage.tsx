import { SectionPage } from "./SectionPage";
import { CATEGORIES } from "@/lib/categories";

export function RealEstatePage() {
  return <SectionPage category={CATEGORIES[1]} />;
}