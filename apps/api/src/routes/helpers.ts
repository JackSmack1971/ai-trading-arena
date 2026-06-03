import type { FastifyReply } from 'fastify';
import type { z } from 'zod';
import { ErrorEnvelopeSchema, okEnvelope } from '../contracts.js';

export function sendOk<TSchema extends z.ZodTypeAny>(reply: FastifyReply, statusCode: number, schema: TSchema, data: z.input<TSchema>) {
  return reply.code(statusCode).send(okEnvelope(schema).parse({ ok: true, data }));
}

export function sendError(reply: FastifyReply, statusCode: number, code: string, message: string, issues?: unknown) {
  return reply.code(statusCode).send(ErrorEnvelopeSchema.parse({
    ok: false,
    error: { code, message, ...(issues === undefined ? {} : { issues }) },
  }));
}
