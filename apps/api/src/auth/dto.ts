import { BadRequestException } from "@nestjs/common";
import { z } from "zod";

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

export interface Verify2faSetupDto {
  tempToken: string;
  code: string;
  secret: string;
}

export interface Verify2faLoginDto {
  tempToken: string;
  code: string;
}

export interface GoogleVerifyDto {
  idToken?: string;
  accessToken?: string;
  code?: string;
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

const verify2faSetupSchema = z.object({
  tempToken: z.string().min(1, "Temporary 2FA token is required."),
  code: z.string().trim().min(6, "Verification code must be at least 6 digits."),
  secret: z.string().min(16, "2FA secret is required."),
});

const verify2faLoginSchema = z.object({
  tempToken: z.string().min(1, "Temporary 2FA token is required."),
  code: z.string().trim().min(6, "Verification code or backup code is required."),
});

const googleVerifySchema = z.object({
  idToken: z.string().optional(),
  accessToken: z.string().optional(),
  code: z.string().optional(),
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

export function parseVerify2faSetup(data: unknown): Verify2faSetupDto {
  const result = verify2faSetupSchema.safeParse(data);
  if (!result.success) {
    throw new BadRequestException({
      message: "Invalid 2FA setup verification request",
      errors: result.error.flatten().fieldErrors,
    });
  }
  return result.data as Verify2faSetupDto;
}

export function parseVerify2faLogin(data: unknown): Verify2faLoginDto {
  const result = verify2faLoginSchema.safeParse(data);
  if (!result.success) {
    throw new BadRequestException({
      message: "Invalid 2FA login verification request",
      errors: result.error.flatten().fieldErrors,
    });
  }
  return result.data as Verify2faLoginDto;
}

export function parseGoogleVerify(data: unknown): GoogleVerifyDto {
  const result = googleVerifySchema.safeParse(data);
  if (!result.success) {
    throw new BadRequestException({
      message: "Invalid Google verification request",
      errors: result.error.flatten().fieldErrors,
    });
  }
  return result.data as GoogleVerifyDto;
}