import { Page } from 'puppeteer';
import { BooksParser, ParserObjectHeaderItem } from './books.parser';
import { load } from 'cheerio';

export class LabirintParser extends BooksParser {
  protected readonly site = 'https://www.labirint.ru';
  protected readonly searchURL = `${this.site}/search/`;
  protected readonly detailsURL = `${this.site}`;

  protected readonly bookPreviewSelector = '.product-card';
  protected readonly booksLinkSelector = '.product-card__img';

  protected readonly productTitle = '.area-header';

  private sections: ParserObjectHeaderItem[] = [
    { id: 'title', title: 'Название' },
    { id: 'authors', title: 'Автор' },
    { id: 'shop', title: 'Магазин' },
    { id: 'code', title: 'ID товара' },
    { id: 'publisher', title: 'Издательство' },
    { id: 'series', title: 'Серия' },
    { id: 'paper', title: 'Бумага' },
    { id: 'binding', title: 'Тип обложки' },
    { id: 'pages', title: 'Страниц' },
    { id: 'year', title: 'Год издания' },
    { id: 'isbn', title: 'ISBN' },
    { id: 'section', title: 'Раздел' },
    { id: 'dimensions', title: 'Размеры' },
    { id: 'weight', title: 'Вес' },
    { id: 'cover', title: 'Обложка' },
    { id: 'link', title: 'Ссылка' }
  ];

  protected extractParameters(content: string): Record<string, string> {
    const $ = load(content);

    let details: Record<string, string> = {};

    $('div[id="сharacteristics"] div[class="_feature_mmfyx_1"]').each((_, element) => {
      const title = $(element.children[0])?.text()?.trim();
      const content = $(element.children[1])?.text()?.trim();
      const itemType = this.sections.find(item => item.title === title);

      if (title === 'Издательство') {
        const [publisher, year] = content.split(', ');

        details['publisher'] = publisher;
        details['year'] = year;
      } else if (itemType && content) {
        details[itemType.id] = content;
      }
    });

    const sections: string[] = [];

    $("a[href*='https://www.labirint.ru/genres']").each((_, element) => {
      sections.push($(element).text());
    });

    details.section = sections.join(', ');

    details.title = $(this.productTitle).find('h1').text().trim();

    const coverLink = $('.area-info').find('img').attr('src');

    if (coverLink) {
      details.cover = `https:${coverLink}`;
    }

    details.shop = 'Лабиринт';

    return details;
  }

  protected async getNextPageHref(page: Page): Promise<string | null> {
    const content = await page.content();
    const $ = load(content);

    const nextLink = $('div[class="pagination-next"] a[class="pagination-next__text"]').get()?.[0];

    if (!nextLink?.attribs?.href) {
      return null;
    }

    return `${page.url()}${nextLink.attribs.href}`;
  }
}
