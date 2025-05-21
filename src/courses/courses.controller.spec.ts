import { Test, TestingModule } from '@nestjs/testing';

import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { Role } from '../users/user.model';

const mockCoursesService = {
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  enroll: jest.fn(),
  sendAttendance: jest.fn(),
  update: jest.fn(),
  findOneAndDelete: jest.fn(),
};

describe('CoursesController', () => {
  let controller: CoursesController;
  let service: typeof mockCoursesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursesController],
      providers: [
        {
          provide: CoursesService,
          useValue: mockCoursesService,
        },
      ],
    }).compile();

    controller = module.get<CoursesController>(CoursesController);
    service = module.get(CoursesService);
  });

  it('should create a course', async () => {
    const dto = { courseName: 'Math' };
    const user = { _id: 'teacher-id' };
    service.create.mockResolvedValue('created-course');
    const result = await controller.create(dto, { user } as any);
    expect(service.create).toHaveBeenCalledWith(dto, 'teacher-id');
    expect(result).toEqual({
      data: 'created-course',
      message: 'Course Created successfully',
    });
  });

  it('should find all courses for a student', async () => {
    const sortMock = jest.fn().mockResolvedValue(['course1']);
    service.find.mockReturnValue({ sort: sortMock } as any);
    const result = await controller.findAll({
      user: { role: 'student', _id: 'student-id' },
    } as any);
    expect(service.find).toHaveBeenCalledWith({ students: 'student-id' });
    expect(result).toEqual({
      data: ['course1'],
      message: 'Available Course found',
    });
  });

  it('should find a course and populate students', async () => {
    const populateMock = jest.fn().mockResolvedValue({ students: [] });
    service.findOne.mockReturnValue({ populate: populateMock } as any);
    const result = await controller.findOne({ id: 'course-id' });
    expect(result).toEqual({
      data: {
        students: [],
      },
      message: 'Course Found successfully',
    });
  });

  it('should enroll a student', async () => {
    const dto = { courseCode: 'XYZ123' };
    const user = { _id: 'student-id' };
    const result = await controller.enroll(dto, { user } as any);
    expect(service.enroll).toHaveBeenCalledWith(dto, 'student-id');
    expect(result).toEqual({ message: 'Course Enrollment Done' });
  });

  it('should send attendance', async () => {
    service.sendAttendance.mockResolvedValue({
      message: 'Attendance sent successfully to registered Email',
    });
    const result = await controller.sendAttendance({ courseId: 'cid' });
    expect(service.sendAttendance).toHaveBeenCalledWith('cid');
    expect(result).toEqual({
      message: 'Attendance sent successfully to registered Email',
    });
  });

  it('should update a course', async () => {
    const dto = { courseName: 'Physics' };
    const user = { _id: 'uid', role: Role.Teacher };
    service.update.mockResolvedValue({
      message: 'Course updated successfully',
    });
    const result = await controller.update({ id: 'cid' }, dto, { user } as any);
    expect(service.update).toHaveBeenCalledWith('cid', dto, user);
    expect(result).toEqual({ message: 'Course updated successfully' });
  });

  it('should delete a course', async () => {
    const result = await controller.remove({ id: 'cid' });
    expect(service.findOneAndDelete).toHaveBeenCalledWith({ _id: 'cid' });
    expect(result).toEqual({ message: 'Course deleted successfully' });
  });
});
