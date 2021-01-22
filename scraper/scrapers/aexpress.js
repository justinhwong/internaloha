import Logger from 'loglevel';
import { fetchInfo, startBrowser, writeToJSON } from './scraperFunctions.js';

async function getData(page) {
  const results = [];
  for (let i = 0; i < 3; i++) {
    // position
    results.push(fetchInfo(page, 'h1[itemprop="title"]', 'innerText'));
    // location
    results.push(fetchInfo(page, 'li[itemprop="jobLocation"]', 'innerText'));
    // description
    results.push(fetchInfo(page, 'article[itemprop="description"]', 'innerHTML'));
  }
  return Promise.all(results);
}

async function setSearchFilters(page) {
  // Navigated to internship page
  await page.waitForSelector('input[id="keyword-search"]');
  await page.type('input[id="keyword-search"]', 'internship');
  // Set filter to United Stats
  await page.waitForSelector('input[id="location-search"]');
  await page.type('input[id="location-search"]', 'United States');
  await page.click('button[id="search-btn"]');
}

async function main() {
  let browser;
  let page;
  const data = [];
  // Enable console logs
  Logger.enableAll();
  try {
    Logger.info('Executing script...');
    // Starts the browser in headless mode
    [browser, page] = await startBrowser();
    await page.goto('https://jobs.americanexpress.com/jobs');
    await setSearchFilters(page);
    await page.waitForSelector('mat-panel-title > p > a');
    const urls = await page.evaluate(() => Array.from(
      document.querySelectorAll('mat-panel-title > p > a'),
      a => a.href,
    ));
    for (let i = 0; i < urls.length; i++) {
      try {
        await page.goto(urls[i]);
        const city = 'N/A';
        const state = 'Error';
        const company = 'American Express';
        const contact = 'https://careers.americanexpress.com/';
        const lastScraped = new Date();
        const [position, location, description] = await getData(page);
        data.push({
          position: position,
          company: company,
          contact: contact,
          url: urls[i],
          lastScraped: lastScraped,
          location: {
            city: city,
            state: state,
            country: location.trim(),
          },
          description: description,
        });
      } catch (err2) {
        Logger.debug(err2.message);
      }
    }
    await writeToJSON(data, 'aexpress');
    await browser.close();
  } catch (err) {
    Logger.debug(err.message);
    await browser.close();
  }
}

main();
