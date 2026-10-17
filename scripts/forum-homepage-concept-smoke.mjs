import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
const baseUrl=process.env.NAZERAK_BASE_URL||"http://127.0.0.1:4173";
const browser=await chromium.launch({headless:true});
const failures=[];
const check=(ok,message)=>{if(!ok)failures.push(message)};
try{
 const page=await browser.newPage({viewport:{width:1440,height:950}});
 const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 const response=await page.goto(new URL("/forum-concept/home.html",baseUrl).toString(),{waitUntil:"networkidle"});
 check(response?.status()===200,"homepage concept should return HTTP 200");
 check((await page.title()).includes("NaZerak"),"homepage title missing");
 check(await page.locator("h1").count()===1,"homepage should have exactly one h1");
 check(await page.locator(".features article").count()===3,"homepage feature cards missing");
 for(const width of [1440,1024,768,390,320]){
  await page.setViewportSize({width,height:width<500?844:900});
  await page.waitForTimeout(30);
  const sizes=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
  check(sizes.doc<=width+1,"document overflow at "+width+": "+sizes.doc);
  check(sizes.body<=width+1,"body overflow at "+width+": "+sizes.body);
  if(width===1440||width===390){
   const dir=path.join(process.cwd(),"artifacts","forum-hud");fs.mkdirSync(dir,{recursive:true});
   await page.screenshot({path:path.join(dir,"homepage-concept-"+width+".png"),fullPage:true});
  }
 }
 await page.setViewportSize({width:390,height:844});
 const toggle=page.locator("#menuButton");
 await toggle.click();
 check(await toggle.getAttribute("aria-expanded")==="true","mobile nav should open");
 check(await page.locator("#nav.open").isVisible(),"mobile nav should be visible");
 await page.keyboard.press("Escape");
 check(await toggle.getAttribute("aria-expanded")==="false","Escape should close mobile nav");
 check((await page.locator("#copy").getAttribute("data-copy"))==="nazehard.rustix.cc","server address should match project configuration");
 check(errors.length===0,"browser errors: "+errors.join(" | "));
 if(failures.length){console.error(failures.join("\n"));process.exitCode=1}else console.log("Homepage concept smoke passed: HTTP, content, five viewport widths, mobile navigation and copy action target.");
}finally{await browser.close()}
