const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');

const {
  getActionItems,
  createActionItem,
  updateActionItem,
  deleteActionItem,
  reorderActionItems,
} = require('../controllers/actionItemController');

const router = express.Router({ mergeParams: true });

const actionItemRules = [
  body('title').trim().notEmpty().isLength({ max: 300 }),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']),
  body('dueDate').optional().isISO8601().toDate(),
  body('assigneeId').optional().isString(),
  body('goalId').optional().isString(),
];


router.get('/', getActionItems);
router.post('/', actionItemRules, validate, createActionItem);
router.patch('/reorder', reorderActionItems);


router.patch('/:itemId', actionItemRules, validate, updateActionItem);
router.delete('/:itemId', deleteActionItem);

module.exports = router;