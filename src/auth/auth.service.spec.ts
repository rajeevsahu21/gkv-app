import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CoursesService } from '../courses/courses.service';
import { EmailService } from '../common/email/email.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

jest.mock('bcryptjs', () => ({
  compareSync: jest.fn(() => true),
  hashSync: jest.fn(() => 'hashedPassword'),
  genSaltSync: jest.fn(() => 'salt'),
}));

jest.mock('crypto', () => ({
  randomBytes: () => ({ toString: () => 'random-token' }),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let coursesService: CoursesService;
  let emailService: EmailService;

  const mockUsersService = {
    findOneOrThrow: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  const mockCoursesService = {
    findOne: jest.fn().mockReturnValue({ select: jest.fn() }),
  };

  const mockEmailService = {
    addJob: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: CoursesService, useValue: mockCoursesService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    coursesService = module.get<CoursesService>(CoursesService);
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('signIn', () => {
    it('should return token and user on success', async () => {
      const dto: LoginDto = { email: 'test@gkv.ac.in', password: 'pass' };
      const user = {
        _id: '1',
        email: dto.email,
        password: 'hashedPassword',
        status: 'active',
      };
      mockUsersService.findOneOrThrow.mockResolvedValue(user);
      mockCoursesService.findOne().select.mockResolvedValue(null);

      const result = await service.signIn(dto);
      expect(result).toEqual({
        message: 'Logged in sucessfully',
        token: 'jwt-token',
        user,
      });
    });

    it('should throw if user has no password (Google user)', async () => {
      const dto: LoginDto = { email: 'test@gkv.ac.in', password: 'pass' };
      mockUsersService.findOneOrThrow.mockResolvedValue({ password: null });
      await expect(service.signIn(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw if user is not active', async () => {
      const dto: LoginDto = { email: 'test@gkv.ac.in', password: 'pass' };
      mockUsersService.findOneOrThrow.mockResolvedValue({
        password: 'pwd',
        status: 'pending',
      });
      await expect(service.signIn(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('signUp', () => {
    it('should create user and send email', async () => {
      const dto: RegisterDto = {
        name: 'Test',
        email: '12345678@gkv.ac.in',
        password: 'pass',
      };
      mockUsersService.findOne.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({});

      const result = await service.signUp(dto);
      expect(result.message).toBe(
        'User was registered successfully! Please check your email',
      );
      expect(mockUsersService.create).toHaveBeenCalled();
      expect(mockEmailService.addJob).toHaveBeenCalled();
    });

    it('should throw conflict if user already exists', async () => {
      const dto: RegisterDto = {
        name: 'Test',
        email: '12345678@gkv.ac.in',
        password: 'pass',
      };
      mockUsersService.findOne.mockResolvedValue({});
      await expect(service.signUp(dto)).rejects.toThrow(ConflictException);
    });
  });
});
