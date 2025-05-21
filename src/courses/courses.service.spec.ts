import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';

import { CoursesService } from './courses.service';
import { Course } from './course.model';
import { MessagesService } from '../messages/messages.service';
import { ClassesService } from '../classes/classes.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

const mockCourseModel = () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn(),
  findOneAndDelete: jest.fn(),
});

const mockMessagesService = {
  deleteMany: jest.fn(),
};

const mockClassesService = {
  findOne: jest.fn(),
  deleteMany: jest.fn(),
};

const mockCourseQueue = {
  add: jest.fn(),
};

describe('CoursesService', () => {
  let service: CoursesService;
  let model: ReturnType<typeof mockCourseModel>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: getModelToken(Course.name), useFactory: mockCourseModel },
        { provide: MessagesService, useValue: mockMessagesService },
        { provide: ClassesService, useValue: mockClassesService },
        { provide: 'BullQueue_course', useValue: mockCourseQueue },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
    model = module.get(getModelToken(Course.name));
  });

  it('should create a course', async () => {
    const dto = { courseName: 'Math' };
    const userId = 'teacher-id';
    const mockResult = { courseName: 'Math', teacher: userId };
    model.create.mockResolvedValue(mockResult);
    const result = await service.create(dto, userId);
    expect(result).toEqual(mockResult);
    expect(model.create).toHaveBeenCalled();
  });

  it('should find courses by filter', () => {
    service.find({ teacher: 'teacher-id' });
    expect(model.find).toHaveBeenCalledWith({ teacher: 'teacher-id' });
  });

  it('should throw if course not found on enroll', async () => {
    model.findOne.mockResolvedValue(null);
    await expect(
      service.enroll({ courseCode: 'ABC123' }, 'student-id'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw if course is not active on enroll', async () => {
    model.findOne.mockResolvedValue({ isActive: false });
    await expect(
      service.enroll({ courseCode: 'ABC123' }, 'student-id'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw if student already enrolled', async () => {
    const course = {
      isActive: true,
      students: ['student-id'],
      updateOne: jest.fn(),
    };
    model.findOne.mockResolvedValue(course);
    await expect(
      service.enroll({ courseCode: 'ABC123' }, 'student-id'),
    ).rejects.toThrow(ConflictException);
  });

  it('should send attendance and enqueue job', async () => {
    model.findOne.mockResolvedValueOnce({ _id: 'course-id' });
    mockClassesService.findOne.mockResolvedValue({});
    const result = await service.sendAttendance('course-id');
    expect(result.message).toBe(
      'Attendance sent successfully to registered Email',
    );
    expect(mockCourseQueue.add).toHaveBeenCalled();
  });

  it('should delete course and related data', async () => {
    model.findOneAndDelete.mockResolvedValue({ _id: 'course-id' });
    await service.findOneAndDelete({ _id: 'course-id' });
    expect(mockClassesService.deleteMany).toHaveBeenCalledWith({
      courseId: 'course-id',
    });
    expect(mockMessagesService.deleteMany).toHaveBeenCalledWith({
      courseId: 'course-id',
    });
  });

  it('should throw if course not found during delete', async () => {
    model.findOneAndDelete.mockResolvedValue(null);
    await expect(
      service.findOneAndDelete({ _id: 'course-id' }),
    ).rejects.toThrow(NotFoundException);
  });
});
