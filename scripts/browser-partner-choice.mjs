// Existing end-to-end scenarios explicitly choose their initial role, as a user does.
export async function chooseInitialPartner(page,partner='operator'){
 await page.waitForSelector('.partner-choice,.mission-screen,.navigation-chart,.operations-desk');
 if(await page.locator('.partner-choice').count())await page.locator(`.partner-choice button[data-partner="${partner}"]`).click();
}
