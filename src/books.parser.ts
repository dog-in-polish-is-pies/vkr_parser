import { createObjectCsvWriter } from 'csv-writer';
import fs from 'node:fs';

import puppeteer, { Page } from 'puppeteer';
import { load } from 'cheerio';
import { from, retry, firstValueFrom } from 'rxjs';

export type HeadersTypes =
  | 'title'
  | 'shop'
  | 'authors'
  | 'code'
  | 'publisher'
  | 'series'
  | 'paper'
  | 'binding'
  | 'pages'
  | 'year'
  | 'isbn'
  | 'section'
  | 'dimensions'
  | 'weight'
  | 'cover'
  | 'link'
  | 'collection_rgb'
  | 'date_rgb'
  | 'catalogs'
  | 'responsibility'
  | 'outputs'
  | 'description'
  | 'theme'
  | 'original'
  | 'bbk'
  | 'language'
  | 'place';

export interface ParserObjectHeaderItem {
  id: HeadersTypes;
  title: string;
}

export abstract class BooksParser {
  protected readonly exportPath = 'books.csv';

  protected abstract readonly site: string;
  protected abstract readonly searchURL: string;
  protected abstract readonly detailsURL: string;

  protected abstract readonly bookPreviewSelector: string;
  protected abstract readonly booksLinkSelector: string;

  protected abstract readonly productTitle: string;

  protected header: ParserObjectHeaderItem[] = [
    { id: 'title', title: 'Название' },
    { id: 'authors', title: 'Автор' },
    { id: 'shop', title: 'Магазин' },
    { id: 'section', title: 'Раздел' },
    { id: 'cover', title: 'Обложка' },
    { id: 'link', title: 'Ссылка' },
    { id: 'publisher', title: 'Издательство' },
    { id: 'code', title: 'Код' },
    { id: 'year', title: 'Год издания' },
    { id: 'series', title: 'Серия' },
    { id: 'paper', title: 'Бумага' },
    { id: 'binding', title: 'Переплет' },
    { id: 'pages', title: 'Кол-во страниц' },
    { id: 'isbn', title: 'ISBN' },
    { id: 'dimensions', title: 'Размеры' },
    { id: 'weight', title: 'Вес' }
  ];

  public async process(searchQuery: string, startWith = 0): Promise<any> {
    const stream = fs.createWriteStream('log.txt', { flags: 'a' });

    const csvWriter = createObjectCsvWriter({
      path: this.exportPath,
      header: this.header,
      append: true,
      fieldDelimiter: ';'
    });

    stream.write(`--- getBooksLinks: ${searchQuery}\n`);

    const booksLinks = await this.getBooksLinks(searchQuery);

    stream.write(
      `\n--- booksLinks:\n${booksLinks
        .map((bookLink, index) => `${index.toString().padStart(3)} - ${bookLink}`)
        .join('\n')}\n\n`
    );

    for (let idx = startWith; idx < booksLinks.length; ++idx) {
      const details = await this.getBookDetails(booksLinks[idx]);
      await csvWriter.writeRecords([details]);
    }

    stream.end();
  }

  protected abstract extractParameters(content: string): Record<string, string>;

  protected abstract getNextPageHref(page: Page): Promise<string | null>;

  protected async getBooksLinks(searchQuery: string): Promise<string[]> {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);

    await firstValueFrom(
      from(page.goto(`${this.searchURL}${encodeURIComponent(searchQuery)}`)).pipe(retry({ count: 2, delay: 5000 }))
    );

    const booksLinks: string[] = [];

    while (true) {
      const content = await page.content();
      const $ = load(content);

      $(this.bookPreviewSelector).each((_, element) => {
        const bookLink = $(element).find(this.booksLinkSelector).attr('href');

        if (bookLink) {
          booksLinks.push(`${this.site}${bookLink}`);
        }
      });

      const nextPageHref = await this.getNextPageHref(page);

      if (!nextPageHref) {
        break;
      }

      await firstValueFrom(from(page.goto(nextPageHref)));
    }

    await browser.close();

    return booksLinks;
  }

  protected async getBookDetails(bookLink: string): Promise<any> {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await firstValueFrom(from(page.goto(bookLink)));

    const content = await page.content();
    const details = this.extractParameters(content);

    details.link = bookLink;

    await browser.close();

    return details;
  }
}
