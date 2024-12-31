import type {
	GetDashBoardDTO,
	GetFinancialEvolutionDTO,
	IndexTransactionsDTO,
} from "../../dtos/transactions.dto";
import type { Balance } from "../../entities/balance.entity";
import type { Expense } from "../../entities/expense.entity";
import {
	type Transaction,
	TransactionType,
} from "../../entities/transactions.entity";
import type { TransactionModel } from "../schemas/trasnsactions.schema";

export class TransactionsRepository {
	constructor(private model: typeof TransactionModel) {}

	async create({
		title,
		date,
		amount,
		type,
		category,
	}: Transaction): Promise<Transaction> {
		const createdTransaction = await this.model.create({
			title,
			date,
			amount,
			type,
			category,
		});

		return createdTransaction.toObject<Transaction>();
	}

	async index({
		title,
		categoryId,
		beginDate,
		endDate,
	}: IndexTransactionsDTO): Promise<Transaction[]> {
		const whereParams: Record<string, unknown> = {
			...(title && { title: { $regex: title, $options: "i" } }),
			...(categoryId && { "category._id": categoryId }),
		};

		if (beginDate || endDate) {
			whereParams.date = {
				...(beginDate && { $gte: beginDate }),
				...(endDate && { $lte: endDate }),
			};
		}

		const transactions = await this.model.find(whereParams, undefined, {
			sort: {
				date: -1,
			},
		});

		const transactionsMap = transactions.map((item) =>
			item.toObject<Transaction>(),
		);

		return transactionsMap;
	}

	async getBalance({ beginDate, endDate }: GetDashBoardDTO): Promise<Balance> {
		const aggregate = this.model.aggregate<Balance>();

		if (beginDate || endDate) {
			aggregate.match({
				date: {
					...(beginDate && { $gte: beginDate }),
					...(endDate && { $lte: endDate }),
				},
			});
		}

		const [result] = await aggregate
			.project({
				_id: 0,
				incomes: {
					$cond: [
						{
							$eq: ["$type", "income"],
						},
						"$amount",
						0,
					],
				},
				expenses: {
					$cond: [
						{
							$eq: ["$type", "expense"],
						},
						"$amount",
						0,
					],
				},
			})
			.group({
				_id: null,
				incomes: {
					$sum: "$incomes",
				},
				expenses: {
					$sum: "$expenses",
				},
			})
			.addFields({
				balance: {
					$subtract: ["$incomes", "$expenses"],
				},
			});

		return result;
	}

	async getExpenses({
		beginDate,
		endDate,
	}: GetDashBoardDTO): Promise<Expense[]> {
		const aggregate = this.model.aggregate<Expense>();

		const matchParams: Record<string, unknown> = {
			type: TransactionType.EXPENSE,
		};

		if (beginDate || endDate) {
			matchParams.date = {
				...(beginDate && { $gte: beginDate }),
				...(endDate && { $lte: endDate }),
			};
		}

		const result = await aggregate.match(matchParams).group({
			_id: "$category._id",
			title: {
				$first: "$category.title",
			},
			color: {
				$first: "$category.color",
			},
			amount: {
				$sum: "$amount",
			},
		});

		return result;
	}

	async getFinancialEvolution({
		year,
	}: GetFinancialEvolutionDTO): Promise<Balance[]> {
		const aggregate = this.model.aggregate<Balance>();

		const result = await aggregate
			.match({
				date: {
					$gte: new Date(`${year}-01-01`),
					$lte: new Date(`${year}-12-31`),
				},
			})
			.project({
				_id: 0,
				incomes: {
					$cond: [
						{
							$eq: ["$type", "income"],
						},
						"$amount",
						0,
					],
				},
				expenses: {
					$cond: [
						{
							$eq: ["$type", "expense"],
						},
						"$amount",
						0,
					],
				},
				year: {
					$year: "$date",
				},
				month: {
					$month: "$date",
				},
			})
			.group({
				_id: ["$year", "$month"],
				incomes: {
					$sum: "$incomes",
				},
				expenses: {
					$sum: "$expenses",
				},
			})
			.addFields({
				balance: {
					$subtract: ["$incomes", "$expenses"],
				},
			})
			.sort({
				_id: 1,
			});

		return result;
	}
}