import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthUser } from '../common/auth-user';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SupportService } from './support.service';

@Controller('support')
@Auth()
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  getHistory(@CurrentUser() user: AuthUser) {
    return this.supportService.history(user.id);
  }

  @Post()
  ask(@CurrentUser() user: AuthUser, @Body('question') question: string) {
    return this.supportService.ask(user, question);
  }
}
