import { Page } from 'puppeteer';
import { BooksParser, ParserObjectHeaderItem } from './books.parser';
import { load } from 'cheerio';

export class BukvoedParser extends BooksParser {
  protected readonly site = 'https://www.bookvoed.ru';
  protected readonly searchURL = `${this.site}/search?q=`;
  protected readonly detailsURL = `${this.site}`;

  protected readonly bookPreviewSelector = '.product-card';
  protected readonly booksLinkSelector = '.product-card__image-link';

  protected readonly productTitle = '.product-title-author__title';

  private sections: ParserObjectHeaderItem[] = [
    { id: 'title', title: 'Название' },
    { id: 'authors', title: 'Автор' },
    { id: 'code', title: 'Код' },
    { id: 'shop', title: 'Магазин' },
    { id: 'publisher', title: 'Издательство' },
    { id: 'series', title: 'Серия' },
    { id: 'paper', title: 'Бумага' },
    { id: 'binding', title: 'Переплет' },
    { id: 'pages', title: 'Кол-во страниц' },
    { id: 'year', title: 'Год издания' },
    { id: 'isbn', title: 'ISBN' },
    { id: 'section', title: 'Раздел' },
    { id: 'dimensions', title: 'Размеры' },
    { id: 'weight', title: 'Вес' },
    { id: 'cover', title: 'Обложка' },
    { id: 'link', title: 'Ссылка' }
  ];

  protected async getNextPageHref(page: Page): Promise<string | null> {
    const content = await page.content();
    const $ = load(content);

    const nextLink = $('a[class*="app-pagination__button-next"]:not(.ui-button--disabled)').get()?.[0];

    if (!nextLink) {
      return null;
    }

    return `${this.site}${nextLink.attribs.href}`;
  }

  protected extractParameters(content: string): Record<string, string> {
    const $ = load(content);

    const paramsTable = $('.product-characteristics-full__tbody');

    let details: Record<string, string> = {};

    paramsTable.find('tr').each((_, element) => {
      const title = $(element).find('.product-characteristics-full__cell-th').text()?.trim();
      const content = $(element).find('.product-characteristics-full__cell-td').text()?.trim();

      const itemType = this.sections.find(item => item.title === title);

      if (itemType && content) {
        details[itemType.id] = content;
      }
    });

    const sections: string[] = [];

    $("li[class='breadcrumbs__item'] a[href*='/catalog/'] span").each((_, element) => {
      sections.push($(element).text());
    });

    details.section = sections.join(', ');

    details.title = $(this.productTitle).text().trim();

    const srcset = $('.product-preview__big-img-wrapper').find('source').attr('srcset');

    const coverLink =
      srcset?.split(' 2x,')[0] ?? $('.product-preview__big-img-wrapper .product-preview__big-img').attr('src');

    if (coverLink) {
      details.cover = `https:${coverLink}`;
    }

    details.shop = 'Буквоед';

    return details;
  }
}
