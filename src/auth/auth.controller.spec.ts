import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { EmailDto } from './dto/email.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    signIn: jest.fn(),
    signUp: jest.fn(),
    authWithGoogle: jest.fn(),
    confirmAccount: jest.fn(),
    recover: jest.fn(),
    reset: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signIn', () => {
    it('should call authService.signIn with correct payload', async () => {
      const dto: LoginDto = { email: 'test@gkv.ac.in', password: '1234' };
      const result = {
        message: 'Logged in successfully',
        token: 'jwt',
        user: {},
      };

      mockAuthService.signIn.mockResolvedValue(result);
      await expect(controller.signIn(dto)).resolves.toEqual(result);
      expect(mockAuthService.signIn).toHaveBeenCalledWith(dto);
    });
  });

  describe('signUp', () => {
    it('should call authService.signUp and return message', async () => {
      const dto: RegisterDto = {
        email: 'student@gkv.ac.in',
        password: '1234',
        name: 'Test',
      };
      const result = {
        message: 'User was registered successfully! Please check your email',
      };

      mockAuthService.signUp.mockResolvedValue(result);
      await expect(controller.signUp(dto)).resolves.toEqual(result);
      expect(mockAuthService.signUp).toHaveBeenCalledWith(dto);
    });
  });

  describe('authWithGoogle', () => {
    it('should call authService.authWithGoogle with correct payload', async () => {
      const dto: GoogleAuthDto = { credential: 'token' };
      const result = {
        message: 'User Authenticated successfully',
        token: 'jwt',
        user: {},
      };

      mockAuthService.authWithGoogle.mockResolvedValue(result);
      await expect(controller.authWithGoogle(dto)).resolves.toEqual(result);
      expect(mockAuthService.authWithGoogle).toHaveBeenCalledWith(dto);
    });
  });

  describe('confirmAccount', () => {
    it('should call authService.confirmAccount with token', async () => {
      const token = 'confirm-token';
      const html = '<html>Success</html>';

      mockAuthService.confirmAccount.mockResolvedValue(html);
      await expect(controller.confirmAccount(token)).resolves.toBe(html);
      expect(mockAuthService.confirmAccount).toHaveBeenCalledWith(token);
    });
  });

  describe('recover', () => {
    it('should call authService.recover with emailDto', async () => {
      const dto: EmailDto = { email: 'test@gkv.ac.in' };
      const result = { message: 'A reset email has been sent' };

      mockAuthService.recover.mockResolvedValue(result);
      await expect(controller.recover(dto)).resolves.toEqual(result);
      expect(mockAuthService.recover).toHaveBeenCalledWith(dto);
    });
  });

  describe('reset', () => {
    it('should call authService.reset with token', async () => {
      const token = 'reset-token';
      const html = '<html>Reset</html>';

      mockAuthService.reset.mockResolvedValue(html);
      await expect(controller.reset(token)).resolves.toBe(html);
      expect(mockAuthService.reset).toHaveBeenCalledWith(token);
    });
  });

  describe('resetPassword', () => {
    it('should call authService.resetPassword with token and password', async () => {
      const token = 'reset-token';
      const password = 'newpassword';
      const html = '<html>Password Reset Success</html>';

      mockAuthService.resetPassword.mockResolvedValue(html);
      await expect(controller.resetPassword(token, password)).resolves.toBe(
        html,
      );
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        token,
        password,
      );
    });
  });
});
