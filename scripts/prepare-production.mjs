import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const origin=String(process.env.NAZERAK_ORIGIN||"https://nazerak.ru").replace(/\/$/,"");
const legacy="https://waslnison22-sudo.github.io/NazerakSites";

const files=["index.html","robots.txt","sitemap.xml"];
for (const file of files) {
  const target=path.join(root,file);
  let content=fs.readFileSync(target,"utf8");
  content=content.replaceAll(legacy,origin);
  fs.writeFileSync(target,content,"utf8");
  console.log("prepared",file);
}
