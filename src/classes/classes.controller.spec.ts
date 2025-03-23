import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';

import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

describe('ClassesController', () => {
  let controller: ClassesController;
  let service: ClassesService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ClassesController],
      providers: [
        {
          provide: ClassesService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(ClassesController);
    service = module.get(ClassesService);
  });

  describe('create', () => {
    it('should create a class', async () => {
      const dto = {
        courseId: new Types.ObjectId().toString(),
        location: { latitude: 12.34, longitude: 56.78 },
        radius: 50,
      };
      jest.spyOn(service, 'create').mockImplementationOnce(() =>
        Promise.resolve({
          message: 'Class Started successfully',
        }),
      );
      expect(await controller.create(dto)).toEqual({
        message: 'Class Started successfully',
      });
    });
  });

  describe('findAll', () => {
    it('should return all classes', async () => {
      const oneClass = {
        _id: new Types.ObjectId(),
        courseId: new Types.ObjectId(),
        students: [],
        location: {
          longitude: 78.1235391,
          latitude: 29.916638,
        },
        radius: 20,
        active: true,
        createdAt: '2025-02-20T17:01:59.376Z',
        updatedAt: '2025-02-20T17:01:59.376Z',
        __v: 0,
      };
      jest.spyOn(service, 'findAll').mockImplementationOnce(async () =>
        Promise.resolve({
          message: 'Available classes found: 1',
          data: [oneClass],
        }),
      );
      const result = await controller.findAll();
      expect(result).toEqual({
        message: 'Available classes found: 1',
        data: [oneClass],
      });
      expect(service.findAll).toHaveBeenCalled();
    });
  });
});
