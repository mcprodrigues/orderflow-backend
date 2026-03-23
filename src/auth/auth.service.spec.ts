import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/schemas/user.schema';

const mockUser = {
  _id: '665f000000000000000000001',
  name: 'João',
  email: 'joao@email.com',
  passwordHash: '',
  role: UserRole.CUSTOMER,
};

const mockUsersService = {
  create: jest.fn(),
  findByEmail: jest.fn(),
  findById: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should create user and return userId', async () => {
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await service.register({
        name: 'João',
        email: 'joao@email.com',
        password: 'senha123',
      });

      expect(mockUsersService.create).toHaveBeenCalledWith({
        name: 'João',
        email: 'joao@email.com',
        password: 'senha123',
      });
      expect(result).toHaveProperty('userId', mockUser._id);
    });
  });

  describe('login', () => {
    it('should return accessToken and user info on valid credentials', async () => {
      const hash = await bcrypt.hash('senha123', 10);
      mockUsersService.findByEmail.mockResolvedValue({ ...mockUser, passwordHash: hash });

      const result = await service.login({ email: 'joao@email.com', password: 'senha123' });

      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result.user).toHaveProperty('email', 'joao@email.com');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'x@x.com', password: 'any' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      const hash = await bcrypt.hash('correta', 10);
      mockUsersService.findByEmail.mockResolvedValue({ ...mockUser, passwordHash: hash });

      await expect(
        service.login({ email: 'joao@email.com', password: 'errada' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
