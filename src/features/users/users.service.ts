import { prisma } from '../../config/database.js';
import { ConflictError, NotFoundError } from '../../utils/custom-errors.js';

export class UsersService {
  async createUser(data: { email: string; name?: string }) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictError('A user with this email already exists');
    }

    return prisma.user.create({
      data,
    });
  }

  async getAllUsers() {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }

    return user;
  }

  async updateUser(id: string, data: { email?: string; name?: string }) {
    // Ensure the user exists first
    await this.getUserById(id);

    if (data.email) {
      const existing = await prisma.user.findFirst({
        where: {
          email: data.email,
          NOT: { id },
        },
      });
      if (existing) {
        throw new ConflictError('A user with this email already exists');
      }
    }

    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async deleteUser(id: string) {
    await this.getUserById(id);
    return prisma.user.delete({
      where: { id },
    });
  }
}

export const usersService = new UsersService();
