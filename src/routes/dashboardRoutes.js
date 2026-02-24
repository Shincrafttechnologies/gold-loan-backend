const express = require('express');
const router = express.Router();
const customerRankingController = require('../controllers/dashboard/customerRankingController');
const purchaseSoldStockController = require('../controllers/dashboard/purchaseSoldStockController');
const getNewCustomersCountController = require('../controllers/dashboard/getNewCustomerCountController');
const inventoryStatusController = require('../controllers/dashboard/inventoryStatusController');
const loanStatusDistributionController = require('../controllers/dashboard/loanStatusDistributionController');
const netprofitController = require('../controllers/dashboard/netprofitController');
const profitTrendController = require('../controllers/dashboard/profitTrendController');
const cashflowTrendController = require('../controllers/dashboard/cashflowTrendController');
const loanClosingPredictionController = require('../controllers/dashboard/loanClosingPredictionController');
const loanFinanceController = require('../controllers/dashboard/loanFinanceController');
const authenticateAdmin = require('../middleware/authMiddleware');

router.get('/rankings', authenticateAdmin, customerRankingController.getCustomerRankings);
router.get('/customer-stats', authenticateAdmin, customerRankingController.getCustomerStats);
router.get('/purchase-stats', authenticateAdmin, purchaseSoldStockController.getPurchaseDashboardStats);
router.get('/new-customer-count', authenticateAdmin, getNewCustomersCountController.getNewCustomersCount);
router.get('/inventory-chart', authenticateAdmin, inventoryStatusController.getInventoryPieChart);
router.get('/loan-status-distribution', authenticateAdmin, loanStatusDistributionController.getLoanStatusDistribution);
router.get('/net-profit', authenticateAdmin, netprofitController.getTotalNetProfit);
router.get('/profit-trend', authenticateAdmin, profitTrendController.getProfitTrendChart);
router.get('/cash-flow-trend', authenticateAdmin, cashflowTrendController.getCashFlowTrendChart);
router.get('/loan-closing-prediction', authenticateAdmin, loanClosingPredictionController.getUpcomingClosingLoansChart);
router.get('/loan-finance', authenticateAdmin, loanFinanceController.getLoanFinancialSummary);
router.get('/latest-loan-ids', authenticateAdmin, getNewCustomersCountController.getLatestLoanIds);

module.exports = router;
