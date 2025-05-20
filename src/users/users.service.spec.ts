import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User } from './user.model';
import { NotFoundException } from '@nestjs/common';
import { CoursesService } from '../courses/courses.service';
import { ClassesService } from '../classes/classes.service';
import { NotificationService } from '../common/notification/notification.service';

const mockUserModel = () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  updateOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  countDocuments: jest.fn(),
});

const mockCoursesService = () => ({
  updateOne: jest.fn(),
  find: jest.fn(),
});

describe('UsersService', () => {
  let service: UsersService;
  let model: ReturnType<typeof mockUserModel>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useFactory: mockUserModel,
        },
        { provide: CoursesService, useFactory: mockCoursesService },
        { provide: ClassesService, useValue: { find: jest.fn() } },
        { provide: NotificationService, useValue: { addEmailJob: jest.fn() } },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    model = module.get(getModelToken(User.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const dto = { email: 'test@example.com', name: 'Test' };
      const createdUser = { _id: '1', ...dto };
      model.create.mockResolvedValue(createdUser);

      const result = await service.create(dto as any);
      expect(result).toEqual(createdUser);
      expect(model.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('find', () => {
    it('should return an array of users', async () => {
      const users = [{ email: 'test@example.com' }];
      model.find.mockReturnValue({ lean: () => users });

      const result = await service.find({}, {});
      expect(result).toEqual(users);
    });
  });

  describe('findOne', () => {
    it('should return one user', async () => {
      const user = { email: 'test@example.com' };
      model.findOne.mockReturnValue({ lean: () => user });

      const result = await service.findOne({ email: user.email });
      expect(result).toEqual(user);
    });
  });

  describe('findOneOrThrow', () => {
    it('should return user if found', async () => {
      const user = { email: 'test@example.com' };
      model.findOne.mockReturnValue({ lean: () => user });

      const result = await service.findOneOrThrow({ email: user.email });
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException if user not found', async () => {
      model.findOne.mockReturnValue({ lean: () => null });

      await expect(
        service.findOneOrThrow({ email: 'none@example.com' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('countDocuments', () => {
    it('should return document count', async () => {
      model.countDocuments.mockResolvedValue(5);
      const count = await service.countDocuments({});
      expect(count).toBe(5);
    });
  });

  describe('updateOne', () => {
    it('should call updateOne with filter and update', async () => {
      const filter = { email: 'test@example.com' };
      const update = { name: 'Updated' };
      model.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.updateOne(filter, update);
      expect(result).toEqual({ modifiedCount: 1 });
    });
  });

  describe('findOneAndUpdate', () => {
    it('should update and return one user', async () => {
      const filter = { email: 'test@example.com' };
      const update = { status: 'active' };
      const user = { _id: '1', email: 'test@example.com', status: 'active' };
      model.findOneAndUpdate.mockResolvedValue(user);

      const result = await service.findOneAndUpdate(filter, update);
      expect(result).toEqual(user);
    });
  });
});
