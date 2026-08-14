import { BadRequestException } from "@nestjs/common";
import { z } from "zod";

// Manual interfaces to completely bypass Zod type inference issues
export interface RegisterDto {
  email: string;
  password: string;
  name?: string;
  businessName?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  name: z.string().trim().min(1).optional(),
  businessName: z.string().trim().min(1).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export function parseRegister(data: unknown): RegisterDto {
  const result = registerSchema.safeParse(data);
  if (!result.success) {
    throw new BadRequestException({
      message: "Validation failed",
      errors: result.error.flatten().fieldErrors,
    });
  }
  return result.data as RegisterDto;
}

export function parseLogin(data: unknown): LoginDto {
  const result = loginSchema.safeParse(data);
  if (!result.success) {
    throw new BadRequestException({
      message: "Validation failed",
      errors: result.error.flatten().fieldErrors,
    });
  }
  return result.data as LoginDto;
}