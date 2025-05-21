import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';

import { MessagesService } from './messages.service';
import { Message } from './message.model';

const mockMessageModel = () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  deleteMany: jest.fn(),
});

describe('MessagesService', () => {
  let service: MessagesService;
  let model: ReturnType<typeof mockMessageModel>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: getModelToken(Message.name),
          useFactory: mockMessageModel,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    model = module.get(getModelToken(Message.name));
  });

  it('should create a message', async () => {
    const dto = { message: 'Hello', title: 'test', courseId: 'course123' };
    model.create.mockResolvedValue(dto);
    const result = await service.create(dto);
    expect(result).toEqual(dto);
    expect(model.create).toHaveBeenCalledWith(dto);
  });

  it('should find messages by courseId', async () => {
    const result = [{ text: 'Hello', courseId: 'course123' }];
    model.find.mockReturnValue(result);
    const messages = await service.find({ courseId: 'course123' });
    expect(messages).toEqual(result);
    expect(model.find).toHaveBeenCalledWith({ courseId: 'course123' });
  });

  it('should find one message by id', async () => {
    const result = { text: 'Hello', _id: 'message123' };
    model.findOne.mockReturnValue(result);
    const message = await service.findOneOrThrow({ _id: 'message123' });
    expect(message).toEqual(result);
    expect(model.findOne).toHaveBeenCalledWith({ _id: 'message123' });
  });

  it('should update a message', async () => {
    model.findOneAndUpdate.mockResolvedValue({});
    await expect(
      service.update('message123', { message: 'Updated' }),
    ).resolves.toBeUndefined();
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'message123' },
      { message: 'Updated' },
    );
  });

  it('should throw if message to update not found', async () => {
    model.findOneAndUpdate.mockResolvedValue(null);
    await expect(
      service.update('invalid-id', { message: 'Updated' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should delete a message', async () => {
    model.findOneAndDelete.mockResolvedValue({});
    await expect(service.remove('message123')).resolves.toBeUndefined();
    expect(model.findOneAndDelete).toHaveBeenCalledWith({ _id: 'message123' });
  });

  it('should throw if message to delete not found', async () => {
    model.findOneAndDelete.mockResolvedValue(null);
    await expect(service.remove('invalid-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should delete many messages by courseId', async () => {
    const result = { deletedCount: 2 };
    model.deleteMany.mockResolvedValue(result);
    const res = await service.deleteMany({ courseId: 'course123' });
    expect(res).toEqual(result);
    expect(model.deleteMany).toHaveBeenCalledWith({ courseId: 'course123' });
  });
});
