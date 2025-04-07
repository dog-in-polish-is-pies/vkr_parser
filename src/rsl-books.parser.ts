import puppeteer, { Page } from 'puppeteer';
import { BooksParser, ParserObjectHeaderItem } from './books.parser';
import { load } from 'cheerio';
import { delay, firstValueFrom, from, retry } from 'rxjs';

export class RslParser extends BooksParser {
  protected readonly site = 'https://search.rsl.ru';
  protected readonly searchURL = `${this.site}/ru/search#`;
  protected readonly detailsURL = `${this.site}`;

  protected readonly bookPreviewSelector = '.search-item';
  protected readonly booksLinkSelector = 'a[class="rsl-modal"]';

  protected readonly productTitle = '.area-header';

  protected header: ParserObjectHeaderItem[] = [
    { id: 'title', title: 'Автор' },
    { id: 'authors', title: 'Заглавие' },
    { id: 'collection_rgb', title: 'Коллекции ЭК РГБ' },
    { id: 'date_rgb', title: 'Дата поступления в ЭК РГБ' },
    { id: 'catalogs', title: 'Каталоги' },
    { id: 'link', title: 'Ссылка' },
    { id: 'responsibility', title: 'Сведения об ответственности' },
    { id: 'code', title: 'Код' },
    { id: 'outputs', title: 'Выходные данные' },
    { id: 'description', title: 'Физическое описание' },
    { id: 'isbn', title: 'ISBN' },
    { id: 'theme', title: 'Тема' },
    { id: 'original', title: 'Примечание об оригинале' },
    { id: 'bbk', title: 'BBK-код' },
    { id: 'language', title: 'Язык' },
    { id: 'place', title: 'Места хранения' }
  ];

  private sections: ParserObjectHeaderItem[] = [
    { id: 'title', title: 'Автор' },
    { id: 'authors', title: 'Заглавие' },
    { id: 'collection_rgb', title: 'Коллекции ЭК РГБ' },
    { id: 'date_rgb', title: 'Дата поступления в ЭК РГБ' },
    { id: 'catalogs', title: 'Каталоги' },
    { id: 'responsibility', title: 'Сведения об ответственности' },
    { id: 'code', title: 'Код' },
    { id: 'outputs', title: 'Выходные данные' },
    { id: 'description', title: 'Физическое описание' },
    { id: 'isbn', title: 'ISBN' },
    { id: 'theme', title: 'Тема' },
    { id: 'original', title: 'Примечание об оригинале' },
    { id: 'bbk', title: 'BBK-код' },
    { id: 'language', title: 'Язык' },
    { id: 'place', title: 'Места хранения' }
  ];

  protected extractParameters(content: string): Record<string, string> {
    const $ = load(content);

    let details: Record<string, string> = {};

    $('table[class="card-descr-table"] tr').each((_, element) => {
      const title = $(element).find('th')?.text()?.trim();
      const content = $(element).find('td')?.text()?.trim();
      const itemType = this.sections.find(item => item.title === title);

      if (title === 'Тема') {
        details.section = content.split(' -- ').join(' / ');
      } else if (itemType && content) {
        details[itemType.id] = content;
      }
    });

    details.shop = 'РГБ';

    return details;
  }

  protected async getNextPageHref(page: Page): Promise<string | null> {
    const content = await page.content();
    const $ = load(content);

    const links = $('a[class="pagination-link"]').get();

    const lastPage = Number.parseInt(links[links.length - 1].attribs['data-page']);

    const currentPage = Number.parseInt(
      $('li[class="active"] a[class="pagination-link"]').get()?.[0].attribs['data-page']
    );

    if (currentPage === lastPage - 1) {
      return `${lastPage}`;
    }

    if (currentPage === lastPage) {
      return null;
    }

    const nextLink = links.find(link => {
      const nextPage = Number.parseInt(link.attribs['data-page']);

      return nextPage === currentPage + 1 && nextPage !== lastPage;
    });

    // @ts-ignore
    return nextLink?.attribs['data-page'] ?? null;
  }

  protected async getBooksLinks(searchQuery: string): Promise<string[]> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);

    await firstValueFrom(from(page.goto(`${this.searchURL}${searchQuery}`)).pipe(retry({ count: 2, delay: 5000 })));

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

      const href = `${this.searchURL}p=${nextPageHref}&${searchQuery}`;

      await firstValueFrom(from(page.goto(href)).pipe(delay(3000)));
    }

    await browser.close();

    return booksLinks;
  }
}
