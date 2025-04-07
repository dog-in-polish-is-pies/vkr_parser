import { LabirintParser } from './labirint-books.parser';
import { BukvoedParser } from './bukvoed-books.parser';
import { RslParser } from './rsl-books.parser';
import { PowelsParser } from './powels-books.parser';

const runBukvoedParser = async (searchQuery: string) => {
  const labirintParser = new BukvoedParser();
  await labirintParser.process(searchQuery, 109);
};

const runLabirintParser = async (searchQuery: string) => {
  const labirintParser = new LabirintParser();
  await labirintParser.process(searchQuery);
};

const runRslParser = async (searchQuery: string) => {
  const rslParser = new RslParser();
  await rslParser.process(searchQuery);
};

const runPowelsParser = async (searchQuery: string) => {
  const rslParser = new PowelsParser();
  await rslParser.process(searchQuery, 1140);
};

async function main() {
  runBukvoedParser('Рудольф Штайнер');
  runLabirintParser('Рудольф Штайнер');
  runRslParser('q=author%3A(штайнер%20рудольф)');
  runPowelsParser('Rudolf Steiner');
}

main();
