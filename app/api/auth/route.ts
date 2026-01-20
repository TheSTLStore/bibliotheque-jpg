import { NextRequest, NextResponse } from 'next/server';
import {
  validateFamilyPassword,
  validateLoginFields,
  setFamilyNameCookie,
} from '@/lib/auth';
import {
  LoginRequest,
  LoginResponse,
  InvalidPasswordError,
  MissingFieldsError,
} from '@/types';

/**
 * POST /api/auth
 * Family login endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { password, name } = body;

    // Validate fields
    try {
      validateLoginFields(password, name);
    } catch (error) {
      if (error instanceof MissingFieldsError) {
        const response: LoginResponse = {
          success: false,
          error: 'Veuillez remplir tous les champs',
        };
        return NextResponse.json(response, { status: 400 });
      }

      const response: LoginResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur de validation',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate password
    const isValidPassword = await validateFamilyPassword(password);
    if (!isValidPassword) {
      const response: LoginResponse = {
        success: false,
        error: 'Mot de passe incorrect',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Set cookie
    setFamilyNameCookie(name.trim());

    // Return success
    const response: LoginResponse = {
      success: true,
      user: {
        name: name.trim(),
        type: 'family',
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Login error:', error);

    const response: LoginResponse = {
      success: false,
      error: 'Une erreur est survenue lors de la connexion',
    };

    return NextResponse.json(response, { status: 500 });
  }
}
