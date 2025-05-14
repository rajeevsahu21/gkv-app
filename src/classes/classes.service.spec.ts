import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';

import { ClassesService } from './classes.service';
import { CoursesService } from '../courses/courses.service';
import { Class } from './class.model';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { MarkAttendanceDto } from './dto/markAttendance.dto';

const mockClassModel = () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  updateOne: jest.fn(),
  deleteMany: jest.fn(),
});

const mockCoursesService = () => ({
  updateOne: jest.fn(),
  findOne: jest.fn(),
});

const mockQueue = () => ({
  add: jest.fn(),
});

describe('ClassesService', () => {
  let service: ClassesService;
  let classModel: Model<Class>;
  let coursesService: CoursesService;
  let classQueue: { add: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesService,
        {
          provide: getModelToken(Class.name),
          useFactory: mockClassModel,
        },
        {
          provide: CoursesService,
          useFactory: mockCoursesService,
        },
        {
          provide: getQueueToken('class'),
          useFactory: mockQueue,
        },
      ],
    }).compile();

    service = module.get<ClassesService>(ClassesService);
    classModel = module.get<Model<Class>>(getModelToken(Class.name));
    coursesService = module.get<CoursesService>(CoursesService);
    classQueue = module.get(getQueueToken('class'));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createClassDto: CreateClassDto = {
      courseId: 'course-123',
      location: { latitude: 40.7128, longitude: -74.006 },
      radius: 100,
    };

    it('should throw BadRequestException if active class already exists for course', async () => {
      (classModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'class-123' }),
      });

      await expect(service.create(createClassDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(classModel.findOne).toHaveBeenCalledWith(
        { courseId: createClassDto.courseId, active: true },
        { _id: 1 },
      );
    });

    it('should create a class, update course and add job to queue', async () => {
      (classModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      (classModel.create as jest.Mock).mockResolvedValue({});
      (coursesService.updateOne as jest.Mock).mockResolvedValue({});
      classQueue.add.mockResolvedValue({});

      await service.create(createClassDto);

      expect(classModel.create).toHaveBeenCalledWith({
        courseId: createClassDto.courseId,
        location: createClassDto.location,
        radius: createClassDto.radius,
      });
      expect(coursesService.updateOne).toHaveBeenCalledWith(
        { _id: createClassDto.courseId },
        { activeClass: true, radius: createClassDto.radius },
      );
      expect(classQueue.add).toHaveBeenCalledWith(
        'close',
        { courseId: createClassDto.courseId },
        { delay: 300000, deduplication: { id: createClassDto.courseId } },
      );
    });
  });

  describe('find', () => {
    it('should find classes with given filter', async () => {
      const filter = { courseId: 'course-123', students: 'student-123' };
      const expectedResult = [{ _id: 'class-123' }];

      (classModel.find as jest.Mock).mockResolvedValue(expectedResult);

      const result = await service.find(filter);

      expect(result).toEqual(expectedResult);
      expect(classModel.find).toHaveBeenCalledWith(filter);
    });
  });

  describe('findOne', () => {
    it('should find a class with given filter', async () => {
      const filter = { _id: 'class-123' };
      const expectedResult = { _id: 'class-123' };

      (classModel.findOne as jest.Mock).mockResolvedValue(expectedResult);

      const result = await service.findOne(filter);

      expect(result).toEqual(expectedResult);
      expect(classModel.findOne).toHaveBeenCalledWith(filter);
    });
  });

  describe('getClassWithStudents', () => {
    it('should throw NotFoundException if class not found', async () => {
      (classModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getClassWithStudents('class-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return class with student attendance data', async () => {
      const classId = 'class-123';
      const courseId = 'course-123';
      const mockClass = {
        _id: classId,
        courseId: courseId,
        students: ['507f1f77bcf86cd799439021'],
      };
      const mockCourse = {
        _id: courseId,
        students: [
          {
            _id: '507f1f77bcf86cd799439021',
            name: 'Student 1',
            registrationNo: 'S001',
          },
          {
            _id: '507f1f77bcf86cd799439022',
            name: 'Student 2',
            registrationNo: 'S002',
          },
        ],
      };

      (classModel.findOne as jest.Mock).mockResolvedValue(mockClass);
      (coursesService.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockCourse),
      });

      const result = await service.getClassWithStudents(classId);

      expect(result).toEqual({
        message: 'Student Attendance found',
        data: [
          {
            _id: '507f1f77bcf86cd799439021',
            name: 'Student 1',
            registrationNo: 'S001',
            present: true,
          },
          {
            _id: '507f1f77bcf86cd799439022',
            name: 'Student 2',
            registrationNo: 'S002',
            present: false,
          },
        ],
      });
      expect(classModel.findOne).toHaveBeenCalledWith({ _id: classId });
      expect(coursesService.findOne).toHaveBeenCalledWith({
        _id: courseId.toString(),
      });
    });
  });

  describe('update', () => {
    it('should update student attendance status', async () => {
      const classId = 'class-123';
      const updateDto: UpdateClassDto = {
        students: [
          { _id: '507f1f77bcf86cd799439021', present: true },
          { _id: '507f1f77bcf86cd799439022', present: false },
        ],
      };

      (classModel.updateOne as jest.Mock).mockResolvedValue({});

      await service.update(classId, updateDto);

      expect(classModel.updateOne).toHaveBeenCalledWith(
        { _id: classId },
        { $addToSet: { students: ['507f1f77bcf86cd799439021'] } },
      );
      expect(classModel.updateOne).toHaveBeenCalledWith(
        { _id: classId },
        { $pull: { students: ['507f1f77bcf86cd799439022'] } },
      );
    });
  });

  describe('updateClass', () => {
    describe('when user is teacher', () => {
      // Use valid MongoDB ObjectId format (24-character hex string)
      const user = { _id: '507f1f77bcf86cd799439012', role: 'teacher' };
      const markAttendanceDto: MarkAttendanceDto = {
        courseId: 'course-123',
        location: undefined,
      };

      it('should throw NotFoundException if no active class is found', async () => {
        (classModel.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

        await expect(
          service.updateClass(markAttendanceDto, user),
        ).rejects.toThrow(NotFoundException);
      });

      it('should dismiss class successfully', async () => {
        const oldClass = {
          _id: 'class-123',
          courseId: 'course-123',
        };

        (classModel.findOneAndUpdate as jest.Mock).mockResolvedValue(oldClass);
        (coursesService.updateOne as jest.Mock).mockResolvedValue({});

        const result = await service.updateClass(markAttendanceDto, user);

        expect(classModel.findOneAndUpdate).toHaveBeenCalledWith(
          { courseId: markAttendanceDto.courseId, active: true },
          { active: false },
        );
        expect(coursesService.updateOne).toHaveBeenCalledWith(
          { _id: markAttendanceDto.courseId },
          { activeClass: false },
        );
        expect(result).toEqual({ message: 'Class dismissed successfully' });
      });
    });

    describe('when user is student', () => {
      // Use valid MongoDB ObjectId format (24-character hex string)
      const user = { _id: '507f1f77bcf86cd799439011', role: 'student' };

      it('should throw BadRequestException if location is missing', async () => {
        const markAttendanceDto: MarkAttendanceDto = {
          courseId: 'course-123',
          location: undefined,
        };

        await expect(
          service.updateClass(markAttendanceDto, user),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw NotFoundException if no active class found', async () => {
        const markAttendanceDto: MarkAttendanceDto = {
          courseId: 'course-123',
          location: { latitude: 40.7128, longitude: -74.006 },
        };

        (classModel.findOne as jest.Mock).mockResolvedValue(null);

        await expect(
          service.updateClass(markAttendanceDto, user),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw BadRequestException if student already marked attendance', async () => {
        const markAttendanceDto: MarkAttendanceDto = {
          courseId: 'course-123',
          location: { latitude: 40.7128, longitude: -74.006 },
        };

        const runningClass = {
          _id: 'class-123',
          courseId: 'course-123',
          location: { latitude: 40.7128, longitude: -74.006 },
          radius: 100,
          students: [user._id],
        };

        (classModel.findOne as jest.Mock).mockResolvedValue(runningClass);

        await expect(
          service.updateClass(markAttendanceDto, user),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException if student is too far from class', async () => {
        const markAttendanceDto: MarkAttendanceDto = {
          courseId: 'course-123',
          location: { latitude: 42.7128, longitude: -76.006 }, // Location far from class
        };

        // We need to mock the private calculateDistance method since it's used in updateClass
        jest.spyOn(service as any, 'calculateDistance').mockReturnValue(1000); // Return 1000 meters

        const runningClass = {
          _id: 'class-123',
          courseId: 'course-123',
          location: { latitude: 40.7128, longitude: -74.006 },
          radius: 100, // 100 meters
          students: [],
        };

        (classModel.findOne as jest.Mock).mockResolvedValue(runningClass);

        await expect(
          service.updateClass(markAttendanceDto, user),
        ).rejects.toThrow(BadRequestException);
      });

      it('should mark attendance successfully if student is within range', async () => {
        const markAttendanceDto: MarkAttendanceDto = {
          courseId: 'course-123',
          location: { latitude: 40.7129, longitude: -74.0061 }, // Very close to class location
        };

        // Mock the calculateDistance method to return a distance within the radius
        jest.spyOn(service as any, 'calculateDistance').mockReturnValue(50); // Return 50 meters

        const runningClass = {
          _id: 'class-123',
          courseId: 'course-123',
          location: { latitude: 40.7128, longitude: -74.006 },
          radius: 100, // 100 meters
          students: [],
        };

        (classModel.findOne as jest.Mock).mockResolvedValue(runningClass);
        (classModel.updateOne as jest.Mock).mockResolvedValue({});

        const result = await service.updateClass(markAttendanceDto, user);

        expect(classModel.updateOne).toHaveBeenCalledWith(
          { _id: runningClass._id },
          { $addToSet: { students: user._id } },
        );
        expect(result).toEqual({
          message: 'Class Attendance marked successfully',
        });
      });
    });
  });

  describe('updateOne', () => {
    it('should update class with given filter and update data', async () => {
      const filter = { courseId: 'course-123', active: true };
      const update = { active: false };
      const expectedResult = { modifiedCount: 1 };

      (classModel.updateOne as jest.Mock).mockResolvedValue(expectedResult);

      const result = await service.updateOne(filter, update);

      expect(result).toEqual(expectedResult);
      expect(classModel.updateOne).toHaveBeenCalledWith(filter, update);
    });
  });

  describe('findOneAndDelete', () => {
    it('should throw NotFoundException if class not found', async () => {
      (classModel.findOneAndDelete as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findOneAndDelete({ _id: 'class-123' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete class and update course if class was active', async () => {
      const deletedClass = {
        _id: 'class-123',
        courseId: 'course-123',
        active: true,
      };

      (classModel.findOneAndDelete as jest.Mock).mockResolvedValue(
        deletedClass,
      );
      (coursesService.updateOne as jest.Mock).mockResolvedValue({});

      await service.findOneAndDelete({ _id: 'class-123' });

      expect(classModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: 'class-123',
      });
      expect(coursesService.updateOne).toHaveBeenCalledWith(
        { _id: deletedClass.courseId.toString() },
        { activeClass: false },
      );
    });

    it('should delete class but not update course if class was inactive', async () => {
      const deletedClass = {
        _id: 'class-123',
        courseId: 'course-123',
        active: false,
      };

      (classModel.findOneAndDelete as jest.Mock).mockResolvedValue(
        deletedClass,
      );

      await service.findOneAndDelete({ _id: 'class-123' });

      expect(classModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: 'class-123',
      });
      expect(coursesService.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('deleteMany', () => {
    it('should delete many classes with given filter', async () => {
      const filter = { courseId: 'course-123' };
      const expectedResult = { deletedCount: 2 };

      (classModel.deleteMany as jest.Mock).mockResolvedValue(expectedResult);

      const result = await service.deleteMany(filter);

      expect(result).toEqual(expectedResult);
      expect(classModel.deleteMany).toHaveBeenCalledWith(filter);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate the correct distance between two points', () => {
      // Using the private method through any to access it
      const distance = (service as any).calculateDistance(
        40.7128, // NYC latitude
        40.7129, // Very close latitude
        -74.006, // NYC longitude
        -74.0061, // Very close longitude
      );

      // Should be a very small distance (about 11 meters)
      expect(distance).toBeLessThan(20);
    });
  });
});
