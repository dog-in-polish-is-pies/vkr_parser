import puppeteer, { Page } from 'puppeteer';
import { BooksParser, ParserObjectHeaderItem } from './books.parser';
import { load } from 'cheerio';
import { delay, firstValueFrom, from, retry } from 'rxjs';

export class PowelsParser extends BooksParser {
  protected readonly site = 'https://www.powells.com';
  protected readonly searchURL = `${this.site}/searchresults?keyword=`;
  protected readonly detailsURL = `${this.site}`;

  protected readonly bookPreviewSelector = '.book-info';
  protected readonly booksLinkSelector = 'div[class="book-image"] a';

  protected readonly productTitle = '.product-title-author__title';

  private sections: ParserObjectHeaderItem[] = [
    { id: 'title', title: 'title' },
    { id: 'authors', title: 'author' },
    { id: 'code', title: 'upccode' },
    { id: 'publisher', title: 'publisher' },
    { id: 'paper', title: 'thickness' },
    { id: 'binding', title: 'binding' },
    { id: 'pages', title: 'pages' },
    { id: 'year', title: 'publicationdate' },
    { id: 'isbn', title: 'isbn' },
    { id: 'section', title: 'subject' },
    { id: 'cover', title: 'обложка' },
    { id: 'link', title: 'ссылка' }
  ];

  protected async getNextPageHref(page: Page): Promise<string | null> {
    const content = await page.content();
    const $ = load(content);

    const nextLink = $('a[class*="hawk-arrowRight hawk-pageLink"]').get()?.[0];

    if (!nextLink) {
      return null;
    }

    return `${this.site}${nextLink.attribs.href}`;
  }

  protected extractParameters(content: string): Record<string, string> {
    const $ = load(content);

    const paramsTable = $('dl[class="bibliographic"]').find(' dd');

    let details: Record<string, string> = {};

    let sections: string[] = [];

    paramsTable.each((_, element) => {
      const section = this.sections.find(section => section.title === element.attribs.class);

      if (!section) {
        return;
      }

      if (section.id === 'section') {
        sections.push($(element)?.text()?.trim());
      } else if (section.id === 'year') {
        details.year = new Date($(element)?.text()?.trim()).getFullYear().toString();
      } else if (section) {
        details[section.id] = $(element)?.text()?.trim();
      }
    });

    details.section = sections.join(' / ');
    details.title = $('h1[class="book-title"]')?.text()?.trim();

    const coverLink = $('img[id="cover"]')?.get()?.[0]?.attribs?.src;

    if (coverLink) {
      details.cover = coverLink;
    }

    details.shop = 'Powells';

    return details;
  }

  browserConnection = puppeteer.connect({
    browserWSEndpoint: 'ws://127.0.0.1:9222/devtools/browser/d27bef06-76c6-4534-bf05-16d3ba81030d'
  });

  protected async getBookDetails(bookLink: string): Promise<Record<string, string>> {
    const browser = await this.browserConnection;
    const page = await browser.newPage();

    await firstValueFrom(
      from(page.goto(bookLink, { waitUntil: 'domcontentloaded' })).pipe(retry({ count: 2, delay: 5000 }))
    );

    const content = await page.content();
    const details = this.extractParameters(content);

    details.link = bookLink;

    await page.close();

    return details;
  }
}
