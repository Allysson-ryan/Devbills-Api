"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionsService = void 0;
const http_status_codes_1 = require("http-status-codes");
const balance_entity_1 = require("../entities/balance.entity");
const transactions_entity_1 = require("../entities/transactions.entity");
const app_error_1 = require("../errors/app-error");
class TransactionsService {
    constructor(transactionsRepository, categoriesRepository) {
        this.transactionsRepository = transactionsRepository;
        this.categoriesRepository = categoriesRepository;
    }
    async create({ title, type, date, categoryId, amount, }) {
        const category = await this.categoriesRepository.findById(categoryId);
        if (!category) {
            throw new app_error_1.AppError("Category does not existes.", http_status_codes_1.StatusCodes.BAD_REQUEST);
        }
        const transaction = new transactions_entity_1.Transaction({
            title,
            type,
            date,
            category,
            amount,
        });
        const createdTransaction = await this.transactionsRepository.create(transaction);
        return createdTransaction;
    }
    async index(filters) {
        const transaction = await this.transactionsRepository.index(filters);
        return transaction;
    }
    async getDashboard({ beginDate, endDate, }) {
        let [balance, expenses] = await Promise.all([
            this.transactionsRepository.getBalance({
                beginDate,
                endDate,
            }),
            this.transactionsRepository.getExpenses({
                beginDate,
                endDate,
            }),
        ]);
        if (!balance) {
            balance = new balance_entity_1.Balance({
                _id: null,
                incomes: 0,
                expenses: 0,
                balance: 0,
            });
        }
        return { balance, expenses };
    }
    async getFinancialEvolution({ year, }) {
        const financialEvolution = await this.transactionsRepository.getFinancialEvolution({ year });
        return financialEvolution;
    }
}
exports.TransactionsService = TransactionsService;
