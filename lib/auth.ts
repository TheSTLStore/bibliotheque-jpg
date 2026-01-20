import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import {
  AuthUser,
  AssociationConfig,
  InvalidPasswordError,
  InvalidSlugError,
  MissingFieldsError,
} from '@/types';

// Constants
const COOKIE_NAME = 'familyName';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Association Management

let associationCache: Map<string, string> | null = null;

/**
 * Parse ASSOCIATION_SLUGS environment variable
 * Format: "slug1:DisplayName1,slug2:DisplayName2"
 */
export function parseAssociationSlugs(): Map<string, string> {
  if (associationCache) {
    return associationCache;
  }

  const slugsEnv = process.env.ASSOCIATION_SLUGS || '';
  const map = new Map<string, string>();

  slugsEnv.split(',').forEach((pair) => {
    const trimmedPair = pair.trim();
    if (!trimmedPair) return;

    const [slug, name] = trimmedPair.split(':');
    if (slug && name) {
      map.set(slug.trim(), name.trim());
    }
  });

  associationCache = map;
  return map;
}

/**
 * Get association display name from slug
 */
export function getAssociationName(slug: string): string | null {
  const associations = parseAssociationSlugs();
  return associations.get(slug) || null;
}

/**
 * Check if slug is valid
 */
export function isValidAssociation(slug: string): boolean {
  const associations = parseAssociationSlugs();
  return associations.has(slug);
}

/**
 * Validate association slug, throws if invalid
 */
export function validateAssociationSlug(slug: string): void {
  if (!isValidAssociation(slug)) {
    throw new InvalidSlugError(slug);
  }
}

/**
 * Get all association configs
 */
export function getAssociationConfigs(): AssociationConfig[] {
  const associations = parseAssociationSlugs();
  return Array.from(associations.entries()).map(([slug, displayName]) => ({
    slug,
    displayName,
  }));
}

// Family Authentication

/**
 * Validate family password
 */
export async function validateFamilyPassword(password: string): Promise<boolean> {
  const envPassword = process.env.FAMILY_PASSWORD;

  if (!envPassword) {
    console.error('FAMILY_PASSWORD not set in environment variables');
    return false;
  }

  // Check if env password is hashed (starts with $2a$ or $2b$)
  const isHashed = envPassword.startsWith('$2a$') || envPassword.startsWith('$2b$');

  if (isHashed) {
    // Compare with bcrypt
    return await bcrypt.compare(password, envPassword);
  } else {
    // Fallback to plain text comparison (not recommended for production)
    console.warn('WARNING: Using plain text password. Consider hashing FAMILY_PASSWORD');
    return password === envPassword;
  }
}

/**
 * Validate input fields for login
 */
export function validateLoginFields(password: string, name: string): void {
  const missing: string[] = [];

  if (!password || password.trim() === '') {
    missing.push('password');
  }

  if (!name || name.trim() === '') {
    missing.push('name');
  }

  if (missing.length > 0) {
    throw new MissingFieldsError(missing);
  }

  // Additional validation
  if (name.length > 50) {
    throw new Error('Le nom ne peut pas dépasser 50 caractères');
  }

  // Sanitize name (basic XSS prevention)
  if (/<|>|&|"|'/.test(name)) {
    throw new Error('Le nom contient des caractères non autorisés');
  }
}

// Cookie Management

/**
 * Set family name cookie (server-side)
 */
export function setFamilyNameCookie(name: string): void {
  cookies().set({
    name: COOKIE_NAME,
    value: name,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
    httpOnly: false, // Allow client-side access for UI
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}

/**
 * Get family name from cookie (server-side)
 */
export function getFamilyNameFromCookie(): string | null {
  const cookie = cookies().get(COOKIE_NAME);
  return cookie?.value || null;
}

/**
 * Clear family name cookie (logout)
 */
export function clearFamilyNameCookie(): void {
  cookies().delete(COOKIE_NAME);
}

// User Context

/**
 * Get current user from request
 * Returns AuthUser if authenticated, null otherwise
 */
export function getCurrentUser(request: NextRequest): AuthUser | null {
  const { pathname } = request.nextUrl;

  // Check if it's an association route
  const associationMatch = pathname.match(/^\/public\/([^/]+)/);
  if (associationMatch) {
    const slug = associationMatch[1];
    if (isValidAssociation(slug)) {
      const displayName = getAssociationName(slug);
      return {
        name: displayName || slug,
        type: 'association',
        associationSlug: slug,
      };
    }
    return null;
  }

  // Check for family cookie
  const familyName = request.cookies.get(COOKIE_NAME)?.value;
  if (familyName) {
    return {
      name: familyName,
      type: 'family',
    };
  }

  return null;
}

/**
 * Get user type from current user
 */
export function getUserType(user: AuthUser | null): 'family' | 'association' | null {
  return user?.type || null;
}

/**
 * Require authentication middleware helper
 * Returns user if authenticated, redirects to login otherwise
 */
export function requireAuth(request: NextRequest): AuthUser | NextResponse {
  const user = getCurrentUser(request);

  if (!user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return user;
}

/**
 * Require family authentication middleware helper
 * Returns user if family member, redirects otherwise
 */
export function requireFamilyAuth(request: NextRequest): AuthUser | NextResponse {
  const result = requireAuth(request);

  // If result is a redirect, return it
  if (result instanceof NextResponse) {
    return result;
  }

  // Check if user is family
  if (result.type !== 'family') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return result;
}

// Utility to hash password (for generating FAMILY_PASSWORD env value)
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}
