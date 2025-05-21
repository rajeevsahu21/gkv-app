import { Test, TestingModule } from '@nestjs/testing';

import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

const mockMessagesService = {
  create: jest.fn(),
  find: jest.fn(),
  findOneOrThrow: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('MessagesController', () => {
  let controller: MessagesController;
  let service: typeof mockMessagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [
        {
          provide: MessagesService,
          useValue: mockMessagesService,
        },
      ],
    }).compile();

    controller = module.get<MessagesController>(MessagesController);
    service = module.get(MessagesService);
  });

  it('should create a message', async () => {
    service.create.mockResolvedValue({});
    const result = await controller.create({} as any);
    expect(service.create).toHaveBeenCalled();
    expect(result).toEqual({ message: 'Message Send successfully' });
  });

  it('should return all messages', async () => {
    service.find.mockResolvedValue([{ text: 'Hello' }]);
    const result = await controller.findAll({ courseId: 'course-id' });
    expect(service.find).toHaveBeenCalledWith({ courseId: 'course-id' });
    expect(result).toEqual({
      message: 'All Messages found',
      total: 1,
      data: [{ text: 'Hello' }],
    });
  });

  it('should return a single message', async () => {
    service.findOneOrThrow.mockResolvedValue({ text: 'Hello' });
    const result = await controller.findOne({ id: 'id' });
    expect(service.findOneOrThrow).toHaveBeenCalledWith({ _id: 'id' });
    expect(result).toEqual({
      message: 'Message Found successfully',
      data: { text: 'Hello' },
    });
  });

  it('should update a message', async () => {
    service.update.mockResolvedValue(undefined);
    const result = await controller.update(
      { id: 'id' },
      { message: 'Updated' },
    );
    expect(service.update).toHaveBeenCalledWith('id', { message: 'Updated' });
    expect(result).toEqual({ message: 'Message Updated successfully' });
  });

  it('should delete a message', async () => {
    service.remove.mockResolvedValue(undefined);
    const result = await controller.remove({ id: 'id' });
    expect(service.remove).toHaveBeenCalledWith('id');
    expect(result).toEqual({ message: 'Message deleted successfully' });
  });
});
