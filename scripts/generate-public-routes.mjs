import fs from "node:fs";
import path from "node:path";

const ROOT=process.cwd();
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,"public-routes.json"),"utf8"));
const template=fs.readFileSync(path.join(ROOT,"templates","public-route.html"),"utf8");
const origin=String(process.env.NAZERAK_ORIGIN||"https://nazerak.ru").replace(/\/$/,"");

const escapeHtml=(value)=>String(value).replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const depth=(slug)=>Math.max(0,slug.split("/").length-1);
const replace=(template,route)=>{
  const level=depth(route.slug);
  const assetPrefix="../".repeat(level+1);
  const root=assetPrefix;
  const forum=assetPrefix+"forum-category.html?slug="+encodeURIComponent(route.forumRoute);
  const output=template
    .replaceAll("{{TITLE}}",escapeHtml(route.title))
    .replaceAll("{{DESCRIPTION}}",escapeHtml(route.description))
    .replaceAll("{{ASSET_PREFIX}}",assetPrefix)
    .replaceAll("{{ROOT}}",root)
    .replaceAll("{{FORUM}}",forum)
    .replaceAll("{{CABINET}}",assetPrefix+"cabinet.html");
  return output.replace(
    '<meta name="description" content="'+escapeHtml(route.description)+'">',
    '<meta name="description" content="'+escapeHtml(route.description)+'">\n  <link rel="canonical" href="'+origin+"/"+route.slug+'">'
  );
};

for(const route of Object.values(manifest)){
  if(!/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(route.slug)) throw new Error("Invalid route slug: "+route.slug);
  const target=path.join(ROOT,route.slug,"index.html");
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,replace(template,route),"utf8");
  console.log("generated",route.slug);
}