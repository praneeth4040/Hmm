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

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create a new user
 *     description: Create a new user in the system
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of all users
 *
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: User found
 *   patch:
 *     summary: Update a user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 *   delete:
 *     summary: Delete a user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       204:
 *         description: User deleted
 */
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
