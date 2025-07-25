// import { Injectable } from '@nestjs/common';
// import { OnEvent } from '@nestjs/event-emitter';
// import { TokenService } from './transactions.service';

// @Injectable()
// export class TokenEventListener {
//   constructor(private readonly transactionService: TokenService) {}

//   @OnEvent('token.created')
//   async handleTokenCreated(payload: CreateTokenDto) {
//     // Add new token to Tokens table
//     await this.tokenService.create(payload);
//   }
// }
