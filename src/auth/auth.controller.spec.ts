import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            signIn: jest.fn(),
            signUp: jest.fn(),
            authWithGoogle: jest.fn(),
            confirmAccount: jest.fn(),
          },
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(authController).toBeDefined();
  });

  describe('signIn', () => {
    it('should call AuthService.signIn with the correct arguments', async () => {
      const loginDto: LoginDto = {
        email: 'test@gkv.com',
        password: 'password123',
      };
      jest.spyOn(authService, 'signIn').mockResolvedValue({
        message: 'Logged in sucessfully',
        token: 'token',
        user: {
          _id: '123',
          name: 'test',
          email: 'test@gmail.com',
        } as any,
      });

      const result = await authController.signIn(loginDto);
      expect(authService.signIn).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual({ accessToken: 'token' });
    });
  });
});
