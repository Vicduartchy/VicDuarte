// Simula o backend REST do Firebase Identity Toolkit para testes
// Playwright, sem bater na rede real nem exigir credenciais na CI.
// Intercepta as chamadas que o SDK modular do Firebase Auth faz para
// login, cadastro, refresh de token e reload/getAccountInfo.
export async function mockFirebaseAuth(page, { email = 'professor@unichristus.edu.br', verified = true } = {}) {
    const uid = 'test-uid-1';
    const idToken = 'fake-id-token';
    const refreshToken = 'fake-refresh-token';

    await page.route('**/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            kind: 'identitytoolkit#VerifyPasswordResponse',
            localId: uid,
            email,
            idToken,
            registered: true,
            refreshToken,
            expiresIn: '3600',
        }),
    }));

    await page.route('**/identitytoolkit.googleapis.com/v1/accounts:signUp*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            kind: 'identitytoolkit#SignupNewUserResponse',
            localId: uid,
            email,
            idToken,
            refreshToken,
            expiresIn: '3600',
        }),
    }));

    await page.route('**/identitytoolkit.googleapis.com/v1/accounts:lookup*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            kind: 'identitytoolkit#GetAccountInfoResponse',
            users: [{
                localId: uid,
                email,
                emailVerified: verified,
                providerUserInfo: [{ providerId: 'password', email }],
                validSince: '1',
                lastLoginAt: String(Date.now()),
                createdAt: String(Date.now()),
            }],
        }),
    }));

    await page.route('**/identitytoolkit.googleapis.com/v1/accounts:sendOobCode*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ kind: 'identitytoolkit#GetOobConfirmationCodeResponse', email }),
    }));

    await page.route('**/securetoken.googleapis.com/v1/token*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            access_token: idToken,
            expires_in: '3600',
            token_type: 'Bearer',
            refresh_token: refreshToken,
            id_token: idToken,
            user_id: uid,
            project_id: 'test-project',
        }),
    }));
}

export async function loginAsVerifiedProfessor(page, email = 'professor@unichristus.edu.br') {
    await mockFirebaseAuth(page, { email, verified: true });
    await page.locator('#enade-auth-email').fill(email);
    await page.locator('#enade-auth-password').fill('senha123456');
    await page.locator('#enade-auth-submit').click();
    await page.locator('#enade-workspace-content').waitFor({ state: 'visible' });
}
