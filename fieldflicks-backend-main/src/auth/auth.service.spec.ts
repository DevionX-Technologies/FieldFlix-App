import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from 'src/user/user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationEntity } from 'src/notification/entities/notification.entity';
import { JwtService } from '@nestjs/jwt';
import { Msg91Service } from 'src/common/service/msg91.service';
import { FileServiceService } from 'src/file-service/file-service.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const mockUserService = {};
    const mockNotificationRepository = {};
    const mockJwtService = {};
    const mockMsg91Service = {};
    const mockFileServiceService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: getRepositoryToken(NotificationEntity),
          useValue: mockNotificationRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: Msg91Service,
          useValue: mockMsg91Service,
        },
        {
          provide: FileServiceService,
          useValue: mockFileServiceService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
