import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { EmailDto } from './dto/email.dto';
import { Public } from './decorators/public.decorator';

@Controller('auth')
@Public()
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  /**
   * Login Gkv users
   *
   * @throws {400} Login denied because active class found
   * @throws {401} Invalid email or password
   */
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() loginDto: LoginDto) {
    return this.authService.signIn(loginDto);
  }

  /**
   * SignUp only with Gkv email
   *
   * @throws {409} User with given email already exist
   */
  @Post('signUp')
  signUp(@Body() registerDto: RegisterDto): Promise<{ message: string }> {
    return this.authService.signUp(registerDto);
  }

  /**
   *
   * Auth With Google
   *
   * @throws {400} Invalid user detected. Please try again
   */
  @HttpCode(HttpStatus.OK)
  @Post('google')
  authWithGoogle(@Body() body: GoogleAuthDto) {
    return this.authService.authWithGoogle(body);
  }

  /**
   *
   *
   * @throws User Not Found
   */
  @Get('confirm/:token')
  confirmAccount(@Param('token') token: string) {
    return this.authService.confirmAccount(token);
  }

  /**
   *
   *
   * @throws {401} No User found with given email
   */
  @UseGuards(ThrottlerGuard)
  @Post('recover')
  recover(@Body() emailDto: EmailDto) {
    return this.authService.recover(emailDto);
  }

  @UseGuards(ThrottlerGuard)
  @Get('reset/:token')
  reset(@Param('token') token: string) {
    return this.authService.reset(token);
  }

  @Post('reset/:token')
  resetPassword(
    @Param('token') token: string,
    @Body('password') password: string,
  ) {
    return this.authService.resetPassword(token, password);
  }
}
