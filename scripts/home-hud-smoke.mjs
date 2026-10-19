import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
const baseUrl=process.env.NAZERAK_BASE_URL||"http://127.0.0.1:4173";
const browser=await chromium.launch({headless:true});
const failures=[];
const check=(ok,message)=>{if(!ok)failures.push(message)};
try {
 const page=await browser.newPage({viewport:{width:1440,height:950}});
 const browserErrors=[];
 page.on("pageerror",error=>browserErrors.push(error.message));
 const response=await page.goto(new URL("/index.html",baseUrl).toString(),{waitUntil:"domcontentloaded"});
 check(response?.status()===200,"homepage should return HTTP 200");
 check((await page.title()).includes("NaZerak"),"homepage title is missing");
 check(await page.locator("body.home-hud").count()===1,"homepage HUD scope is missing");
 check(await page.locator("h1").count()===1,"homepage must contain one primary heading");
 check((await page.locator("h1").textContent())?.includes("Добро пожаловать"),"welcome heading missing");
 check(await page.locator(".hud-world-grid .hud-world-item").count()===3,"three world category columns are required");
  check(await page.locator("#site-nav a[href=\"/forum/pravila-i-dokumenty\"]").textContent().then((value)=>value?.trim())==="Правила","rules navigation must target the rules category");
  check(await page.locator("#site-nav a[href=\"#community\"]").textContent().then((value)=>value?.trim())==="Сообщество","community navigation must have a working section target");
 check(await page.locator('.hud-connect [data-copy="nazehard.rustix.cc"]').count()===1,"server IP copy control missing");
 check((await page.locator(".server-address__copy strong").textContent())?.trim()==="nazehard.rustix.cc","server address does not match project IP");
 check(await page.locator('link[href*="home-hud.css"]').count()===1,"isolated HUD stylesheet missing");
 check(await page.locator('link[href*="styles.css"]').count()===0,"homepage must not inherit global styles");
 check(await page.locator(".hud-hero__image").count()===1,"hero should use a real image element rather than a cropped CSS background");
 await page.waitForFunction(()=>{const n=document.querySelector(".hud-hero__image");return !!n&&n.complete&&n.naturalWidth>0},{},{timeout:20000});
 check(await page.locator(".hud-hero__image").evaluate(n=>n.naturalWidth>0&&n.naturalHeight>0),"hero image failed to load");
 check(await page.locator(".hud-hero__image").evaluate(n=>getComputedStyle(n).objectFit==="cover"),"hero should preserve the full image frame without cropping");
 check((await page.locator(".hud-hero__image").getAttribute("src")||"").startsWith("https://images.unsplash.com/photo-1762515993692-7b9946f76858"),"homepage must use the selected autumn landscape from Unsplash");
 check(await page.locator(".hero-art,.world-visual,.partner-panel,.hud-orbit,.hud-triangle,.home-v2,.hud-circle").count()===0,"obsolete abstract decorations remain");
 const cssResponse=await page.request.get(new URL("/home-hud.css?v=5",baseUrl).toString());
 check(cssResponse.status()===200,"standalone HUD stylesheet should return HTTP 200");
 const cssText=await cssResponse.text();
 check(!/radial-gradient|clip-path\s*:[^;]*polygon|clip-path\s*:[^;]*circle/i.test(cssText),"homepage CSS must not create abstract circles or triangles");
 check(cssText.includes(".home-hud .nav>a.is-active"),"active navigation style missing");
 for(const id of ["about","guide","faq"]) check(await page.locator("#"+id).count()===1,"missing homepage section #"+id);
 check(await page.locator(".hud-about-card").count()===3,"project explanation should contain three content cards");
 check(await page.locator(".hud-faq-item").count()>=3,"FAQ content is missing");
 check(await page.locator(".brand__mark svg").count()===1,"abstract NaZerak brand mark is missing");
 check(await page.locator(".hud-guide-step").count()===3,"launcher onboarding must contain exactly three steps");
 check((await page.locator(".hud-guide-step h3").allTextContents()).map(s=>s.trim()).join("|")==="Скачай лаунчер|Зарегистрируйся|Скачай файлы и играй","launcher onboarding step order is wrong");
 check(await page.locator(".hud-launcher-download").count()===1,"launcher download CTA missing");
 check(await page.locator(".hud-launcher-download").getAttribute("aria-disabled")==="true","download CTA must stay unavailable until a verified public installer exists");
 check(await page.locator(".community-card[href^='https://discord.gg'] .community-icon svg path[fill='currentColor']").count()===1,"Discord icon should use a clean brand mark");
 const faq=page.locator(".hud-faq-item").first();
 await faq.locator("summary").click();
 check(await faq.evaluate(n=>n.open),"FAQ item did not expand");
 await faq.locator("summary").click();
 check(!(await faq.evaluate(n=>n.open)),"FAQ item did not collapse");
 await page.emulateMedia({reducedMotion:"reduce"});
 check(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior)==="auto","reduced motion should disable smooth scrolling");
 await page.emulateMedia({reducedMotion:"no-preference"});
 check(await page.locator('a[target="_blank"]').evaluateAll(links=>links.every(a=>/noopener/.test(a.getAttribute("rel")||""))),"external links must use rel=noopener");
 for(const width of [1440,1280,1024,900,768,390,320]){
  await page.setViewportSize({width,height:width<500?844:900});
  await page.waitForTimeout(35);
  const sizes=await page.evaluate(()=>{
   const overflow=[...document.querySelectorAll("body *")].map(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return{tag:n.tagName.toLowerCase(),className:typeof n.className==="string"?n.className:"",left:Math.round(r.left),right:Math.round(r.right),scrollWidth:n.scrollWidth,clientWidth:n.clientWidth,display:s.display}}).filter(x=>x.display!=="none"&&(x.right>innerWidth+1||x.left< -1||x.scrollWidth>x.clientWidth+3)).slice(0,8);
   return{document:document.documentElement.scrollWidth,body:document.body.scrollWidth,overflow};
  });
  check(sizes.document<=width+1,"document overflow at "+width+"px: "+JSON.stringify(sizes.overflow));
  check(sizes.body<=width+1,"body overflow at "+width+"px: "+JSON.stringify(sizes.overflow));
  if(width===1440||width===390){const d=path.join(process.cwd(),"artifacts","forum-hud");fs.mkdirSync(d,{recursive:true});await page.screenshot({path:path.join(d,"homepage-hud-"+width+".png"),fullPage:true});}
 }
 await page.setViewportSize({width:390,height:844});
 const toggle=page.locator(".nav-toggle");await toggle.click();
 check(await toggle.getAttribute("aria-expanded")==="true","mobile nav did not open");
 check(await page.locator("#site-nav.is-open").isVisible(),"mobile nav did not become visible");
 await page.keyboard.press("Escape");
 check(await toggle.getAttribute("aria-expanded")==="false","Escape did not reset nav state");
 check(!(await page.locator("#site-nav").evaluate(n=>n.classList.contains("is-open"))),"Escape did not close mobile nav");
 check(browserErrors.length===0,"browser errors: "+browserErrors.join(" | "));
 if(failures.length){console.error(failures.join("\n"));process.exitCode=1}
 else console.log("Homepage HUD smoke passed: Unsplash autumn hero, project sections, launcher onboarding, FAQ, server copy and seven viewports.");
} finally {await browser.close()}
