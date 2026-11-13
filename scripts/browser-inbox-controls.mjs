// Follow the current deck's modal/accordion flow instead of clicking hidden controls.
export async function revealInboxControl(page,selector){
 const dialog=page.locator('#contracts-dialog');
 if(!await dialog.evaluate(e=>e.open))await page.locator('#contracts-open').click();
 if(await page.locator('#deck-received-tab').getAttribute('aria-selected')!=='true')await page.locator('#deck-received-tab').click();
 const target=page.locator('#contracts-dialog '+selector);
 for(let i=0;i<3&&!await target.isVisible();i++){
  const closed=target.locator('xpath=ancestor::details[not(@open)]').first();
  if(!await closed.count())break;
  await closed.locator(':scope > summary').click();
 }
 return target;
}
export async function clickInboxControl(page,selector){await (await revealInboxControl(page,selector)).click();}
export async function reopenInboxAfterPlan(page){
 await page.waitForFunction(()=>!document.querySelector('#contracts-dialog')?.open);
 await page.locator('#contracts-open').click();
 await page.locator('#deck-received-tab').click();
}
export async function editInboxCard(card){
 const target=card.locator('.inbox-review');
 if(!await target.isVisible())await card.locator('.inbox-card-extra>summary').click();
 await target.click();
}
