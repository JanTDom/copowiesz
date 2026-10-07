import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/jak-to-dziala", "/pomoc", "/platnosci", "/kontakt", "/regulamin", "/polityka-prywatnosci", "/odstapienie"].map(path => ({url:`https://copowiesz.pl${path}`,lastModified:"2026-10-07",changeFrequency:"monthly",priority:path===""?1:path==="/pomoc"||path==="/jak-to-dziala"?.8:.5}));
}
