import { getCustomRepository, getRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import AppError from '../errors/AppError';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<void> {
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    const contactFileStream = fs.createReadStream(filePath);
    const parser = csvParse({
      from_line: 2,
      trim: true,
    });

    const parseCSV = contactFileStream.pipe(parser);

    const categories: string[] = [];
    const transactions: CSVTransaction[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) => cell);

      if (!title || !value || !type) return;

      categories.push(category);
      transactions.push({ title, value, type, category });
    });

    parseCSV.on('error', err => {
      throw new AppError(err.message);
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const existentCategories = await categoryRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoryTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoryTitle = categories
      .filter(category => !existentCategoryTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoryRepository.create(
      addCategoryTitle.map(title => ({
        title,
      })),
    );

    await categoryRepository.save(newCategories);

    const allCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        value: transaction.value,
        type: transaction.type,
        category_id: allCategories.find(
          category => category.title === transaction.category,
        )?.id,
      })),
    );

    console.log(createdTransactions);

    await transactionRepository.save(createdTransactions);
    await fs.promises.unlink(filePath);
  }
}

export default ImportTransactionsService;
