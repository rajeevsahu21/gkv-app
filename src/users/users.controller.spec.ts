import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CoursesService } from '../courses/courses.service';
import { Role } from './user.model';
import { IRequest } from '../common/interfaces/request';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;
  let coursesService: CoursesService;

  const mockUsersService = {
    countDocuments: jest.fn(),
    find: jest
      .fn()
      .mockReturnValue({ skip: jest.fn().mockReturnThis(), limit: jest.fn() }),
    updateOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  const mockCoursesService = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: CoursesService, useValue: mockCoursesService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
    coursesService = module.get<CoursesService>(CoursesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create (me)', () => {
    it('should return user details with version', () => {
      const req = { user: { _id: 'Test User' } } as IRequest;
      const result = controller.create(req);
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('message', 'User Found Successfully');
      expect(result).toHaveProperty('data', req.user);
    });
  });

  describe('findAll', () => {
    it('should return paginated users list', async () => {
      const mockUsers = [{ name: 'John' }, { name: 'Jane' }];
      mockUsersService.countDocuments.mockResolvedValue(2);
      mockUsersService.find().skip().limit.mockResolvedValue(mockUsers);

      const result = await controller.findAll({
        pageNumber: 1,
        limit: 2,
        searchTerm: '',
      });

      expect(result.total).toBe(2);
      expect(result.pageCount).toBe(1);
      expect(result.data).toEqual(mockUsers);
      expect(result.message).toBe('Users found Successfully');
    });
  });

  describe('getUserCourses', () => {
    it('should return courses for student', async () => {
      const mockCourses = [{ title: 'Course1' }];
      mockCoursesService.find.mockResolvedValue(mockCourses);

      const result = await controller.getUserCourses({
        userId: '123',
        role: 'student',
      });

      expect(result).toEqual({
        data: mockCourses,
        message: 'Courses Found Successfully',
      });
    });

    it('should return courses for teacher', async () => {
      const mockCourses = [{ title: 'Course1' }];
      mockCoursesService.find.mockResolvedValue(mockCourses);

      const result = await controller.getUserCourses({
        userId: '123',
        role: 'teacher',
      });

      expect(result).toEqual({
        data: mockCourses,
        message: 'Courses Found Successfully',
      });
    });
  });

  describe('update', () => {
    it('should update user profile', async () => {
      const dto = { name: 'Updated Name' };
      const req = { user: { _id: '123' } } as IRequest;
      const result = await controller.update(dto, req);
      expect(usersService.updateOne).toHaveBeenCalledWith({ _id: '123' }, dto);
      expect(result).toEqual({ message: 'User Profile Updated successfully' });
    });
  });

  describe('updateUsers', () => {
    it('should update user details by admin', async () => {
      const body = {
        userId: '123',
        name: 'Name',
        email: 'test@gkv.ac.in',
        role: Role.Student,
      };
      const result = await controller.updateUsers(body);
      expect(usersService.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: body.userId },
        { name: body.name, email: body.email, role: body.role },
      );
      expect(result).toEqual({ message: 'User Profile Updated Successfully' });
    });
  });
});
