import {test,expect} from "@playwright/test";
async function start(page){
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".hb-play--broadcast")).toBeVisible({timeout:40000});
  await expect(page.locator("#snap")).toBeEnabled();
  expect(errors).toEqual([]);
}
test("phone field-first broadcast retains real snap and thumb steering",async({page},info)=>{
  await start(page);
  await expect(page.locator(".masthead")).toBeHidden();
  await expect(page.locator(".scorebug")).toBeHidden();
  await expect(page.locator(".field-wrap .dpad")).toBeVisible();
  await expect(page.locator(".hb-play #snap")).toBeVisible();
  await expect(page.locator(".hb-play__readout")).toHaveCount(3);
  const layout=await page.evaluate(()=>({
    width:document.documentElement.scrollWidth,
    viewport:window.innerWidth,
    field:document.querySelector(".field-wrap").getBoundingClientRect().height
  }));
  expect(layout.width).toBeLessThanOrEqual(layout.viewport+3);
  expect(layout.field).toBeGreaterThan(245);
  await page.locator("#snap").click();
  await expect(page.locator("#snap")).toBeHidden();
  await page.locator('[data-dir="right"]').dispatchEvent("pointerdown",{pointerId:7,pointerType:"touch"});
  await page.locator('[data-dir="right"]').dispatchEvent("pointerup",{pointerId:7,pointerType:"touch"});
  await page.screenshot({path:"test-results/football-play-"+info.project.name+".png"});
});
test("settings and pause controls remain functional on the HUD",async({page})=>{
  await start(page);
  await page.locator("#settings-toggle").click();
  await expect(page.locator("#settings")).toBeVisible();
  await page.locator("#settings-close").click();
  await expect(page.locator("#settings")).toBeHidden();
  await page.locator("#snap").click();
  await page.locator("#pause").click();
  await expect(page.locator("#pause")).toContainText("Resume");
  await page.locator("#pause").click();
  await expect(page.locator("#pause")).toContainText("Pause");
});
