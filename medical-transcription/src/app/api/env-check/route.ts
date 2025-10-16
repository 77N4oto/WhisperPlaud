import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    AUTH_USERNAME: process.env.AUTH_USERNAME,
    AUTH_PASSWORD_HASH_LENGTH: process.env.AUTH_PASSWORD_HASH?.length || 0,
    AUTH_PASSWORD_HASH_PREFIX: process.env.AUTH_PASSWORD_HASH?.substring(0, 10) || 'missing',
    JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
  });
}
