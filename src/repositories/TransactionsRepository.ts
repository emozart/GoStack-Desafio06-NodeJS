import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();
    const incomes = transactions.filter(
      transaction => transaction.type === 'income',
    );
    const outcomes = transactions.filter(
      transaction => transaction.type === 'outcome',
    );
    const totalIncome = incomes.reduce(
      (total, transaction) => total + Number(transaction.value),
      0,
    );
    const totalOutcome = outcomes.reduce(
      (total, transaction) => total + Number(transaction.value),
      0,
    );
    const balance: Balance = {
      income: totalIncome,
      outcome: totalOutcome,
      total: totalIncome - totalOutcome,
    };
    return balance;
  }
}

export default TransactionsRepository;
