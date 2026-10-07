import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {return {rules:{userAgent:"*",allow:"/",disallow:["/api/","/platnosci/wynik"]},sitemap:"https://copowiesz.pl/sitemap.xml"};}
