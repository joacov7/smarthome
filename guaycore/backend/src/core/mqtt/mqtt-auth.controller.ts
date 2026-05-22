import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Public } from '../../shared/decorators/public.decorator';
import { DevicesService } from '../devices/devices.service';

// ============================================================
//  MqttAuthController — hook HTTP que EMQX llama para auth
//
//  EMQX config (docker-compose):
//    EMQX_AUTHENTICATION__1__URL: http://backend:3000/api/v1/internal/mqtt/auth
//    EMQX_AUTHENTICATION__1__METHOD: post
//    EMQX_AUTHENTICATION__1__BODY: {"username":"${username}","password":"${password}"}
//
//  EMQX espera HTTP 200 = allow, HTTP 4xx = deny.
// ============================================================

interface MqttAuthBody {
  username: string;   // deviceKey del dispositivo
  password: string;   // deviceSecret en texto plano
  clientid: string;
}

@Controller('internal/mqtt')
export class MqttAuthController {
  constructor(private readonly devices: DevicesService) {}

  @Post('auth')
  @Public()                        // no requiere JWT — viene de EMQX
  @HttpCode(HttpStatus.OK)
  async authenticate(@Body() body: MqttAuthBody): Promise<{ result: string }> {
    const allowed = await this.devices.authenticateMqtt(body.username, body.password);

    if (!allowed) {
      // EMQX interpreta cualquier body con result != 'allow' como denegado
      return { result: 'deny' };
    }

    return { result: 'allow' };
  }
}
