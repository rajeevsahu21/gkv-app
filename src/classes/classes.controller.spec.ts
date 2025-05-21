import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

const mockClassesService = {
  create: jest.fn(),
  find: jest.fn(),
  getClassWithStudents: jest.fn(),
  findOne: jest.fn(),
  updateClass: jest.fn(),
  update: jest.fn(),
  findOneAndDelete: jest.fn(),
};

describe('ClassesController', () => {
  let controller: ClassesController;
  let service: typeof mockClassesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassesController],
      providers: [
        {
          provide: ClassesService,
          useValue: mockClassesService,
        },
      ],
    }).compile();

    controller = module.get<ClassesController>(ClassesController);
    service = module.get(ClassesService);
    jest.clearAllMocks();
  });

  it('should create a class', async () => {
    await controller.create({} as any);
    expect(service.create).toHaveBeenCalled();
  });

  it('should find all classes for student', async () => {
    const mockReq = { user: { _id: 'student-id', role: 'student' } };
    const sortMock = jest.fn().mockResolvedValue([]);
    service.find.mockReturnValue({ sort: sortMock } as any);
    const res = await controller.findAll(
      { courseId: 'course-id' },
      mockReq as any,
    );
    expect(service.find).toHaveBeenCalledWith({
      students: 'student-id',
      courseId: 'course-id',
    });
    expect(res.data).toEqual([]);
  });

  it('should find all classes for teacher', async () => {
    const mockReq = { user: { role: 'teacher' } };
    const sortMock = jest.fn().mockResolvedValue([]);
    service.find.mockReturnValue({ sort: sortMock } as any);
    const res = await controller.findAll(
      { courseId: 'course-id' },
      mockReq as any,
    );
    expect(service.find).toHaveBeenCalledWith({ courseId: 'course-id' });
    expect(res.data).toEqual([]);
  });

  it('should get class with students', async () => {
    service.getClassWithStudents.mockResolvedValue('result');
    const result = await controller.getClassWithStudents({
      classId: 'class-id',
    });
    expect(result).toBe('result');
  });

  it('should return class with populated students', async () => {
    const mockPopulate = jest.fn().mockResolvedValue({ students: [1, 2] });
    service.findOne.mockReturnValue({ populate: mockPopulate } as any);
    const res = await controller.findOne({ id: 'class-id' });
    expect(res.message).toBe('2 student found');
  });

  it('should throw if class not found', async () => {
    const mockPopulate = jest.fn().mockResolvedValue(null);
    service.findOne.mockReturnValue({ populate: mockPopulate } as any);
    await expect(controller.findOne({ id: 'invalid-id' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should update class attendance', async () => {
    await controller.updateClass({} as any, { user: {} } as any);
    expect(service.updateClass).toHaveBeenCalled();
  });

  it('should update attendance list', async () => {
    await controller.update(
      { id: 'id' },
      { students: [{ _id: '', present: true }] },
    );
    expect(service.update).toHaveBeenCalled();
  });

  it('should delete class', async () => {
    await controller.remove({ id: 'id' });
    expect(service.findOneAndDelete).toHaveBeenCalledWith({ _id: 'id' });
  });
});
