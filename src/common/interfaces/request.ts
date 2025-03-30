import { Request } from 'express';

import { Role } from '../../users/user.model';

export interface IUser {
  _id: string;
  role: Role;
  email: string;
}
export interface IRequest extends Request {
  user: IUser;
}
