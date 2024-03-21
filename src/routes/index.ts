import express from 'express';
import { getLogger } from '@/utils/loggers';
const router = express.Router();
const logger = getLogger('INDEX_ROUTE');

/* GET home page. */
router.get('/', function (_req, res, _next) {
  logger.info('hello Express');
  res.render('index', { title: 'Express', paypal_client_id: process.env.PAYPAL_CLIENT_ID });
});

export default router;
