import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { compareSync, hashSync, genSaltSync } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { compile } from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';
import { CoursesService } from '../courses/courses.service';
import { EmailDto } from './dto/email.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { NotificationService } from '../common/notification/notification.service';

@Injectable()
export class AuthService {
  private client: OAuth2Client;

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly coursesService: CoursesService,
    private readonly notificationService: NotificationService,
  ) {
    this.client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  async signIn(loginDto: LoginDto) {
    const user = await this.usersService.findOneOrThrow(
      {
        email: loginDto.email,
      },
      'No User found with given email',
    );
    if (!user.password) {
      throw new BadRequestException(
        'You signed up with Google. Please login using Google or continue using forgot Password',
      );
    }
    if (user.status !== 'active') {
      throw new BadRequestException(
        'Pending Account. Please Verify Your Email or Continue with Google',
      );
    }
    const verifiedPassword = compareSync(loginDto.password, user.password);
    if (!verifiedPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const course = await this.coursesService
      .findOne({
        students: user._id.toString(),
        activeClass: true,
      })
      .select('_id');
    if (course) {
      throw new BadRequestException('Login denied because active class found');
    }
    const payload = { _id: user._id };
    return {
      message: 'Logged in sucessfully',
      token: this.jwtService.sign(payload),
      user,
    };
  }

  async signUp(registerDto: RegisterDto) {
    const oldUser = await this.usersService.findOne({
      email: registerDto.email,
    });
    if (oldUser) {
      throw new ConflictException('User with given email already exist');
    }
    const role = /^\d{8,9}@gkv\.ac\.in$/.test(registerDto.email)
      ? 'student'
      : 'teacher';
    const registrationNo =
      role === 'student' ? registerDto.email.split('@')[0] : undefined;
    const salt = genSaltSync(Number(process.env.SALT));
    const hashPassword = hashSync(registerDto.password, salt);

    const confirmationCode = randomBytes(25).toString('hex');
    await this.usersService.create({
      name: registerDto.name,
      email: registerDto.email,
      registrationNo,
      role,
      password: hashPassword,
      confirmationCode,
    });
    await this.notificationService.addEmailJob({
      subject: 'Please confirm your account',
      to: registerDto.email,
      body: {
        OTP: confirmationCode,
        NAME: registerDto.name,
        URL: process.env.URL,
      },
      templateName: 'confirm-account',
    });
    return {
      message: 'User was registered successfully! Please check your email',
    };
  }

  async authWithGoogle(body: GoogleAuthDto) {
    let profile: {
      email: string;
      name: string;
      sub: string;
      picture: string;
      id: string;
    };
    if (body.credential) {
      profile = (await this.verifyGoogleToken(body.credential)) as any;
    } else if (body.userToken) {
      const response = await fetch(
        'https://www.googleapis.com/userinfo/v2/me',
        {
          headers: { Authorization: `Bearer ${body.userToken}` },
        },
      );
      if (!response.ok) {
        throw new BadRequestException(
          'Invalid user detected. Please try again',
        );
      }
      profile = await response.json();
    } else {
      throw new BadRequestException('Missing authentication credentials.');
    }
    const email = profile.email;
    if (!/[a-zA-Z0-9+_.-]+@gkv.ac.in/.test(email)) {
      throw new BadRequestException('Please use GKV E-mail');
    }
    const role = /^\d{8,9}@gkv\.ac\.in$/.test(email) ? 'student' : 'teacher';
    const registrationNo = role === 'student' ? email.split('@')[0] : undefined;
    const name = profile.name;
    const gId = profile.sub || profile.id;
    const profileImage = profile.picture;
    let user = await this.usersService.findOne({ email });

    if (!user) {
      user = await this.usersService.create({
        name,
        email,
        gId,
        profileImage,
        role,
        status: 'active',
        registrationNo,
      });
    } else if (!user.gId) {
      await this.usersService.updateOne(
        { email },
        { name, gId, profileImage, status: 'active' },
      );
    }
    const course = await this.coursesService.findOne({
      students: user._id.toString(),
      activeClass: true,
    });
    if (course) {
      throw new BadRequestException('login denied because active class found');
    }
    const payload = { _id: user._id };
    return {
      message: 'User Authenticated sucessfully',
      token: this.jwtService.sign(payload),
      user,
    };
  }

  async confirmAccount(token: string) {
    const user = await this.usersService.findOneAndUpdate(
      {
        confirmationCode: token,
      },
      { status: 'active' },
    );
    if (!user) {
      const templatePath = join(
        process.cwd(),
        'public',
        'templates',
        'error.html',
      );
      const source = readFileSync(templatePath, 'utf8');
      const template = compile(source);
      return template({
        TITLE: 'User Not Found.',
        MESSAGE: 'Please register again or Continue with Google.',
      });
    }
    const templatePath = join(
      process.cwd(),
      'public',
      'templates',
      'success.html',
    );
    const source = readFileSync(templatePath, 'utf8');
    const template = compile(source);
    return template({
      TITLE: 'Your Account has been Verified!',
      MESSAGE: 'Now, You are able to Login.',
    });
  }

  async recover(emailDto: EmailDto) {
    const resetPasswordToken = randomBytes(20).toString('hex');
    const user = await this.usersService.findOneAndUpdate(
      { email: emailDto.email },
      {
        resetPasswordToken,
        resetPasswordExpires: Date.now() + 3600000,
      },
    );
    if (!user) {
      throw new UnauthorizedException('No User found with given email');
    }

    await this.notificationService.addEmailJob({
      subject: 'Password change request',
      to: user.email,
      body: {
        OTP: resetPasswordToken,
        NAME: user.name,
        URL: process.env.URL,
      },
      templateName: 'forgot-password',
    });
    return { message: 'A reset email has been sent' };
  }

  async reset(token: string) {
    const user = await this.usersService.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
      const templatePath = join(
        process.cwd(),
        'public',
        'templates',
        'error.html',
      );
      const source = readFileSync(templatePath, 'utf8');
      const template = compile(source);
      return template({
        TITLE: 'Password reset token is invalid or has expired.',
        MESSAGE: 'Please reset your password once again.',
      });
    }
    return readFileSync(
      join(process.cwd(), 'public', 'templates', 'reset-password.html'),
      'utf8',
    );
  }

  async resetPassword(token: string, password: string) {
    const salt = genSaltSync(Number(process.env.SALT));
    const hashPassword = hashSync(password, salt);
    const user = await this.usersService.findOneAndUpdate(
      {
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      },
      {
        password: hashPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        status: 'active',
      },
    );
    if (!user) {
      const templatePath = join(
        process.cwd(),
        'public',
        'templates',
        'error.html',
      );
      const source = readFileSync(templatePath, 'utf8');
      const template = compile(source);
      return template({
        TITLE: 'Password reset token is invalid or has expired.',
        MESSAGE: 'Please reset your password once again.',
      });
    }

    await this.notificationService.addEmailJob({
      subject: 'Your password has been changed',
      to: user.email,
      body: {
        NAME: user.name,
        EMAIL: user.email,
      },
      templateName: 'password-change-confirmation',
    });

    const templatePath = join(
      process.cwd(),
      'public',
      'templates',
      'success.html',
    );
    const source = readFileSync(templatePath, 'utf8');
    const template = compile(source);
    return template({
      TITLE: 'Your Password has been Updated!',
      MESSAGE: 'Now, You are able to Login.',
    });
  }

  async verifyGoogleToken(token: string) {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      return ticket.getPayload();
    } catch (e) {
      console.error(e);
      throw new BadRequestException('Invalid user detected. Please try again');
    }
  }
}
