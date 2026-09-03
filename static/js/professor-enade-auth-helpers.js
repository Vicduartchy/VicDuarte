// Funções puras de apoio à autenticação do PROFESSOR-ENADE — sem
// dependência do SDK do Firebase, por isso testáveis direto no Node.
const ALLOWED_EMAIL_DOMAIN = '@unichristus.edu.br';

export function isAllowedDomain(email) {
    return typeof email === 'string' && email.trim().toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
}

const AUTH_ERROR_MESSAGES = {
    'auth/email-already-in-use': 'Esse e-mail já tem uma conta cadastrada.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/too-many-requests': 'Muitas tentativas. Espere um pouco e tente de novo.',
};

export function mapAuthError(error) {
    return AUTH_ERROR_MESSAGES[error?.code] ?? 'Não deu certo. Tente de novo.';
}
