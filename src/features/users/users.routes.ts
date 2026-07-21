import { Router } from 'express';
import { validate } from '../../middlewares/validation.middleware.js';
import {
  createUserSchema,
  getUserByIdSchema,
  updateUserSchema,
} from './users.schema.js';
import {
  createUser,
  deleteUser,
  getAllUsers,
  getUserById,
  updateUser,
} from './users.controller.js';

const router = Router();

router
  .route('/')
  .post(validate(createUserSchema), createUser)
  .get(getAllUsers);

router
  .route('/:id')
  .get(validate(getUserByIdSchema), getUserById)
  .patch(validate(updateUserSchema), updateUser)
  .delete(validate(getUserByIdSchema), deleteUser);

export default router;
