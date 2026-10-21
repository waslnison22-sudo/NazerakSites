import path from "node:path";
import fs from "node:fs";
import { chromium } from "playwright";
const baseUrl=process.env.NAZERAK_BASE_URL||"http://127.0.0.1:4173";
const browser=await chromium.launch({headless:true});
const failures=[];
const check=(ok,message)=>{if(!ok)failures.push(message)};
try{
 const page=await browser.newPage({viewport:{width:1440,height:960}});
 const errors=[];
 page.on("pageerror",error=>errors.push(error.message));
 const response=await page.goto(new URL("/cabinet.html",baseUrl).toString(),{waitUntil:"domcontentloaded"});
 check(response?.status()===200,"cabinet should return HTTP 200");
 check(await page.locator("body[data-cabinet]").count()===1,"cabinet scope missing");
 check((await page.title()).includes("личный кабинет"),"cabinet title missing");
 check(await page.locator("h1").count()===1,"cabinet should contain one primary heading");
 check(await page.locator(".account-login__copy h2").textContent().then(x=>x?.includes("Войти")),"guest login copy missing");
 check(await page.locator("[data-discord-login]").count()===1,"Discord login action missing");
 check(await page.locator("#minecraft-profile-form").count()===0,"website must not show a Minecraft nickname form");
 check(await page.locator("[data-minecraft-input]").count()===0,"website must not render a Minecraft nickname input");
 check(await page.locator(".account-panel--minecraft .account-state-card h3").textContent().then(x=>x?.includes("лаунчере")), "Minecraft setup must be directed to the launcher");
 check(await page.locator("[data-sign-out]").count()>=2,"sign-out controls missing from authenticated view");
 check(await page.locator(".account-mark-emblem svg").count()===1,"abstract account emblem missing");
 check(await page.locator(".brand__mark").count()===2,"header and footer brand marks should both exist");
 check((await page.locator(".brand__mark").allTextContents()).every(value=>value.trim()==="N"),"header and footer should use the restored NaZerak N mark");
 const css=await page.request.get(new URL("/cabinet-hud.css?v=1",baseUrl).toString());
 check(css.status()===200,"cabinet-specific stylesheet should return HTTP 200");
 check((await css.text()).includes("body[data-cabinet] .account-login"),"dedicated cabinet design rules are missing");
 for(const width of [1440,1024,760,390,320]){
  await page.setViewportSize({width,height:width<500?844:900});
  const dims=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,body:document.body.scrollWidth,viewport:innerWidth}));
  check(dims.doc<=width+1,"cabinet document horizontal overflow at "+width+"px: "+JSON.stringify(dims));
  check(dims.body<=width+1,"cabinet body horizontal overflow at "+width+"px: "+JSON.stringify(dims));
  if(width===1440||width===390){const dir=path.join(process.cwd(),"artifacts","forum-hud");fs.mkdirSync(dir,{recursive:true});await page.screenshot({path:path.join(dir,"cabinet-"+width+".png"),fullPage:true});}
 }
 await page.setViewportSize({width:390,height:844});
 const toggle=page.locator(".nav-toggle");
 await toggle.click();
 check(await toggle.getAttribute("aria-expanded")==="true","cabinet mobile nav did not open");
 check(await page.locator("#cabinet-nav.is-open").isVisible(),"cabinet mobile nav is not visible");
 await page.keyboard.press("Escape");
 check(await toggle.getAttribute("aria-expanded")==="false","Escape did not reset cabinet nav");
 check(errors.length===0,"cabinet browser errors: "+errors.join(" | "));
 if(failures.length){console.error(failures.join("\n"));process.exitCode=1}
 else console.log("Cabinet HUD smoke passed: responsive layout, Discord auth entrypoints, profile contracts, matching brand marks and mobile navigation.");
}finally{await browser.close()}
