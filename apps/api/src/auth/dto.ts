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

export interface SendPhoneOtpDto {
  phone: string;
}

export interface VerifyPhoneOtpDto {
  phone: string;
  code: string;
  name?: string;
  businessName?: string;
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

const sendPhoneOtpSchema = z.object({
  phone: z.string().trim().min(7, "Please enter a valid phone number."),
});

const verifyPhoneOtpSchema = z.object({
  phone: z.string().trim().min(7, "Please enter a valid phone number."),
  code: z.string().trim().min(4, "Verification code must be at least 4 digits."),
  name: z.string().trim().optional(),
  businessName: z.string().trim().optional(),
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

export function parseSendPhoneOtp(data: unknown): SendPhoneOtpDto {
  const result = sendPhoneOtpSchema.safeParse(data);
  if (!result.success) {
    throw new BadRequestException({
      message: "Invalid phone number format",
      errors: result.error.flatten().fieldErrors,
    });
  }
  return result.data as SendPhoneOtpDto;
}

export function parseVerifyPhoneOtp(data: unknown): VerifyPhoneOtpDto {
  const result = verifyPhoneOtpSchema.safeParse(data);
  if (!result.success) {
    throw new BadRequestException({
      message: "Invalid OTP verification request",
      errors: result.error.flatten().fieldErrors,
    });
  }
  return result.data as VerifyPhoneOtpDto;
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