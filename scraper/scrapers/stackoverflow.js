import puppeteer from 'puppeteer';
import fs from 'fs';
import log from 'loglevel';
import { fetchInfo, isRemote } from './scraperFunctions.js';

async function main() {
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 900 });
  // eslint-disable-next-line max-len
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36');
  log.enableAll();
  try {
    await page.goto('https://stackoverflow.com/jobs?q=internship');
    // filter by internship tag
    // await page.waitForSelector('button[data-tab="Background"]');
    // await page.click('button[data-tab="Background"]');
    // await page.waitForSelector('input[id="jInternship"]');
    // await page.click('input[id="jInternship"]');
    // await page.waitForSelector('div[id="popover-background"] button');
    // await page.click('div[id="popover-background"] button');
    await page.waitForTimeout(2000);
    const text = await fetchInfo(page, 'span[class="description fc-light fs-body1"]', 'textContent');
    const number = text.match(/\d+/gm);
    log.trace('Internships found:', number[0]);
    // grab all links
    const elements = await page.evaluate(
        () => Array.from(
            // eslint-disable-next-line no-undef
            document.querySelectorAll('a[class="s-link stretched-link"]'),
            a => `https://stackoverflow.com${a.getAttribute('href')}`,
        ),
    );
    const data = [];
    // goes to each page
    for (let i = 0; i < number[0]; i++) {
      await page.goto(elements[i]);
      try {
        const position = await fetchInfo(page, 'div[class="grid--cell fl1 sm:mb12"] h1', 'innerText');
        let company = '';
        try {
           company = await fetchInfo(page, 'div[class="fc-black-700 fs-body3"] a', 'innerText');
        } catch (noCompany) {
          company = 'Unknown';
        }
        const posted = await fetchInfo(page, 'ul[class="horizontal-list horizontal-list__lg fs-body1 fc-black-500 ai-baseline mb24"]', 'innerText');
        const description = await fetchInfo(page, 'section[class="mb32 fs-body2 fc-medium pr48"]', 'innerHTML');
        const skills = await page.evaluate(
            () => Array.from(
                // eslint-disable-next-line no-undef
                document.querySelectorAll('section[class="mb32"]:nth-child(3) a'),
                a => a.textContent,
            ),
        );
        const date = new Date();
        let daysBack = 0;
        const lastScraped = new Date();
        if (posted.includes('yesterday')) {
          daysBack = 1;
        } else {
          daysBack = posted.match(/\d+/g);
        }
        date.setDate(date.getDate() - daysBack);
        let location = '';
        let city = '';
        let state = '';
        try {
          location = await fetchInfo(page, 'div[class="fc-black-700 fs-body3"] span', 'innerText');
          city = location.match(/([^ –\n][^,]*)/g)[0].trim();
          state = location.match(/([^,]*)/g)[2].trim();
        } catch (noLocation) {
          location = '';
          city = 'Unknown';
          state = 'Unknown';
        }
        // eslint-disable-next-line no-unused-vars
        let remote = false;
        if (isRemote(position) || isRemote(city) || isRemote(description)
            || isRemote(city) || isRemote(state)) {
          remote = true;
        }
        data.push({
          position: position.trim(),
          company: company.trim(),
          location: {
            city: city,
            state: state,
          },
          posted: date,
          url: elements[i],
          skills: skills,
          lastScraped: lastScraped,
          description: description.trim(),
        });
        log.info(position.trim());
      } catch (err) {
        log.warn('Our Error: ', err.message);
      }
    }
    await fs.writeFile('./data/canonical/stackoverflow.canonical.data.json',
        JSON.stringify(data, null, 4), 'utf-8',
        err => (err ? log.warn('\nData not written!', err) :
            log.info('\nData successfully written!')));
    await browser.close();
  } catch (err) {
    log.warn('Our Error:', err.message);
    await browser.close();
  }
}
main().then();
