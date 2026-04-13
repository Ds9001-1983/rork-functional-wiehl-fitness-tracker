import { TRPCError } from '@trpc/server';

export function toDbId(id: string | number | undefined | null, label = 'id'): number {
  if (id === undefined || id === null || (typeof id === 'string' && !/^\d+$/.test(id))) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: `Ungültige ${label}` });
  }
  const n = typeof id === 'number' ? id : parseInt(id, 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: `Ungültige ${label}` });
  }
  return n;
}

export function isValidDbId(id: unknown): boolean {
  return typeof id === 'string' && /^\d+$/.test(id);
}
