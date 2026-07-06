import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const playerSchema = z.object({
  name: z.string().min(1).max(15),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).or(z.string().min(1))
});

describe('Player Validation Schema', () => {
  it('validates correct player data', () => {
    const validData = { name: 'Player1', color: '#ff0000' };
    expect(() => playerSchema.parse(validData)).not.toThrow();
  });

  it('rejects too long names', () => {
    const invalidData = { name: 'ThisNameIsWayTooLong', color: '#ff0000' };
    expect(() => playerSchema.parse(invalidData)).toThrow();
  });
});
